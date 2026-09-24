const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const attendanceService = require('../services/attendanceService');
const { EmployeeLeave, LeaveType, Employee } = require('../models');
const { LEAVE_STATUS } = require('../constants/statuses');

const checkIn = asyncHandler(async (req, res) => {
  const record = await attendanceService.checkIn({ employeeId: req.body.employee_id, shiftId: req.body.shift_id });
  return ApiResponse.success(res, { message: 'Checked in successfully', data: record });
});

const checkOut = asyncHandler(async (req, res) => {
  const employeeId = req.body.employee_id || req.user.employee_id;
  if (!employeeId) {
    return ApiResponse.error(res, { message: 'No employee profile linked to this account', statusCode: 400 });
  }
  const record = await attendanceService.checkOut({ employeeId });
  return ApiResponse.success(res, { message: 'Checked out successfully', data: record });
});

const markManual = asyncHandler(async (req, res) => {
  const { record, created } = await attendanceService.markManualAttendance(req.body);
  if (created) return ApiResponse.created(res, { message: 'Attendance recorded', data: record });
  return ApiResponse.success(res, { message: 'Attendance updated', data: record });
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

// Half-day applications are stored as a 0.5-day leave under this internal type,
// which is created on first use and hidden from the leave-type picker.
const HALF_DAY_LEAVE_CODE = 'HALF_DAY';

async function getHalfDayLeaveType() {
  const [type] = await LeaveType.findOrCreate({
    where: { code: HALF_DAY_LEAVE_CODE },
    defaults: { name: 'Half Day', code: HALF_DAY_LEAVE_CODE, is_paid: true },
  });
  return type;
}

const listLeaveTypes = asyncHandler(async (req, res) => {
  const types = await LeaveType.findAll({ where: { code: { [Op.ne]: HALF_DAY_LEAVE_CODE } }, order: [['id', 'ASC']] });
  return ApiResponse.success(res, { message: 'Leave types retrieved', data: types });
});

/** Every new application (leave or half day) starts as PENDING until approved / rejected. */
const applyLeave = asyncHandler(async (req, res) => {
  const { employee_id, leave_mode, reason } = req.body;

  const employee = await Employee.findByPk(employee_id, { attributes: ['id'] });
  if (!employee) return ApiResponse.error(res, { message: 'Employee not found', statusCode: 404 });

  let fields;
  if (leave_mode === 'HALF_DAY') {
    const halfDayType = await getHalfDayLeaveType();
    fields = { leave_type_id: halfDayType.id, start_date: req.body.date, end_date: req.body.date, days: 0.5 };
  } else {
    const leaveType = await LeaveType.findByPk(req.body.leave_type_id);
    if (!leaveType || leaveType.code === HALF_DAY_LEAVE_CODE) {
      return ApiResponse.error(res, { message: 'Leave type not found', statusCode: 404 });
    }
    fields = {
      leave_type_id: leaveType.id,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      days: Number(req.body.days),
    };
  }

  const leave = await EmployeeLeave.create({
    employee_id,
    ...fields,
    reason: reason.trim(),
    status: LEAVE_STATUS.PENDING,
  });
  return ApiResponse.created(res, { message: 'Leave application submitted (Pending approval)', data: leave });
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
  if (![LEAVE_STATUS.APPROVED, LEAVE_STATUS.REJECTED].includes(decision)) {
    return ApiResponse.error(res, { message: 'decision must be APPROVED or REJECTED', statusCode: 422 });
  }
  const leave = await EmployeeLeave.findByPk(req.params.id, { include: [{ model: LeaveType, as: 'leaveType' }] });
  if (!leave) return ApiResponse.error(res, { message: 'Leave application not found', statusCode: 404 });
  if (leave.status !== LEAVE_STATUS.PENDING) {
    return ApiResponse.error(res, { message: `Leave application is already ${leave.status.toLowerCase()}`, statusCode: 409 });
  }
  await leave.update({ status: decision, approved_by: req.userId });

  // A half day is still a working day: its attendance (HALF_DAY with check-in / check-out)
  // is recorded from Daily Attendance, so only full leave days are marked here.
  const isHalfDay = leave.leaveType?.code === HALF_DAY_LEAVE_CODE;
  if (decision === LEAVE_STATUS.APPROVED && !isHalfDay) {
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
