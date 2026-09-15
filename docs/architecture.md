# Architecture — HR Plus

## 1. Layered Backend Architecture

```
Routes  →  Middleware  →  Controllers  →  Services  →  Sequelize Models  →  MySQL
```

- **Routes** (`src/routes/*.js`) — declare endpoints, attach middleware
  (auth, permission checks, validation, audit), delegate to controllers.
  Zero business logic.
- **Middleware** (`src/middleware/*.js`) — `authMiddleware` verifies the
  JWT and loads `req.user`; `permissionMiddleware` resolves the user's role
  → permissions and checks against the route's required codes;
  `validationMiddleware` turns express-validator errors into the standard
  error envelope; `errorMiddleware` is the single place that formats any
  thrown error into a response; `auditMiddleware` writes to `audit_logs`
  after a successful mutating request.
- **Controllers** (`src/controllers/*.js`) — parse the request, call a
  service function, wrap the result in `ApiResponse`. No calculations, no
  direct Sequelize queries beyond simple lookups.
- **Services** (`src/services/*.js`) — all business logic and calculations
  live here: `attendanceService`, `payrollService`, `kpiCalculationService`,
  `performanceService`, `dashboardService`, `reportService`,
  `notificationService`, `authService`, `employeeService`. Payroll
  processing runs inside a single Sequelize transaction
  (`sequelize.transaction(...)`) so a partial failure never leaves a payroll
  run half-committed.
- **Models** (`src/models/*.js`) — one file per table, associations wired
  centrally in `src/models/index.js` via each model's static `associate()`
  method.

## 2. Pure Calculation Utilities

The two most important formulas in the system — KPI achievement scoring and
payroll computation — are implemented as **pure, side-effect-free functions**
in `src/utils/kpiCalculator.js` and `src/utils/payrollCalculator.js`. They:

- take plain numbers/arrays in, return plain numbers/objects out;
- have no dependency on the database or Express;
- are directly unit-tested (`backend/tests/kpi.test.js`,
  `backend/tests/payroll.test.js`);
- are reused identically by the live API (`kpiCalculationService`,
  `payrollService`) **and** by the database seeders, so the seeded demo
  data was generated with the exact same math the running app uses.

This separation is what makes every number in the system explainable in a
few lines of code — useful both for debugging and for a viva defense.

## 3. Frontend Architecture

The frontend is intentionally simple: static HTML pages + Bootstrap 5 +
vanilla JavaScript, no build step, no framework.

```
frontend/
├── js/api.js         → single fetch() wrapper: attaches JWT, unwraps
│                        { success, message, data } envelope, handles 401
├── js/auth.js         → login/logout/session helpers (localStorage)
├── js/utils.js        → formatting, escaping, toast/error helpers
├── js/navigation.js    → mounts sidebar/navbar components, role-based menu
│                        filtering, active-link highlighting
├── js/<module>.js      → one file per module (employees, attendance,
│                        payroll, kpi, performance, production, reports,
│                        dashboard, shifts, administration) containing that
│                        module's page-init functions
├── components/*.html  → reusable HTML fragments (sidebar, navbar, alerts,
│                        modal, pagination), injected at runtime by
│                        navigation.js
└── pages/<module>/*.html → one HTML file per screen; loads Bootstrap +
                        the shared JS files + its module's JS file, then
                        calls `HrpLayout.init(...)` followed by that page's
                        init function
```

Every page follows the same shell:

```html
<div class="hrp-app">
  <aside class="hrp-sidebar" id="hrp-sidebar-mount"></aside>
  <div class="hrp-main">
    <header class="hrp-topbar" id="hrp-topbar-mount"></header>
    <main class="hrp-content">...</main>
  </div>
</div>
```

`navigation.js` computes the correct relative path prefix for
`components/*.html` based on how deep the current page is nested
(`frontend/login.html` vs `frontend/pages/employees/index.html`), fetches
the sidebar/navbar fragments, and injects them — this is what "reusable
frontend components" means in a vanilla-JS project without a bundler.

## 4. Near Real-Time Dashboards

Per the project's explicit requirement, dashboards use **REST polling
(~60 seconds)**, not WebSockets:

```js
HrpDashboard.startPolling(HrpDashboard.loadOrganizationDashboard);
// -> calls the loader immediately, then every 60s via setInterval
```

Each dashboard level (`organization`, `department`, `employee`) has its own
service method (`dashboardService.getOrganizationDashboard()`, etc.) that
aggregates attendance, KPI, payroll, and performance data live from the
database — nothing is pre-materialized, keeping the numbers trustworthy at
the cost of a bit more query work per poll, which is an acceptable
trade-off at this data scale.

## 5. Security Architecture

| Concern | Mechanism |
|---|---|
| Password storage | bcrypt (configurable salt rounds) |
| Session/API auth | Short-lived JWT access token + longer-lived refresh token |
| Authorization | Two layers: role check (`requireRole`) + fine-grained permission check (`requirePermission`) resolved from `role_permissions` on every request |
| Input validation | express-validator chains per endpoint, centralized error formatting |
| Transport hardening | helmet (secure headers), CORS allow-list |
| Abuse prevention | express-rate-limit, stricter limiter specifically on `/auth/login` |
| Traceability | `audit_logs` records CREATE/UPDATE/DELETE with old/new values, actor, IP |
| Secrets | All credentials/keys in `.env` (never committed — see `.env.example`) |

## 6. Request Lifecycle Example

`POST /api/v1/payroll/process` (HR_MANAGER processes a payroll period):

1. `authMiddleware.authenticate` verifies JWT → loads `req.user`.
2. `requirePermission('PAYROLL_PROCESS')` checks the user's role has that
   permission via `role_permissions`.
3. `processPayrollRules` (express-validator) + `validate` confirm the body
   shape.
4. `payrollController.process` calls `payrollService.processPayroll(...)`.
5. The service opens a Sequelize transaction, loops over active employees,
   pulls each one's attendance summary + salary components, calls the pure
   `calculatePayroll()` function, and writes `payrolls` + `payroll_items`
   rows — all inside the same transaction.
6. Controller wraps the result in the standard `{ success, message, data }`
   response.
