const { ATTENDANCE_STATUS } = require('../constants/statuses');

module.exports = (sequelize, DataTypes) => {
  const AttendanceRecord = sequelize.define(
    'AttendanceRecord',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: { type: DataTypes.INTEGER, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      shift_id: { type: DataTypes.INTEGER, allowNull: true },
      check_in: { type: DataTypes.DATE, allowNull: true },
      check_out: { type: DataTypes.DATE, allowNull: true },
      regular_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      late_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      early_leave_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      overtime_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      status: {
        type: DataTypes.ENUM(...Object.values(ATTENDANCE_STATUS)),
        allowNull: false,
        defaultValue: ATTENDANCE_STATUS.PRESENT,
      },
    },
    {
      tableName: 'attendance_records',
      indexes: [{ unique: true, fields: ['employee_id', 'date'] }],
    }
  );

  AttendanceRecord.associate = (models) => {
    AttendanceRecord.belongsTo(models.Employee, { foreignKey: 'employee_id', as: 'employee' });
    AttendanceRecord.belongsTo(models.Shift, { foreignKey: 'shift_id', as: 'shift' });
  };

  return AttendanceRecord;
};