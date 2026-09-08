module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define(
    'Department',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'departments' }
  );

  Department.associate = (models) => {
    Department.hasMany(models.Section, { foreignKey: 'department_id', as: 'sections' });
    Department.hasMany(models.Employee, { foreignKey: 'department_id', as: 'employees' });
    Department.hasMany(models.KpiDefinition, { foreignKey: 'department_id', as: 'kpiDefinitions' });
  };

  return Department;
};