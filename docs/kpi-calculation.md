# KPI Calculation Methodology — HR Plus

This is the research core of the system. Every formula below is implemented
as a pure function in `backend/src/utils/kpiCalculator.js` and unit-tested
in `backend/tests/kpi.test.js`, so it can be verified independently of the
database or the UI.

## 1. Achievement Percentage

```
HIGHER_IS_BETTER:  achievement% = (actual / target) * 100
LOWER_IS_BETTER:   achievement% = (target / actual) * 100
```

Examples:

- Production Target Achievement (HIGHER_IS_BETTER), target 100 units,
  actual 118 units → achievement = 118%.
- Defect Rate (LOWER_IS_BETTER), target 2%, actual 1% → achievement =
  (2/1)×100 = 200%, capped at 150% (see §3).

### Zero-value handling

| Direction | actual = 0 | target = 0 |
|---|---|---|
| HIGHER_IS_BETTER | 0% (nothing achieved) | 0% (undefined ratio avoided) |
| LOWER_IS_BETTER | capped ceiling (best possible outcome, e.g. zero defects) | 100% (no target to exceed, treated as met) |

This keeps the function total — it never returns `NaN` or `Infinity` — while
still behaving intuitively at the edges.

## 2. Weighted Score

```
weighted_score = achievement_percentage * (weight / 100)
```

`weight` is a percentage point value (e.g. `25` for 25%). An employee's KPI
weights should sum to 100 across all their active assignments — the system
validates this (`aggregateKpiScore` returns `weightsValid`) and surfaces a
warning in the UI rather than silently accepting an invalid configuration.

## 3. Achievement Cap

Achievement is capped at **150%** by default (`DEFAULT_ACHIEVEMENT_CAP`).
Without a cap, one wildly over-performing KPI (e.g. hitting 400% of a
production target through an unusual circumstance) could dominate an
employee's entire score and hide underperformance elsewhere. The cap is
applied to the *percentage*, never to the raw actual value that gets
stored — so the underlying data stays accurate even though the score
contribution is bounded.

## 4. Overall KPI Score

```
overall_kpi_score = Σ(weighted_score) across all active KPI assignments
```

Computed by `aggregateKpiScore()`, which also returns `totalWeight` (should
be ~100) and `weightsValid` for validation/UI display.

## 5. Data Sources

Each `kpi_definitions.data_source` tells `kpiCalculationService` where the
`actual_value` comes from:

| Source | Feeds from | Example KPIs |
|---|---|---|
| `ATTENDANCE` | Aggregated `attendance_records` for the period | Attendance Rate, Punctuality, Absenteeism |
| `PRODUCTION` | Aggregated `production_records` for the period | Production Target Achievement, Quality Rate, Defect Rate, Safety Incidents |
| `MANUAL` | Directly entered by a manager/HR user | Task Completion Rate, Cost Efficiency, Management Effectiveness |
| `SYSTEM` / `IMPORT` | Reserved for future automated/bulk-imported sources | — |

Automatic-KPI formulas used by the seeders and `kpiCalculationService`:

```
Attendance Rate      = present_days / workable_days * 100
Punctuality          = on_time_days / present_days * 100
Absenteeism          = absent_days / workable_days * 100
Production Target %  = produced_units / target_units * 100
Quality Rate         = (produced_units - defective_units) / produced_units * 100
Defect Rate          = defective_units / produced_units * 100
```

## 6. KPI Hierarchy

```
Organization KPI → Department KPI → Designation KPI → Employee KPI
```

Represented by `kpi_definitions.level` (`ORGANIZATION` / `DEPARTMENT` /
`DESIGNATION` / `EMPLOYEE`) plus optional `department_id` /
`designation_id` scoping columns. `kpi_assignments` is always the leaf —
one row per (KPI definition, employee) — so regardless of what level a KPI
was *defined* at, it is always *measured* per employee, which is what rolls
up into individual performance evaluations and, in aggregate, into
department/organization dashboards.

## 7. From KPI Score to Performance Rating

```
final_score = kpi_score * 0.7 + manager_score * 0.3
```

(constants `KPI_WEIGHT_IN_FINAL_SCORE` / `MANAGER_WEIGHT_IN_FINAL_SCORE` in
`performanceService.js`) — a 70/30 split between the automated,
data-driven KPI score and the manager's qualitative assessment. The
resulting `final_score` (0–100) is mapped to a rating **by looking up
`performance_rating_scales` rows in the database**, not a hardcoded
if/else chain:

```
90–150  Outstanding
80–89   Very Good
70–79   Good
60–69   Satisfactory
< 60    Needs Improvement
```

`resolveRating(score, scales)` simply finds the row where
`min_score <= score <= max_score`. Because these bands live in a table,
an administrator can retune them without a code deployment.

The top band's ceiling is **150, not 100** — deliberately matching
`DEFAULT_ACHIEVEMENT_CAP` (§3). Since achievement percentage can exceed
100% when an employee over-performs against target, and weights sum to
100, a blended final score can legitimately land above 100 for a
strong over-achiever. Capping the *rating band* at 100 would leave such
scores unmatched (no rating resolved); capping the *achievement itself*
at 100 would erase the signal that they exceeded target. Extending the
top band to the same 150 ceiling used elsewhere keeps the system
internally consistent.

## 8. Why This Design Answers the Research Question

> "How can an integrated HRIS with a near real-time KPI dashboard support
> effective employee performance management and managerial decision-making?"

- **Transparency**: every score is traceable to a short formula, not a
  black box — critical for employees to trust their evaluation and for
  managers to explain it.
- **Consistency**: the same formulas run in the live API and in the demo
  data generator, so what a manager sees in training/demo data behaves
  identically to production.
- **Actionability**: KPI scores below threshold automatically surface as
  **management alerts** on the organization dashboard and can trigger an
  **improvement plan**, closing the loop from measurement to action.
