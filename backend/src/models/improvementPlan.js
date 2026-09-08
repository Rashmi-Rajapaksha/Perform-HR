const { IMPROVEMENT_PLAN_STATUS } = require('../constants/statuses');

module.exports = (sequelize, DataTypes) => {
  const ImprovementPlan = sequelize.define(
    'ImprovementPlan',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: { type: DataTypes.INTEGER, allowNull: false },
      performance_evaluation_id: { type: DataTypes.INTEGER, allowNull: true },
      created_by: { type: DataTypes.INTEGER, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      target_date: { type: DataTypes.DATEONLY, allowNull: false },
      status: {
        type: DataTypes.ENUM(...Object.values(IMPROVEMENT_PLAN_STATUS)),
        allowNull: false,
        defaultValue: IMPROVEMENT_PLAN_STATUS.OPEN,
      },
      review_notes: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'improvement_plans' }
  );

  ImprovementPlan.associate = (models) => {
    ImprovementPlan.belongsTo(models.Employee, { foreignKey: 'employee_id', as: 'employee' });
    ImprovementPlan.belongsTo(models.PerformanceEvaluation, { foreignKey: 'performance_evaluation_id', as: 'evaluation' });
    ImprovementPlan.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
  };

  return ImprovementPlan;
};