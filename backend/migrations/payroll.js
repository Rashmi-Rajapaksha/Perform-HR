module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('salary_components', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(80), allowNull: false },
      code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      type: { type: Sequelize.ENUM('EARNING', 'DEDUCTION'), allowNull: false },
      calculation_type: { type: Sequelize.ENUM('FIXED', 'PERCENTAGE', 'FORMULA'), allowNull: false, defaultValue: 'FIXED' },
      is_taxable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('employee_salary_components', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'employees', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      salary_component_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'salary_components', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      effective_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('payroll_periods', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.ENUM('OPEN', 'PROCESSING', 'CLOSED'), allowNull: false, defaultValue: 'OPEN' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('payrolls', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'employees', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      payroll_period_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'payroll_periods', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      basic_salary: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      gross_earnings: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_deductions: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      net_salary: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('DRAFT', 'CALCULATED', 'REVIEWED', 'APPROVED', 'PAID', 'CANCELLED'),
        allowNull: false, defaultValue: 'DRAFT',
      },
      processed_at: { type: Sequelize.DATE, allowNull: true },
      approved_by: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('payrolls', ['employee_id', 'payroll_period_id'], { unique: true, name: 'ux_payroll_employee_period' });

    await queryInterface.createTable('payroll_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      payroll_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'payrolls', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      salary_component_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'salary_components', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      component_name: { type: Sequelize.STRING(80), allowNull: false },
      type: { type: Sequelize.ENUM('EARNING', 'DEDUCTION'), allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('payroll_items');
    await queryInterface.dropTable('payrolls');
    await queryInterface.dropTable('payroll_periods');
    await queryInterface.dropTable('employee_salary_components');
    await queryInterface.dropTable('salary_components');
  },
};