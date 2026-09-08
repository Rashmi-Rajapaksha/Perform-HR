module.exports = (sequelize, DataTypes) => {
  const Holiday = sequelize.define(
    'Holiday',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
      is_recurring: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'holidays' }
  );

  Holiday.associate = () => {};

  return Holiday;
};