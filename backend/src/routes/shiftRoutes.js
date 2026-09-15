const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.SHIFT_VIEW, PERMISSIONS.SHIFT_MANAGE), shiftController.list);
router.post('/', requirePermission(PERMISSIONS.SHIFT_MANAGE), shiftController.create);
router.put('/:id', requirePermission(PERMISSIONS.SHIFT_MANAGE), shiftController.update);
router.delete('/:id', requirePermission(PERMISSIONS.SHIFT_MANAGE), shiftController.remove);

router.get('/assignments', requirePermission(PERMISSIONS.SHIFT_VIEW, PERMISSIONS.SHIFT_MANAGE), shiftController.listAssignments);
router.post('/assignments', requirePermission(PERMISSIONS.SHIFT_MANAGE), shiftController.assignEmployee);

module.exports = router;
