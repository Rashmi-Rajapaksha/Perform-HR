module.exports = (sequelize, DataTypes) => {
  const SalaryComponent = sequelize.define(
    'SalaryComponent',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(80), allowNull: false },
      code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      type: { type: DataTypes.ENUM('EARNING', 'DEDUCTION'), allowNull: false },
      calculation_type: { type: DataTypes.ENUM('FIXED', 'PERCENTAGE', 'FORMULA'), allowNull: false, defaultValue: 'FIXED' },
      is_taxable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'salary_components' }
  );

  SalaryComponent.associate = (models) => {
    SalaryComponent.hasMany(models.EmployeeSalaryComponent, { foreignKey: 'salary_component_id', as: 'employeeComponents' });
    SalaryComponent.hasMany(models.PayrollItem, { foreignKey: 'salary_component_id', as: 'payrollItems' });
  };

  return SalaryComponent;
};