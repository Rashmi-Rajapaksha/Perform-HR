# Screenshots

This folder is a placeholder for UI screenshots referenced by the original
project layout (`login.png`, `dashboard.png`, `employees.png`,
`attendance.png`, `payroll.png`, `kpi.png`, `performance.png`).

Screenshots can't be generated without a running instance of the app (they
depend on your actual browser, OS theme, and seeded data), so none are
checked in here. To produce them yourself once the app is running locally:

1. Start the backend (`npm run dev` in `backend/`) and serve the frontend
   (see the root `README.md`).
2. Log in with one of the seeded demo accounts.
3. Navigate to each screen below and take a screenshot, saving it with the
   matching filename into this folder:

| Filename | Page |
|---|---|
| `login.png` | `frontend/login.html` |
| `dashboard.png` | `frontend/pages/dashboard/organization.html` |
| `employees.png` | `frontend/pages/employees/index.html` |
| `attendance.png` | `frontend/pages/attendance/index.html` |
| `payroll.png` | `frontend/pages/payroll/periods.html` |
| `kpi.png` | `frontend/pages/kpi/definitions.html` |
| `performance.png` | `frontend/pages/performance/evaluations.html` |

These are also good candidates to embed in the root `README.md` or a
university report/presentation once captured.
