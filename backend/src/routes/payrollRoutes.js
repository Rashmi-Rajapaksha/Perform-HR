const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { processPayrollRules, payrollActionRules, addSalaryComponentRules } = require('../validators/payrollValidator');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);

router.get('/periods', requirePermission(PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_PROCESS), payrollController.listPeriods);
router.post('/periods', requirePermission(PERMISSIONS.PAYROLL_PROCESS), payrollController.createPeriod);

router.get('/components', requirePermission(PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_PROCESS), payrollController.listSalaryComponents);
router.post('/components', requirePermission(PERMISSIONS.PAYROLL_PROCESS), payrollController.createSalaryComponent);
router.post(
  '/components/assign',
  addSalaryComponentRules,
  validate,
  requirePermission(PERMISSIONS.PAYROLL_PROCESS),
  payrollController.assignSalaryComponent
);

router.get('/my-payslips', requirePermission(PERMISSIONS.PAYROLL_VIEW_OWN), payrollController.myPayslips);

router.post('/process', processPayrollRules, validate, requirePermission(PERMISSIONS.PAYROLL_PROCESS), payrollController.process);
router.get('/', requirePermission(PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_VIEW_OWN), payrollController.list);
router.get('/:id', payrollActionRules, validate, requirePermission(PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_VIEW_OWN), payrollController.getById);
router.patch('/:id/review', payrollActionRules, validate, requirePermission(PERMISSIONS.PAYROLL_PROCESS), payrollController.review);
router.patch('/:id/approve', payrollActionRules, validate, requirePermission(PERMISSIONS.PAYROLL_APPROVE), payrollController.approve);
router.patch('/:id/mark-paid', payrollActionRules, validate, requirePermission(PERMISSIONS.PAYROLL_APPROVE), payrollController.markPaid);
router.patch('/:id/cancel', payrollActionRules, validate, requirePermission(PERMISSIONS.PAYROLL_APPROVE), payrollController.cancel);

module.exports = router;
