module.exports = (sequelize, DataTypes) => {
    const Role = sequelize.define(
        'Role',
        {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
            description: { type: DataTypes.STRING(255), allowNull: true },
        },
        { tableName: 'roles' }
    );

    Role.associate = (models) => {
        Role.hasMany(models.User, { foreignKey: 'role_id', as: 'users' });
        Role.belongsToMany(models.Permission, { through: models.RolePermission, foreignKey: 'role_id', otherKey: 'permission_id', as: 'permissions' });
    };
    return Role;
};