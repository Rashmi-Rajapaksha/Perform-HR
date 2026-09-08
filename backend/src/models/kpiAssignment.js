module.exports = (sequelize, DataTypes) => {
  const KpiAssignment = sequelize.define(
    'KpiAssignment',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      kpi_definition_id: { type: DataTypes.INTEGER, allowNull: false },
      employee_id: { type: DataTypes.INTEGER, allowNull: false },
      target_value: { type: DataTypes.DECIMAL(12, 2), allowNull: true }, // overrides definition default if set
      weight: { type: DataTypes.DECIMAL(5, 2), allowNull: true },        // overrides definition default if set
      effective_from: { type: DataTypes.DATEONLY, allowNull: false },
      effective_to: { type: DataTypes.DATEONLY, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'kpi_assignments' }
  );

  KpiAssignment.associate = (models) => {
    KpiAssignment.belongsTo(models.KpiDefinition, { foreignKey: 'kpi_definition_id', as: 'kpiDefinition' });
    KpiAssignment.belongsTo(models.Employee, { foreignKey: 'employee_id', as: 'employee' });
    KpiAssignment.hasMany(models.KpiMeasurement, { foreignKey: 'kpi_assignment_id', as: 'measurements' });
  };

  return KpiAssignment;
};