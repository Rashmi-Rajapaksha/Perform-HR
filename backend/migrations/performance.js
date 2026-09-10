module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('performance_evaluations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'employees', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      evaluation_period_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'evaluation_periods', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      kpi_score: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      manager_score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      final_score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      rating_scale_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'performance_rating_scales', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      strengths: { type: Sequelize.TEXT, allowNull: true },
      weaknesses: { type: Sequelize.TEXT, allowNull: true },
      manager_comments: { type: Sequelize.TEXT, allowNull: true },
      employee_comments: { type: Sequelize.TEXT, allowNull: true },
      reviewer_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      status: { type: Sequelize.ENUM('DRAFT', 'SUBMITTED', 'MANAGER_REVIEWED', 'FINALIZED'), allowNull: false, defaultValue: 'DRAFT' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('performance_evaluations', ['employee_id', 'evaluation_period_id'], { unique: true, name: 'ux_eval_employee_period' });

    await queryInterface.createTable('performance_evaluation_details', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      performance_evaluation_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'performance_evaluations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      kpi_definition_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'kpi_definitions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      target_value: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      actual_value: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      achievement_percentage: { type: Sequelize.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      weight: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      weighted_score: { type: Sequelize.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('performance_evaluation_details');
    await queryInterface.dropTable('performance_evaluations');
  },
};