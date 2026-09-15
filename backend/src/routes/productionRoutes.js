const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.PRODUCTION_VIEW, PERMISSIONS.PRODUCTION_MANAGE), productionController.list);
router.post('/', requirePermission(PERMISSIONS.PRODUCTION_MANAGE), productionController.create);
router.post('/bulk', requirePermission(PERMISSIONS.PRODUCTION_MANAGE), productionController.bulkCreate);
router.put('/:id', requirePermission(PERMISSIONS.PRODUCTION_MANAGE), productionController.update);

module.exports = router;
