# HR Plus — Integrated Human Resource Information System

**Research title:** *An Integrated Human Resource Information System for
KPI-Based Employee Performance Management*

A full-stack HRIS built for a manufacturing company, centered on
**KPI-based employee performance monitoring and managerial decision
support** via a near real-time dashboard.

📄 See [`docs/research-alignment.md`](docs/research-alignment.md) for how
every module maps back to the research question.

## Tech Stack

- **Backend**: Node.js, Express.js, Sequelize ORM, MySQL, JWT + bcrypt,
  express-validator, helmet, cors, morgan, express-rate-limit, dayjs
- **Frontend**: HTML5, CSS3, Bootstrap 5, vanilla JavaScript, Chart.js
  (no React/Vue/Angular/TypeScript/Tailwind — by design, see
  `docs/system-requirements.md`)

## Project Structure

```
integrated-hris/
├── backend/        # Node/Express API (routes → middleware → controllers → services → models)
├── frontend/       # Static HTML/Bootstrap/vanilla-JS admin dashboard
├── database/       # schema.sql, sample-data.sql, ERD
├── docs/           # Architecture, API, KPI/payroll methodology, research alignment
├── dataset/        # Realistic 100-employee / 12-month CSV dataset
└── screenshots/    # See screenshots/README.md
```

## Getting Started

### 1. Prerequisites

- Node.js 18+
- MySQL 8+ (or MariaDB 10.6+)

### 2. Backend Setup

```bash
cd backend
npm install
cp ../.env.example .env      # edit DB credentials, JWT secrets, etc.
```

Create the database (or let Sequelize do it via the schema file):

```bash
mysql -u root -p -e "CREATE DATABASE hr_plus CHARACTER SET utf8mb4;"
```

Run migrations, then seed realistic demo data (100 employees, 12 months of
attendance/production/payroll/KPI/performance history):

```bash
npm run migrate
npm run seed
```

Start the API:

```bash
npm run dev      # nodemon, auto-reload
# or
npm start
```

The API runs at `http://localhost:5000/api/v1` by default (see `.env`).

### 3. Frontend Setup

The frontend is static — no build step. Serve it with any static file
server, e.g.:

```bash
cd frontend
npx serve .          # or: python3 -m http.server 5500
```

Open `http://localhost:5500/login.html`. If your API isn't on
`http://localhost:5000`, add this to the `<head>` of each HTML page (or
just `login.html` + set it once and it persists via the same origin):

```html
<meta name="hrp-api-base" content="http://your-api-host:5000/api/v1">
```

### 4. Demo Accounts (created by the seeders)

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin@12345` | ADMIN |
| `hr.manager` | `HrManager@12345` | HR_MANAGER |
| `dept.manager` | `Manager@12345` | MANAGER |
| `employee.demo` | `Employee@12345` | EMPLOYEE |

**Change these before any real/shared deployment.**

### 5. Running Tests

```bash
cd backend
npm test
```

`kpi.test.js` and `payroll.test.js` are pure unit tests (no DB needed).
`auth.test.js`, `employee.test.js`, and `performance.test.js` are
integration tests against a running API + migrated/seeded **test**
database (`<DB_NAME>_test`, configured in
`src/config/sequelize-cli.config.js`).

## Key Documents

| Document | Contents |
|---|---|
| [`docs/system-requirements.md`](docs/system-requirements.md) | Functional/non-functional requirements, roles, tech stack |
| [`docs/architecture.md`](docs/architecture.md) | Layered backend, frontend structure, security architecture |
| [`docs/database-design.md`](docs/database-design.md) | Schema rationale by module |
| [`docs/api-documentation.md`](docs/api-documentation.md) | Full endpoint reference |
| [`docs/kpi-calculation.md`](docs/kpi-calculation.md) | KPI achievement/weighting formulas, worked examples |
| [`docs/payroll-calculation.md`](docs/payroll-calculation.md) | Payroll formulas, lifecycle, transactional processing |
| [`docs/research-alignment.md`](docs/research-alignment.md) | Maps the implementation back to the research question |

## Notes on the Seed Dataset

`backend/seeders/` generates a full, internally-consistent demo dataset
directly in MySQL when you run `npm run seed`:

- 100 employees across 7 departments with a realistic manager hierarchy
- 12 months of attendance (with deliberate variety: late arrivals,
  absences, leave, overtime)
- 12 months of production records for the Production department
- 12 months of payroll, computed with the same `payrollCalculator.js`
  used by the live API
- KPI measurements and performance evaluations computed with the same
  `kpiCalculator.js` used by the live API, tuned to produce a realistic
  spread of high/average/low performers rather than everyone scoring near
  the top

The `/dataset` folder contains an equivalent, standalone CSV export of the
same kind of data (generated independently of MySQL) for anyone who wants
to inspect or import the numbers without standing up the full backend.

## License

MIT (or your institution's required license — update as needed for
submission).
