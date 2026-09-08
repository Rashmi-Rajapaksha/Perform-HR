module.exports = (sequelize, DataTypes) => {
  const PayrollItem = sequelize.define(
    'PayrollItem',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      payroll_id: { type: DataTypes.INTEGER, allowNull: false },
      salary_component_id: { type: DataTypes.INTEGER, allowNull: true },
      component_name: { type: DataTypes.STRING(80), allowNull: false },
      type: { type: DataTypes.ENUM('EARNING', 'DEDUCTION'), allowNull: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    },
    { tableName: 'payroll_items' }
  );

  PayrollItem.associate = (models) => {
    PayrollItem.belongsTo(models.Payroll, { foreignKey: 'payroll_id', as: 'payroll' });
    PayrollItem.belongsTo(models.SalaryComponent, { foreignKey: 'salary_component_id', as: 'component' });
  };

  return PayrollItem;
};