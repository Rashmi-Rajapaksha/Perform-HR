const dayjs = require('dayjs');
const { createRng } = require('../src/utils/seedData/seededRandom');
const { calculatePayroll } = require('../src/utils/payrollCalculator');

const rng = createRng(4004);
const TODAY = dayjs();

const SALARY_COMPONENTS = [
  { name: 'Transport Allowance', code: 'TRANSPORT', type: 'EARNING', calculation_type: 'FIXED', is_taxable: true },
  { name: 'Meal Allowance', code: 'MEAL', type: 'EARNING', calculation_type: 'FIXED', is_taxable: true },
  { name: 'Shift Allowance', code: 'SHIFT_ALLOWANCE', type: 'EARNING', calculation_type: 'FIXED', is_taxable: true },
  { name: 'Performance Bonus', code: 'BONUS', type: 'EARNING', calculation_type: 'FIXED', is_taxable: true },
  { name: 'Other Earning', code: 'OTHER_EARNING', type: 'EARNING', calculation_type: 'FIXED', is_taxable: true },
  { name: 'Salary Advance / Loan', code: 'LOAN', type: 'DEDUCTION', calculation_type: 'FIXED', is_taxable: false },
  { name: 'Other Deduction', code: 'OTHER_DEDUCTION', type: 'DEDUCTION', calculation_type: 'FIXED', is_taxable: false },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('salary_components', SALARY_COMPONENTS.map((c) => ({ ...c, is_active: true, created_at: now, updated_at: now })));
    const [components] = await queryInterface.sequelize.query('SELECT id, code FROM salary_components');
    const compId = Object.fromEntries(components.map((c) => [c.code, c.id]));

    const [employees] = await queryInterface.sequelize.query(`
      SELECT e.id, e.join_date, e.basic_salary, e.work_schedule_type, e.employment_status
      FROM employees e WHERE e.employment_status IN ('ACTIVE', 'ON_LEAVE', 'SUSPENDED')
    `);

    // ----- Recurring salary components: Transport + Meal for everyone, Shift Allowance for rotating-schedule staff -----
    const escRows = [];
    employees.forEach((emp) => {
      escRows.push({
        employee_id: emp.id, salary_component_id: compId.TRANSPORT,
        amount: rng.int(5000, 8000), effective_date: emp.join_date, end_date: null, created_at: now, updated_at: now,
      });
      escRows.push({
        employee_id: emp.id, salary_component_id: compId.MEAL,
        amount: rng.int(3000, 5000), effective_date: emp.join_date, end_date: null, created_at: now, updated_at: now,
      });
      if (emp.work_schedule_type === 'ROTATING') {
        escRows.push({
          employee_id: emp.id, salary_component_id: compId.SHIFT_ALLOWANCE,
          amount: rng.int(4000, 7000), effective_date: emp.join_date, end_date: null, created_at: now, updated_at: now,
        });
      }
      // ~15% of employees have an active salary-advance/loan deduction
      if (rng.next() < 0.15) {
        escRows.push({
          employee_id: emp.id, salary_component_id: compId.LOAN,
          amount: rng.int(2000, 8000),
          effective_date: TODAY.subtract(rng.int(1, 5), 'month').startOf('month').format('YYYY-MM-DD'),
          end_date: null, created_at: now, updated_at: now,
        });
      }
    });

    const CHUNK = 1000;
    for (let i = 0; i < escRows.length; i += CHUNK) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.bulkInsert('employee_salary_components', escRows.slice(i, i + CHUNK));
    }

    // ----- Payroll periods: trailing 12 calendar months -----
    const periodRows = [];
    for (let i = 11; i >= 0; i -= 1) {
      const monthStart = TODAY.subtract(i, 'month').startOf('month');
      const monthEnd = monthStart.endOf('month');
      periodRows.push({
        name: monthStart.format('YYYY-MM'),
        start_date: monthStart.format('YYYY-MM-DD'),
        end_date: monthEnd.format('YYYY-MM-DD'),
        status: i === 0 ? 'PROCESSING' : 'CLOSED',
        created_at: now,
        updated_at: now,
      });
    }
    await queryInterface.bulkInsert('payroll_periods', periodRows);
    const [periods] = await queryInterface.sequelize.query('SELECT id, name, start_date, end_date FROM payroll_periods ORDER BY start_date ASC');

    // ----- Pull monthly attendance aggregates for all employees in one query -----
    const [attendanceAgg] = await queryInterface.sequelize.query(`
      SELECT employee_id, DATE_FORMAT(date, '%Y-%m') AS ym,
        SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_days,
        SUM(late_minutes) AS late_minutes,
        SUM(early_leave_minutes) AS early_minutes,
        SUM(overtime_minutes) AS ot_minutes
      FROM attendance_records
      GROUP BY employee_id, ym
    `);
    const aggKey = (empId, ym) => `${empId}:${ym}`;
    const aggMap = Object.fromEntries(attendanceAgg.map((r) => [aggKey(r.employee_id, r.ym), r]));

    // ----- Group employee_salary_components by employee for payroll input building -----
    const [allEsc] = await queryInterface.sequelize.query(`
      SELECT esc.employee_id, esc.amount, sc.code
      FROM employee_salary_components esc
      JOIN salary_components sc ON sc.id = esc.salary_component_id
    `);
    const escByEmployee = {};
    allEsc.forEach((r) => {
      escByEmployee[r.employee_id] = escByEmployee[r.employee_id] || [];
      escByEmployee[r.employee_id].push(r);
    });

    const [admin] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'hr.manager' LIMIT 1");
    const approverId = admin[0]?.id || null;

    const payrollRows = [];
    const payrollItemsByPayrollIndex = [];

    periods.forEach((period, periodIdx) => {
      const ym = dayjs(period.start_date).format('YYYY-MM');
      const isCurrentPeriod = periodIdx === periods.length - 1;

      employees.forEach((emp) => {
        if (dayjs(emp.join_date).isAfter(period.end_date)) return; // not yet hired in this period

        const agg = aggMap[aggKey(emp.id, ym)] || { absent_days: 0, late_minutes: 0, early_minutes: 0, ot_minutes: 0 };
        const esc = escByEmployee[emp.id] || [];
        const bucket = (code) => esc.filter((r) => r.code === code).map((r) => ({ amount: r.amount }));

        // A bonus is occasionally granted in a given month (e.g. festival/performance bonus)
        const bonuses = rng.next() < 0.1 ? [{ amount: rng.int(5000, 20000) }] : [];

        const calc = calculatePayroll({
          basicSalary: Number(emp.basic_salary),
          fixedAllowances: bucket('TRANSPORT').concat(bucket('MEAL')).concat(bucket('OTHER_EARNING')),
          shiftAllowances: bucket('SHIFT_ALLOWANCE'),
          overtimeMinutes: Number(agg.ot_minutes) || 0,
          bonuses,
          otherEarnings: [],
          deductibleAttendanceMinutes: (Number(agg.late_minutes) || 0) + (Number(agg.early_minutes) || 0),
          noPayDays: Number(agg.absent_days) || 0,
          loanDeductions: bucket('LOAN'),
          otherDeductions: bucket('OTHER_DEDUCTION'),
        });

        let status = 'PAID';
        if (isCurrentPeriod) {
          status = rng.weightedChoice([
            { value: 'CALCULATED', weight: 40 },
            { value: 'REVIEWED', weight: 30 },
            { value: 'APPROVED', weight: 30 },
          ]);
        }

        payrollRows.push({
          employee_id: emp.id,
          payroll_period_id: period.id,
          basic_salary: calc.basicSalary,
          gross_earnings: calc.grossEarnings,
          total_deductions: calc.totalDeductions,
          net_salary: calc.netSalary,
          status,
          processed_at: now,
          approved_by: ['APPROVED', 'PAID'].includes(status) ? approverId : null,
          created_at: now,
          updated_at: now,
        });

        const lineItems = [
          { component_name: 'Basic Salary', type: 'EARNING', amount: calc.basicSalary },
          { component_name: 'Fixed Allowances', type: 'EARNING', amount: calc.fixedAllowanceTotal },
          { component_name: 'Shift Allowances', type: 'EARNING', amount: calc.shiftAllowanceTotal },
          { component_name: 'Overtime Pay', type: 'EARNING', amount: calc.overtimePay },
          { component_name: 'Bonuses', type: 'EARNING', amount: calc.bonusTotal },
          { component_name: 'Attendance Deduction', type: 'DEDUCTION', amount: calc.attendanceDeduction },
          { component_name: 'No-Pay Deduction', type: 'DEDUCTION', amount: calc.noPayDeduction },
          { component_name: 'Loan/Advance Deduction', type: 'DEDUCTION', amount: calc.loanDeductionTotal },
        ].filter((item) => Number(item.amount) !== 0);

        payrollItemsByPayrollIndex.push(lineItems);
      });
    });

    const PAYROLL_CHUNK = 500;
    for (let i = 0; i < payrollRows.length; i += PAYROLL_CHUNK) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.bulkInsert('payrolls', payrollRows.slice(i, i + PAYROLL_CHUNK));
    }

    // Re-fetch to map (employee_id, payroll_period_id) -> id for attaching line items
    const [insertedPayrolls] = await queryInterface.sequelize.query('SELECT id, employee_id, payroll_period_id FROM payrolls');
    const payrollIdByKey = Object.fromEntries(
      insertedPayrolls.map((p) => [`${p.employee_id}:${p.payroll_period_id}`, p.id])
    );

    const itemRows = [];
    let idx = 0;
    periods.forEach((period) => {
      employees.forEach((emp) => {
        if (dayjs(emp.join_date).isAfter(period.end_date)) return;
        const payrollId = payrollIdByKey[`${emp.id}:${period.id}`];
        const items = payrollItemsByPayrollIndex[idx];
        idx += 1;
        if (!payrollId || !items) return;
        items.forEach((item) => itemRows.push({ payroll_id: payrollId, salary_component_id: null, ...item, created_at: now, updated_at: now }));
      });
    });

    const ITEM_CHUNK = 2000;
    for (let i = 0; i < itemRows.length; i += ITEM_CHUNK) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.bulkInsert('payroll_items', itemRows.slice(i, i + ITEM_CHUNK));
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('payroll_items', null, {});
    await queryInterface.bulkDelete('payrolls', null, {});
    await queryInterface.bulkDelete('payroll_periods', null, {});
    await queryInterface.bulkDelete('employee_salary_components', null, {});
    await queryInterface.bulkDelete('salary_components', null, {});
  },
};
