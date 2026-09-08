const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const kpiService = require('../services/kpiCalculationService');
const { KpiCategory, KpiDefinition, KpiAssignment, KpiMeasurement, Employee } = require('../models');

// ----- Categories -----
const listCategories = asyncHandler(async (req, res) => {
  const categories = await KpiCategory.findAll();
  return ApiResponse.success(res, { message: 'KPI categories retrieved', data: categories });
});

// ----- Definitions -----
const listDefinitions = asyncHandler(async (req, res) => {
  const { rows, meta } = await kpiService.listKpiDefinitions(req.query);
  return ApiResponse.success(res, { message: 'KPI definitions retrieved', data: rows, meta });
});

const createDefinition = asyncHandler(async (req, res) => {
  const definition = await KpiDefinition.create(req.body);
  return ApiResponse.created(res, { message: 'KPI definition created', data: definition });
});

const updateDefinition = asyncHandler(async (req, res) => {
  const definition = await KpiDefinition.findByPk(req.params.id);
  if (!definition) return ApiResponse.error(res, { message: 'KPI definition not found', statusCode: 404 });
  await definition.update(req.body);
  return ApiResponse.success(res, { message: 'KPI definition updated', data: definition });
});

const deactivateDefinition = asyncHandler(async (req, res) => {
  const definition = await KpiDefinition.findByPk(req.params.id);
  if (!definition) return ApiResponse.error(res, { message: 'KPI definition not found', statusCode: 404 });
  await definition.update({ is_active: false });
  return ApiResponse.success(res, { message: 'KPI definition deactivated', data: definition });
});

// ----- Assignments -----
const assign = asyncHandler(async (req, res) => {
  const assignment = await KpiAssignment.create(req.body);
  return ApiResponse.created(res, { message: 'KPI assigned to employee', data: assignment });
});

const listAssignments = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.employee_id) where.employee_id = req.query.employee_id;
  if (req.query.kpi_definition_id) where.kpi_definition_id = req.query.kpi_definition_id;
  const assignments = await KpiAssignment.findAll({
    where,
    include: [
      { model: KpiDefinition, as: 'kpiDefinition', include: [{ model: KpiCategory, as: 'category' }] },
      { model: Employee, as: 'employee', attributes: ['id', 'employee_code', 'first_name', 'last_name'] },
    ],
    order: [['id', 'DESC']],
  });
  return ApiResponse.success(res, { message: 'KPI assignments retrieved', data: assignments });
});

// ----- Measurements -----
const recordMeasurement = asyncHandler(async (req, res) => {
  const measurement = await kpiService.recordManualMeasurement({ ...req.body, recorded_by: req.userId });
  return ApiResponse.success(res, { message: 'KPI measurement recorded', data: measurement });
});

const recalculate = asyncHandler(async (req, res) => {
  const { kpi_assignment_id, period_start, period_end } = req.body;
  const measurement = await kpiService.recalculateMeasurement({
    kpiAssignmentId: kpi_assignment_id,
    periodStart: period_start,
    periodEnd: period_end,
    recordedBy: req.userId,
  });
  return ApiResponse.success(res, { message: 'KPI measurement recalculated', data: measurement });
});

const recalculateAll = asyncHandler(async (req, res) => {
  const { period_start, period_end } = req.body;
  const results = await kpiService.recalculateAllForPeriod({ periodStart: period_start, periodEnd: period_end });
  return ApiResponse.success(res, { message: `Recalculated ${results.length} KPI measurement(s)`, data: results });
});

const listMeasurements = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.kpi_assignment_id) where.kpi_assignment_id = req.query.kpi_assignment_id;
  const measurements = await KpiMeasurement.findAll({ where, order: [['period_start', 'DESC']] });
  return ApiResponse.success(res, { message: 'KPI measurements retrieved', data: measurements });
});

const employeeScore = asyncHandler(async (req, res) => {
  const { employee_id, period_start, period_end } = req.query;
  const result = await kpiService.getEmployeeKpiScore(employee_id, period_start, period_end);
  return ApiResponse.success(res, { message: 'Employee KPI score retrieved', data: result });
});

module.exports = {
  listCategories,
  listDefinitions, createDefinition, updateDefinition, deactivateDefinition,
  assign, listAssignments,
  recordMeasurement, recalculate, recalculateAll, listMeasurements, employeeScore,
};