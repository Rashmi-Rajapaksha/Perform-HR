const { KPI_DIRECTION, KPI_FREQUENCY, KPI_DATA_SOURCE, KPI_LEVEL, KPI_CALCULATION_TYPE } = require('../constants/kpi');

module.exports = (sequelize, DataTypes) => {
  const KpiDefinition = sequelize.define(
    'KpiDefinition',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      description: { type: DataTypes.STRING(500), allowNull: true },
      category_id: { type: DataTypes.INTEGER, allowNull: false },

      measurement_unit: { type: DataTypes.STRING(30), allowNull: false }, // %, units, minutes, count...
      direction: { type: DataTypes.ENUM(...Object.values(KPI_DIRECTION)), allowNull: false },
      target_value: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      weight: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 }, // percentage points
      frequency: { type: DataTypes.ENUM(...Object.values(KPI_FREQUENCY)), allowNull: false },
      calculation_type: { type: DataTypes.ENUM(...Object.values(KPI_CALCULATION_TYPE)), allowNull: false, defaultValue: 'RATIO' },
      data_source: { type: DataTypes.ENUM(...Object.values(KPI_DATA_SOURCE)), allowNull: false, defaultValue: 'MANUAL' },

      level: { type: DataTypes.ENUM(...Object.values(KPI_LEVEL)), allowNull: false, defaultValue: KPI_LEVEL.EMPLOYEE },
      department_id: { type: DataTypes.INTEGER, allowNull: true },
      designation_id: { type: DataTypes.INTEGER, allowNull: true },

      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'kpi_definitions' }
  );

  KpiDefinition.associate = (models) => {
    KpiDefinition.belongsTo(models.KpiCategory, { foreignKey: 'category_id', as: 'category' });
    KpiDefinition.belongsTo(models.Department, { foreignKey: 'department_id', as: 'department' });
    KpiDefinition.belongsTo(models.Designation, { foreignKey: 'designation_id', as: 'designation' });
    KpiDefinition.hasMany(models.KpiAssignment, { foreignKey: 'kpi_definition_id', as: 'assignments' });
    KpiDefinition.hasMany(models.PerformanceEvaluationDetail, { foreignKey: 'kpi_definition_id', as: 'evaluationDetails' });
  };

  return KpiDefinition;
};