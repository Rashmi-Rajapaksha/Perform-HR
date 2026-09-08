const { PAYROLL_STATUS } = require('../constants/statuses');

module.exports = (sequelize, DataTypes) => {
  const Payroll = sequelize.define(
    'Payroll',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: { type: DataTypes.INTEGER, allowNull: false },
      payroll_period_id: { type: DataTypes.INTEGER, allowNull: false },
      basic_salary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      gross_earnings: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_deductions: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      net_salary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      status: {
        type: DataTypes.ENUM(...Object.values(PAYROLL_STATUS)),
        allowNull: false,
        defaultValue: PAYROLL_STATUS.DRAFT,
      },
      processed_at: { type: DataTypes.DATE, allowNull: true },
      approved_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'payrolls',
      indexes: [{ unique: true, fields: ['employee_id', 'payroll_period_id'] }],
    }
  );

  Payroll.associate = (models) => {
    Payroll.belongsTo(models.Employee, { foreignKey: 'employee_id', as: 'employee' });
    Payroll.belongsTo(models.PayrollPeriod, { foreignKey: 'payroll_period_id', as: 'period' });
    Payroll.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approver' });
    Payroll.hasMany(models.PayrollItem, { foreignKey: 'payroll_id', as: 'items' });
  };

  return Payroll;
};