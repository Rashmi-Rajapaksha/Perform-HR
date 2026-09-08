const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const performanceService = require('../services/performanceService');
const { EvaluationPeriod, PerformanceRatingScale } = require('../models');

// ----- Evaluation periods -----
const listPeriods = asyncHandler(async (req, res) => {
  const periods = await EvaluationPeriod.findAll({ order: [['start_date', 'DESC']] });
  return ApiResponse.success(res, { message: 'Evaluation periods retrieved', data: periods });
});

const createPeriod = asyncHandler(async (req, res) => {
  const period = await EvaluationPeriod.create(req.body);
  return ApiResponse.created(res, { message: 'Evaluation period created', data: period });
});

// ----- Rating scales -----
const listRatingScales = asyncHandler(async (req, res) => {
  const scales = await PerformanceRatingScale.findAll({ order: [['min_score', 'DESC']] });
  return ApiResponse.success(res, { message: 'Rating scales retrieved', data: scales });
});

const createRatingScale = asyncHandler(async (req, res) => {
  const scale = await PerformanceRatingScale.create(req.body);
  return ApiResponse.created(res, { message: 'Rating scale created', data: scale });
});

// ----- Evaluations -----
const generate = asyncHandler(async (req, res) => {
  const evaluation = await performanceService.createEvaluation(req.body);
  return ApiResponse.success(res, { message: 'Evaluation generated from KPI data', data: evaluation });
});

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await performanceService.listEvaluations(req.query);
  return ApiResponse.success(res, { message: 'Evaluations retrieved', data: rows, meta });
});

const getById = asyncHandler(async (req, res) => {
  const evaluation = await performanceService.getEvaluationById(req.params.id);
  return ApiResponse.success(res, { message: 'Evaluation retrieved', data: evaluation });
});

const review = asyncHandler(async (req, res) => {
  const evaluation = await performanceService.reviewEvaluation(req.params.id, { ...req.body, reviewer_id: req.userId });
  return ApiResponse.success(res, { message: 'Evaluation reviewed', data: evaluation });
});

const employeeComment = asyncHandler(async (req, res) => {
  const evaluation = await performanceService.addEmployeeComment(req.params.id, req.body.employee_comments);
  return ApiResponse.success(res, { message: 'Comment added', data: evaluation });
});

const finalize = asyncHandler(async (req, res) => {
  const evaluation = await performanceService.finalizeEvaluation(req.params.id);
  return ApiResponse.success(res, { message: 'Evaluation finalized', data: evaluation });
});

// ----- Improvement plans -----
const createImprovementPlan = asyncHandler(async (req, res) => {
  const plan = await performanceService.createImprovementPlan({ ...req.body, created_by: req.userId });
  return ApiResponse.created(res, { message: 'Improvement plan created', data: plan });
});

const listImprovementPlans = asyncHandler(async (req, res) => {
  const plans = await performanceService.listImprovementPlans(req.query);
  return ApiResponse.success(res, { message: 'Improvement plans retrieved', data: plans });
});

module.exports = {
  listPeriods, createPeriod,
  listRatingScales, createRatingScale,
  generate, list, getById, review, employeeComment, finalize,
  createImprovementPlan, listImprovementPlans,
};