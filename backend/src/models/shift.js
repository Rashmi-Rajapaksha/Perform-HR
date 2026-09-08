module.exports = (sequelize, DataTypes) => {
  const Shift = sequelize.define(
    'Shift',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(50), allowNull: false },
      code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      start_time: { type: DataTypes.TIME, allowNull: false },
      end_time: { type: DataTypes.TIME, allowNull: false },
      is_night_shift: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'shifts' }
  );

  Shift.associate = (models) => {
    Shift.hasMany(models.EmployeeShiftAssignment, { foreignKey: 'shift_id', as: 'assignments' });
    Shift.hasMany(models.AttendanceRecord, { foreignKey: 'shift_id', as: 'attendanceRecords' });
    Shift.hasMany(models.ProductionRecord, { foreignKey: 'shift_id', as: 'productionRecords' });
  };

  return Shift;
};