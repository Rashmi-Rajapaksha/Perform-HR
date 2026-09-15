# Research Alignment — HR Plus

**Research title:** *An Integrated Human Resource Information System for
KPI-Based Employee Performance Management*

**Research question:** *How can an integrated Human Resource Information
System with a near real-time KPI dashboard support effective employee
performance management and managerial decision-making?*

This document maps that research question directly to what was built, so
the connection between the academic problem and the implementation is
explicit and defensible in a viva.

## 1. "Integrated" — one system, not siloed spreadsheets

The premise of the research is that HR data (attendance, payroll, KPIs,
performance) is often fragmented across disconnected tools, which weakens
both employee-facing transparency and manager-facing decision support.
HR Plus integrates all of it around a single `employees` table and a single
permission model:

- Attendance minutes feed directly into **both** payroll deductions/OT pay
  **and** the `ATTENDANCE_RATE`/`PUNCTUALITY` KPIs — computed once, reused
  twice, never duplicated or allowed to drift out of sync.
- Production records feed the `PRODUCTION_TARGET_ACHIEVEMENT`,
  `QUALITY_RATE`, and `DEFECT_RATE` KPIs automatically.
- KPI scores feed directly into performance evaluations, which can trigger
  improvement plans — a closed loop from raw operational data to a
  managerial action.

## 2. "KPI-Based" — the measurement model is the center of the design

Unlike a generic HRIS bolt-on, KPI management here is a first-class,
hierarchical module (`Organization → Department → Designation → Employee`,
see `docs/kpi-calculation.md`) with:

- Explicit **direction semantics** (`HIGHER_IS_BETTER` /
  `LOWER_IS_BETTER`) so the same achievement formula correctly handles both
  "more is better" (production output) and "less is better" (defect rate)
  metrics without special-casing each KPI.
- **Configurable data sources** (`MANUAL` / `ATTENDANCE` / `PRODUCTION` /
  `SYSTEM` / `IMPORT`) so KPIs aren't only manually entered opinions —
  several are computed automatically from operational data, which is what
  makes "near real-time" meaningful rather than a marketing term.
- **Database-driven rating scales**, so the mapping from a numeric score to
  a qualitative label (Outstanding → Needs Improvement) is configuration,
  not code — supporting the "decision support" half of the research
  question by letting HR tune what "good performance" means without a
  deployment.

## 3. "Near Real-Time Dashboard" — REST polling, deliberately

The system requirement explicitly calls for **REST polling at ~60 seconds**,
not WebSockets. This is a deliberate, defensible architectural choice for
this problem: manufacturing KPIs (attendance, production, defect rates)
don't change second-to-second, so true real-time push infrastructure would
add operational complexity (persistent connections, scaling concerns)
without a proportional benefit to a factory floor manager checking a
dashboard. `frontend/js/dashboard.js` implements this via
`HrpDashboard.startPolling()`, calling the relevant dashboard endpoint
immediately and then every 60 seconds via `setInterval`.

## 4. "Employee Performance Management" — the full lifecycle, not just a score

The system doesn't stop at producing a number. It implements the full
management cycle:

1. **Measure** — automatic + manual KPI data collection
   (`kpiCalculationService`).
2. **Evaluate** — KPI score blended with a manager's qualitative review
   (`performanceService`, 70/30 weighting, documented in
   `docs/kpi-calculation.md §7`).
3. **Rate** — mapped to a database-driven rating scale.
4. **Act** — evaluations below a threshold can generate an
   **improvement plan** (`improvement_plans` table), assigned a target
   date and tracked to completion.
5. **Alert** — the organization dashboard surfaces **rule-based management
   alerts** (`dashboardService.getManagementAlerts()`) for low individual
   KPI scores, low department KPI averages, high absenteeism, high
   overtime, and high defect rates — turning passive dashboard viewing into
   proactive management.

## 5. "Managerial Decision-Making" — three dashboard levels, not one

The research question specifically calls out decision support, which is
why the dashboard isn't a single screen: **Organization**, **Department**,
and **Employee** levels each answer a different managerial question (is the
company healthy? / is my department healthy? / is this specific person on
track?), backed by the same underlying KPI engine so the numbers are always
consistent across levels — a department's average KPI score on the
department dashboard is computed from the exact same per-employee scores
shown on their individual employee dashboards.

## 6. Traceability Summary

| Research concept | Where it lives in the codebase |
|---|---|
| KPI achievement formula | `backend/src/utils/kpiCalculator.js` |
| Payroll transparency | `backend/src/utils/payrollCalculator.js` |
| KPI hierarchy | `kpi_definitions.level` + `kpi_assignments` (see `docs/database-design.md §5`) |
| Automatic data sources | `kpiCalculationService.fetchActualValueFromSource()` |
| Manager + KPI blended score | `performanceService.reviewEvaluation()` |
| Database-driven rating scale | `performance_rating_scales` table + `resolveRating()` |
| Near real-time polling | `frontend/js/dashboard.js` → `HrpDashboard.startPolling()` |
| Management alerts | `dashboardService.getManagementAlerts()` |
| Improvement plan loop | `improvement_plans` table + performance review UI |
| Full RBAC decision-support access | `PERMISSIONS.DASHBOARD_VIEW_ORG` / `_DEPARTMENT` / `_OWN` |
