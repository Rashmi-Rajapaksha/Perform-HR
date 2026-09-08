module.exports = (sequelize, DataTypes) => {
  const KpiCategory = sequelize.define(
    'KpiCategory',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'kpi_categories' }
  );

  KpiCategory.associate = (models) => {
    KpiCategory.hasMany(models.KpiDefinition, { foreignKey: 'category_id', as: 'kpiDefinitions' });
  };

  return KpiCategory;
};