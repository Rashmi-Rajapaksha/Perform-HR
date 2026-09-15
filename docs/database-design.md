# Database Design — HR Plus

Full DDL: `database/schema.sql`. ERD: `database/erd/erd.png`. This document
explains the *why* behind the schema, grouped by module.

## 1. RBAC — `roles`, `permissions`, `role_permissions`, `users`

Permission-based authorization sits on top of roles rather than hardcoding
role checks everywhere: a `role` has many `permissions` through
`role_permissions`, and every protected route checks for a permission code
(e.g. `PAYROLL_PROCESS`), not a role name. This means granting/revoking a
capability for a role is a data change, not a code change.

`users.employee_id` is nullable because system accounts (e.g. `ADMIN`)
don't necessarily correspond to a factory employee.

## 2. Organization Structure

```
departments (1) ──< sections (1) ──< employees
      │                                  │
      └──────────────< designations ─────┘
```

`employees.reporting_manager_id` is a **self-referencing foreign key**,
which is what makes the org chart / direct-reports queries possible without
a separate hierarchy table.

`employee_employment_history` is an append-only log of HIRE / PROMOTION /
TRANSFER / DEMOTION / SALARY_CHANGE / STATUS_CHANGE / TERMINATION events —
kept separate from `employees` itself so the current state (`employees`
row) stays simple to query while history remains fully auditable.

## 3. Shifts & Attendance

`employee_shift_assignments` is date-ranged (`effective_date` /
`end_date`) rather than a single FK on `employees`, so shift rotation over
time is representable without losing history.

`attendance_records` stores **derived** minute buckets
(`regular_minutes`, `late_minutes`, `early_leave_minutes`,
`overtime_minutes`) computed once at check-out time from the raw
`check_in`/`check_out` timestamps against the assigned shift's schedule —
this means downstream consumers (payroll, KPI) never have to re-derive
attendance math themselves, they just read the stored minutes. One row per
`(employee_id, date)`, enforced by a unique index.

## 4. Payroll

```
salary_components ──< employee_salary_components >── employees
payroll_periods ──< payrolls >── employees
payrolls ──< payroll_items >── salary_components
```

`salary_components` is a master list (Transport Allowance, Shift Allowance,
Loan, etc.) each tagged `EARNING`/`DEDUCTION`. `employee_salary_components`
attaches specific amounts to specific employees over a date range (so a
component can start/stop without deleting history). When payroll is
processed, the computed result is **frozen** into `payrolls` (totals) and
`payroll_items` (line-item breakdown) — so a payslip always shows exactly
what was paid, even if `salary_components` changes later.

`payrolls.status` enforces the lifecycle `DRAFT → CALCULATED → REVIEWED →
APPROVED → PAID` (or `CANCELLED`), validated in `payrollService`, not just
in the UI.

## 5. KPI Management (research core)

```
kpi_categories ──< kpi_definitions ──< kpi_assignments ──< kpi_measurements
                        ↑                    ↑
                   departments/          employees
                   designations
                  (optional scope)
```

- `kpi_definitions` is the **template**: code, category, unit, direction,
  default target/weight, frequency, calculation type, and — critically —
  `data_source` (`MANUAL` / `ATTENDANCE` / `PRODUCTION` / `SYSTEM` /
  `IMPORT`), which tells `kpiCalculationService` where to pull the actual
  value from.
- `kpi_assignments` is the **instance**: which employee has which KPI
  active, with optional `target_value`/`weight` overrides (falls back to
  the definition's defaults when null).
- `kpi_measurements` is the **fact table**: one row per
  `(assignment, period)`, storing `actual_value`, the computed
  `achievement_percentage`, and `weighted_score`.

`evaluation_periods` and `performance_rating_scales` are separate master
tables so evaluation cadence (monthly/quarterly) and the rating bands
(Outstanding / Very Good / Good / Satisfactory / Needs Improvement) are
**data, not hardcoded constants** — matching the project requirement to
store rating scales in the database.

## 6. Performance Evaluation

```
performance_evaluations ──< performance_evaluation_details >── kpi_definitions
        │
        └──< improvement_plans
```

`performance_evaluations` stores the automated `kpi_score`, the manager's
qualitative `manager_score`, and the blended `final_score`, plus
`rating_scale_id` resolved from `performance_rating_scales`.
`performance_evaluation_details` is a snapshot of each KPI's
target/actual/achievement/weight at evaluation time — so even if the KPI
definition changes later, historical evaluations remain accurate.

## 7. Production

`production_records` (`employee_id`, `date`, `target_units`,
`produced_units`, `defective_units`, `rework_units`, `downtime_minutes`,
`safety_incidents`) is the raw manufacturing data source behind the
`PRODUCTION_TARGET_ACHIEVEMENT`, `QUALITY_RATE`, `DEFECT_RATE`, and
`SAFETY_INCIDENTS` automatic KPIs.

## 8. Supporting Tables

`notifications` (per-user, read/unread), `audit_logs` (before/after JSON
snapshots of any mutating action), `system_settings` (key/value config that
doesn't need a full migration to change).

## 9. Indexing Strategy

Every FK column is indexed by MySQL/InnoDB automatically. Additional
composite unique indexes prevent duplicate facts:

- `attendance_records (employee_id, date)`
- `production_records (employee_id, date)`
- `payrolls (employee_id, payroll_period_id)`
- `kpi_measurements (kpi_assignment_id, period_start, period_end)`
- `performance_evaluations (employee_id, evaluation_period_id)`
