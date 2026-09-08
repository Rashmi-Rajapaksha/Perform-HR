module.exports = (sequelize, DataTypes) => {
  const Designation = sequelize.define(
    'Designation',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    },
    { tableName: 'designations' }
  );

  Designation.associate = (models) => {
    Designation.hasMany(models.Employee, { foreignKey: 'designation_id', as: 'employees' });
    Designation.hasMany(models.KpiDefinition, { foreignKey: 'designation_id', as: 'kpiDefinitions' });
  };

  return Designation;
};