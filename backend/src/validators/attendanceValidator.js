const { body, query } = require('express-validator');
const { ATTENDANCE_STATUS, WORKED_ATTENDANCE_STATUSES } = require('../constants/statuses');

const checkInRules = [
  body('employee_id').isInt({ min: 1 }).withMessage('employee_id is required'),
  body('shift_id').optional({ nullable: true }).isInt({ min: 1 }),
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const manualAttendanceRules = [
  body('employee_id').isInt({ min: 1 }).withMessage('employee_id is required'),
  body('date').isISO8601({ strict: true }).withMessage('date must be valid (YYYY-MM-DD)'),
  body('status').isIn(Object.values(ATTENDANCE_STATUS)).withMessage('Invalid attendance status'),
  body('shift_id').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('shift_id must be a valid id'),
  // Check In / Check Out are required only when the employee worked (PRESENT / HALF_DAY);
  // for any other status they are not required and are ignored.
  body('check_in')
    .if(body('status').isIn(WORKED_ATTENDANCE_STATUSES))
    .notEmpty().withMessage('Check In time is required for PRESENT / HALF_DAY')
    .bail()
    .matches(TIME_PATTERN).withMessage('check_in must be a time (HH:mm)'),
  body('check_out')
    .if(body('status').isIn(WORKED_ATTENDANCE_STATUSES))
    .notEmpty().withMessage('Check Out time is required for PRESENT / HALF_DAY')
    .bail()
    .matches(TIME_PATTERN).withMessage('check_out must be a time (HH:mm)')
    .bail()
    .custom((value, { req }) => value.slice(0, 5) !== String(req.body.check_in).slice(0, 5))
    .withMessage('Check Out time must be different from Check In time'),
];

const LEAVE_MODES = ['LEAVE', 'HALF_DAY'];
const isLeave = body('leave_mode').equals('LEAVE');
const isHalfDay = body('leave_mode').equals('HALF_DAY');

// LEAVE    -> leave_type_id, start_date, end_date, days, reason
// HALF_DAY -> date, reason
const applyLeaveRules = [
  body('employee_id').isInt({ min: 1 }).withMessage('Employee is required'),
  body('leave_mode').isIn(LEAVE_MODES).withMessage('leave_mode must be LEAVE or HALF_DAY'),
  body('reason').trim().notEmpty().withMessage('Reason is required')
    .isLength({ max: 255 }).withMessage('Reason must be 255 characters or less'),

  body('leave_type_id').if(isLeave).isInt({ min: 1 }).withMessage('Leave type is required'),
  body('start_date').if(isLeave).isISO8601({ strict: true }).withMessage('Start date must be valid (YYYY-MM-DD)'),
  body('end_date').if(isLeave).isISO8601({ strict: true }).withMessage('End date must be valid (YYYY-MM-DD)')
    .bail()
    .custom((value, { req }) => value >= req.body.start_date).withMessage('End date cannot be before start date'),
  body('days').if(isLeave).isFloat({ min: 0.5 }).withMessage('No of days must be at least 0.5')
    .bail()
    .custom((value) => Number(value) * 2 === Math.round(Number(value) * 2)).withMessage('No of days must be in steps of 0.5')
    .bail()
    .custom((value, { req }) => {
      const span = (Date.parse(req.body.end_date) - Date.parse(req.body.start_date)) / 86400000 + 1;
      return !(span > 0) || Number(value) <= span;
    })
    .withMessage('No of days cannot be more than the days between start and end date'),

  body('date').if(isHalfDay).isISO8601({ strict: true }).withMessage('Half day date must be valid (YYYY-MM-DD)'),
];

const listAttendanceRules = [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('employee_id').optional().isInt({ min: 1 }),
  query('department_id').optional().isInt({ min: 1 }),
];

module.exports = { checkInRules, manualAttendanceRules, applyLeaveRules, listAttendanceRules };
