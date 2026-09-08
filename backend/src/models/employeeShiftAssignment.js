module.exports = (sequelize, DataTypes) => {
  const EmployeeShiftAssignment = sequelize.define(
    'EmployeeShiftAssignment',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: { type: DataTypes.INTEGER, allowNull: false },
      shift_id: { type: DataTypes.INTEGER, allowNull: false },
      effective_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
    },
    { tableName: 'employee_shift_assignments' }
  );

  EmployeeShiftAssignment.associate = (models) => {
    EmployeeShiftAssignment.belongsTo(models.Employee, { foreignKey: 'employee_id', as: 'employee' });
    EmployeeShiftAssignment.belongsTo(models.Shift, { foreignKey: 'shift_id', as: 'shift' });
  };

  return EmployeeShiftAssignment;
};