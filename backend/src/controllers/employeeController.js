const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const employeeService = require('../services/employeeService');

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await employeeService.listEmployees(req.query);
  return ApiResponse.success(res, { message: 'Employees retrieved', data: rows, meta });
});

const getById = asyncHandler(async (req, res) => {
  const employee = await employeeService.getEmployeeById(req.params.id);
  return ApiResponse.success(res, { message: 'Employee retrieved', data: employee });
});

const create = asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.body);
  return ApiResponse.created(res, { message: 'Employee created', data: employee });
});

const update = asyncHandler(async (req, res) => {
  const employee = await employeeService.updateEmployee(req.params.id, req.body);
  return ApiResponse.success(res, { message: 'Employee updated', data: employee });
});

const deactivate = asyncHandler(async (req, res) => {
  const employee = await employeeService.deactivateEmployee(req.params.id, req.body);
  return ApiResponse.success(res, { message: 'Employee deactivated', data: employee });
});

const directReports = asyncHandler(async (req, res) => {
  const reports = await employeeService.getDirectReports(req.params.id);
  return ApiResponse.success(res, { message: 'Direct reports retrieved', data: reports });
});

const me = asyncHandler(async (req, res) => {
  if (!req.user.employee_id) {
    return ApiResponse.error(res, { message: 'No employee profile linked to this account', statusCode: 404 });
  }
  const employee = await employeeService.getEmployeeById(req.user.employee_id);
  return ApiResponse.success(res, { message: 'Your employee profile', data: employee });
});

module.exports = { list, getById, create, update, deactivate, directReports, me };