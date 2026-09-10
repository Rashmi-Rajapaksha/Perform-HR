const { ROLE_LIST } = require('../src/constants/roles');

const descriptions = {
  ADMIN: 'Full system access - IT/system administration',
  HR_MANAGER: 'Manages employees, payroll, attendance, and performance across the organization',
  MANAGER: 'Manages direct reports, approves leave, reviews performance within their department',
  EMPLOYEE: 'Self-service access to own attendance, payslips, and performance data',
};

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert(
      'roles',
      ROLE_LIST.map((name) => ({ name, description: descriptions[name], created_at: now, updated_at: now }))
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('roles', null, {});
  },
};