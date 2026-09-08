module.exports = (sequelize, DataTypes) => {
  const PayrollPeriod = sequelize.define(
    'PayrollPeriod',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(40), allowNull: false, unique: true }, // e.g. "2026-01"
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: false },
      status: {
        type: DataTypes.ENUM('OPEN', 'PROCESSING', 'CLOSED'),
        allowNull: false,
        defaultValue: 'OPEN',
      },
    },
    { tableName: 'payroll_periods' }
  );

  PayrollPeriod.associate = (models) => {
    PayrollPeriod.hasMany(models.Payroll, { foreignKey: 'payroll_period_id', as: 'payrolls' });
  };

  return PayrollPeriod;
};