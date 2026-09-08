const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const payrollService = require('../services/payrollService');
const { PayrollPeriod, SalaryComponent, EmployeeSalaryComponent } = require('../models');

const listPeriods = asyncHandler(async (req, res) => {
  const periods = await PayrollPeriod.findAll({ order: [['start_date', 'DESC']] });
  return ApiResponse.success(res, { message: 'Payroll periods retrieved', data: periods });
});

const createPeriod = asyncHandler(async (req, res) => {
  const period = await PayrollPeriod.create(req.body);
  return ApiResponse.created(res, { message: 'Payroll period created', data: period });
});

const process = asyncHandler(async (req, res) => {
  const payrolls = await payrollService.processPayroll(req.body);
  return ApiResponse.success(res, { message: `Payroll processed for ${payrolls.length} employee(s)`, data: payrolls });
});

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await payrollService.listPayrolls(req.query);
  return ApiResponse.success(res, { message: 'Payrolls retrieved', data: rows, meta });
});

const getById = asyncHandler(async (req, res) => {
  const payroll = await payrollService.getPayrollDetail(req.params.id);
  return ApiResponse.success(res, { message: 'Payroll retrieved', data: payroll });
});

const review = asyncHandler(async (req, res) => {
  const payroll = await payrollService.reviewPayroll(req.params.id);
  return ApiResponse.success(res, { message: 'Payroll marked as reviewed', data: payroll });
});

const approve = asyncHandler(async (req, res) => {
  const payroll = await payrollService.approvePayroll(req.params.id, req.userId);
  return ApiResponse.success(res, { message: 'Payroll approved', data: payroll });
});

const markPaid = asyncHandler(async (req, res) => {
  const payroll = await payrollService.markPaid(req.params.id);
  return ApiResponse.success(res, { message: 'Payroll marked as paid', data: payroll });
});

const cancel = asyncHandler(async (req, res) => {
  const payroll = await payrollService.cancelPayroll(req.params.id);
  return ApiResponse.success(res, { message: 'Payroll cancelled', data: payroll });
});

const myPayslips = asyncHandler(async (req, res) => {
  const { rows } = await payrollService.listPayrolls({ employee_id: req.user.employee_id, pageSize: 24 });
  return ApiResponse.success(res, { message: 'Your payslips', data: rows });
});

// ----- Salary components -----

const listSalaryComponents = asyncHandler(async (req, res) => {
  const components = await SalaryComponent.findAll({ where: { is_active: true } });
  return ApiResponse.success(res, { message: 'Salary components retrieved', data: components });
});

const createSalaryComponent = asyncHandler(async (req, res) => {
  const component = await SalaryComponent.create(req.body);
  return ApiResponse.created(res, { message: 'Salary component created', data: component });
});

const assignSalaryComponent = asyncHandler(async (req, res) => {
  const record = await EmployeeSalaryComponent.create(req.body);
  return ApiResponse.created(res, { message: 'Salary component assigned to employee', data: record });
});

module.exports = {
  listPeriods, createPeriod, process, list, getById, review, approve, markPaid, cancel, myPayslips,
  listSalaryComponents, createSalaryComponent, assignSalaryComponent,
};