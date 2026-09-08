const { Op, fn, col } = require('sequelize');
const dayjs = require('dayjs');
const {
  Employee, Department, Designation, AttendanceRecord, Payroll, PayrollPeriod,
  PerformanceEvaluation, EvaluationPeriod, KpiAssignment,
} = require('../models');
const { getAttendanceSummary } = require('./attendanceService');
const { getEmployeeKpiScore } = require('./kpiCalculationService');

/** Converts an array of flat objects into CSV text (no external dependency). */
function toCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(',')];
  rows.forEach((row) => lines.push(headers.map((h) => escape(row[h])).join(',')));
  return lines.join('\n');
}

// ---------- Employee reports ----------

async function employeeMasterReport(filters = {}) {
  const where = {};
  if (filters.department_id) where.department_id = filters.department_id;
  if (filters.designation_id) where.designation_id = filters.designation_id;

  const employees = await Employee.findAll({
    where,
    include: [{ model: Department, as: 'department' }, { model: Designation, as: 'designation' }],
    order: [['employee_code', 'ASC']],
  });

  return employees.map((e) => ({
    employee_code: e.employee_code,
    name: e.getFullName(),
    department: e.department?.name,
    designation: e.designation?.name,
    employment_status: e.employment_status,
    join_date: e.join_date,
    basic_salary: e.basic_salary,
  }));
}

async function departmentEmployeeReport() {
  const departments = await Department.findAll({ include: [{ model: Employee, as: 'employees' }] });
  return departments.map((d) => ({
    department: d.name,
    employee_count: d.employees.length,
  }));
}

// ---------- Attendance reports ----------

async function dailyAttendanceReport(date) {
  const records = await AttendanceRecord.findAll({
    where: { date },
    include: [{ model: Employee, as: 'employee', attributes: ['employee_code', 'first_name', 'last_name'] }],
  });
  return records.map((r) => ({
    date: r.date,
    employee_code: r.employee.employee_code,
    name: r.employee.getFullName(),
    status: r.status,
    late_minutes: r.late_minutes,
    overtime_minutes: r.overtime_minutes,
  }));
}

async function monthlyAttendanceReport(month) {
  const { start, end } = require('../utils/dateHelper').getMonthRange(month);
  const employees = await Employee.findAll({ where: { employment_status: 'ACTIVE' } });
  const rows = [];
  for (const emp of employees) {
    // eslint-disable-next-line no-await-in-loop
    const summary = await getAttendanceSummary(emp.id, start, end);
    rows.push({
      employee_code: emp.employee_code,
      name: emp.getFullName(),
      present_days: summary.presentDays,
      absent_days: summary.absentDays,
      leave_days: summary.leaveDays,
      attendance_rate: summary.attendanceRate,
      total_overtime_minutes: summary.totalOvertimeMinutes,
    });
  }
  return rows;
}

async function lateAttendanceReport(filters = {}) {
  const where = { late_minutes: { [Op.gt]: 0 } };
  if (filters.from && filters.to) where.date = { [Op.between]: [filters.from, filters.to] };

  const records = await AttendanceRecord.findAll({
    where,
    include: [{ model: Employee, as: 'employee', attributes: ['employee_code', 'first_name', 'last_name'] }],
    order: [['late_minutes', 'DESC']],
  });
  return records.map((r) => ({
    date: r.date,
    employee_code: r.employee.employee_code,
    name: r.employee.getFullName(),
    late_minutes: r.late_minutes,
  }));
}

async function absenteeismReport(filters = {}) {
  const where = { status: 'ABSENT' };
  if (filters.from && filters.to) where.date = { [Op.between]: [filters.from, filters.to] };

  const rows = await AttendanceRecord.findAll({
    where,
    attributes: ['employee_id', [fn('COUNT', col('id')), 'absentDays']],
    include: [{ model: Employee, as: 'employee', attributes: ['employee_code', 'first_name', 'last_name'] }],
    group: ['employee_id', 'employee.id'],
    order: [[fn('COUNT', col('AttendanceRecord.id')), 'DESC']],
  });

  return rows.map((r) => ({
    employee_code: r.employee.employee_code,
    name: r.employee.getFullName(),
    absent_days: Number(r.get('absentDays')),
  }));
}

async function overtimeReport(filters = {}) {
  const where = { overtime_minutes: { [Op.gt]: 0 } };
  if (filters.from && filters.to) where.date = { [Op.between]: [filters.from, filters.to] };

  const rows = await AttendanceRecord.findAll({
    where,
    attributes: ['employee_id', [fn('SUM', col('overtime_minutes')), 'totalOvertimeMinutes']],
    include: [{ model: Employee, as: 'employee', attributes: ['employee_code', 'first_name', 'last_name'] }],
    group: ['employee_id', 'employee.id'],
    order: [[fn('SUM', col('AttendanceRecord.overtime_minutes')), 'DESC']],
  });

  return rows.map((r) => ({
    employee_code: r.employee.employee_code,
    name: r.employee.getFullName(),
    total_overtime_minutes: Number(r.get('totalOvertimeMinutes')),
  }));
}

// ---------- Payroll reports ----------

async function payrollSummaryReport(payrollPeriodId) {
  const payrolls = await Payroll.findAll({
    where: { payroll_period_id: payrollPeriodId },
    include: [{ model: Employee, as: 'employee', attributes: ['employee_code', 'first_name', 'last_name', 'department_id'] }],
  });
  return payrolls.map((p) => ({
    employee_code: p.employee.employee_code,
    name: p.employee.getFullName(),
    gross_earnings: p.gross_earnings,
    total_deductions: p.total_deductions,
    net_salary: p.net_salary,
    status: p.status,
  }));
}

async function departmentPayrollReport(payrollPeriodId) {
  const payrolls = await Payroll.findAll({
    where: { payroll_period_id: payrollPeriodId },
    include: [{ model: Employee, as: 'employee', include: [{ model: Department, as: 'department' }] }],
  });
  const grouped = {};
  payrolls.forEach((p) => {
    const deptName = p.employee.department?.name || 'Unassigned';
    grouped[deptName] = grouped[deptName] || { department: deptName, total_net_salary: 0, employee_count: 0 };
    grouped[deptName].total_net_salary += Number(p.net_salary);
    grouped[deptName].employee_count += 1;
  });
  return Object.values(grouped);
}

async function overtimeCostReport(payrollPeriodId) {
  const { PayrollItem } = require('../models');
  const items = await PayrollItem.findAll({
    where: { component_name: 'Overtime Pay' },
    include: [{ model: Payroll, as: 'payroll', where: { payroll_period_id: payrollPeriodId }, include: [{ model: Employee, as: 'employee' }] }],
  });
  return items.map((i) => ({
    employee_code: i.payroll.employee.employee_code,
    name: i.payroll.employee.getFullName(),
    overtime_pay: i.amount,
  }));
}

// ---------- Performance reports ----------

async function employeeKpiReport(employeeId, periodStart, periodEnd) {
  const result = await getEmployeeKpiScore(employeeId, periodStart, periodEnd);
  return result.details;
}

async function performanceRankingReport(evaluationPeriodId) {
  const evaluations = await PerformanceEvaluation.findAll({
    where: { evaluation_period_id: evaluationPeriodId },
    include: [{ model: Employee, as: 'employee', attributes: ['employee_code', 'first_name', 'last_name'] }],
    order: [['final_score', 'DESC']],
  });
  return evaluations.map((e, idx) => ({
    rank: idx + 1,
    employee_code: e.employee.employee_code,
    name: e.employee.getFullName(),
    final_score: e.final_score,
  }));
}

async function highLowPerformersReport(evaluationPeriodId, limit = 10) {
  const ranking = await performanceRankingReport(evaluationPeriodId);
  return {
    highPerformers: ranking.slice(0, limit),
    lowPerformers: ranking.slice(-limit).reverse(),
  };
}

module.exports = {
  toCsv,
  employeeMasterReport,
  departmentEmployeeReport,
  dailyAttendanceReport,
  monthlyAttendanceReport,
  lateAttendanceReport,
  absenteeismReport,
  overtimeReport,
  payrollSummaryReport,
  departmentPayrollReport,
  overtimeCostReport,
  employeeKpiReport,
  performanceRankingReport,
  highLowPerformersReport,
};