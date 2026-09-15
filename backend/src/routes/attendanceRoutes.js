const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { checkInRules, manualAttendanceRules, listAttendanceRules } = require('../validators/attendanceValidator');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);

router.post('/check-in', checkInRules, validate, attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);

router.get(
  '/',
  listAttendanceRules,
  validate,
  requirePermission(PERMISSIONS.ATTENDANCE_VIEW, PERMISSIONS.ATTENDANCE_VIEW_OWN, PERMISSIONS.ATTENDANCE_VIEW_TEAM, PERMISSIONS.ATTENDANCE_MANAGE),
  attendanceController.list
);
router.get(
  '/summary',
  requirePermission(PERMISSIONS.ATTENDANCE_VIEW, PERMISSIONS.ATTENDANCE_VIEW_OWN, PERMISSIONS.ATTENDANCE_VIEW_TEAM, PERMISSIONS.ATTENDANCE_MANAGE),
  attendanceController.summary
);
router.post(
  '/manual',
  manualAttendanceRules,
  validate,
  requirePermission(PERMISSIONS.ATTENDANCE_MANAGE),
  attendanceController.markManual
);

router.get('/holidays', attendanceController.listHolidays);
router.post('/holidays', requirePermission(PERMISSIONS.ATTENDANCE_MANAGE), attendanceController.createHoliday);

module.exports = router;
