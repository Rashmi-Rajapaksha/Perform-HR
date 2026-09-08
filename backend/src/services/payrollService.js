const { Op } = require('sequelize');
const sequelize = require('../config/database');
const {
  Payroll, PayrollItem, PayrollPeriod, Employee, EmployeeSalaryComponent, SalaryComponent,
} = require('../models');
const { calculatePayroll } = require('../utils/payrollCalculator');
const { getAttendanceSummary } = require('./attendanceService');
const { PAYROLL_STATUS } = require('../constants/statuses');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * Builds the raw calculation inputs for one employee/period, pulling
 * active salary components and the period's attendance summary, then
 * delegates the actual arithmetic to the pure payrollCalculator util.
 */
async function buildPayrollInputs(employee, period) {
  const components = await EmployeeSalaryComponent.findAll({
    where: {
      employee_id: employee.id,
      effective_date: { [Op.lte]: period.end_date },
      [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: period.start_date } }],
    },
    include: [{ model: SalaryComponent, as: 'component' }],
  });

  const bucket = (type, code) =>
    components
      .filter((c) => c.component?.type === type && (!code || c.component.code === code))
      .map((c) => ({ amount: c.amount }));

  const fixedAllowances = bucket('EARNING').filter((c) => true); // all active earning components other than shift/bonus handled below
  const shiftAllowances = components
    .filter((c) => c.component?.code === 'SHIFT_ALLOWANCE')
    .map((c) => ({ amount: c.amount }));
  const bonuses = components
    .filter((c) => c.component?.code === 'BONUS')
    .map((c) => ({ amount: c.amount }));
  const otherEarnings = [];
  const loanDeductions = components
    .filter((c) => c.component?.type === 'DEDUCTION' && c.component.code === 'LOAN')
    .map((c) => ({ amount: c.amount }));
  const otherDeductions = components
    .filter((c) => c.component?.type === 'DEDUCTION' && c.component.code !== 'LOAN')
    .map((c) => ({ amount: c.amount }));

  const attendance = await getAttendanceSummary(employee.id, period.start_date, period.end_date);

  return {
    basicSalary: Number(employee.basic_salary),
    fixedAllowances: fixedAllowances.filter((c) => !shiftAllowances.includes(c) && !bonuses.includes(c)),
    shiftAllowances,
    overtimeMinutes: attendance.totalOvertimeMinutes,
    bonuses,
    otherEarnings,
    deductibleAttendanceMinutes: attendance.deductibleMinutes,
    noPayDays: attendance.absentDays,
    loanDeductions,
    otherDeductions,
    _attendance: attendance,
    _components: components,
  };
}

/**
 * Processes payroll for one or more employees in a period, wrapped in a
 * single DB transaction so a partial failure never leaves half a payroll
 * run committed (per project rule #6).
 */
async function processPayroll({ payroll_period_id, employee_ids }) {
  const period = await PayrollPeriod.findByPk(payroll_period_id);
  if (!period) {
    const err = new Error('Payroll period not found');
    err.statusCode = 404;
    throw err;
  }

  const employees = await Employee.findAll({
    where: {
      employment_status: 'ACTIVE',
      ...(employee_ids && employee_ids.length ? { id: { [Op.in]: employee_ids } } : {}),
    },
  });

  const results = await sequelize.transaction(async (t) => {
    const created = [];

    for (const employee of employees) {
      const inputs = await buildPayrollInputs(employee, period);
      const calc = calculatePayroll(inputs);

      const [payroll] = await Payroll.findOrCreate({
        where: { employee_id: employee.id, payroll_period_id: period.id },
        defaults: {
          employee_id: employee.id,
          payroll_period_id: period.id,
          basic_salary: calc.basicSalary,
          gross_earnings: calc.grossEarnings,
          total_deductions: calc.totalDeductions,
          net_salary: calc.netSalary,
          status: PAYROLL_STATUS.CALCULATED,
          processed_at: new Date(),
        },
        transaction: t,
      });

      if (payroll.status === PAYROLL_STATUS.DRAFT || payroll.status === PAYROLL_STATUS.CALCULATED) {
        await payroll.update(
          {
            basic_salary: calc.basicSalary,
            gross_earnings: calc.grossEarnings,
            total_deductions: calc.totalDeductions,
            net_salary: calc.netSalary,
            status: PAYROLL_STATUS.CALCULATED,
            processed_at: new Date(),
          },
          { transaction: t }
        );

        await PayrollItem.destroy({ where: { payroll_id: payroll.id }, transaction: t });

        const lineItems = [
          { component_name: 'Basic Salary', type: 'EARNING', amount: calc.basicSalary },
          { component_name: 'Fixed Allowances', type: 'EARNING', amount: calc.fixedAllowanceTotal },
          { component_name: 'Shift Allowances', type: 'EARNING', amount: calc.shiftAllowanceTotal },
          { component_name: 'Overtime Pay', type: 'EARNING', amount: calc.overtimePay },
          { component_name: 'Bonuses', type: 'EARNING', amount: calc.bonusTotal },
          { component_name: 'Other Earnings', type: 'EARNING', amount: calc.otherEarningsTotal },
          { component_name: 'Attendance Deduction', type: 'DEDUCTION', amount: calc.attendanceDeduction },
          { component_name: 'No-Pay Deduction', type: 'DEDUCTION', amount: calc.noPayDeduction },
          { component_name: 'Loan/Advance Deduction', type: 'DEDUCTION', amount: calc.loanDeductionTotal },
          { component_name: 'Other Deductions', type: 'DEDUCTION', amount: calc.otherDeductionTotal },
        ].filter((item) => Number(item.amount) !== 0);

        for (const item of lineItems) {
          await PayrollItem.create({ payroll_id: payroll.id, ...item }, { transaction: t });
        }
      }

      created.push(payroll);
    }

    return created;
  });

  return results;
}

async function reviewPayroll(id) {
  const payroll = await Payroll.findByPk(id);
  if (!payroll) throw Object.assign(new Error('Payroll not found'), { statusCode: 404 });
  if (payroll.status !== PAYROLL_STATUS.CALCULATED) {
    throw Object.assign(new Error('Only CALCULATED payrolls can be reviewed'), { statusCode: 400 });
  }
  payroll.status = PAYROLL_STATUS.REVIEWED;
  await payroll.save();
  return payroll;
}

async function approvePayroll(id, approverId) {
  const payroll = await Payroll.findByPk(id);
  if (!payroll) throw Object.assign(new Error('Payroll not found'), { statusCode: 404 });
  if (payroll.status !== PAYROLL_STATUS.REVIEWED) {
    throw Object.assign(new Error('Only REVIEWED payrolls can be approved'), { statusCode: 400 });
  }
  payroll.status = PAYROLL_STATUS.APPROVED;
  payroll.approved_by = approverId;
  await payroll.save();
  return payroll;
}

async function markPaid(id) {
  const payroll = await Payroll.findByPk(id);
  if (!payroll) throw Object.assign(new Error('Payroll not found'), { statusCode: 404 });
  if (payroll.status !== PAYROLL_STATUS.APPROVED) {
    throw Object.assign(new Error('Only APPROVED payrolls can be marked as PAID'), { statusCode: 400 });
  }
  payroll.status = PAYROLL_STATUS.PAID;
  await payroll.save();
  return payroll;
}

async function cancelPayroll(id) {
  const payroll = await Payroll.findByPk(id);
  if (!payroll) throw Object.assign(new Error('Payroll not found'), { statusCode: 404 });
  if ([PAYROLL_STATUS.PAID].includes(payroll.status)) {
    throw Object.assign(new Error('A PAID payroll cannot be cancelled'), { statusCode: 400 });
  }
  payroll.status = PAYROLL_STATUS.CANCELLED;
  await payroll.save();
  return payroll;
}

async function listPayrolls(query) {
  const { page, pageSize, limit, offset } = getPagination(query);
  const where = {};
  if (query.payroll_period_id) where.payroll_period_id = query.payroll_period_id;
  if (query.employee_id) where.employee_id = query.employee_id;
  if (query.status) where.status = query.status;

  const { rows, count } = await Payroll.findAndCountAll({
    where,
    include: [
      { model: Employee, as: 'employee', attributes: ['id', 'employee_code', 'first_name', 'last_name'] },
      { model: PayrollPeriod, as: 'period' },
    ],
    limit,
    offset,
    order: [['id', 'DESC']],
    distinct: true,
  });

  return { rows, meta: buildPaginationMeta({ total: count, page, pageSize }) };
}

async function getPayrollDetail(id) {
  const payroll = await Payroll.findByPk(id, {
    include: [
      { model: Employee, as: 'employee' },
      { model: PayrollPeriod, as: 'period' },
      { model: PayrollItem, as: 'items' },
    ],
  });
  if (!payroll) throw Object.assign(new Error('Payroll not found'), { statusCode: 404 });
  return payroll;
}

module.exports = {
  buildPayrollInputs,
  processPayroll,
  reviewPayroll,
  approvePayroll,
  markPaid,
  cancelPayroll,
  listPayrolls,
  getPayrollDetail,
};