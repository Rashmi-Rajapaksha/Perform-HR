const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const [roles] = await queryInterface.sequelize.query('SELECT id, name FROM roles');
    const roleIdByName = Object.fromEntries(roles.map((r) => [r.name, r.id]));

    const passwordHash = await bcrypt.hash('Admin@12345', 10);
    const managerPasswordHash = await bcrypt.hash('Manager@12345', 10);
    const hrPasswordHash = await bcrypt.hash('HrManager@12345', 10);
    const employeePasswordHash = await bcrypt.hash('Employee@12345', 10);

    // NOTE: employee_id for the HR/Manager/Employee demo accounts is
    // linked after 007-employees.js runs, via seeder 007 itself (it
    // updates these users once employee rows exist). Here we only create
    // the ADMIN account, which has no employee profile, plus placeholder
    // login accounts for the demo HR/Manager/Employee users.
    await queryInterface.bulkInsert('users', [
      {
        username: 'admin',
        email: 'admin@hrplus.local',
        password_hash: passwordHash,
        role_id: roleIdByName.ADMIN,
        employee_id: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        username: 'hr.manager',
        email: 'hr.manager@hrplus.local',
        password_hash: hrPasswordHash,
        role_id: roleIdByName.HR_MANAGER,
        employee_id: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        username: 'dept.manager',
        email: 'dept.manager@hrplus.local',
        password_hash: managerPasswordHash,
        role_id: roleIdByName.MANAGER,
        employee_id: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        username: 'employee.demo',
        email: 'employee.demo@hrplus.local',
        password_hash: employeePasswordHash,
        role_id: roleIdByName.EMPLOYEE,
        employee_id: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', null, {});
  },
};