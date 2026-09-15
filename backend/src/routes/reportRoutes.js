const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);
router.use(requirePermission(PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_EXPORT));

router.get('/employees/master', reportController.employeeMaster);
router.get('/employees/by-department', reportController.departmentEmployee);

router.get('/attendance/daily', reportController.dailyAttendance);
router.get('/attendance/monthly', reportController.monthlyAttendance);
router.get('/attendance/late', reportController.lateAttendance);
router.get('/attendance/absenteeism', reportController.absenteeism);
router.get('/attendance/overtime', reportController.overtime);

router.get('/payroll/summary', reportController.payrollSummary);
router.get('/payroll/by-department', reportController.departmentPayroll);
router.get('/payroll/overtime-cost', reportController.overtimeCost);

router.get('/performance/employee-kpi', reportController.employeeKpi);
router.get('/performance/ranking', reportController.performanceRanking);
router.get('/performance/high-low-performers', reportController.highLowPerformers);

module.exports = router;
