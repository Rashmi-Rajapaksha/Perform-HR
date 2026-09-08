module.exports = (sequelize, DataTypes) => {
  const PerformanceRatingScale = sequelize.define(
    'PerformanceRatingScale',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      min_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
      max_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
      rating_label: { type: DataTypes.STRING(40), allowNull: false }, // Outstanding, Very Good, Good, Satisfactory, Needs Improvement
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'performance_rating_scales' }
  );

  PerformanceRatingScale.associate = (models) => {
    PerformanceRatingScale.hasMany(models.PerformanceEvaluation, { foreignKey: 'rating_scale_id', as: 'evaluations' });
  };

  return PerformanceRatingScale;
};