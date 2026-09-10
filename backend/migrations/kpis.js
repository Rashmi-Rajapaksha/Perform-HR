module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('kpi_categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      description: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('kpi_definitions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(120), allowNull: false },
      description: { type: Sequelize.STRING(500), allowNull: true },
      category_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'kpi_categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      measurement_unit: { type: Sequelize.STRING(30), allowNull: false },
      direction: { type: Sequelize.ENUM('HIGHER_IS_BETTER', 'LOWER_IS_BETTER'), allowNull: false },
      target_value: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      weight: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      frequency: { type: Sequelize.ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'), allowNull: false },
      calculation_type: { type: Sequelize.ENUM('RATIO', 'SUM', 'AVERAGE', 'COUNT'), allowNull: false, defaultValue: 'RATIO' },
      data_source: { type: Sequelize.ENUM('MANUAL', 'ATTENDANCE', 'PAYROLL', 'PRODUCTION', 'SYSTEM', 'IMPORT'), allowNull: false, defaultValue: 'MANUAL' },
      level: { type: Sequelize.ENUM('ORGANIZATION', 'DEPARTMENT', 'DESIGNATION', 'EMPLOYEE'), allowNull: false, defaultValue: 'EMPLOYEE' },
      department_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'departments', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      designation_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'designations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('kpi_assignments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kpi_definition_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'kpi_definitions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      employee_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'employees', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      target_value: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      weight: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      effective_from: { type: Sequelize.DATEONLY, allowNull: false },
      effective_to: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('kpi_measurements', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kpi_assignment_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'kpi_assignments', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      period_start: { type: Sequelize.DATEONLY, allowNull: false },
      period_end: { type: Sequelize.DATEONLY, allowNull: false },
      actual_value: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      achievement_percentage: { type: Sequelize.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      weighted_score: { type: Sequelize.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      source: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'MANUAL' },
      recorded_by: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      recorded_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('kpi_measurements', ['kpi_assignment_id', 'period_start', 'period_end'], { unique: true, name: 'ux_kpi_measurement_period' });

    await queryInterface.createTable('evaluation_periods', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      type: { type: Sequelize.ENUM('MONTHLY', 'QUARTERLY'), allowNull: false },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.ENUM('OPEN', 'IN_PROGRESS', 'CLOSED'), allowNull: false, defaultValue: 'OPEN' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('performance_rating_scales', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      min_score: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      max_score: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      rating_label: { type: Sequelize.STRING(40), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('performance_rating_scales');
    await queryInterface.dropTable('evaluation_periods');
    await queryInterface.dropTable('kpi_measurements');
    await queryInterface.dropTable('kpi_assignments');
    await queryInterface.dropTable('kpi_definitions');
    await queryInterface.dropTable('kpi_categories');
  },
};