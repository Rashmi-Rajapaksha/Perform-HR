const { body, param } = require('express-validator');

const processPayrollRules = [
  body('payroll_period_id').isInt({ min: 1 }).withMessage('payroll_period_id is required'),
  body('employee_ids').optional().isArray().withMessage('employee_ids must be an array if provided'),
];

const payrollActionRules = [param('id').isInt({ min: 1 }).withMessage('A valid payroll id is required')];

const addSalaryComponentRules = [
  body('employee_id').isInt({ min: 1 }),
  body('salary_component_id').isInt({ min: 1 }),
  body('amount').isFloat({ min: 0 }),
  body('effective_date').isISO8601(),
];

module.exports = { processPayrollRules, payrollActionRules, addSalaryComponentRules };