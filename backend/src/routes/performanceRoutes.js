const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performanceController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { createEvaluationRules, reviewEvaluationRules, createImprovementPlanRules } = require('../validators/performanceValidator');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);

router.get('/periods', performanceController.listPeriods);
router.post('/periods', requirePermission(PERMISSIONS.PERFORMANCE_MANAGE), performanceController.createPeriod);

router.get('/rating-scales', performanceController.listRatingScales);
router.post('/rating-scales', requirePermission(PERMISSIONS.PERFORMANCE_MANAGE), performanceController.createRatingScale);

router.post('/evaluations/generate', createEvaluationRules, validate, requirePermission(PERMISSIONS.PERFORMANCE_MANAGE), performanceController.generate);
router.get(
  '/evaluations',
  requirePermission(PERMISSIONS.PERFORMANCE_VIEW, PERMISSIONS.PERFORMANCE_VIEW_OWN, PERMISSIONS.PERFORMANCE_VIEW_TEAM, PERMISSIONS.PERFORMANCE_MANAGE),
  performanceController.list
);
router.get(
  '/evaluations/:id',
  requirePermission(PERMISSIONS.PERFORMANCE_VIEW, PERMISSIONS.PERFORMANCE_VIEW_OWN, PERMISSIONS.PERFORMANCE_VIEW_TEAM, PERMISSIONS.PERFORMANCE_MANAGE),
  performanceController.getById
);
router.patch(
  '/evaluations/:id/review',
  reviewEvaluationRules,
  validate,
  requirePermission(PERMISSIONS.PERFORMANCE_REVIEW, PERMISSIONS.PERFORMANCE_MANAGE),
  performanceController.review
);
router.patch('/evaluations/:id/employee-comment', performanceController.employeeComment);
router.patch('/evaluations/:id/finalize', requirePermission(PERMISSIONS.PERFORMANCE_MANAGE), performanceController.finalize);

router.get('/improvement-plans', performanceController.listImprovementPlans);
router.post(
  '/improvement-plans',
  createImprovementPlanRules,
  validate,
  requirePermission(PERMISSIONS.PERFORMANCE_REVIEW, PERMISSIONS.PERFORMANCE_MANAGE),
  performanceController.createImprovementPlan
);

module.exports = router;
