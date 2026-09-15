const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/sectionController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.ORG_STRUCTURE_VIEW, PERMISSIONS.ORG_STRUCTURE_MANAGE), sectionController.list);
router.post('/', requirePermission(PERMISSIONS.ORG_STRUCTURE_MANAGE), sectionController.create);
router.put('/:id', requirePermission(PERMISSIONS.ORG_STRUCTURE_MANAGE), sectionController.update);
router.delete('/:id', requirePermission(PERMISSIONS.ORG_STRUCTURE_MANAGE), sectionController.remove);

module.exports = router;
