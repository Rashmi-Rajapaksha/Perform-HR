module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('designations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('employment_types', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      description: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    // Wire up remaining FKs deferred from 004-create-employees.js
    await queryInterface.addConstraint('employees', {
      fields: ['designation_id'],
      type: 'foreign key',
      name: 'fk_employees_designation_id',
      references: { table: 'designations', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('employees', {
      fields: ['employment_type_id'],
      type: 'foreign key',
      name: 'fk_employees_employment_type_id',
      references: { table: 'employment_types', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('employees', {
      fields: ['reporting_manager_id'],
      type: 'foreign key',
      name: 'fk_employees_reporting_manager_id',
      references: { table: 'employees', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addConstraint('employee_employment_history', {
      fields: ['designation_id'],
      type: 'foreign key',
      name: 'fk_history_designation_id',
      references: { table: 'designations', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint('employee_employment_history', 'fk_history_designation_id');
    await queryInterface.removeConstraint('employees', 'fk_employees_reporting_manager_id');
    await queryInterface.removeConstraint('employees', 'fk_employees_employment_type_id');
    await queryInterface.removeConstraint('employees', 'fk_employees_designation_id');
    await queryInterface.dropTable('employment_types');
    await queryInterface.dropTable('designations');
  },
};