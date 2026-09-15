# API Documentation — HR Plus

Base URL: `http://localhost:5000/api/v1` (configurable via `.env` → `PORT`
/ `API_PREFIX`).

## Response Envelope

Every response follows:

```json
{ "success": true, "message": "...", "data": {}, "meta": { "...pagination if applicable..." } }
```

Errors:

```json
{ "success": false, "message": "...", "data": {}, "errors": [{ "field": "email", "message": "..." }] }
```

## Authentication

All endpoints except `POST /auth/login` and `POST /auth/refresh` require:

```
Authorization: Bearer <accessToken>
```

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | `{ username, password }` → `{ user, accessToken, refreshToken }` |
| POST | `/auth/register` | Create a user account (auth required) |
| POST | `/auth/refresh` | `{ refreshToken }` → new `accessToken` |
| POST | `/auth/logout` | Client discards token (stateless JWT) |
| GET | `/auth/me` | Current authenticated user |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }` |

## Users & Roles

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/users` | `USER_VIEW` / `USER_MANAGE` |
| GET | `/users/roles` | `USER_VIEW` / `ROLE_MANAGE` |
| GET | `/users/:id` | `USER_VIEW` / `USER_MANAGE` |
| PUT | `/users/:id` | `USER_MANAGE` |
| PATCH | `/users/:id/deactivate` | `USER_MANAGE` |

## Organization Structure

| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/departments` | list / create |
| GET/PUT/DELETE | `/departments/:id` | delete blocked if employees exist |
| GET/POST/PUT/DELETE | `/sections` | filter by `?department_id=` |
| GET/POST/PUT/DELETE | `/designations` | |

## Employees

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/employees` | filters: `search, department_id, section_id, designation_id, employment_status`, paginated |
| GET | `/employees/me` | current user's own employee profile |
| GET | `/employees/:id` | |
| GET | `/employees/:id/direct-reports` | |
| POST | `/employees` | requires `EMPLOYEE_MANAGE` |
| PUT | `/employees/:id` | |
| PATCH | `/employees/:id/deactivate` | |

## Shifts

| Method | Endpoint |
|---|---|
| GET/POST/PUT/DELETE | `/shifts` |
| GET/POST | `/shifts/assignments` |

## Attendance & Leave

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/attendance/check-in` | `{ employee_id, shift_id? }` |
| POST | `/attendance/check-out` | derives late/early/overtime minutes |
| POST | `/attendance/manual` | HR/admin manual entry |
| GET | `/attendance` | filters: `employee_id, department_id, date, from, to` |
| GET | `/attendance/summary` | `?employee_id&from&to` → attendance/punctuality/absenteeism rates |
| GET/POST | `/attendance/holidays` | |
| GET | `/leaves/types` | |
| GET/POST | `/leaves` | apply for leave |
| PATCH | `/leaves/:id/decision` | `{ decision: 'APPROVED'|'REJECTED' }`, requires `LEAVE_APPROVE` |

## Payroll

| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/payroll/periods` | |
| GET/POST | `/payroll/components` | salary component master data |
| POST | `/payroll/components/assign` | attach a component to an employee |
| POST | `/payroll/process` | `{ payroll_period_id, employee_ids? }` — transactional |
| GET | `/payroll` | filters: `payroll_period_id, employee_id, status` |
| GET | `/payroll/:id` | full detail incl. line items |
| PATCH | `/payroll/:id/review` \| `/approve` \| `/mark-paid` \| `/cancel` | lifecycle transitions |
| GET | `/payroll/my-payslips` | current user's own payslips |

## KPI Management

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/kpi/categories` | |
| GET/POST | `/kpi/definitions` | |
| PUT | `/kpi/definitions/:id` \| PATCH `.../deactivate` | |
| GET/POST | `/kpi/assignments` | |
| GET/POST | `/kpi/measurements` | manual entry |
| POST | `/kpi/measurements/recalculate` | recompute one assignment/period from its data source |
| POST | `/kpi/measurements/recalculate-all` | recompute every active assignment for a period |
| GET | `/kpi/employee-score` | `?employee_id&period_start&period_end` → aggregated KPI score |

## Performance Evaluation

| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/performance/periods` | |
| GET/POST | `/performance/rating-scales` | |
| POST | `/performance/evaluations/generate` | `{ employee_id, evaluation_period_id }` — pulls KPI data |
| GET | `/performance/evaluations` | filters: `employee_id, evaluation_period_id, status` |
| GET | `/performance/evaluations/:id` | |
| PATCH | `/performance/evaluations/:id/review` | manager score + comments |
| PATCH | `/performance/evaluations/:id/employee-comment` | |
| PATCH | `/performance/evaluations/:id/finalize` | |
| GET/POST | `/performance/improvement-plans` | |

## Production

| Method | Endpoint |
|---|---|
| GET/POST | `/production` |
| POST | `/production/bulk` |
| PUT | `/production/:id` |

## Dashboards

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/dashboard/organization` | `DASHBOARD_VIEW_ORG` |
| GET | `/dashboard/department/:departmentId` | `DASHBOARD_VIEW_DEPARTMENT` / `_ORG` |
| GET | `/dashboard/employee/me` | `DASHBOARD_VIEW_OWN` |
| GET | `/dashboard/employee/:employeeId` | `DASHBOARD_VIEW_DEPARTMENT` / `_ORG` |
| GET | `/dashboard/alerts` | rule-based management alerts |

Frontend polls these roughly every 60 seconds (see `frontend/js/dashboard.js`).

## Reports

All under `/reports/*`, require `REPORT_VIEW`/`REPORT_EXPORT`. Add
`?format=csv` to any of them to download a CSV instead of JSON:

```
/reports/employees/master
/reports/employees/by-department
/reports/attendance/daily?date=YYYY-MM-DD
/reports/attendance/monthly?month=YYYY-MM
/reports/attendance/late?from&to
/reports/attendance/absenteeism?from&to
/reports/attendance/overtime?from&to
/reports/payroll/summary?payroll_period_id
/reports/payroll/by-department?payroll_period_id
/reports/payroll/overtime-cost?payroll_period_id
/reports/performance/employee-kpi?employee_id&period_start&period_end
/reports/performance/ranking?evaluation_period_id
/reports/performance/high-low-performers?evaluation_period_id&limit
```

## Notifications

| Method | Endpoint |
|---|---|
| GET | `/notifications?unread=true` |
| PATCH | `/notifications/:id/read` |
| PATCH | `/notifications/read-all` |

## Health Check

`GET /api/v1/health` → `{ success: true, data: { timestamp } }`, unauthenticated.
