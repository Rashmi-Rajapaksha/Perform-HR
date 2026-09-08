module.exports = (sequelize, DataTypes) => {
  const EmploymentHistory = sequelize.define(
    'EmploymentHistory',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: { type: DataTypes.INTEGER, allowNull: false },
      department_id: { type: DataTypes.INTEGER, allowNull: true },
      designation_id: { type: DataTypes.INTEGER, allowNull: true },
      effective_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
      change_type: {
        type: DataTypes.ENUM('HIRE', 'PROMOTION', 'TRANSFER', 'DEMOTION', 'SALARY_CHANGE', 'STATUS_CHANGE', 'TERMINATION'),
        allowNull: false,
      },
      remarks: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'employee_employment_history' }
  );

  EmploymentHistory.associate = (models) => {
    EmploymentHistory.belongsTo(models.Employee, { foreignKey: 'employee_id', as: 'employee' });
    EmploymentHistory.belongsTo(models.Department, { foreignKey: 'department_id', as: 'department' });
    EmploymentHistory.belongsTo(models.Designation, { foreignKey: 'designation_id', as: 'designation' });
  };

  return EmploymentHistory;
};