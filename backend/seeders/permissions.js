const { PERMISSION_LIST, ROLE_PERMISSION_MAP } = require('../src/constants/permissions');

function moduleOf(code) {
  return code.split('_')[0];
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    await queryInterface.bulkInsert(
      'permissions',
      PERMISSION_LIST.map((code) => ({ code, module: moduleOf(code), description: code.replace(/_/g, ' '), created_at: now, updated_at: now }))
    );

    const [roles] = await queryInterface.sequelize.query('SELECT id, name FROM roles');
    const [permissions] = await queryInterface.sequelize.query('SELECT id, code FROM permissions');
    const roleIdByName = Object.fromEntries(roles.map((r) => [r.name, r.id]));
    const permIdByCode = Object.fromEntries(permissions.map((p) => [p.code, p.id]));

    const rolePermissionRows = [];
    Object.entries(ROLE_PERMISSION_MAP).forEach(([roleName, codes]) => {
      codes.forEach((code) => {
        if (roleIdByName[roleName] && permIdByCode[code]) {
          rolePermissionRows.push({
            role_id: roleIdByName[roleName],
            permission_id: permIdByCode[code],
            created_at: now,
            updated_at: now,
          });
        }
      });
    });

    await queryInterface.bulkInsert('role_permissions', rolePermissionRows);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('role_permissions', null, {});
    await queryInterface.bulkDelete('permissions', null, {});
  },
};