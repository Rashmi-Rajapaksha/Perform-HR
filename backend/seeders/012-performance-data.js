const dayjs = require('dayjs');
const { createRng } = require('../src/utils/seedData/seededRandom');
const { calculateKpiResult, aggregateKpiScore, resolveRating } = require('../src/utils/kpiCalculator');

const rng = createRng(5005);

/**
 * Blended final-score weighting. Mirrors performanceService.js's
 * KPI_WEIGHT_IN_FINAL_SCORE / MANAGER_WEIGHT_IN_FINAL_SCORE constants -
 * duplicated here (rather than required) so this seeder stays free of any
 * dependency on the live Sequelize model graph.
 */
const KPI_WEIGHT = 0.7;
const MANAGER_WEIGHT = 0.3;

function manualPerformanceProfileFor() {
  const roll = rng.next();
  if (roll < 0.15) return { tier: 'LOW', factor: rng.float(0.40, 0.62) };
  if (roll < 0.80) return { tier: 'MID', factor: rng.float(0.68, 0.85) };
  return { tier: 'HIGH', factor: rng.float(0.98, 1.15) };
}

const STRENGTHS_POOL = [
  'Consistently meets production targets', 'Strong attention to detail', 'Reliable and punctual',
  'Good team collaboration', 'Proactive problem solver', 'High-quality output', 'Dependable under pressure',
];
const WEAKNESSES_POOL = [
  'Occasional lateness', 'Needs improvement in documentation', 'Could improve communication with team leads',
  'Struggles with tight deadlines occasionally', 'Requires closer supervision on complex tasks', 'None significant this period',
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const [periods] = await queryInterface.sequelize.query('SELECT id, name, start_date, end_date FROM evaluation_periods ORDER BY start_date ASC');
    const [ratingScales] = await queryInterface.sequelize.query('SELECT id, min_score, max_score, rating_label FROM performance_rating_scales');

    const [assignments] = await queryInterface.sequelize.query(`
      SELECT ka.id AS assignment_id, ka.employee_id, ka.target_value AS override_target, ka.weight AS override_weight,
             ka.effective_from, ka.effective_to,
             kd.id AS kpi_definition_id, kd.code, kd.direction, kd.target_value AS default_target, kd.data_source
      FROM kpi_assignments ka
      JOIN kpi_definitions kd ON kd.id = ka.kpi_definition_id
      WHERE ka.is_active = 1
    `);

    const [attendanceAgg] = await queryInterface.sequelize.query(`
      SELECT employee_id, DATE_FORMAT(date, '%Y-%m') AS ym,
        COUNT(*) AS total_days,
        SUM(CASE WHEN status IN ('PRESENT','HALF_DAY') THEN 1 ELSE 0 END) AS present_days,
        SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_days,
        SUM(CASE WHEN status IN ('HOLIDAY','OFF_DAY') THEN 1 ELSE 0 END) AS non_workable_days,
        SUM(CASE WHEN status = 'PRESENT' AND late_minutes = 0 THEN 1 ELSE 0 END) AS on_time_days
      FROM attendance_records GROUP BY employee_id, ym
    `);
    const attKey = (empId, ym) => `${empId}:${ym}`;
    const attMap = Object.fromEntries(attendanceAgg.map((r) => [attKey(r.employee_id, r.ym), r]));

    const [productionAgg] = await queryInterface.sequelize.query(`
      SELECT employee_id, DATE_FORMAT(date, '%Y-%m') AS ym,
        SUM(target_units) AS target, SUM(produced_units) AS produced,
        SUM(defective_units) AS defective, SUM(safety_incidents) AS safety
      FROM production_records GROUP BY employee_id, ym
    `);
    const prodMap = Object.fromEntries(productionAgg.map((r) => [attKey(r.employee_id, r.ym), r]));

    const [employees] = await queryInterface.sequelize.query(`
      SELECT e.id, e.reporting_manager_id, e.join_date FROM employees e
      WHERE e.employment_status IN ('ACTIVE', 'ON_LEAVE', 'SUSPENDED')
    `);
    const [users] = await queryInterface.sequelize.query('SELECT id, employee_id FROM users WHERE employee_id IS NOT NULL');
    const userIdByEmployee = Object.fromEntries(users.map((u) => [u.employee_id, u.id]));
    const [hrManagerUser] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'hr.manager' LIMIT 1");
    const fallbackReviewerId = hrManagerUser[0]?.id || null;

    // Deterministic per-employee manual-KPI performance profile, reused across all 12 periods for internal consistency.
    const manualProfileByEmployee = {};
    employees.forEach((e) => { manualProfileByEmployee[e.id] = manualPerformanceProfileFor(); });

    const measurementRows = [];
    const evaluationInputs = []; // { employee_id, period, details: [...] } built up per period below

    periods.forEach((period) => {
      const ym = dayjs(period.start_date).format('YYYY-MM');
      const isCurrentPeriod = period === periods[periods.length - 1];

      // Group this period's assignments by employee
      const byEmployee = {};
      assignments.forEach((a) => {
        if (dayjs(a.effective_from).isAfter(period.end_date)) return;
        if (a.effective_to && dayjs(a.effective_to).isBefore(period.start_date)) return;
        byEmployee[a.employee_id] = byEmployee[a.employee_id] || [];
        byEmployee[a.employee_id].push(a);
      });

      Object.entries(byEmployee).forEach(([employeeIdStr, empAssignments]) => {
        const employeeId = Number(employeeIdStr);
        const profile = manualProfileByEmployee[employeeId] || { factor: 1 };
        const details = [];

        empAssignments.forEach((a) => {
          const target = a.override_target !== null ? Number(a.override_target) : Number(a.default_target);
          const weight = a.override_weight !== null ? Number(a.override_weight) : 0;

          let actual = 0;
          const att = attMap[attKey(employeeId, ym)];
          const prod = prodMap[attKey(employeeId, ym)];

          if (a.data_source === 'ATTENDANCE') {
            const workable = att ? att.total_days - att.non_workable_days : 0;
            if (a.code === 'ATTENDANCE_RATE') actual = workable > 0 ? (att.present_days / workable) * 100 : 0;
            else if (a.code === 'PUNCTUALITY') actual = att && att.present_days > 0 ? (att.on_time_days / att.present_days) * 100 : 0;
            else actual = 0;
          } else if (a.data_source === 'PRODUCTION') {
            if (!prod || Number(prod.produced) === 0) {
              actual = a.code === 'SAFETY_INCIDENTS' ? 0 : 0;
            } else if (a.code === 'PRODUCTION_TARGET_ACHIEVEMENT') actual = (prod.produced / (prod.target || 1)) * 100;
            else if (a.code === 'QUALITY_RATE') actual = ((prod.produced - prod.defective) / prod.produced) * 100;
            else if (a.code === 'DEFECT_RATE') actual = (prod.defective / prod.produced) * 100;
            else if (a.code === 'SAFETY_INCIDENTS') actual = Number(prod.safety) || 0;
          } else {
            // MANUAL: TASK_COMPLETION_RATE, COST_EFFICIENCY, MANAGEMENT_EFFECTIVENESS
            const noise = rng.float(0.92, 1.08);
            actual = Math.max(0, Math.min(100, target * profile.factor * noise));
          }

          const { achievementPercentage, weightedScore } = calculateKpiResult({
            actualValue: actual, targetValue: target, direction: a.direction, weight,
          });

          measurementRows.push({
            kpi_assignment_id: a.assignment_id,
            period_start: period.start_date,
            period_end: period.end_date,
            actual_value: Math.round(actual * 100) / 100,
            achievement_percentage: achievementPercentage,
            weighted_score: weightedScore,
            source: a.data_source,
            recorded_by: fallbackReviewerId,
            recorded_at: now,
            created_at: now,
            updated_at: now,
          });

          details.push({
            kpi_definition_id: a.kpi_definition_id,
            target_value: target,
            actual_value: Math.round(actual * 100) / 100,
            achievement_percentage: achievementPercentage,
            weight,
            weighted_score: weightedScore,
          });
        });

        const { overallKpiScore } = aggregateKpiScore(details.map((d) => ({ weight: d.weight, weightedScore: d.weighted_score })));

        evaluationInputs.push({
          employee_id: employeeId,
          period_id: period.id,
          period_end: period.end_date,
          isCurrentPeriod,
          kpi_score: overallKpiScore,
          details,
        });
      });
    });

    // ----- Bulk insert KPI measurements -----
    const MEAS_CHUNK = 2000;
    for (let i = 0; i < measurementRows.length; i += MEAS_CHUNK) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.bulkInsert('kpi_measurements', measurementRows.slice(i, i + MEAS_CHUNK));
    }

    // ----- Build performance_evaluations -----
    const evaluationRows = evaluationInputs.map((input) => {
      const managerNoise = rng.float(-8, 6);
      const managerScore = Math.max(0, Math.min(100, Math.round((input.kpi_score + managerNoise) * 100) / 100));
      const finalScore = Math.round((input.kpi_score * KPI_WEIGHT + managerScore * MANAGER_WEIGHT) * 100) / 100;
      const rating = resolveRating(finalScore, ratingScales.map((r) => ({ ...r, min_score: Number(r.min_score), max_score: Number(r.max_score) })));

      const employee = employees.find((e) => e.id === input.employee_id);
      const reviewerId = (employee && userIdByEmployee[employee.reporting_manager_id]) || fallbackReviewerId;

      let status = 'FINALIZED';
      if (input.isCurrentPeriod) {
        status = rng.weightedChoice([
          { value: 'DRAFT', weight: 20 },
          { value: 'SUBMITTED', weight: 30 },
          { value: 'MANAGER_REVIEWED', weight: 50 },
        ]);
      }

      return {
        __employee_id: input.employee_id,
        __period_id: input.period_id,
        __details: input.details,
        __period_end: input.period_end,
        __finalScore: finalScore,
        row: {
          employee_id: input.employee_id,
          evaluation_period_id: input.period_id,
          kpi_score: input.kpi_score,
          manager_score: status === 'DRAFT' ? null : managerScore,
          final_score: status === 'DRAFT' ? null : finalScore,
          rating_scale_id: status === 'DRAFT' ? null : rating?.id || null,
          strengths: status === 'DRAFT' ? null : rng.choice(STRENGTHS_POOL),
          weaknesses: status === 'DRAFT' ? null : rng.choice(WEAKNESSES_POOL),
          manager_comments: status === 'DRAFT' ? null : 'Reviewed against monthly KPI targets and attendance record.',
          employee_comments: null,
          reviewer_id: status === 'DRAFT' ? null : reviewerId,
          status,
          created_at: now,
          updated_at: now,
        },
      };
    });

    const EVAL_CHUNK = 500;
    for (let i = 0; i < evaluationRows.length; i += EVAL_CHUNK) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.bulkInsert('performance_evaluations', evaluationRows.slice(i, i + EVAL_CHUNK).map((e) => e.row));
    }

    // ----- Map back to real ids for evaluation details + improvement plans -----
    const [insertedEvals] = await queryInterface.sequelize.query('SELECT id, employee_id, evaluation_period_id, final_score, status FROM performance_evaluations');
    const evalIdByKey = Object.fromEntries(insertedEvals.map((e) => [`${e.employee_id}:${e.evaluation_period_id}`, e]));

    const detailRows = [];
    evaluationRows.forEach((e) => {
      const evalRecord = evalIdByKey[`${e.__employee_id}:${e.__period_id}`];
      if (!evalRecord) return;
      e.__details.forEach((d) => {
        detailRows.push({
          performance_evaluation_id: evalRecord.id,
          kpi_definition_id: d.kpi_definition_id,
          target_value: d.target_value,
          actual_value: d.actual_value,
          achievement_percentage: d.achievement_percentage,
          weight: d.weight,
          weighted_score: d.weighted_score,
          created_at: now,
          updated_at: now,
        });
      });
    });

    const DETAIL_CHUNK = 2000;
    for (let i = 0; i < detailRows.length; i += DETAIL_CHUNK) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.bulkInsert('performance_evaluation_details', detailRows.slice(i, i + DETAIL_CHUNK));
    }

    // ----- Improvement plans for FINALIZED evaluations scoring below 60 ("Needs Improvement") -----
    const improvementRows = [];
    Object.values(evalIdByKey).forEach((evalRecord) => {
      if (evalRecord.status === 'FINALIZED' && evalRecord.final_score !== null && Number(evalRecord.final_score) < 60) {
        const targetDate = dayjs().add(rng.int(20, 45), 'day').format('YYYY-MM-DD');
        improvementRows.push({
          employee_id: evalRecord.employee_id,
          performance_evaluation_id: evalRecord.id,
          created_by: fallbackReviewerId,
          description: 'Performance improvement plan: focus on KPI targets, attendance consistency, and quality output. Weekly check-ins scheduled with direct supervisor.',
          target_date: targetDate,
          status: rng.weightedChoice([{ value: 'OPEN', weight: 60 }, { value: 'IN_PROGRESS', weight: 40 }]),
          review_notes: null,
          created_at: now,
          updated_at: now,
        });
      }
    });

    if (improvementRows.length) await queryInterface.bulkInsert('improvement_plans', improvementRows);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('improvement_plans', null, {});
    await queryInterface.bulkDelete('performance_evaluation_details', null, {});
    await queryInterface.bulkDelete('performance_evaluations', null, {});
    await queryInterface.bulkDelete('kpi_measurements', null, {});
  },
};
