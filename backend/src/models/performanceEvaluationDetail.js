module.exports = (sequelize, DataTypes) => {
  const PerformanceEvaluationDetail = sequelize.define(
    'PerformanceEvaluationDetail',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      performance_evaluation_id: { type: DataTypes.INTEGER, allowNull: false },
      kpi_definition_id: { type: DataTypes.INTEGER, allowNull: false },
      target_value: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      actual_value: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      achievement_percentage: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      weight: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      weighted_score: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
    },
    { tableName: 'performance_evaluation_details' }
  );

  PerformanceEvaluationDetail.associate = (models) => {
    PerformanceEvaluationDetail.belongsTo(models.PerformanceEvaluation, { foreignKey: 'performance_evaluation_id', as: 'evaluation' });
    PerformanceEvaluationDetail.belongsTo(models.KpiDefinition, { foreignKey: 'kpi_definition_id', as: 'kpiDefinition' });
  };

  return PerformanceEvaluationDetail;
};