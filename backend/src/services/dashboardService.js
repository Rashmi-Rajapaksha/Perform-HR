const dayjs = require('dayjs');
const { Op, fn, col, literal } = require('sequelize');
const {
  Employee, Department, AttendanceRecord, Payroll, PayrollPeriod,
  KpiAssignment, KpiMeasurement, KpiDefinition, PerformanceEvaluation,
  EvaluationPeriod, ProductionRecord,
} = require('../models');
const { ATTENDANCE_STATUS } = require('../constants/statuses');
const { getAttendanceSummary } = require('./attendanceService');
const { getEmployeeKpiScore } = require('./kpiCalculationService');

/**
 * Alert thresholds. Centralized here so the "Management Alerts" rules are
 * transparent and easy to tune without hunting through the aggregation
 * logic below.
 */
const ALERT_THRESHOLDS = {
  LOW_KPI_SCORE: 60,
  LOW_DEPARTMENT_KPI: 65,
  HIGH_ABSENTEEISM_RATE: 10, // percent
  HIGH_OVERTIME_MINUTES_MONTHLY: 1500,
  HIGH_DEFECT_RATE: 5, // percent
};

/** Organization-wide dashboard: headline counts + trends + alerts. */
async function getOrganizationDashboard() {
  const today = dayjs().format('YYYY-MM-DD');
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');

  const totalEmployees = await Employee.count({ where: { employment_status: 'ACTIVE' } });

  const todaysAttendance = await AttendanceRecord.findAll({ where: { date: today } });
  const presentToday = todaysAttendance.filter((a) =>
    [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.HALF_DAY].includes(a.status)
  ).length;
  const absentToday = todaysAttendance.filter((a) => a.status === ATTENDANCE_STATUS.ABSENT).length;
  const attendancePercentage = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 10000) / 100 : 0;

  const latestPeriod = await PayrollPeriod.findOne({ order: [['start_date', 'DESC']] });
  let payrollCost = 0;
  if (latestPeriod) {
    const sumResult = await Payroll.sum('net_salary', { where: { payroll_period_id: latestPeriod.id } });
    payrollCost = sumResult || 0;
  }

  const activeAssignments = await KpiAssignment.findAll({ where: { is_active: true }, attributes: ['employee_id'] });
  const employeeIds = [...new Set(activeAssignments.map((a) => a.employee_id))];

  const scores = [];
  for (const empId of employeeIds) {
    // eslint-disable-next-line no-await-in-loop
    const result = await getEmployeeKpiScore(empId, monthStart, today);
    scores.push({ employeeId: empId, score: result.overallKpiScore });
  }

  const averageKpiScore = scores.length
    ? Math.round((scores.reduce((s, r) => s + r.score, 0) / scores.length) * 100) / 100
    : 0;

  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const topPerformerIds = sortedScores.slice(0, 5).map((s) => s.employeeId);
  const lowPerformerIds = sortedScores.slice(-5).reverse().map((s) => s.employeeId);

  const topPerformers = await Employee.findAll({
    where: { id: { [Op.in]: topPerformerIds.length ? topPerformerIds : [0] } },
    attributes: ['id', 'employee_code', 'first_name', 'last_name', 'department_id'],
  });
  const lowPerformers = await Employee.findAll({
    where: { id: { [Op.in]: lowPerformerIds.length ? lowPerformerIds : [0] } },
    attributes: ['id', 'employee_code', 'first_name', 'last_name', 'department_id'],
  });

  const departmentPerformance = await getDepartmentPerformanceBreakdown(monthStart, today);
  const performanceTrend = await getOrgPerformanceTrend(6);
  const alerts = await getManagementAlerts();

  return {
    totalEmployees,
    presentEmployees: presentToday,
    absentEmployees: absentToday,
    attendancePercentage,
    averageKpiScore,
    payrollCost,
    topPerformers: attachScore(topPerformers, scores),
    lowPerformers: attachScore(lowPerformers, scores),
    departmentPerformance,
    performanceTrend,
    kpiAchievement: averageKpiScore,
    managementAlerts: alerts,
    generatedAt: new Date().toISOString(),
  };
}

function attachScore(employees, scores) {
  const map = new Map(scores.map((s) => [s.employeeId, s.score]));
  return employees.map((e) => ({ ...e.toJSON(), kpiScore: map.get(e.id) || 0 }));
}

async function getDepartmentPerformanceBreakdown(periodStart, periodEnd) {
  const departments = await Department.findAll({ where: { is_active: true } });
  const breakdown = [];

  for (const dept of departments) {
    // eslint-disable-next-line no-await-in-loop
    const employees = await Employee.findAll({ where: { department_id: dept.id, employment_status: 'ACTIVE' } });
    if (employees.length === 0) {
      breakdown.push({ departmentId: dept.id, departmentName: dept.name, employeeCount: 0, averageKpiScore: 0 });
      continue;
    }
    const scores = [];
    for (const emp of employees) {
      // eslint-disable-next-line no-await-in-loop
      const result = await getEmployeeKpiScore(emp.id, periodStart, periodEnd);
      scores.push(result.overallKpiScore);
    }
    const avg = scores.length ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 100) / 100 : 0;
    breakdown.push({ departmentId: dept.id, departmentName: dept.name, employeeCount: employees.length, averageKpiScore: avg });
  }

  return breakdown.sort((a, b) => b.averageKpiScore - a.averageKpiScore);
}

/** Average final_score from PerformanceEvaluation across the last N evaluation periods, org-wide. */
async function getOrgPerformanceTrend(numPeriods = 6) {
  const periods = await EvaluationPeriod.findAll({ order: [['start_date', 'DESC']], limit: numPeriods });
  const trend = [];
  for (const period of periods) {
    // eslint-disable-next-line no-await-in-loop
    const avg = await PerformanceEvaluation.findOne({
      where: { evaluation_period_id: period.id },
      attributes: [[fn('AVG', col('final_score')), 'avgScore']],
      raw: true,
    });
    trend.push({ period: period.name, averageScore: avg?.avgScore ? Math.round(Number(avg.avgScore) * 100) / 100 : 0 });
  }
  return trend.reverse();
}

/** Department-level dashboard. */
async function getDepartmentDashboard(departmentId) {
  const department = await Department.findByPk(departmentId);
  if (!department) throw Object.assign(new Error('Department not found'), { statusCode: 404 });

  const today = dayjs().format('YYYY-MM-DD');
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');

  const employees = await Employee.findAll({ where: { department_id: departmentId, employment_status: 'ACTIVE' } });

  const attendanceSummaries = [];
  const kpiScores = [];
  let totalOvertimeMinutes = 0;

  for (const emp of employees) {
    // eslint-disable-next-line no-await-in-loop
    const attendance = await getAttendanceSummary(emp.id, monthStart, today);
    attendanceSummaries.push(attendance);
    totalOvertimeMinutes += attendance.totalOvertimeMinutes;

    // eslint-disable-next-line no-await-in-loop
    const kpi = await getEmployeeKpiScore(emp.id, monthStart, today);
    kpiScores.push({ employee: emp, score: kpi.overallKpiScore });
  }

  const avgAttendanceRate = attendanceSummaries.length
    ? Math.round((attendanceSummaries.reduce((s, a) => s + a.attendanceRate, 0) / attendanceSummaries.length) * 100) / 100
    : 0;
  const avgKpi = kpiScores.length
    ? Math.round((kpiScores.reduce((s, k) => s + k.score, 0) / kpiScores.length) * 100) / 100
    : 0;

  const ranking = [...kpiScores]
    .sort((a, b) => b.score - a.score)
    .map((k, idx) => ({
      rank: idx + 1,
      employeeId: k.employee.id,
      name: k.employee.getFullName(),
      score: k.score,
    }));

  const shiftPerformance = await getShiftPerformance(departmentId, monthStart, today);

  return {
    departmentId: department.id,
    departmentName: department.name,
    numberOfEmployees: employees.length,
    averageAttendanceRate: avgAttendanceRate,
    averageKpiScore: avgKpi,
    kpiAchievement: avgKpi,
    employeeRanking: ranking,
    shiftPerformance,
    totalOvertimeMinutes,
    monthlyPerformanceTrend: await getDepartmentPerformanceTrend(departmentId, 6),
  };
}

async function getShiftPerformance(departmentId, periodStart, periodEnd) {
  const rows = await ProductionRecord.findAll({
    include: [
      { model: Employee, as: 'employee', where: { department_id: departmentId }, attributes: [] },
    ],
    where: { date: { [Op.between]: [periodStart, periodEnd] } },
    attributes: [
      'shift_id',
      [fn('SUM', col('produced_units')), 'totalProduced'],
      [fn('SUM', col('target_units')), 'totalTarget'],
      [fn('SUM', col('defective_units')), 'totalDefective'],
    ],
    group: ['shift_id'],
    raw: true,
  });

  return rows.map((r) => ({
    shiftId: r.shift_id,
    totalProduced: Number(r.totalProduced) || 0,
    totalTarget: Number(r.totalTarget) || 0,
    achievementPercentage: r.totalTarget > 0 ? Math.round((r.totalProduced / r.totalTarget) * 10000) / 100 : 0,
    defectRate: r.totalProduced > 0 ? Math.round((r.totalDefective / r.totalProduced) * 10000) / 100 : 0,
  }));
}

async function getDepartmentPerformanceTrend(departmentId, numPeriods = 6) {
  const periods = await EvaluationPeriod.findAll({ order: [['start_date', 'DESC']], limit: numPeriods });
  const trend = [];
  for (const period of periods) {
    // eslint-disable-next-line no-await-in-loop
    const avg = await PerformanceEvaluation.findOne({
      where: { evaluation_period_id: period.id },
      include: [{ model: Employee, as: 'employee', where: { department_id: departmentId }, attributes: [] }],
      attributes: [[fn('AVG', col('final_score')), 'avgScore']],
      raw: true,
    });
    trend.push({ period: period.name, averageScore: avg?.avgScore ? Math.round(Number(avg.avgScore) * 100) / 100 : 0 });
  }
  return trend.reverse();
}

/** Individual employee dashboard. */
async function getEmployeeDashboard(employeeId) {
  const employee = await Employee.findByPk(employeeId, {
    include: [
      { model: Department, as: 'department' },
      { model: require('../models').Designation, as: 'designation' },
    ],
  });
  if (!employee) throw Object.assign(new Error('Employee not found'), { statusCode: 404 });

  const today = dayjs().format('YYYY-MM-DD');
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');

  const attendance = await getAttendanceSummary(employee.id, monthStart, today);
  const kpi = await getEmployeeKpiScore(employee.id, monthStart, today);

  const latestEvaluation = await PerformanceEvaluation.findOne({
    where: { employee_id: employee.id },
    include: [{ model: EvaluationPeriod, as: 'period' }, { model: require('../models').PerformanceRatingScale, as: 'rating' }],
    order: [['id', 'DESC']],
  });

  const performanceHistory = await PerformanceEvaluation.findAll({
    where: { employee_id: employee.id },
    include: [{ model: EvaluationPeriod, as: 'period' }],
    order: [['id', 'DESC']],
    limit: 12,
  });

  const currentShift = await require('./attendanceService').getAssignedShift(employee.id, today);

  const recentPayslips = await Payroll.findAll({
    where: { employee_id: employee.id },
    include: [{ model: PayrollPeriod, as: 'period' }],
    order: [['id', 'DESC']],
    limit: 6,
  });

  return {
    employee: {
      id: employee.id,
      employeeCode: employee.employee_code,
      name: employee.getFullName(),
      department: employee.department?.name,
      designation: employee.designation?.name,
    },
    attendance,
    currentShift: currentShift ? { id: currentShift.id, name: currentShift.name, start: currentShift.start_time, end: currentShift.end_time } : null,
    kpi,
    overallPerformanceScore: latestEvaluation?.final_score ?? null,
    performanceRating: latestEvaluation?.rating?.rating_label ?? null,
    performanceHistory: performanceHistory.map((e) => ({
      period: e.period.name,
      kpiScore: e.kpi_score,
      finalScore: e.final_score,
    })),
    managerFeedback: latestEvaluation?.manager_comments ?? null,
    payslips: recentPayslips.map((p) => ({
      period: p.period.name,
      netSalary: p.net_salary,
      status: p.status,
    })),
  };
}

/**
 * Rule-based management alerts, evaluated live (not stored) each time the
 * dashboard is polled - simple to reason about and always fresh, which
 * matters more than raw speed at this data scale (project rule: REST
 * polling every ~60s, not WebSockets).
 */
async function getManagementAlerts() {
  const alerts = [];
  const today = dayjs().format('YYYY-MM-DD');
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');

  const employees = await Employee.findAll({ where: { employment_status: 'ACTIVE' } });

  for (const emp of employees) {
    // eslint-disable-next-line no-await-in-loop
    const kpi = await getEmployeeKpiScore(emp.id, monthStart, today);
    if (kpi.overallKpiScore > 0 && kpi.overallKpiScore < ALERT_THRESHOLDS.LOW_KPI_SCORE) {
      alerts.push({
        type: 'EMPLOYEE_PERFORMANCE_LOW',
        severity: 'HIGH',
        message: `${emp.getFullName()} KPI score (${kpi.overallKpiScore}%) is below threshold`,
        employeeId: emp.id,
      });
    }

    // eslint-disable-next-line no-await-in-loop
    const attendance = await getAttendanceSummary(emp.id, monthStart, today);
    if (attendance.absenteeismRate > ALERT_THRESHOLDS.HIGH_ABSENTEEISM_RATE) {
      alerts.push({
        type: 'HIGH_ABSENTEEISM',
        severity: 'MEDIUM',
        message: `${emp.getFullName()} absenteeism rate (${attendance.absenteeismRate}%) is high`,
        employeeId: emp.id,
      });
    }
    if (attendance.totalOvertimeMinutes > ALERT_THRESHOLDS.HIGH_OVERTIME_MINUTES_MONTHLY) {
      alerts.push({
        type: 'HIGH_OVERTIME',
        severity: 'LOW',
        message: `${emp.getFullName()} has logged excessive overtime this month`,
        employeeId: emp.id,
      });
    }
  }

  const departmentPerformance = await getDepartmentPerformanceBreakdown(monthStart, today);
  departmentPerformance.forEach((d) => {
    if (d.employeeCount > 0 && d.averageKpiScore < ALERT_THRESHOLDS.LOW_DEPARTMENT_KPI) {
      alerts.push({
        type: 'DEPARTMENT_KPI_LOW',
        severity: 'HIGH',
        message: `${d.departmentName} average KPI (${d.averageKpiScore}%) is below threshold`,
        departmentId: d.departmentId,
      });
    }
  });

  const productionRows = await ProductionRecord.findAll({
    where: { date: { [Op.between]: [monthStart, today] } },
    attributes: [
      'employee_id',
      [fn('SUM', col('produced_units')), 'totalProduced'],
      [fn('SUM', col('defective_units')), 'totalDefective'],
    ],
    group: ['employee_id'],
    raw: true,
  });
  for (const row of productionRows) {
    const produced = Number(row.totalProduced) || 0;
    const defective = Number(row.totalDefective) || 0;
    const defectRate = produced > 0 ? (defective / produced) * 100 : 0;
    if (defectRate > ALERT_THRESHOLDS.HIGH_DEFECT_RATE) {
      alerts.push({
        type: 'DEFECT_RATE_HIGH',
        severity: 'MEDIUM',
        message: `Employee #${row.employee_id} defect rate (${Math.round(defectRate * 100) / 100}%) exceeds threshold`,
        employeeId: row.employee_id,
      });
    }
  }

  return alerts;
}

module.exports = {
  ALERT_THRESHOLDS,
  getOrganizationDashboard,
  getDepartmentDashboard,
  getEmployeeDashboard,
  getManagementAlerts,
  getDepartmentPerformanceBreakdown,
};