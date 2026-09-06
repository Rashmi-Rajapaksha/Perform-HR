/**
 * Payroll calculation helpers. Kept as pure functions (no DB access) so the
 * math is easy to unit test and easy to walk through in a viva.
 *
 * A payroll for one employee/period is composed of:
 *   grossEarnings   = basicSalary + fixedAllowances + shiftAllowances
 *                      + overtimePay + bonuses + otherEarnings
 *   totalDeductions = attendanceDeduction + noPayDeduction + loanDeductions
 *                      + otherDeductions
 *   netSalary       = grossEarnings - totalDeductions
 */

/**
 * Prorates a monthly amount down to a per-minute rate, used for both
 * overtime pay and attendance-based deductions, assuming a standard
 * working month of `standardWorkingDays` days at `standardDailyMinutes`
 * minutes/day.
 */
function getPerMinuteRate(basicSalary, standardWorkingDays = 26, standardDailyMinutes = 480) {
  const totalMinutes = standardWorkingDays * standardDailyMinutes;
  if (totalMinutes === 0) return 0;
  return basicSalary / totalMinutes;
}

/**
 * Overtime pay = overtime minutes * per-minute rate * multiplier.
 * Default multiplier of 1.5x follows common overtime premium practice.
 */
function calculateOvertimePay({
  basicSalary,
  overtimeMinutes,
  multiplier = 1.5,
  standardWorkingDays = 26,
  standardDailyMinutes = 480,
}) {
  const perMinuteRate = getPerMinuteRate(basicSalary, standardWorkingDays, standardDailyMinutes);
  const pay = perMinuteRate * (Number(overtimeMinutes) || 0) * multiplier;
  return Math.round(pay * 100) / 100;
}

/**
 * Attendance-based deduction for late/early-leave/absence minutes not
 * otherwise excused, deducted at the plain (non-premium) per-minute rate.
 */
function calculateAttendanceDeduction({
  basicSalary,
  deductibleMinutes,
  standardWorkingDays = 26,
  standardDailyMinutes = 480,
}) {
  const perMinuteRate = getPerMinuteRate(basicSalary, standardWorkingDays, standardDailyMinutes);
  const deduction = perMinuteRate * (Number(deductibleMinutes) || 0);
  return Math.round(deduction * 100) / 100;
}

/**
 * No-pay deduction for full unpaid absence days.
 */
function calculateNoPayDeduction({ basicSalary, noPayDays, standardWorkingDays = 26 }) {
  if (standardWorkingDays === 0) return 0;
  const perDayRate = basicSalary / standardWorkingDays;
  const deduction = perDayRate * (Number(noPayDays) || 0);
  return Math.round(deduction * 100) / 100;
}

/**
 * Sums an array of { amount } salary component rows for a given type
 * (EARNING or DEDUCTION), used for fixed allowances / other earnings /
 * loan or other deductions pulled from employee_salary_components.
 */
function sumComponents(components = []) {
  return Math.round(components.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) * 100) / 100;
}

/**
 * Full payroll computation for one employee for one period.
 * Every input is a plain number/array so this function has no side effects
 * and can be reused identically by both the live payrollService and the
 * seeders.
 */
function calculatePayroll({
  basicSalary,
  fixedAllowances = [],      // [{amount}]
  shiftAllowances = [],      // [{amount}]
  overtimeMinutes = 0,
  bonuses = [],              // [{amount}]
  otherEarnings = [],        // [{amount}]
  deductibleAttendanceMinutes = 0, // late + early-leave minutes
  noPayDays = 0,
  loanDeductions = [],       // [{amount}]
  otherDeductions = [],      // [{amount}]
  overtimeMultiplier = 1.5,
  standardWorkingDays = 26,
  standardDailyMinutes = 480,
}) {
  const fixedAllowanceTotal = sumComponents(fixedAllowances);
  const shiftAllowanceTotal = sumComponents(shiftAllowances);
  const bonusTotal = sumComponents(bonuses);
  const otherEarningsTotal = sumComponents(otherEarnings);
  const overtimePay = calculateOvertimePay({
    basicSalary,
    overtimeMinutes,
    multiplier: overtimeMultiplier,
    standardWorkingDays,
    standardDailyMinutes,
  });

  const grossEarnings =
    Number(basicSalary || 0) +
    fixedAllowanceTotal +
    shiftAllowanceTotal +
    overtimePay +
    bonusTotal +
    otherEarningsTotal;

  const attendanceDeduction = calculateAttendanceDeduction({
    basicSalary,
    deductibleMinutes: deductibleAttendanceMinutes,
    standardWorkingDays,
    standardDailyMinutes,
  });
  const noPayDeduction = calculateNoPayDeduction({ basicSalary, noPayDays, standardWorkingDays });
  const loanDeductionTotal = sumComponents(loanDeductions);
  const otherDeductionTotal = sumComponents(otherDeductions);

  const totalDeductions =
    attendanceDeduction + noPayDeduction + loanDeductionTotal + otherDeductionTotal;

  const netSalary = Math.round((grossEarnings - totalDeductions) * 100) / 100;

  return {
    basicSalary: Number(basicSalary || 0),
    fixedAllowanceTotal,
    shiftAllowanceTotal,
    overtimePay,
    bonusTotal,
    otherEarningsTotal,
    grossEarnings: Math.round(grossEarnings * 100) / 100,
    attendanceDeduction,
    noPayDeduction,
    loanDeductionTotal,
    otherDeductionTotal,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netSalary,
  };
}

module.exports = {
  getPerMinuteRate,
  calculateOvertimePay,
  calculateAttendanceDeduction,
  calculateNoPayDeduction,
  sumComponents,
  calculatePayroll,
};