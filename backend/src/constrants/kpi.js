const KPI_DIRECTION = Object.freeze({
  HIGHER_IS_BETTER: 'HIGHER_IS_BETTER',
  LOWER_IS_BETTER: 'LOWER_IS_BETTER',
});

const KPI_FREQUENCY = Object.freeze({
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  ANNUALLY: 'ANNUALLY',
});

const KPI_DATA_SOURCE = Object.freeze({
  MANUAL: 'MANUAL',
  ATTENDANCE: 'ATTENDANCE',
  PAYROLL: 'PAYROLL',
  PRODUCTION: 'PRODUCTION',
  SYSTEM: 'SYSTEM',
  IMPORT: 'IMPORT',
});

const KPI_LEVEL = Object.freeze({
  ORGANIZATION: 'ORGANIZATION',
  DEPARTMENT: 'DEPARTMENT',
  DESIGNATION: 'DESIGNATION',
  EMPLOYEE: 'EMPLOYEE',
});

const KPI_CALCULATION_TYPE = Object.freeze({
  RATIO: 'RATIO',        // actual / target based (default achievement formula)
  SUM: 'SUM',            // simple accumulation, e.g. total units
  AVERAGE: 'AVERAGE',    // averaged across the period
  COUNT: 'COUNT',        // count-based, e.g. number of incidents
});

/** Default category codes seeded into kpi_categories. */
const KPI_CATEGORY_CODES = Object.freeze({
  PRODUCTIVITY: 'PRODUCTIVITY',
  QUALITY: 'QUALITY',
  ATTENDANCE: 'ATTENDANCE',
  EFFICIENCY: 'EFFICIENCY',
  SAFETY: 'SAFETY',
  COST: 'COST',
  TASK_COMPLETION: 'TASK_COMPLETION',
  MANAGEMENT: 'MANAGEMENT',
});

module.exports = {
  KPI_DIRECTION,
  KPI_FREQUENCY,
  KPI_DATA_SOURCE,
  KPI_LEVEL,
  KPI_CALCULATION_TYPE,
  KPI_CATEGORY_CODES,
};