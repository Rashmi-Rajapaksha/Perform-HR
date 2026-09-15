const express = require('express');
const router = express.Router();
const kpiController = require('../controllers/kpiController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { createKpiDefinitionRules, assignKpiRules, recordMeasurementRules, idParamRule } = require('../validators/kpiValidator');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);

router.get('/categories', kpiController.listCategories);

router.get('/definitions', requirePermission(PERMISSIONS.KPI_VIEW, PERMISSIONS.KPI_MANAGE), kpiController.listDefinitions);
router.post('/definitions', createKpiDefinitionRules, validate, requirePermission(PERMISSIONS.KPI_MANAGE), kpiController.createDefinition);
router.put('/definitions/:id', idParamRule, validate, requirePermission(PERMISSIONS.KPI_MANAGE), kpiController.updateDefinition);
router.patch('/definitions/:id/deactivate', idParamRule, validate, requirePermission(PERMISSIONS.KPI_MANAGE), kpiController.deactivateDefinition);

router.get('/assignments', requirePermission(PERMISSIONS.KPI_VIEW, PERMISSIONS.KPI_MANAGE), kpiController.listAssignments);
router.post('/assignments', assignKpiRules, validate, requirePermission(PERMISSIONS.KPI_MANAGE), kpiController.assign);

router.get('/measurements', requirePermission(PERMISSIONS.KPI_VIEW, PERMISSIONS.KPI_MANAGE), kpiController.listMeasurements);
router.post('/measurements', recordMeasurementRules, validate, requirePermission(PERMISSIONS.KPI_RECORD, PERMISSIONS.KPI_MANAGE), kpiController.recordMeasurement);
router.post('/measurements/recalculate', requirePermission(PERMISSIONS.KPI_MANAGE), kpiController.recalculate);
router.post('/measurements/recalculate-all', requirePermission(PERMISSIONS.KPI_MANAGE), kpiController.recalculateAll);

router.get('/employee-score', requirePermission(PERMISSIONS.KPI_VIEW, PERMISSIONS.KPI_MANAGE), kpiController.employeeScore);

module.exports = router;
