const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const attendanceService = require('../services/attendanceService');
const { EmployeeLeave, LeaveType, Employee } = require('../models');
const { LEAVE_STATUS } = require('../constants/statuses');

const checkIn = asyncHandler(async (req, res) => {
  const record = await attendanceService.checkIn(req.body);
  return ApiResponse.success(res, { message: 'Checked in successfully', data: record });
});

const checkOut = asyncHandler(async (req, res) => {
  const record = await attendanceService.checkOut(req.body);
  return ApiResponse.success(res, { message: 'Checked out successfully', data: record });
});

const markManual = asyncHandler(async (req, res) => {
  const record = await attendanceService.markManualAttendance(req.body);
  return ApiResponse.success(res, { message: 'Attendance recorded', data: record });
});

const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await attendanceService.listAttendance(req.query);
  return ApiResponse.success(res, { message: 'Attendance records retrieved', data: rows, meta });
});

const summary = asyncHandler(async (req, res) => {
  const { employee_id, from, to } = req.query;
  const data = await attendanceService.getAttendanceSummary(employee_id, from, to);
  return ApiResponse.success(res, { message: 'Attendance summary retrieved', data });
});

// ----- Leave -----

const listLeaveTypes = asyncHandler(async (req, res) => {
  const types = await LeaveType.findAll();
  return ApiResponse.success(res, { message: 'Leave types retrieved', data: types });
});

const applyLeave = asyncHandler(async (req, res) => {
  const leave = await EmployeeLeave.create({ ...req.body, status: LEAVE_STATUS.PENDING });
  return ApiResponse.created(res, { message: 'Leave application submitted', data: leave });
});

const listLeaves = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.employee_id) where.employee_id = req.query.employee_id;
  if (req.query.status) where.status = req.query.status;
  const leaves = await EmployeeLeave.findAll({
    where,
    include: [
      { model: LeaveType, as: 'leaveType' },
      { model: Employee, as: 'employee', attributes: ['id', 'employee_code', 'first_name', 'last_name'] },
    ],
    order: [['id', 'DESC']],
  });
  return ApiResponse.success(res, { message: 'Leave applications retrieved', data: leaves });
});

const decideLeave = asyncHandler(async (req, res) => {
  const { decision } = req.body; // APPROVED | REJECTED
  const leave = await EmployeeLeave.findByPk(req.params.id);
  if (!leave) return ApiResponse.error(res, { message: 'Leave application not found', statusCode: 404 });
  await leave.update({ status: decision, approved_by: req.userId });

  if (decision === LEAVE_STATUS.APPROVED) {
    const dayjs = require('dayjs');
    let current = dayjs(leave.start_date);
    const end = dayjs(leave.end_date);
    while (current.isSame(end) || current.isBefore(end)) {
      // eslint-disable-next-line no-await-in-loop
      await attendanceService.markManualAttendance({
        employee_id: leave.employee_id,
        date: current.format('YYYY-MM-DD'),
        status: 'LEAVE',
      });
      current = current.add(1, 'day');
    }
  }

  return ApiResponse.success(res, { message: `Leave application ${decision.toLowerCase()}`, data: leave });
});

// ----- Holidays -----
const { Holiday } = require('../models');

const listHolidays = asyncHandler(async (req, res) => {
  const holidays = await Holiday.findAll({ order: [['date', 'ASC']] });
  return ApiResponse.success(res, { message: 'Holidays retrieved', data: holidays });
});

const createHoliday = asyncHandler(async (req, res) => {
  const holiday = await Holiday.create(req.body);
  return ApiResponse.created(res, { message: 'Holiday created', data: holiday });
});

module.exports = {
  checkIn, checkOut, markManual, list, summary,
  listLeaveTypes, applyLeave, listLeaves, decideLeave,
  listHolidays, createHoliday,
};