const { LEAVE_STATUS } = require('../constrants/statuses');

module.exports = (sequelize, DataTypes) => {
  const EmployeeLeave = sequelize.define(
    'EmployeeLeave',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },

      employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      leave_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      days: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 1
      },

      status: {
        type: DataTypes.ENUM(...Object.values(LEAVE_STATUS)),
        allowNull: false,
        defaultValue: LEAVE_STATUS.PENDING,
      },
      reason: {
        type: DataTypes.STRING(255),
        allowNull: true
      },

      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
    }, { tableName: 'employee_leaves' });

  EmployeeLeave.associate = (models) => {
    EmployeeLeave.belongsTo(models.Employee, { foreignKey: 'employee_id', as: 'employee' });
    EmployeeLeave.belongsTo(models.LeaveType, { foreignKey: 'leave_type_id', as: 'leaveType' });
    EmployeeLeave.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approver' });
  };

  return EmployeeLeave;
};