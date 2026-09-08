const { EVALUATION_STATUS } = require('../constants/statuses');

module.exports = (sequelize, DataTypes) => {
  const PerformanceEvaluation = sequelize.define(
    'PerformanceEvaluation',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: { type: DataTypes.INTEGER, allowNull: false },
      evaluation_period_id: { type: DataTypes.INTEGER, allowNull: false },
      kpi_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      manager_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      final_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      rating_scale_id: { type: DataTypes.INTEGER, allowNull: true },
      strengths: { type: DataTypes.TEXT, allowNull: true },
      weaknesses: { type: DataTypes.TEXT, allowNull: true },
      manager_comments: { type: DataTypes.TEXT, allowNull: true },
      employee_comments: { type: DataTypes.TEXT, allowNull: true },
      reviewer_id: { type: DataTypes.INTEGER, allowNull: true },
      status: {
        type: DataTypes.ENUM(...Object.values(EVALUATION_STATUS)),
        allowNull: false,
        defaultValue: EVALUATION_STATUS.DRAFT,
      },
    },
    {
      tableName: 'performance_evaluations',
      indexes: [{ unique: true, fields: ['employee_id', 'evaluation_period_id'] }],
    }
  );

  PerformanceEvaluation.associate = (models) => {
    PerformanceEvaluation.belongsTo(models.Employee, { foreignKey: 'employee_id', as: 'employee' });
    PerformanceEvaluation.belongsTo(models.EvaluationPeriod, { foreignKey: 'evaluation_period_id', as: 'period' });
    PerformanceEvaluation.belongsTo(models.PerformanceRatingScale, { foreignKey: 'rating_scale_id', as: 'rating' });
    PerformanceEvaluation.belongsTo(models.User, { foreignKey: 'reviewer_id', as: 'reviewer' });
    PerformanceEvaluation.hasMany(models.PerformanceEvaluationDetail, { foreignKey: 'performance_evaluation_id', as: 'details' });
    PerformanceEvaluation.hasMany(models.ImprovementPlan, { foreignKey: 'performance_evaluation_id', as: 'improvementPlans' });
  };

  return PerformanceEvaluation;
};