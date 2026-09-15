const {
  calculateOvertimePay,
  calculateAttendanceDeduction,
  calculateNoPayDeduction,
  sumComponents,
  calculatePayroll,
} = require('../src/utils/payrollCalculator');

describe('payrollCalculator - overtime pay', () => {
  test('computes overtime pay from minutes at 1.5x multiplier', () => {
    const pay = calculateOvertimePay({ basicSalary: 62400, overtimeMinutes: 120, standardWorkingDays: 26, standardDailyMinutes: 480 });
    // per-minute rate = 62400 / (26*480) = 5; overtime = 5 * 120 * 1.5 = 900
    expect(pay).toBe(900);
  });

  test('zero overtime minutes -> zero pay', () => {
    const pay = calculateOvertimePay({ basicSalary: 62400, overtimeMinutes: 0 });
    expect(pay).toBe(0);
  });
});

describe('payrollCalculator - attendance deduction', () => {
  test('computes deduction from late/early-leave minutes at plain rate', () => {
    const deduction = calculateAttendanceDeduction({ basicSalary: 62400, deductibleMinutes: 60, standardWorkingDays: 26, standardDailyMinutes: 480 });
    expect(deduction).toBe(300); // rate 5/min * 60
  });
});

describe('payrollCalculator - no-pay deduction', () => {
  test('computes per-day deduction for unpaid absence days', () => {
    const deduction = calculateNoPayDeduction({ basicSalary: 26000, noPayDays: 2, standardWorkingDays: 26 });
    expect(deduction).toBe(2000); // 1000/day * 2
  });
});

describe('payrollCalculator - sumComponents', () => {
  test('sums a list of {amount} rows', () => {
    expect(sumComponents([{ amount: 100 }, { amount: 250.5 }])).toBe(350.5);
  });

  test('empty list sums to zero', () => {
    expect(sumComponents([])).toBe(0);
  });
});

describe('payrollCalculator - full payroll calculation', () => {
  test('computes gross, deductions, and net salary consistently', () => {
    const result = calculatePayroll({
      basicSalary: 60000,
      fixedAllowances: [{ amount: 5000 }],
      shiftAllowances: [{ amount: 3000 }],
      overtimeMinutes: 60,
      bonuses: [{ amount: 2000 }],
      deductibleAttendanceMinutes: 30,
      noPayDays: 1,
      loanDeductions: [{ amount: 1000 }],
    });

    expect(result.grossEarnings).toBeCloseTo(
      result.basicSalary + result.fixedAllowanceTotal + result.shiftAllowanceTotal + result.overtimePay + result.bonusTotal + result.otherEarningsTotal,
      2
    );
    expect(result.totalDeductions).toBeCloseTo(
      result.attendanceDeduction + result.noPayDeduction + result.loanDeductionTotal + result.otherDeductionTotal,
      2
    );
    expect(result.netSalary).toBeCloseTo(result.grossEarnings - result.totalDeductions, 2);
  });

  test('net salary never silently goes negative in the formula (still computed, caller may flag it)', () => {
    const result = calculatePayroll({ basicSalary: 1000, noPayDays: 30, standardWorkingDays: 26 });
    expect(typeof result.netSalary).toBe('number');
  });
});
