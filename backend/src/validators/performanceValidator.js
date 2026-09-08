const { body, param } = require('express-validator');

const createEvaluationRules = [
  body('employee_id').isInt({ min: 1 }),
  body('evaluation_period_id').isInt({ min: 1 }),
];

const reviewEvaluationRules = [
  param('id').isInt({ min: 1 }),
  body('manager_score').optional().isFloat({ min: 0, max: 100 }),
  body('manager_comments').optional().isString(),
];

const createImprovementPlanRules = [
  body('employee_id').isInt({ min: 1 }),
  body('description').trim().notEmpty(),
  body('target_date').isISO8601(),
];

module.exports = { createEvaluationRules, reviewEvaluationRules, createImprovementPlanRules };