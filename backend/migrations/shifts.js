module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('shifts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(50), allowNull: false },
      code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      start_time: { type: Sequelize.TIME, allowNull: false },
      end_time: { type: Sequelize.TIME, allowNull: false },
      is_night_shift: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('work_schedules', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(80), allowNull: false },
      type: { type: Sequelize.ENUM('FIXED', 'ROTATING'), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('employee_shift_assignments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'employees', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      shift_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'shifts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      effective_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('employee_shift_assignments', ['employee_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('employee_shift_assignments');
    await queryInterface.dropTable('work_schedules');
    await queryInterface.dropTable('shifts');
  },
};