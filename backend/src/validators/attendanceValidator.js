const { body, query } = require('express-validator');
const { ATTENDANCE_STATUS } = require('../constants/statuses');

const checkInRules = [
  body('employee_id').isInt({ min: 1 }).withMessage('employee_id is required'),
  body('shift_id').optional({ nullable: true }).isInt({ min: 1 }),
];

const manualAttendanceRules = [
  body('employee_id').isInt({ min: 1 }).withMessage('employee_id is required'),
  body('date').isISO8601().withMessage('date must be valid (YYYY-MM-DD)'),
  body('status').isIn(Object.values(ATTENDANCE_STATUS)).withMessage('Invalid attendance status'),
];

const listAttendanceRules = [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('employee_id').optional().isInt({ min: 1 }),
  query('department_id').optional().isInt({ min: 1 }),
];

module.exports = { checkInRules, manualAttendanceRules, listAttendanceRules };