const express = require('express');
const router = express.Router();
const designationController = require('../controllers/designationController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.ORG_STRUCTURE_VIEW, PERMISSIONS.ORG_STRUCTURE_MANAGE), designationController.list);
router.post('/', requirePermission(PERMISSIONS.ORG_STRUCTURE_MANAGE), designationController.create);
router.put('/:id', requirePermission(PERMISSIONS.ORG_STRUCTURE_MANAGE), designationController.update);
router.delete('/:id', requirePermission(PERMISSIONS.ORG_STRUCTURE_MANAGE), designationController.remove);

module.exports = router;
