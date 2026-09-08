module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER, allowNull: true },
      action: { type: DataTypes.STRING(30), allowNull: false }, // CREATE, UPDATE, DELETE, LOGIN, LOGOUT
      module: { type: DataTypes.STRING(50), allowNull: false },
      entity_type: { type: DataTypes.STRING(50), allowNull: true },
      entity_id: { type: DataTypes.INTEGER, allowNull: true },
      old_values: { type: DataTypes.JSON, allowNull: true },
      new_values: { type: DataTypes.JSON, allowNull: true },
      ip_address: { type: DataTypes.STRING(45), allowNull: true },
    },
    { tableName: 'audit_logs', updatedAt: false }
  );

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return AuditLog;
};