-- ============================================================================
-- HR Plus - Minimal sample data for quick manual testing of schema.sql
-- (This is a small, hand-written illustrative subset - NOT the full 100
-- employee / 12-month dataset. For the full realistic dataset used by the
-- application, run the Sequelize seeders in backend/seeders/, or import
-- the CSV files in /dataset via the xlsx/csv import tooling of your choice.)
-- ============================================================================

USE hr_plus;

INSERT INTO roles (name, description) VALUES
  ('ADMIN', 'Full system access'),
  ('HR_MANAGER', 'Manages employees, payroll, attendance, performance'),
  ('MANAGER', 'Manages direct reports'),
  ('EMPLOYEE', 'Self-service access');

INSERT INTO departments (name, code, description) VALUES
  ('Production', 'PROD', 'Manufacturing and assembly operations'),
  ('Quality Assurance', 'QA', 'Product quality inspection and control'),
  ('Human Resources', 'HR', 'Recruitment and HR operations');

INSERT INTO designations (name, code, level) VALUES
  ('Department Manager', 'DEPT_MGR', 6),
  ('Supervisor', 'SUPERVISOR', 4),
  ('Machine Operator', 'MACHINE_OP', 2);

INSERT INTO employment_types (name, description) VALUES
  ('PERMANENT', 'Permanent, full-time employment'),
  ('CONTRACT', 'Fixed-term contract employment');

INSERT INTO shifts (name, code, start_time, end_time, is_night_shift) VALUES
  ('Shift A (Morning)', 'SHIFT_A', '06:00:00', '14:00:00', FALSE),
  ('Shift B (Afternoon)', 'SHIFT_B', '14:00:00', '22:00:00', FALSE),
  ('General / Day Shift', 'GENERAL', '08:30:00', '17:30:00', FALSE);

INSERT INTO employees (employee_code, first_name, last_name, department_id, designation_id, employment_type_id, join_date, work_schedule_type, basic_salary) VALUES
  ('EMP0001', 'Nimal', 'Perera', 1, 1, 1, '2022-03-01', 'FIXED', 220000),
  ('EMP0002', 'Kasun', 'Silva', 1, 2, 1, '2023-06-15', 'ROTATING', 105000),
  ('EMP0003', 'Sanduni', 'Fernando', 1, 3, 1, '2024-01-10', 'ROTATING', 58000);

INSERT INTO kpi_categories (name, code, description) VALUES
  ('Productivity', 'PRODUCTIVITY', 'Output volume against targets'),
  ('Attendance', 'ATTENDANCE', 'Presence and reliability metrics');

INSERT INTO kpi_definitions (code, name, category_id, measurement_unit, direction, target_value, weight, frequency, data_source, level) VALUES
  ('ATTENDANCE_RATE', 'Attendance Rate', 2, '%', 'HIGHER_IS_BETTER', 95, 0, 'MONTHLY', 'ATTENDANCE', 'EMPLOYEE'),
  ('PRODUCTION_TARGET_ACHIEVEMENT', 'Production Target Achievement', 1, '%', 'HIGHER_IS_BETTER', 100, 0, 'MONTHLY', 'PRODUCTION', 'EMPLOYEE');

INSERT INTO performance_rating_scales (min_score, max_score, rating_label, description) VALUES
  (90, 150, 'Outstanding', 'Consistently exceeds expectations (150 = achievement cap ceiling)'),
  (80, 89.99, 'Very Good', 'Frequently exceeds expectations'),
  (70, 79.99, 'Good', 'Meets expectations'),
  (60, 69.99, 'Satisfactory', 'Meets most expectations, some gaps'),
  (0, 59.99, 'Needs Improvement', 'Below expected performance level');
