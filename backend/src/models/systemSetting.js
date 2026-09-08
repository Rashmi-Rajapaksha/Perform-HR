module.exports = (sequelize, DataTypes) => {
  const SystemSetting = sequelize.define(
    'SystemSetting',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      value: { type: DataTypes.STRING(500), allowNull: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'system_settings' }
  );

  SystemSetting.associate = () => {};

  return SystemSetting;
};