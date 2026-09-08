module.exports = (sequelize, DataTypes) => {
  const Section = sequelize.define(
    'Section',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      department_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: false },
      code: { type: DataTypes.STRING(20), allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'sections',
      indexes: [{ unique: true, fields: ['department_id', 'code'] }],
    }
  );

  Section.associate = (models) => {
    Section.belongsTo(models.Department, { foreignKey: 'department_id', as: 'department' });
    Section.hasMany(models.Employee, { foreignKey: 'section_id', as: 'employees' });
  };

  return Section;
};