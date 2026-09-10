/**
 * Creates `employees` (and its `employee_employment_history` child table)
 * before departments/sections/designations/employment_types exist, per
 * the project's required migration file numbering. Foreign keys for
 * department_id, section_id, designation_id, employment_type_id and the
 * self-referencing reporting_manager_id are added as separate
 * ALTER TABLE ADD CONSTRAINT statements once those tables are created in
 * migrations 005/006, so column order matches the spec while FK creation
 * order stays valid for MySQL/InnoDB.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('employees', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      first_name: { type: Sequelize.STRING(60), allowNull: false },
      last_name: { type: Sequelize.STRING(60), allowNull: false },
      gender: { type: Sequelize.ENUM('MALE', 'FEMALE', 'OTHER'), allowNull: true },
      date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      email: { type: Sequelize.STRING(120), allowNull: true },
      address: { type: Sequelize.STRING(255), allowNull: true },

      department_id: { type: Sequelize.INTEGER, allowNull: false },
      section_id: { type: Sequelize.INTEGER, allowNull: true },
      designation_id: { type: Sequelize.INTEGER, allowNull: false },
      reporting_manager_id: { type: Sequelize.INTEGER, allowNull: true },
      employment_type_id: { type: Sequelize.INTEGER, allowNull: false },

      employment_status: {
        type: Sequelize.ENUM('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED', 'RETIRED'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      join_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },

      work_schedule_type: { type: Sequelize.ENUM('FIXED', 'ROTATING'), allowNull: false, defaultValue: 'FIXED' },
      basic_salary: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addConstraint('users', {
      fields: ['employee_id'],
      type: 'foreign key',
      name: 'fk_users_employee_id',
      references: { table: 'employees', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.createTable('employee_employment_history', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      department_id: { type: Sequelize.INTEGER, allowNull: true },
      designation_id: { type: Sequelize.INTEGER, allowNull: true },
      effective_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      change_type: {
        type: Sequelize.ENUM('HIRE', 'PROMOTION', 'TRANSFER', 'DEMOTION', 'SALARY_CHANGE', 'STATUS_CHANGE', 'TERMINATION'),
        allowNull: false,
      },
      remarks: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('employee_employment_history');
    await queryInterface.removeConstraint('users', 'fk_users_employee_id');
    await queryInterface.dropTable('employees');
  },
};