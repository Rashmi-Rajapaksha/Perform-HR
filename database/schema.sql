-- ============================================================================
-- HR Plus - Integrated Human Resource Information System
-- Full database schema (MySQL 8+ / InnoDB)
-- This file mirrors backend/migrations/*.js exactly and can be used to
-- stand up the schema directly (mysql -u root -p hr_plus < schema.sql)
-- without running Sequelize migrations, e.g. for quick inspection or a
-- fresh grading environment.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS hr_plus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hr_plus;

-- ---------------------------------------------------------------------------
-- RBAC: roles, users, permissions, role_permissions
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  employee_id INT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(60) NOT NULL UNIQUE,
  module VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_role_permissions (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Organization structure
-- ---------------------------------------------------------------------------
CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  description VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_sections_dept_code (department_id, code),
  CONSTRAINT fk_sections_department FOREIGN KEY (department_id) REFERENCES departments(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE designations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  level INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE employment_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Employees
-- ---------------------------------------------------------------------------
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(60) NOT NULL,
  last_name VARCHAR(60) NOT NULL,
  gender ENUM('MALE','FEMALE','OTHER'),
  date_of_birth DATE,
  phone VARCHAR(20),
  email VARCHAR(120),
  address VARCHAR(255),
  department_id INT NOT NULL,
  section_id INT NULL,
  designation_id INT NOT NULL,
  reporting_manager_id INT NULL,
  employment_type_id INT NOT NULL,
  employment_status ENUM('ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED','RESIGNED','RETIRED') NOT NULL DEFAULT 'ACTIVE',
  join_date DATE NOT NULL,
  end_date DATE NULL,
  work_schedule_type ENUM('FIXED','ROTATING') NOT NULL DEFAULT 'FIXED',
  basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_employees_department (department_id),
  KEY idx_employees_designation (designation_id),
  KEY idx_employees_manager (reporting_manager_id),
  CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_employees_section FOREIGN KEY (section_id) REFERENCES sections(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_employees_designation FOREIGN KEY (designation_id) REFERENCES designations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_employees_employment_type FOREIGN KEY (employment_type_id) REFERENCES employment_types(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_employees_manager FOREIGN KEY (reporting_manager_id) REFERENCES employees(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE users ADD CONSTRAINT fk_users_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TABLE employee_employment_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  department_id INT NULL,
  designation_id INT NULL,
  effective_date DATE NOT NULL,
  end_date DATE NULL,
  change_type ENUM('HIRE','PROMOTION','TRANSFER','DEMOTION','SALARY_CHANGE','STATUS_CHANGE','TERMINATION') NOT NULL,
  remarks VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_history_department FOREIGN KEY (department_id) REFERENCES departments(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_history_designation FOREIGN KEY (designation_id) REFERENCES designations(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Shifts, work schedules, attendance, leave, holidays
-- ---------------------------------------------------------------------------
CREATE TABLE shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_night_shift BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE work_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  type ENUM('FIXED','ROTATING') NOT NULL,
  description VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE employee_shift_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  shift_id INT NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_esa_employee (employee_id),
  CONSTRAINT fk_esa_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_esa_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE attendance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  date DATE NOT NULL,
  shift_id INT NULL,
  check_in DATETIME NULL,
  check_out DATETIME NULL,
  regular_minutes INT NOT NULL DEFAULT 0,
  late_minutes INT NOT NULL DEFAULT 0,
  early_leave_minutes INT NOT NULL DEFAULT 0,
  overtime_minutes INT NOT NULL DEFAULT 0,
  status ENUM('PRESENT','ABSENT','LEAVE','HALF_DAY','HOLIDAY','OFF_DAY') NOT NULL DEFAULT 'PRESENT',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_attendance_employee_date (employee_id, date),
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_attendance_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE leave_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  max_days_per_year INT NOT NULL DEFAULT 14,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE employee_leaves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days DECIMAL(4,1) NOT NULL DEFAULT 1,
  status ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  reason VARCHAR(255),
  approved_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_leaves_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_leaves_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_leaves_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE holidays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  date DATE NOT NULL UNIQUE,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Payroll
-- ---------------------------------------------------------------------------
CREATE TABLE salary_components (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  type ENUM('EARNING','DEDUCTION') NOT NULL,
  calculation_type ENUM('FIXED','PERCENTAGE','FORMULA') NOT NULL DEFAULT 'FIXED',
  is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE employee_salary_components (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  salary_component_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL,
  end_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_esc_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_esc_component FOREIGN KEY (salary_component_id) REFERENCES salary_components(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE payroll_periods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(40) NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('OPEN','PROCESSING','CLOSED') NOT NULL DEFAULT 'OPEN',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE payrolls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  payroll_period_id INT NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  gross_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('DRAFT','CALCULATED','REVIEWED','APPROVED','PAID','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  processed_at DATETIME NULL,
  approved_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_payroll_employee_period (employee_id, payroll_period_id),
  CONSTRAINT fk_payrolls_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_payrolls_period FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_payrolls_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE payroll_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payroll_id INT NOT NULL,
  salary_component_id INT NULL,
  component_name VARCHAR(80) NOT NULL,
  type ENUM('EARNING','DEDUCTION') NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_payroll FOREIGN KEY (payroll_id) REFERENCES payrolls(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_items_component FOREIGN KEY (salary_component_id) REFERENCES salary_components(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- KPI management (research core)
-- ---------------------------------------------------------------------------
CREATE TABLE kpi_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  code VARCHAR(30) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE kpi_definitions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500),
  category_id INT NOT NULL,
  measurement_unit VARCHAR(30) NOT NULL,
  direction ENUM('HIGHER_IS_BETTER','LOWER_IS_BETTER') NOT NULL,
  target_value DECIMAL(12,2) NOT NULL,
  weight DECIMAL(5,2) NOT NULL DEFAULT 0,
  frequency ENUM('DAILY','WEEKLY','MONTHLY','QUARTERLY','ANNUALLY') NOT NULL,
  calculation_type ENUM('RATIO','SUM','AVERAGE','COUNT') NOT NULL DEFAULT 'RATIO',
  data_source ENUM('MANUAL','ATTENDANCE','PAYROLL','PRODUCTION','SYSTEM','IMPORT') NOT NULL DEFAULT 'MANUAL',
  level ENUM('ORGANIZATION','DEPARTMENT','DESIGNATION','EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
  department_id INT NULL,
  designation_id INT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_kpidef_category FOREIGN KEY (category_id) REFERENCES kpi_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_kpidef_department FOREIGN KEY (department_id) REFERENCES departments(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_kpidef_designation FOREIGN KEY (designation_id) REFERENCES designations(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE kpi_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kpi_definition_id INT NOT NULL,
  employee_id INT NOT NULL,
  target_value DECIMAL(12,2) NULL,
  weight DECIMAL(5,2) NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_kpiassign_definition FOREIGN KEY (kpi_definition_id) REFERENCES kpi_definitions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_kpiassign_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE kpi_measurements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kpi_assignment_id INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  actual_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  achievement_percentage DECIMAL(6,2) NOT NULL DEFAULT 0,
  weighted_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  source VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
  recorded_by INT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_kpi_measurement_period (kpi_assignment_id, period_start, period_end),
  CONSTRAINT fk_kpimeasure_assignment FOREIGN KEY (kpi_assignment_id) REFERENCES kpi_assignments(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_kpimeasure_recorder FOREIGN KEY (recorded_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE evaluation_periods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  type ENUM('MONTHLY','QUARTERLY') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('OPEN','IN_PROGRESS','CLOSED') NOT NULL DEFAULT 'OPEN',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE performance_rating_scales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  min_score DECIMAL(5,2) NOT NULL,
  max_score DECIMAL(5,2) NOT NULL,
  rating_label VARCHAR(40) NOT NULL,
  description VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Performance evaluation
-- ---------------------------------------------------------------------------
CREATE TABLE performance_evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  evaluation_period_id INT NOT NULL,
  kpi_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  manager_score DECIMAL(5,2) NULL,
  final_score DECIMAL(5,2) NULL,
  rating_scale_id INT NULL,
  strengths TEXT,
  weaknesses TEXT,
  manager_comments TEXT,
  employee_comments TEXT,
  reviewer_id INT NULL,
  status ENUM('DRAFT','SUBMITTED','MANAGER_REVIEWED','FINALIZED') NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_eval_employee_period (employee_id, evaluation_period_id),
  CONSTRAINT fk_eval_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_eval_period FOREIGN KEY (evaluation_period_id) REFERENCES evaluation_periods(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_eval_rating FOREIGN KEY (rating_scale_id) REFERENCES performance_rating_scales(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_eval_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE performance_evaluation_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  performance_evaluation_id INT NOT NULL,
  kpi_definition_id INT NOT NULL,
  target_value DECIMAL(12,2) NOT NULL,
  actual_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  achievement_percentage DECIMAL(6,2) NOT NULL DEFAULT 0,
  weight DECIMAL(5,2) NOT NULL DEFAULT 0,
  weighted_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_evaldetail_eval FOREIGN KEY (performance_evaluation_id) REFERENCES performance_evaluations(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_evaldetail_kpidef FOREIGN KEY (kpi_definition_id) REFERENCES kpi_definitions(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Production, improvement plans, notifications, audit, settings
-- ---------------------------------------------------------------------------
CREATE TABLE production_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  date DATE NOT NULL,
  shift_id INT NULL,
  target_units INT NOT NULL DEFAULT 0,
  produced_units INT NOT NULL DEFAULT 0,
  defective_units INT NOT NULL DEFAULT 0,
  rework_units INT NOT NULL DEFAULT 0,
  downtime_minutes INT NOT NULL DEFAULT 0,
  safety_incidents INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_production_employee_date (employee_id, date),
  CONSTRAINT fk_production_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_production_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE improvement_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  performance_evaluation_id INT NULL,
  created_by INT NOT NULL,
  description TEXT NOT NULL,
  target_date DATE NOT NULL,
  status ENUM('OPEN','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'OPEN',
  review_notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_improvement_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_improvement_eval FOREIGN KEY (performance_evaluation_id) REFERENCES performance_evaluations(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_improvement_creator FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,
  type ENUM('INFO','ALERT','WARNING','SUCCESS') NOT NULL DEFAULT 'INFO',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(30) NOT NULL,
  module VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id INT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(80) NOT NULL UNIQUE,
  value VARCHAR(500) NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
