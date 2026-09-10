module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('production_records', {
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
      target_units: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      produced_units: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      defective_units: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      rework_units: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      downtime_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      safety_incidents: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('production_records', ['employee_id', 'date'], { unique: true, name: 'ux_production_employee_date' });

    await queryInterface.createTable('improvement_plans', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'employees', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      performance_evaluation_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'performance_evaluations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      created_by: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      description: { type: Sequelize.TEXT, allowNull: false },
      target_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'), allowNull: false, defaultValue: 'OPEN' },
      review_notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('improvement_plans');
    await queryInterface.dropTable('production_records');
  },
};