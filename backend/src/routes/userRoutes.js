const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.USER_VIEW, PERMISSIONS.USER_MANAGE), userController.listUsers);
router.get('/roles', requirePermission(PERMISSIONS.USER_VIEW, PERMISSIONS.ROLE_MANAGE), userController.listRoles);
router.get('/:id', requirePermission(PERMISSIONS.USER_VIEW, PERMISSIONS.USER_MANAGE), userController.getUser);
router.put('/:id', requirePermission(PERMISSIONS.USER_MANAGE), userController.updateUser);
router.patch('/:id/deactivate', requirePermission(PERMISSIONS.USER_MANAGE), userController.deactivateUser);

module.exports = router;
