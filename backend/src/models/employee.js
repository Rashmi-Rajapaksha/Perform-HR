module.exports = (sequelize, DataTypes) => {
  const EmploymentType = sequelize.define(
    'EmploymentType',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(50), allowNull: false, unique: true }, // PERMANENT, CONTRACT, PROBATION, INTERN
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'employment_types' }
  );

  EmploymentType.associate = (models) => {
    EmploymentType.hasMany(models.Employee, { foreignKey: 'employment_type_id', as: 'employees' });
  };

  return EmploymentType;
};