/**
 * NOTE: `roles` itself is created in 001-create-users.js since `users`
 * has a mandatory FK to it. This migration adds the permission tables
 * that complete the RBAC model (permissions + the role<->permission
 * join table), per the numbered migration list in the project spec.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('permissions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      code: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      module: { type: Sequelize.STRING(50), allowNull: false },
      description: { type: Sequelize.STRING(255) },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('role_permissions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      permission_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'permissions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('role_permissions', ['role_id', 'permission_id'], { unique: true, name: 'ux_role_permissions' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('role_permissions');
    await queryInterface.dropTable('permissions');
  },
};