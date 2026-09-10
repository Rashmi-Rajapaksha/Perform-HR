module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('departments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      description: { type: Sequelize.STRING(255), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('sections', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'departments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(100), allowNull: false },
      code: { type: Sequelize.STRING(20), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('sections', ['department_id', 'code'], { unique: true, name: 'ux_sections_dept_code' });

    // Now that departments/sections exist, wire up the FKs deferred from 004-create-employees.js
    await queryInterface.addConstraint('employees', {
      fields: ['department_id'],
      type: 'foreign key',
      name: 'fk_employees_department_id',
      references: { table: 'departments', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('employees', {
      fields: ['section_id'],
      type: 'foreign key',
      name: 'fk_employees_section_id',
      references: { table: 'sections', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addConstraint('employee_employment_history', {
      fields: ['department_id'],
      type: 'foreign key',
      name: 'fk_history_department_id',
      references: { table: 'departments', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint('employee_employment_history', 'fk_history_department_id');
    await queryInterface.removeConstraint('employees', 'fk_employees_section_id');
    await queryInterface.removeConstraint('employees', 'fk_employees_department_id');
    await queryInterface.dropTable('sections');
    await queryInterface.dropTable('departments');
  },
};