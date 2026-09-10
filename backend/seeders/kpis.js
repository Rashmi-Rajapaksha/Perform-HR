const dayjs = require('dayjs');

const CATEGORIES = [
  { name: 'Productivity', code: 'PRODUCTIVITY', description: 'Output volume against targets' },
  { name: 'Quality', code: 'QUALITY', description: 'Product and work quality metrics' },
  { name: 'Attendance', code: 'ATTENDANCE', description: 'Presence and reliability metrics' },
  { name: 'Efficiency', code: 'EFFICIENCY', description: 'Time and resource efficiency metrics' },
  { name: 'Safety', code: 'SAFETY', description: 'Workplace safety and incident metrics' },
  { name: 'Cost', code: 'COST', description: 'Cost control and budget metrics' },
  { name: 'Task Completion', code: 'TASK_COMPLETION', description: 'Completion of assigned tasks/work orders' },
  { name: 'Management', code: 'MANAGEMENT', description: 'Managerial and leadership effectiveness' },
];

/** KPI definitions. code must be UPPER_SNAKE and unique - referenced by kpiCalculationService's fetchActualValueFromSource. */
const DEFINITIONS = [
  { code: 'ATTENDANCE_RATE', name: 'Attendance Rate', category: 'ATTENDANCE', unit: '%', direction: 'HIGHER_IS_BETTER', target: 95, frequency: 'MONTHLY', dataSource: 'ATTENDANCE', level: 'EMPLOYEE' },
  { code: 'PUNCTUALITY', name: 'Punctuality', category: 'EFFICIENCY', unit: '%', direction: 'HIGHER_IS_BETTER', target: 90, frequency: 'MONTHLY', dataSource: 'ATTENDANCE', level: 'EMPLOYEE' },
  { code: 'PRODUCTION_TARGET_ACHIEVEMENT', name: 'Production Target Achievement', category: 'PRODUCTIVITY', unit: '%', direction: 'HIGHER_IS_BETTER', target: 100, frequency: 'MONTHLY', dataSource: 'PRODUCTION', level: 'EMPLOYEE' },
  { code: 'QUALITY_RATE', name: 'Quality Rate', category: 'QUALITY', unit: '%', direction: 'HIGHER_IS_BETTER', target: 98, frequency: 'MONTHLY', dataSource: 'PRODUCTION', level: 'EMPLOYEE' },
  { code: 'DEFECT_RATE', name: 'Defect Rate', category: 'QUALITY', unit: '%', direction: 'LOWER_IS_BETTER', target: 2, frequency: 'MONTHLY', dataSource: 'PRODUCTION', level: 'EMPLOYEE' },
  { code: 'SAFETY_INCIDENTS', name: 'Safety Incidents', category: 'SAFETY', unit: 'count', direction: 'LOWER_IS_BETTER', target: 0, frequency: 'MONTHLY', dataSource: 'PRODUCTION', level: 'EMPLOYEE' },
  { code: 'TASK_COMPLETION_RATE', name: 'Task Completion Rate', category: 'TASK_COMPLETION', unit: '%', direction: 'HIGHER_IS_BETTER', target: 95, frequency: 'MONTHLY', dataSource: 'MANUAL', level: 'EMPLOYEE' },
  { code: 'COST_EFFICIENCY', name: 'Cost Efficiency', category: 'COST', unit: '%', direction: 'HIGHER_IS_BETTER', target: 90, frequency: 'MONTHLY', dataSource: 'MANUAL', level: 'EMPLOYEE' },
  { code: 'MANAGEMENT_EFFECTIVENESS', name: 'Management Effectiveness', category: 'MANAGEMENT', unit: 'score', direction: 'HIGHER_IS_BETTER', target: 90, frequency: 'MONTHLY', dataSource: 'MANUAL', level: 'EMPLOYEE' },
];

const RATING_SCALES = [
  { min_score: 90, max_score: 100, rating_label: 'Outstanding', description: 'Consistently exceeds expectations' },
  { min_score: 80, max_score: 89.99, rating_label: 'Very Good', description: 'Frequently exceeds expectations' },
  { min_score: 70, max_score: 79.99, rating_label: 'Good', description: 'Meets expectations' },
  { min_score: 60, max_score: 69.99, rating_label: 'Satisfactory', description: 'Meets most expectations, some gaps' },
  { min_score: 0, max_score: 59.99, rating_label: 'Needs Improvement', description: 'Below expected performance level' },
];

/** Weighted KPI schemes by department code, split into manager vs non-manager tiers. Every scheme's weights sum to 100. */
const SCHEMES = {
  PROD: {
    manager: [['ATTENDANCE_RATE', 15], ['PRODUCTION_TARGET_ACHIEVEMENT', 25], ['QUALITY_RATE', 15], ['DEFECT_RATE', 10], ['SAFETY_INCIDENTS', 10], ['MANAGEMENT_EFFECTIVENESS', 25]],
    staff: [['ATTENDANCE_RATE', 20], ['PUNCTUALITY', 10], ['PRODUCTION_TARGET_ACHIEVEMENT', 30], ['QUALITY_RATE', 20], ['DEFECT_RATE', 10], ['SAFETY_INCIDENTS', 10]],
  },
  QA: {
    manager: [['ATTENDANCE_RATE', 15], ['QUALITY_RATE', 25], ['DEFECT_RATE', 20], ['MANAGEMENT_EFFECTIVENESS', 40]],
    staff: [['ATTENDANCE_RATE', 20], ['PUNCTUALITY', 15], ['QUALITY_RATE', 35], ['DEFECT_RATE', 30]],
  },
  MAINT: {
    manager: [['ATTENDANCE_RATE', 15], ['TASK_COMPLETION_RATE', 25], ['COST_EFFICIENCY', 20], ['MANAGEMENT_EFFECTIVENESS', 40]],
    staff: [['ATTENDANCE_RATE', 30], ['PUNCTUALITY', 20], ['TASK_COMPLETION_RATE', 30], ['COST_EFFICIENCY', 20]],
  },
  WH: {
    manager: [['ATTENDANCE_RATE', 15], ['TASK_COMPLETION_RATE', 25], ['COST_EFFICIENCY', 20], ['MANAGEMENT_EFFECTIVENESS', 40]],
    staff: [['ATTENDANCE_RATE', 30], ['PUNCTUALITY', 20], ['TASK_COMPLETION_RATE', 35], ['COST_EFFICIENCY', 15]],
  },
  HR: {
    manager: [['ATTENDANCE_RATE', 15], ['TASK_COMPLETION_RATE', 35], ['MANAGEMENT_EFFECTIVENESS', 50]],
    staff: [['ATTENDANCE_RATE', 30], ['PUNCTUALITY', 20], ['TASK_COMPLETION_RATE', 50]],
  },
  FIN: {
    manager: [['ATTENDANCE_RATE', 10], ['TASK_COMPLETION_RATE', 20], ['COST_EFFICIENCY', 25], ['MANAGEMENT_EFFECTIVENESS', 45]],
    staff: [['ATTENDANCE_RATE', 25], ['PUNCTUALITY', 15], ['TASK_COMPLETION_RATE', 30], ['COST_EFFICIENCY', 30]],
  },
  ADMIN: {
    manager: [['ATTENDANCE_RATE', 15], ['TASK_COMPLETION_RATE', 35], ['MANAGEMENT_EFFECTIVENESS', 50]],
    staff: [['ATTENDANCE_RATE', 35], ['PUNCTUALITY', 25], ['TASK_COMPLETION_RATE', 40]],
    ceo: [['ATTENDANCE_RATE', 10], ['MANAGEMENT_EFFECTIVENESS', 90]],
  },
};

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('kpi_categories', CATEGORIES.map((c) => ({ name: c.name, code: c.code, description: c.description, created_at: now, updated_at: now })));
    const [categories] = await queryInterface.sequelize.query('SELECT id, code FROM kpi_categories');
    const catId = Object.fromEntries(categories.map((c) => [c.code, c.id]));

    await queryInterface.bulkInsert(
      'kpi_definitions',
      DEFINITIONS.map((d) => ({
        code: d.code,
        name: d.name,
        description: `${d.name} - tracked ${d.frequency.toLowerCase()}, ${d.direction === 'HIGHER_IS_BETTER' ? 'higher is better' : 'lower is better'}`,
        category_id: catId[d.category],
        measurement_unit: d.unit,
        direction: d.direction,
        target_value: d.target,
        weight: 0, // default weight unused - every assignment supplies its own override weight
        frequency: d.frequency,
        calculation_type: 'RATIO',
        data_source: d.dataSource,
        level: d.level,
        department_id: null,
        designation_id: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      }))
    );
    const [definitions] = await queryInterface.sequelize.query('SELECT id, code FROM kpi_definitions');
    const defId = Object.fromEntries(definitions.map((d) => [d.code, d.id]));

    await queryInterface.bulkInsert('performance_rating_scales', RATING_SCALES.map((r) => ({ ...r, created_at: now, updated_at: now })));

    // ----- Evaluation periods: trailing 12 calendar months, MONTHLY -----
    const periodRows = [];
    for (let i = 11; i >= 0; i -= 1) {
      const monthStart = dayjs().subtract(i, 'month').startOf('month');
      const monthEnd = monthStart.endOf('month');
      periodRows.push({
        name: monthStart.format('MMMM YYYY'),
        type: 'MONTHLY',
        start_date: monthStart.format('YYYY-MM-DD'),
        end_date: monthEnd.format('YYYY-MM-DD'),
        status: i === 0 ? 'IN_PROGRESS' : 'CLOSED',
        created_at: now,
        updated_at: now,
      });
    }
    await queryInterface.bulkInsert('evaluation_periods', periodRows);

    // ----- KPI assignments, one row per (employee, KPI in their department scheme) -----
    const [employees] = await queryInterface.sequelize.query(`
      SELECT e.id, e.join_date, d.code AS dept_code, des.code AS desig_code
      FROM employees e
      JOIN departments d ON d.id = e.department_id
      JOIN designations des ON des.id = e.designation_id
      WHERE e.employment_status IN ('ACTIVE', 'ON_LEAVE', 'SUSPENDED')
    `);

    const assignmentRows = [];
    employees.forEach((emp) => {
      const scheme = SCHEMES[emp.dept_code];
      if (!scheme) return;

      let kpiList;
      if (emp.desig_code === 'CEO' && scheme.ceo) kpiList = scheme.ceo;
      else if (emp.desig_code === 'DEPT_MGR') kpiList = scheme.manager;
      else kpiList = scheme.staff;

      kpiList.forEach(([code, weight]) => {
        if (!defId[code]) return;
        assignmentRows.push({
          kpi_definition_id: defId[code],
          employee_id: emp.id,
          target_value: null,
          weight,
          effective_from: emp.join_date,
          effective_to: null,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      });
    });

    await queryInterface.bulkInsert('kpi_assignments', assignmentRows);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('kpi_assignments', null, {});
    await queryInterface.bulkDelete('evaluation_periods', null, {});
    await queryInterface.bulkDelete('performance_rating_scales', null, {});
    await queryInterface.bulkDelete('kpi_definitions', null, {});
    await queryInterface.bulkDelete('kpi_categories', null, {});
  },
};