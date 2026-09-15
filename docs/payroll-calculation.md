# Payroll Calculation Methodology — HR Plus

Implemented as pure functions in `backend/src/utils/payrollCalculator.js`,
unit-tested in `backend/tests/payroll.test.js`, and reused identically by
`payrollService.js` (live processing) and `backend/seeders/011-payroll-data.js`
(demo data generation).

## 1. Per-Minute Rate

Both overtime pay and attendance deductions are derived from a common
per-minute rate, based on a standard working month:

```
per_minute_rate = basic_salary / (standard_working_days * standard_daily_minutes)
```

Defaults: `standard_working_days = 26`, `standard_daily_minutes = 480` (8
hours). Both are function parameters, not hardcoded, so they can be tuned
per company policy without touching the formula.

## 2. Overtime Pay

```
overtime_pay = per_minute_rate * overtime_minutes * multiplier
```

Default `multiplier = 1.5` (time-and-a-half), a common overtime premium
convention. `overtime_minutes` for the period comes directly from the sum
of `attendance_records.overtime_minutes`, which was itself derived at
check-out time from actual check-in/check-out vs. the assigned shift's
scheduled end time.

## 3. Attendance Deduction

```
attendance_deduction = per_minute_rate * (late_minutes + early_leave_minutes)
```

Deducted at the **plain** rate (no premium/penalty multiplier) — late
arrival and early departure cost the employee the time not worked, nothing
more.

## 4. No-Pay Deduction

```
per_day_rate = basic_salary / standard_working_days
no_pay_deduction = per_day_rate * no_pay_days
```

`no_pay_days` is the count of full `ABSENT` days in the period (unpaid
leave and unapproved absence both reduce pay this way; approved paid leave
does not, since it isn't counted as a no-pay day).

## 5. Full Payroll Composition

```
gross_earnings   = basic_salary
                  + Σ(fixed_allowances)
                  + Σ(shift_allowances)
                  + overtime_pay
                  + Σ(bonuses)
                  + Σ(other_earnings)

total_deductions = attendance_deduction
                  + no_pay_deduction
                  + Σ(loan_deductions)
                  + Σ(other_deductions)

net_salary        = gross_earnings - total_deductions
```

`calculatePayroll()` returns every intermediate figure (not just the
totals), so a payslip can show a full itemized breakdown
(`payroll_items` rows: Basic Salary, Fixed Allowances, Shift Allowances,
Overtime Pay, Bonuses, Attendance Deduction, No-Pay Deduction, Loan
Deduction) rather than a single opaque number.

## 6. Where Inputs Come From

| Input | Source |
|---|---|
| `basicSalary` | `employees.basic_salary` |
| `fixedAllowances`, `shiftAllowances`, `bonuses`, `otherEarnings` | Active rows in `employee_salary_components` joined to `salary_components` where `type = 'EARNING'`, bucketed by component code |
| `overtimeMinutes`, `deductibleAttendanceMinutes` (late+early), `noPayDays` | Aggregated from `attendance_records` for the payroll period |
| `loanDeductions`, `otherDeductions` | Active rows in `employee_salary_components` where `type = 'DEDUCTION'` |

## 7. Payroll Lifecycle

```
DRAFT → CALCULATED → REVIEWED → APPROVED → PAID
                                      ↘ CANCELLED (any state except PAID)
```

Enforced in `payrollService.js` — e.g. `approvePayroll()` throws if the
payroll isn't currently `REVIEWED`, so the lifecycle can't be skipped via a
direct API call, only through the intended sequence of HR review steps.

## 8. Transactional Processing

`processPayroll({ payroll_period_id, employee_ids })` wraps the entire run
— one or many employees — in a single `sequelize.transaction(...)`. If
computing or saving any one employee's payroll throws partway through, the
whole transaction rolls back rather than leaving some employees paid-out
and others not, which would be an unacceptable data integrity risk for a
payroll system.

## 9. Why Not Just a Flat Percentage Deduction?

Attendance and no-pay deductions are minute/day-accurate rather than a flat
"X% off for any lateness" rule, because:

1. It's fairer — a 5-minute delay and a 3-hour absence shouldn't cost the
   same.
2. It's auditable — every deducted rupee/dollar traces back to a specific
   number of minutes or days, visible on the employee's own attendance
   summary, not just trusted blindly.
