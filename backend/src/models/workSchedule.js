const { WORK_SCHEDULE_TYPE } = require('../constants/statuses');

module.exports = (sequelize, DataTypes) => {
  const WorkSchedule = sequelize.define(
    'WorkSchedule',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(80), allowNull: false },
      type: { type: DataTypes.ENUM(...Object.values(WORK_SCHEDULE_TYPE)), allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'work_schedules' }
  );

  WorkSchedule.associate = () => {};

  return WorkSchedule;
};