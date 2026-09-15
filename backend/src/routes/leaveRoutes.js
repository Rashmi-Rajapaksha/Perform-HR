const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);

router.get('/types', attendanceController.listLeaveTypes);
router.post('/', attendanceController.applyLeave);
router.get('/', attendanceController.listLeaves);
router.patch('/:id/decision', requirePermission(PERMISSIONS.LEAVE_APPROVE), attendanceController.decideLeave);

module.exports = router;
