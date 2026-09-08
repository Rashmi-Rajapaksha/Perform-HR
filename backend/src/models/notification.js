const { NOTIFICATION_TYPE } = require('../constants/statuses');

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(150), allowNull: false },
      message: { type: DataTypes.STRING(500), allowNull: false },
      type: { type: DataTypes.ENUM(...Object.values(NOTIFICATION_TYPE)), allowNull: false, defaultValue: 'INFO' },
      is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'notifications' }
  );

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return Notification;
};