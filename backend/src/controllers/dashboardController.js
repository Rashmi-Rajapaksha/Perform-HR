const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const dashboardService = require('../services/dashboardService');

const organization = asyncHandler(async (req, res) => {
  const data = await dashboardService.getOrganizationDashboard();
  return ApiResponse.success(res, { message: 'Organization dashboard retrieved', data });
});

const department = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDepartmentDashboard(req.params.departmentId);
  return ApiResponse.success(res, { message: 'Department dashboard retrieved', data });
});

const employee = asyncHandler(async (req, res) => {
  const employeeId = req.params.employeeId || req.user.employee_id;
  if (!employeeId) return ApiResponse.error(res, { message: 'No employee profile linked to this account', statusCode: 404 });
  const data = await dashboardService.getEmployeeDashboard(employeeId);
  return ApiResponse.success(res, { message: 'Employee dashboard retrieved', data });
});

const alerts = asyncHandler(async (req, res) => {
  const data = await dashboardService.getManagementAlerts();
  return ApiResponse.success(res, { message: 'Management alerts retrieved', data });
});

module.exports = { organization, department, employee, alerts };