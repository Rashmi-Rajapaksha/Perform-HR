module.exports = (sequelize, DataTypes) => {
  const EvaluationPeriod = sequelize.define(
    'EvaluationPeriod',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(60), allowNull: false, unique: true }, // e.g. "January 2026"
      type: { type: DataTypes.ENUM('MONTHLY', 'QUARTERLY'), allowNull: false },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: false },
      status: { type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'CLOSED'), allowNull: false, defaultValue: 'OPEN' },
    },
    { tableName: 'evaluation_periods' }
  );

  EvaluationPeriod.associate = (models) => {
    EvaluationPeriod.hasMany(models.PerformanceEvaluation, { foreignKey: 'evaluation_period_id', as: 'evaluations' });
  };

  return EvaluationPeriod;
};