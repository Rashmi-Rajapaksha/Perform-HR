const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { applyLeaveRules } = require('../validators/attendanceValidator');
const { PERMISSIONS } = require('../constants/permissions');

/** Anyone may apply for their own leave; applying for another employee needs HR / approver rights. */
const canApplyForEmployee = (req, res, next) => {
  if (req.user.employee_id && Number(req.body.employee_id) === req.user.employee_id) return next();
  return requirePermission(PERMISSIONS.ATTENDANCE_MANAGE, PERMISSIONS.LEAVE_APPROVE)(req, res, next);
};

router.use(authenticate);

router.get('/types', attendanceController.listLeaveTypes);
router.post('/', applyLeaveRules, validate, canApplyForEmployee, attendanceController.applyLeave);
router.get('/', attendanceController.listLeaves);
router.patch('/:id/decision', requirePermission(PERMISSIONS.LEAVE_APPROVE), attendanceController.decideLeave);

module.exports = router;
