const express = require('express');
const router = express.Router();

const employeeController = require('../controllers/employeeController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { auditMiddleware } = require('../middleware/auditMiddleware');
const { createEmployeeRules, updateEmployeeRules, idParamRule } = require('../validators/employeeValidator');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);

router.get('/me', requirePermission(PERMISSIONS.EMPLOYEE_VIEW_OWN), employeeController.me);
router.get('/', requirePermission(PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.EMPLOYEE_MANAGE), employeeController.list);
router.get('/:id', idParamRule, validate, requirePermission(PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.EMPLOYEE_MANAGE), employeeController.getById);
router.get('/:id/direct-reports', idParamRule, validate, requirePermission(PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.EMPLOYEE_MANAGE), employeeController.directReports);

router.post('/', createEmployeeRules, validate, requirePermission(PERMISSIONS.EMPLOYEE_MANAGE), auditMiddleware('CREATE', 'EMPLOYEE'), employeeController.create);
router.put('/:id', updateEmployeeRules, validate, requirePermission(PERMISSIONS.EMPLOYEE_MANAGE), auditMiddleware('UPDATE', 'EMPLOYEE'), employeeController.update);
router.patch('/:id/deactivate', idParamRule, validate, requirePermission(PERMISSIONS.EMPLOYEE_MANAGE), auditMiddleware('UPDATE', 'EMPLOYEE'), employeeController.deactivate);

module.exports = router;
