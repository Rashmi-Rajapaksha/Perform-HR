module.exports = (sequelize, DataTypes) => {
  const KpiMeasurement = sequelize.define(
    'KpiMeasurement',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kpi_assignment_id: { type: DataTypes.INTEGER, allowNull: false },
      period_start: { type: DataTypes.DATEONLY, allowNull: false },
      period_end: { type: DataTypes.DATEONLY, allowNull: false },
      actual_value: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      achievement_percentage: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      weighted_score: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      source: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MANUAL' },
      recorded_by: { type: DataTypes.INTEGER, allowNull: true },
      recorded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'kpi_measurements',
      indexes: [{ unique: true, fields: ['kpi_assignment_id', 'period_start', 'period_end'] }],
    }
  );

  KpiMeasurement.associate = (models) => {
    KpiMeasurement.belongsTo(models.KpiAssignment, { foreignKey: 'kpi_assignment_id', as: 'assignment' });
    KpiMeasurement.belongsTo(models.User, { foreignKey: 'recorded_by', as: 'recorder' });
  };

  return KpiMeasurement;
};