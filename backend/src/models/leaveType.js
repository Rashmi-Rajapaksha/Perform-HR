module.exports = (sequelize, DataTypes) => {
  const LeaveType = sequelize.define(
    'LeaveType',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      is_paid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      max_days_per_year: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 14 },
    },
    { tableName: 'leave_types' }
  );

  LeaveType.associate = (models) => {
    LeaveType.hasMany(models.EmployeeLeave, { foreignKey: 'leave_type_id', as: 'employeeLeaves' });
  };

  return LeaveType;
};