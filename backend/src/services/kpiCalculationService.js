const { Op } = require('sequelize');
const {
  KpiDefinition, KpiAssignment, KpiMeasurement, Employee, ProductionRecord, KpiCategory,
} = require('../models');
const { calculateKpiResult, aggregateKpiScore } = require('../utils/kpiCalculator');
const { getAttendanceSummary } = require('./attendanceService');
const { KPI_DATA_SOURCE } = require('../constants/kpi');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * Resolves the effective target/weight for an assignment: the assignment
 * row's own override if set, otherwise the KPI definition's default.
 */
function resolveTargetAndWeight(assignment) {
  const target = assignment.target_value ?? assignment.kpiDefinition.target_value;
  const weight = assignment.weight ?? assignment.kpiDefinition.weight;
  return { target: Number(target), weight: Number(weight) };
}

/**
 * Pulls the raw "actual value" for a given automatic data source
 * (ATTENDANCE or PRODUCTION) over a period, for one employee. MANUAL KPIs
 * skip this and are recorded directly via recordManualMeasurement.
 */
async function fetchActualValueFromSource({ dataSource, kpiCode, employeeId, periodStart, periodEnd }) {
  if (dataSource === KPI_DATA_SOURCE.ATTENDANCE) {
    const summary = await getAttendanceSummary(employeeId, periodStart, periodEnd);
    switch (kpiCode) {
      case 'ATTENDANCE_RATE':
        return summary.attendanceRate;
      case 'PUNCTUALITY':
        return summary.punctualityRate;
      case 'ABSENTEEISM':
        return summary.absenteeismRate;
      default:
        return summary.attendanceRate;
    }
  }

  if (dataSource === KPI_DATA_SOURCE.PRODUCTION) {
    const records = await ProductionRecord.findAll({
      where: { employee_id: employeeId, date: { [Op.between]: [periodStart, periodEnd] } },
    });
    const totals = records.reduce(
      (acc, r) => {
        acc.target += r.target_units;
        acc.produced += r.produced_units;
        acc.defective += r.defective_units;
        acc.rework += r.rework_units;
        acc.safety += r.safety_incidents;
        return acc;
      },
      { target: 0, produced: 0, defective: 0, rework: 0, safety: 0 }
    );

    switch (kpiCode) {
      case 'PRODUCTION_TARGET_ACHIEVEMENT':
        return totals.target > 0 ? (totals.produced / totals.target) * 100 : 0;
      case 'QUALITY_RATE':
        return totals.produced > 0 ? ((totals.produced - totals.defective) / totals.produced) * 100 : 0;
      case 'DEFECT_RATE':
        return totals.produced > 0 ? (totals.defective / totals.produced) * 100 : 0;
      case 'SAFETY_INCIDENTS':
        return totals.safety;
      default:
        return totals.produced;
    }
  }

  return null; // MANUAL / SYSTEM / IMPORT sources are recorded directly, not computed here
}

/**
 * Recomputes and upserts a KpiMeasurement for one assignment + period.
 * Used both for automatic (attendance/production-sourced) KPIs on a
 * schedule, and can be re-run on demand from the KPI management screen.
 */
async function recalculateMeasurement({ kpiAssignmentId, periodStart, periodEnd, recordedBy }) {
  const assignment = await KpiAssignment.findByPk(kpiAssignmentId, {
    include: [{ model: KpiDefinition, as: 'kpiDefinition' }, { model: Employee, as: 'employee' }],
  });
  if (!assignment) throw Object.assign(new Error('KPI assignment not found'), { statusCode: 404 });

  const def = assignment.kpiDefinition;
  const { target, weight } = resolveTargetAndWeight(assignment);

  let actualValue;
  if (def.data_source === KPI_DATA_SOURCE.MANUAL || def.data_source === KPI_DATA_SOURCE.SYSTEM || def.data_source === KPI_DATA_SOURCE.IMPORT) {
    const existing = await KpiMeasurement.findOne({
      where: { kpi_assignment_id: kpiAssignmentId, period_start: periodStart, period_end: periodEnd },
    });
    actualValue = existing ? Number(existing.actual_value) : 0;
  } else {
    actualValue = await fetchActualValueFromSource({
      dataSource: def.data_source,
      kpiCode: def.code,
      employeeId: assignment.employee_id,
      periodStart,
      periodEnd,
    });
  }

  const { achievementPercentage, weightedScore } = calculateKpiResult({
    actualValue,
    targetValue: target,
    direction: def.direction,
    weight,
  });

  const [measurement] = await KpiMeasurement.findOrCreate({
    where: { kpi_assignment_id: kpiAssignmentId, period_start: periodStart, period_end: periodEnd },
    defaults: {
      kpi_assignment_id: kpiAssignmentId,
      period_start: periodStart,
      period_end: periodEnd,
      actual_value: actualValue,
      achievement_percentage: achievementPercentage,
      weighted_score: weightedScore,
      source: def.data_source,
      recorded_by: recordedBy || null,
    },
  });

  await measurement.update({
    actual_value: actualValue,
    achievement_percentage: achievementPercentage,
    weighted_score: weightedScore,
  });

  return measurement;
}

/** Manual entry point for MANUAL-source KPIs recorded by a manager/HR user. */
async function recordManualMeasurement({ kpi_assignment_id, period_start, period_end, actual_value, recorded_by }) {
  const assignment = await KpiAssignment.findByPk(kpi_assignment_id, {
    include: [{ model: KpiDefinition, as: 'kpiDefinition' }],
  });
  if (!assignment) throw Object.assign(new Error('KPI assignment not found'), { statusCode: 404 });

  const { target, weight } = resolveTargetAndWeight(assignment);
  const { achievementPercentage, weightedScore } = calculateKpiResult({
    actualValue: actual_value,
    targetValue: target,
    direction: assignment.kpiDefinition.direction,
    weight,
  });

  const [measurement] = await KpiMeasurement.findOrCreate({
    where: { kpi_assignment_id, period_start, period_end },
    defaults: { kpi_assignment_id, period_start, period_end, actual_value, achievement_percentage: achievementPercentage, weighted_score: weightedScore, source: 'MANUAL', recorded_by },
  });

  await measurement.update({ actual_value, achievement_percentage: achievementPercentage, weighted_score: weightedScore, recorded_by });
  return measurement;
}

/** Recomputes every active assignment's measurement for a period - the job that would run on a schedule (e.g. nightly/monthly cron). */
async function recalculateAllForPeriod({ periodStart, periodEnd }) {
  const assignments = await KpiAssignment.findAll({
    where: { is_active: true },
    include: [{ model: KpiDefinition, as: 'kpiDefinition', where: { is_active: true } }],
  });

  const results = [];
  for (const assignment of assignments) {
    if (assignment.kpiDefinition.data_source === KPI_DATA_SOURCE.MANUAL) continue; // manual entries aren't auto-recalculated
    // eslint-disable-next-line no-await-in-loop
    const measurement = await recalculateMeasurement({
      kpiAssignmentId: assignment.id,
      periodStart,
      periodEnd,
    });
    results.push(measurement);
  }
  return results;
}

/** Aggregates an employee's KPI measurements for a period into an overall KPI score (0-100). */
async function getEmployeeKpiScore(employeeId, periodStart, periodEnd) {
  const assignments = await KpiAssignment.findAll({
    where: { employee_id: employeeId, is_active: true },
    include: [
      { model: KpiDefinition, as: 'kpiDefinition', include: [{ model: KpiCategory, as: 'category' }] },
      {
        model: KpiMeasurement,
        as: 'measurements',
        where: { period_start: periodStart, period_end: periodEnd },
        required: false,
      },
    ],
  });

  const results = assignments.map((a) => {
    const measurement = a.measurements?.[0];
    const { weight } = resolveTargetAndWeight(a);
    return {
      kpiDefinitionId: a.kpi_definition_id,
      kpiName: a.kpiDefinition.name,
      category: a.kpiDefinition.category?.name,
      target: resolveTargetAndWeight(a).target,
      actual: measurement ? Number(measurement.actual_value) : 0,
      achievementPercentage: measurement ? Number(measurement.achievement_percentage) : 0,
      weight,
      weightedScore: measurement ? Number(measurement.weighted_score) : 0,
    };
  });

  const aggregate = aggregateKpiScore(results);
  return { details: results, ...aggregate };
}

async function listKpiDefinitions(query) {
  const { page, pageSize, limit, offset } = getPagination(query);
  const where = {};
  if (query.category_id) where.category_id = query.category_id;
  if (query.level) where.level = query.level;
  if (query.is_active !== undefined) where.is_active = query.is_active === 'true';

  const { rows, count } = await KpiDefinition.findAndCountAll({
    where,
    include: [{ model: KpiCategory, as: 'category' }],
    limit,
    offset,
    order: [['id', 'ASC']],
  });

  return { rows, meta: buildPaginationMeta({ total: count, page, pageSize }) };
}

module.exports = {
  resolveTargetAndWeight,
  fetchActualValueFromSource,
  recalculateMeasurement,
  recordManualMeasurement,
  recalculateAllForPeriod,
  getEmployeeKpiScore,
  listKpiDefinitions,
};