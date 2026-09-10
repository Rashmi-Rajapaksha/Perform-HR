const DEPARTMENTS = [
  { name: 'Production', code: 'PROD', description: 'Manufacturing and assembly operations' },
  { name: 'Quality Assurance', code: 'QA', description: 'Product quality inspection and control' },
  { name: 'Maintenance', code: 'MAINT', description: 'Equipment and facility maintenance' },
  { name: 'Warehouse', code: 'WH', description: 'Inventory, storage, and logistics' },
  { name: 'Human Resources', code: 'HR', description: 'Recruitment, HR operations, and employee relations' },
  { name: 'Finance', code: 'FIN', description: 'Accounting, payroll funding, and financial planning' },
  { name: 'Administration', code: 'ADMIN', description: 'General administration and executive support' },
];

const SECTIONS_BY_DEPARTMENT = {
  PROD: ['Assembly Line 1', 'Assembly Line 2', 'Packaging'],
  QA: ['Incoming Inspection', 'In-Process QC', 'Final Inspection'],
  MAINT: ['Mechanical', 'Electrical'],
  WH: ['Raw Materials Store', 'Finished Goods Store'],
  HR: ['Recruitment', 'Employee Relations'],
  FIN: ['Accounts Payable', 'Payroll & Compensation'],
  ADMIN: ['Executive Office', 'General Administration'],
};

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert(
      'departments',
      DEPARTMENTS.map((d) => ({ ...d, is_active: true, created_at: now, updated_at: now }))
    );

    const [departments] = await queryInterface.sequelize.query('SELECT id, code FROM departments');
    const deptIdByCode = Object.fromEntries(departments.map((d) => [d.code, d.id]));

    const sectionRows = [];
    Object.entries(SECTIONS_BY_DEPARTMENT).forEach(([deptCode, sectionNames]) => {
      sectionNames.forEach((name, idx) => {
        sectionRows.push({
          department_id: deptIdByCode[deptCode],
          name,
          code: `${deptCode}-S${idx + 1}`,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      });
    });

    await queryInterface.bulkInsert('sections', sectionRows);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('sections', null, {});
    await queryInterface.bulkDelete('departments', null, {});
  },
};