const {
  PerformanceEvaluation, PerformanceEvaluationDetail, PerformanceRatingScale,
  EvaluationPeriod, Employee, ImprovementPlan,
} = require('../models');
const { getEmployeeKpiScore } = require('./kpiCalculationService');
const { resolveRating } = require('../utils/kpiCalculator');
const { EVALUATION_STATUS } = require('../constants/statuses');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * Final score weighting between the automated KPI score and the manager's
 * qualitative score. 70/30 is a common HR practice default; kept as a
 * named constant here (rather than buried in the formula) so it's easy to
 * point to and justify in a viva, and easy to change later.
 */
const KPI_WEIGHT_IN_FINAL_SCORE = 0.7;
const MANAGER_WEIGHT_IN_FINAL_SCORE = 0.3;

async function createEvaluation({ employee_id, evaluation_period_id }) {
  const period = await EvaluationPeriod.findByPk(evaluation_period_id);
  if (!period) throw Object.assign(new Error('Evaluation period not found'), { statusCode: 404 });

  const kpiResult = await getEmployeeKpiScore(employee_id, period.start_date, period.end_date);

  const [evaluation] = await PerformanceEvaluation.findOrCreate({
    where: { employee_id, evaluation_period_id },
    defaults: {
      employee_id,
      evaluation_period_id,
      kpi_score: kpiResult.overallKpiScore,
      status: EVALUATION_STATUS.DRAFT,
    },
  });

  await evaluation.update({ kpi_score: kpiResult.overallKpiScore });

  await PerformanceEvaluationDetail.destroy({ where: { performance_evaluation_id: evaluation.id } });
  for (const detail of kpiResult.details) {
    // eslint-disable-next-line no-await-in-loop
    await PerformanceEvaluationDetail.create({
      performance_evaluation_id: evaluation.id,
      kpi_definition_id: detail.kpiDefinitionId,
      target_value: detail.target,
      actual_value: detail.actual,
      achievement_percentage: detail.achievementPercentage,
      weight: detail.weight,
      weighted_score: detail.weightedScore,
    });
  }

  return getEvaluationById(evaluation.id);
}

/**
 * Manager review step: records the qualitative manager_score/comments,
 * computes the final blended score, and resolves the rating label using
 * rating-scale rows from the DB (not hardcoded thresholds).
 */
async function reviewEvaluation(id, { manager_score, manager_comments, strengths, weaknesses, reviewer_id, status }) {
  const evaluation = await PerformanceEvaluation.findByPk(id);
  if (!evaluation) throw Object.assign(new Error('Evaluation not found'), { statusCode: 404 });

  const finalScore =
    manager_score !== undefined && manager_score !== null
      ? Math.round(
          (Number(evaluation.kpi_score) * KPI_WEIGHT_IN_FINAL_SCORE +
            Number(manager_score) * MANAGER_WEIGHT_IN_FINAL_SCORE) *
            100
        ) / 100
      : evaluation.final_score;

  let ratingScaleId = evaluation.rating_scale_id;
  if (finalScore !== null && finalScore !== undefined) {
    const scales = await PerformanceRatingScale.findAll();
    const rating = resolveRating(finalScore, scales.map((s) => s.toJSON()));
    ratingScaleId = rating?.id || null;
  }

  await evaluation.update({
    manager_score: manager_score ?? evaluation.manager_score,
    manager_comments: manager_comments ?? evaluation.manager_comments,
    strengths: strengths ?? evaluation.strengths,
    weaknesses: weaknesses ?? evaluation.weaknesses,
    reviewer_id: reviewer_id ?? evaluation.reviewer_id,
    final_score: finalScore,
    rating_scale_id: ratingScaleId,
    status: status || EVALUATION_STATUS.MANAGER_REVIEWED,
  });

  return getEvaluationById(id);
}

async function addEmployeeComment(id, employee_comments) {
  const evaluation = await PerformanceEvaluation.findByPk(id);
  if (!evaluation) throw Object.assign(new Error('Evaluation not found'), { statusCode: 404 });
  await evaluation.update({ employee_comments });
  return evaluation;
}

async function finalizeEvaluation(id) {
  const evaluation = await PerformanceEvaluation.findByPk(id);
  if (!evaluation) throw Object.assign(new Error('Evaluation not found'), { statusCode: 404 });
  await evaluation.update({ status: EVALUATION_STATUS.FINALIZED });
  return evaluation;
}

async function getEvaluationById(id) {
  const evaluation = await PerformanceEvaluation.findByPk(id, {
    include: [
      { model: Employee, as: 'employee' },
      { model: EvaluationPeriod, as: 'period' },
      { model: PerformanceRatingScale, as: 'rating' },
      { model: PerformanceEvaluationDetail, as: 'details' },
    ],
  });
  if (!evaluation) throw Object.assign(new Error('Evaluation not found'), { statusCode: 404 });
  return evaluation;
}

async function listEvaluations(query) {
  const { page, pageSize, limit, offset } = getPagination(query);
  const where = {};
  if (query.employee_id) where.employee_id = query.employee_id;
  if (query.evaluation_period_id) where.evaluation_period_id = query.evaluation_period_id;
  if (query.status) where.status = query.status;

  const { rows, count } = await PerformanceEvaluation.findAndCountAll({
    where,
    include: [
      { model: Employee, as: 'employee', attributes: ['id', 'employee_code', 'first_name', 'last_name', 'department_id'] },
      { model: EvaluationPeriod, as: 'period' },
      { model: PerformanceRatingScale, as: 'rating' },
    ],
    limit,
    offset,
    order: [['id', 'DESC']],
    distinct: true,
  });

  return { rows, meta: buildPaginationMeta({ total: count, page, pageSize }) };
}

async function createImprovementPlan(payload) {
  return ImprovementPlan.create(payload);
}

async function listImprovementPlans(query) {
  const where = {};
  if (query.employee_id) where.employee_id = query.employee_id;
  if (query.status) where.status = query.status;
  return ImprovementPlan.findAll({
    where,
    include: [{ model: Employee, as: 'employee', attributes: ['id', 'employee_code', 'first_name', 'last_name'] }],
    order: [['id', 'DESC']],
  });
}

module.exports = {
  KPI_WEIGHT_IN_FINAL_SCORE,
  MANAGER_WEIGHT_IN_FINAL_SCORE,
  createEvaluation,
  reviewEvaluation,
  addEmployeeComment,
  finalizeEvaluation,
  getEvaluationById,
  listEvaluations,
  createImprovementPlan,
  listImprovementPlans,
};