const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { auditMiddleware } = require('../middleware/auditMiddleware');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.ORG_STRUCTURE_VIEW, PERMISSIONS.ORG_STRUCTURE_MANAGE), departmentController.list);
router.get('/:id', requirePermission(PERMISSIONS.ORG_STRUCTURE_VIEW, PERMISSIONS.ORG_STRUCTURE_MANAGE), departmentController.getById);
router.post('/', requirePermission(PERMISSIONS.ORG_STRUCTURE_MANAGE), auditMiddleware('CREATE', 'DEPARTMENT'), departmentController.create);
router.put('/:id', requirePermission(PERMISSIONS.ORG_STRUCTURE_MANAGE), auditMiddleware('UPDATE', 'DEPARTMENT'), departmentController.update);
router.delete('/:id', requirePermission(PERMISSIONS.ORG_STRUCTURE_MANAGE), auditMiddleware('DELETE', 'DEPARTMENT'), departmentController.remove);

module.exports = router;
