const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);

router.get('/organization', requirePermission(PERMISSIONS.DASHBOARD_VIEW_ORG), dashboardController.organization);
router.get('/department/:departmentId', requirePermission(PERMISSIONS.DASHBOARD_VIEW_DEPARTMENT, PERMISSIONS.DASHBOARD_VIEW_ORG), dashboardController.department);
router.get('/employee/me', requirePermission(PERMISSIONS.DASHBOARD_VIEW_OWN), dashboardController.employee);
router.get('/employee/:employeeId', requirePermission(PERMISSIONS.DASHBOARD_VIEW_DEPARTMENT, PERMISSIONS.DASHBOARD_VIEW_ORG), dashboardController.employee);
router.get('/alerts', requirePermission(PERMISSIONS.DASHBOARD_VIEW_ORG, PERMISSIONS.DASHBOARD_VIEW_DEPARTMENT), dashboardController.alerts);

module.exports = router;
