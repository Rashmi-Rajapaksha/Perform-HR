const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const reportService = require('../services/reportService');

/** Wraps a report-producing async function so the same handler can return either JSON or CSV based on ?format=csv. */
function reportHandler(reportFn, filename) {
  return asyncHandler(async (req, res) => {
    const rows = await reportFn(req.query);
    if (req.query.format === 'csv') {
      const csv = reportService.toCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.status(200).send(csv);
    }
    return ApiResponse.success(res, { message: `${filename} report generated`, data: rows });
  });
}

module.exports = {
  employeeMaster: reportHandler((q) => reportService.employeeMasterReport(q), 'employee-master'),
  departmentEmployee: reportHandler(() => reportService.departmentEmployeeReport(), 'department-employee'),
  dailyAttendance: reportHandler((q) => reportService.dailyAttendanceReport(q.date), 'daily-attendance'),
  monthlyAttendance: reportHandler((q) => reportService.monthlyAttendanceReport(q.month), 'monthly-attendance'),
  lateAttendance: reportHandler((q) => reportService.lateAttendanceReport(q), 'late-attendance'),
  absenteeism: reportHandler((q) => reportService.absenteeismReport(q), 'absenteeism'),
  overtime: reportHandler((q) => reportService.overtimeReport(q), 'overtime'),
  payrollSummary: reportHandler((q) => reportService.payrollSummaryReport(q.payroll_period_id), 'payroll-summary'),
  departmentPayroll: reportHandler((q) => reportService.departmentPayrollReport(q.payroll_period_id), 'department-payroll'),
  overtimeCost: reportHandler((q) => reportService.overtimeCostReport(q.payroll_period_id), 'overtime-cost'),
  employeeKpi: reportHandler((q) => reportService.employeeKpiReport(q.employee_id, q.period_start, q.period_end), 'employee-kpi'),
  performanceRanking: reportHandler((q) => reportService.performanceRankingReport(q.evaluation_period_id), 'performance-ranking'),
  highLowPerformers: reportHandler((q) => reportService.highLowPerformersReport(q.evaluation_period_id, Number(q.limit) || 10), 'high-low-performers'),
};