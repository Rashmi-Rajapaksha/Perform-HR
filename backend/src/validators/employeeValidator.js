const { body, param } = require('express-validator');

const createEmployeeRules = [
  body('employee_code').trim().notEmpty().withMessage('Employee code is required'),
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('department_id').isInt({ min: 1 }).withMessage('department_id is required'),
  body('designation_id').isInt({ min: 1 }).withMessage('designation_id is required'),
  body('employment_type_id').isInt({ min: 1 }).withMessage('employment_type_id is required'),
  body('join_date').isISO8601().withMessage('join_date must be a valid date'),
  body('basic_salary').isFloat({ min: 0 }).withMessage('basic_salary must be a positive number'),
  body('email').optional({ nullable: true }).isEmail().withMessage('email must be valid'),
];

const updateEmployeeRules = [
  param('id').isInt({ min: 1 }),
  body('basic_salary').optional().isFloat({ min: 0 }),
  body('email').optional({ nullable: true }).isEmail(),
];

const idParamRule = [param('id').isInt({ min: 1 }).withMessage('A valid id is required')];

module.exports = { createEmployeeRules, updateEmployeeRules, idParamRule };