const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/employees', require('./employeeRoutes'));
router.use('/departments', require('./departmentRoutes'));
router.use('/sections', require('./sectionRoutes'));
router.use('/designations', require('./designationRoutes'));
router.use('/shifts', require('./shiftRoutes'));
router.use('/attendance', require('./attendanceRoutes'));
router.use('/leaves', require('./leaveRoutes'));
router.use('/payroll', require('./payrollRoutes'));
router.use('/kpi', require('./kpiRoutes'));
router.use('/performance', require('./performanceRoutes'));
router.use('/production', require('./productionRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/notifications', require('./notificationRoutes'));

router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'HR Plus API is running', data: { timestamp: new Date().toISOString() } });
});

module.exports = router;
