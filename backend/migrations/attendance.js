module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('attendance_records', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'employees', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      shift_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'shifts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      check_in: { type: Sequelize.DATE, allowNull: true },
      check_out: { type: Sequelize.DATE, allowNull: true },
      regular_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      late_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      early_leave_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      overtime_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY', 'HOLIDAY', 'OFF_DAY'),
        allowNull: false,
        defaultValue: 'PRESENT',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('attendance_records', ['employee_id', 'date'], { unique: true, name: 'ux_attendance_employee_date' });

    await queryInterface.createTable('leave_types', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      is_paid: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      max_days_per_year: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 14 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('employee_leaves', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'employees', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      leave_type_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'leave_types', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      days: { type: Sequelize.DECIMAL(4, 1), allowNull: false, defaultValue: 1 },
      status: { type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'), allowNull: false, defaultValue: 'PENDING' },
      reason: { type: Sequelize.STRING(255), allowNull: true },
      approved_by: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('holidays', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      date: { type: Sequelize.DATEONLY, allowNull: false, unique: true },
      is_recurring: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('holidays');
    await queryInterface.dropTable('employee_leaves');
    await queryInterface.dropTable('leave_types');
    await queryInterface.dropTable('attendance_records');
  },
};