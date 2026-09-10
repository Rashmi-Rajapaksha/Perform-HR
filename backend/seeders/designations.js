const DESIGNATIONS = [
  { name: 'Chief Executive Officer', code: 'CEO', level: 7 },
  { name: 'Department Manager', code: 'DEPT_MGR', level: 6 },
  { name: 'Assistant Manager', code: 'ASST_MGR', level: 5 },
  { name: 'Supervisor', code: 'SUPERVISOR', level: 4 },
  { name: 'Senior Officer', code: 'SR_OFFICER', level: 3 },
  { name: 'Machine Operator', code: 'MACHINE_OP', level: 2 },
  { name: 'Quality Inspector', code: 'QC_INSPECTOR', level: 2 },
  { name: 'Maintenance Technician', code: 'MAINT_TECH', level: 2 },
  { name: 'Warehouse Assistant', code: 'WH_ASSISTANT', level: 2 },
  { name: 'HR Officer', code: 'HR_OFFICER', level: 3 },
  { name: 'Finance Officer', code: 'FIN_OFFICER', level: 3 },
  { name: 'Administrative Assistant', code: 'ADMIN_ASST', level: 2 },
  { name: 'Production Operator', code: 'PROD_OP', level: 1 },
  { name: 'Trainee', code: 'TRAINEE', level: 1 },
];

const EMPLOYMENT_TYPES = [
  { name: 'PERMANENT', description: 'Permanent, full-time employment' },
  { name: 'CONTRACT', description: 'Fixed-term contract employment' },
  { name: 'PROBATION', description: 'Employee currently under a probationary period' },
  { name: 'INTERN', description: 'Internship / trainee placement' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert('designations', DESIGNATIONS.map((d) => ({ ...d, created_at: now, updated_at: now })));
    await queryInterface.bulkInsert('employment_types', EMPLOYMENT_TYPES.map((t) => ({ ...t, created_at: now, updated_at: now })));
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('employment_types', null, {});
    await queryInterface.bulkDelete('designations', null, {});
  },
};