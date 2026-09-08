module.exports = (sequelize, DataTypes) => {
  const ProductionRecord = sequelize.define(
    'ProductionRecord',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: { type: DataTypes.INTEGER, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      shift_id: { type: DataTypes.INTEGER, allowNull: true },
      target_units: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      produced_units: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      defective_units: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      rework_units: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      downtime_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      safety_incidents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'production_records',
      indexes: [{ unique: true, fields: ['employee_id', 'date'] }],
    }
  );

  ProductionRecord.associate = (models) => {
    ProductionRecord.belongsTo(models.Employee, { foreignKey: 'employee_id', as: 'employee' });
    ProductionRecord.belongsTo(models.Shift, { foreignKey: 'shift_id', as: 'shift' });
  };

  return ProductionRecord;
};