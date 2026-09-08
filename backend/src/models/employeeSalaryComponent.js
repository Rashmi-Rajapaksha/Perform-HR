module.exports = (sequelize, DataTypes) => {
  const EmployeeSalaryComponent = sequelize.define(
    'EmployeeSalaryComponent',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: { type: DataTypes.INTEGER, allowNull: false },
      salary_component_id: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      effective_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
    },
    { tableName: 'employee_salary_components' }
  );

  EmployeeSalaryComponent.associate = (models) => {
    EmployeeSalaryComponent.belongsTo(models.Employee, { foreignKey: 'employee_id', as: 'employee' });
    EmployeeSalaryComponent.belongsTo(models.SalaryComponent, { foreignKey: 'salary_component_id', as: 'component' });
  };

  return EmployeeSalaryComponent;
};