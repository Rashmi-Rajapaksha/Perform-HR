# System Requirements — HR Plus

## 1. Purpose

HR Plus is a web-based Integrated Human Resource Information System (HRIS)
built for a manufacturing company. Its central objective is **KPI-based
employee performance monitoring and managerial decision support**, delivered
through a near real-time dashboard.

## 2. Functional Requirements

| # | Module | Key Capabilities |
|---|--------|-------------------|
| 1 | Authentication | JWT login/logout, refresh tokens, password change, rate-limited login |
| 2 | RBAC | Role-based + permission-based authorization (ADMIN, HR_MANAGER, MANAGER, EMPLOYEE) |
| 3 | Organization Structure | Departments → Sections → Designations → Employees |
| 4 | Employee Management | Full CRUD, employment history, reporting-manager hierarchy |
| 5 | Shift & Work Schedule | Fixed and rotating shifts, employee shift assignment |
| 6 | Attendance | Check-in/out, manual marking, late/OT/early-leave computation, leave applications |
| 7 | Payroll | Transactional monthly processing, DRAFT→PAID lifecycle, payslips |
| 8 | KPI Management | Org→Dept→Designation→Employee KPI hierarchy, automatic + manual data sources |
| 9 | Performance Evaluation | KPI-driven scoring blended with manager review, DB-driven rating scale |
| 10 | Dashboards | Organization / Department / Employee levels, ~60s REST polling |
| 11 | Reporting | 13 report types across employee/attendance/payroll/performance, CSV export |
| 12 | Notifications | In-app notifications, role-broadcast alerts |
| 13 | Audit Logging | Create/update/delete actions logged with before/after values |
| 14 | System Configuration | Environment-driven settings (rate limits, pagination, poll interval) |

## 3. Non-Functional Requirements

- **Security**: bcrypt password hashing, JWT auth, Helmet, CORS, login rate
  limiting, centralized input validation (express-validator), parameterized
  queries via Sequelize ORM.
- **Transparency**: All KPI and payroll formulas live in pure, unit-tested
  utility functions (`kpiCalculator.js`, `payrollCalculator.js`) so every
  number on screen can be traced back to a short, explainable formula —
  important for a university viva defense.
- **Consistency**: Every API response follows `{ success, message, data }`.
- **Auditability**: Mutating actions are recorded in `audit_logs`.
- **Maintainability**: Strict layered architecture (Routes → Middleware →
  Controllers → Services → Models), no business logic in controllers.
- **Performance**: Dashboard uses REST polling (~60s) rather than
  WebSockets, matching the project's "near real-time" (not real-time)
  requirement and keeping the stack simple.

## 4. Technology Stack

| Layer | Technology |
|-------|------------|
| Backend runtime | Node.js + Express.js |
| ORM / Database | Sequelize + MySQL |
| Auth | JWT + bcrypt |
| Validation | express-validator |
| Security middleware | helmet, cors, express-rate-limit |
| Logging | morgan |
| Date handling | dayjs |
| Frontend | HTML5, CSS3, Bootstrap 5, vanilla JavaScript |
| Charts | Chart.js |

No frameworks outside this list (React, Vue, Angular, TypeScript, Tailwind,
Next.js, etc.) are used, per project constraints.

## 5. User Roles

| Role | Scope |
|------|-------|
| **ADMIN** | Full system access, including user/role management and system settings |
| **HR_MANAGER** | Organization-wide HR operations: employees, payroll, attendance, KPI, performance, reports |
| **MANAGER** | Department/team scope: approves leave, reviews team KPIs and performance, department dashboard |
| **EMPLOYEE** | Self-service: own attendance, payslips, KPI/performance view, leave requests |

## 6. Out of Scope

- Biometric device integration (attendance is captured via check-in/out API
  calls or manual entry, not hardware clock integration)
- Multi-currency / multi-country payroll tax rules
- Native mobile applications (the web UI is responsive but not a packaged app)
- WebSocket-based push notifications (REST polling is used by design)
