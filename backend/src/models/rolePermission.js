module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define(
    'RolePermission',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      role_id: { type: DataTypes.INTEGER, allowNull: false },
      permission_id: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: 'role_permissions',
      indexes: [{ unique: true, fields: ['role_id', 'permission_id'] }],
    }
  );

  RolePermission.associate = (models) => {
    RolePermission.belongsTo(models.Role, { foreignKey: 'role_id' });
    RolePermission.belongsTo(models.Permission, { foreignKey: 'permission_id' });
  };

  return RolePermission;
};