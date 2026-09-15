const { EMPLOYMENT_STATUS, WORK_SCHEDULE_TYPE } = require('../constants/statuses');

module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define(
    'Employee',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      employee_code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      first_name: { type: DataTypes.STRING(60), allowNull: false },
      last_name: { type: DataTypes.STRING(60), allowNull: false },
      gender: { type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER'), allowNull: true },
      date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
      phone: { type: DataTypes.STRING(20), allowNull: true },
      email: { type: DataTypes.STRING(120), allowNull: true, validate: { isEmail: true } },
      address: { type: DataTypes.STRING(255), allowNull: true },

      department_id: { type: DataTypes.INTEGER, allowNull: false },
      section_id: { type: DataTypes.INTEGER, allowNull: true },
      designation_id: { type: DataTypes.INTEGER, allowNull: false },
      reporting_manager_id: { type: DataTypes.INTEGER, allowNull: true },
      employment_type_id: { type: DataTypes.INTEGER, allowNull: false },

      employment_status: {
        type: DataTypes.ENUM(...Object.values(EMPLOYMENT_STATUS)),
        allowNull: false,
        defaultValue: EMPLOYMENT_STATUS.ACTIVE,
      },
      join_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },

      work_schedule_type: {
        type: DataTypes.ENUM(...Object.values(WORK_SCHEDULE_TYPE)),
        allowNull: false,
        defaultValue: WORK_SCHEDULE_TYPE.FIXED,
      },
      basic_salary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'employees',
      indexes: [
        { fields: ['department_id'] },
        { fields: ['designation_id'] },
        { fields: ['reporting_manager_id'] },
      ],
    }
  );

  Employee.prototype.getFullName = function getFullName() {
    return `${this.first_name} ${this.last_name}`;
  };

  Employee.associate = (models) => {
    Employee.belongsTo(models.Department, { foreignKey: 'department_id', as: 'department' });
    Employee.belongsTo(models.Section, { foreignKey: 'section_id', as: 'section' });
    Employee.belongsTo(models.Designation, { foreignKey: 'designation_id', as: 'designation' });
    Employee.belongsTo(models.EmploymentType, { foreignKey: 'employment_type_id', as: 'employmentType' });
    Employee.belongsTo(models.Employee, { foreignKey: 'reporting_manager_id', as: 'manager' });
    Employee.hasMany(models.Employee, { foreignKey: 'reporting_manager_id', as: 'directReports' });

    Employee.hasOne(models.User, { foreignKey: 'employee_id', as: 'userAccount' });
    Employee.hasMany(models.EmploymentHistory, { foreignKey: 'employee_id', as: 'employmentHistory' });
    Employee.hasMany(models.EmployeeShiftAssignment, { foreignKey: 'employee_id', as: 'shiftAssignments' });
    Employee.hasMany(models.AttendanceRecord, { foreignKey: 'employee_id', as: 'attendanceRecords' });
    Employee.hasMany(models.EmployeeLeave, { foreignKey: 'employee_id', as: 'leaves' });
    Employee.hasMany(models.EmployeeSalaryComponent, { foreignKey: 'employee_id', as: 'salaryComponents' });
    Employee.hasMany(models.Payroll, { foreignKey: 'employee_id', as: 'payrolls' });
    Employee.hasMany(models.KpiAssignment, { foreignKey: 'employee_id', as: 'kpiAssignments' });
    Employee.hasMany(models.PerformanceEvaluation, { foreignKey: 'employee_id', as: 'performanceEvaluations' });
    Employee.hasMany(models.ProductionRecord, { foreignKey: 'employee_id', as: 'productionRecords' });
    Employee.hasMany(models.ImprovementPlan, { foreignKey: 'employee_id', as: 'improvementPlans' });
  };

  return Employee;
};
