const dayjs = require('dayjs');
const { Op } = require('sequelize');
const { AttendanceRecord, Employee, Shift, EmployeeShiftAssignment, Holiday } = require('../models');
const { ATTENDANCE_STATUS } = require('../constants/statuses');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

/** Finds the shift an employee is assigned to as of a given date. */
async function getAssignedShift(employeeId, date) {
  const assignment = await EmployeeShiftAssignment.findOne({
    where: {
      employee_id: employeeId,
      effective_date: { [Op.lte]: date },
      [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: date } }],
    },
    include: [{ model: Shift, as: 'shift' }],
    order: [['effective_date', 'DESC']],
  });
  return assignment?.shift || null;
}

/**
 * Derives regular/late/early-leave/overtime minutes from raw check-in and
 * check-out timestamps against the assigned shift's scheduled window.
 * This is the single source of truth for attendance-derived minutes so
 * payroll and KPI calculations never recompute it differently.
 */
function computeMinutes({ checkIn, checkOut, shiftStart, shiftEnd, dateStr }) {
  if (!checkIn || !checkOut) {
    return { regularMinutes: 0, lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0 };
  }

  const scheduledStart = dayjs(`${dateStr} ${shiftStart}`);
  const scheduledEnd = dayjs(`${dateStr} ${shiftEnd}`);
  const actualIn = dayjs(checkIn);
  const actualOut = dayjs(checkOut);

  const lateMinutes = Math.max(0, actualIn.diff(scheduledStart, 'minute'));
  const earlyLeaveMinutes = Math.max(0, scheduledEnd.diff(actualOut, 'minute'));
  const overtimeMinutes = Math.max(0, actualOut.diff(scheduledEnd, 'minute'));

  const scheduledMinutes = Math.max(0, scheduledEnd.diff(scheduledStart, 'minute'));
  const lostMinutes = lateMinutes + earlyLeaveMinutes;
  const regularMinutes = Math.max(0, scheduledMinutes - lostMinutes);

  return { regularMinutes, lateMinutes, earlyLeaveMinutes, overtimeMinutes };
}

async function checkIn({ employeeId, shiftId }) {
  const date = dayjs().format('YYYY-MM-DD');
  const shift = shiftId ? await Shift.findByPk(shiftId) : await getAssignedShift(employeeId, date);

  const [record] = await AttendanceRecord.findOrCreate({
    where: { employee_id: employeeId, date },
    defaults: {
      employee_id: employeeId,
      date,
      shift_id: shift?.id || null,
      check_in: new Date(),
      status: ATTENDANCE_STATUS.PRESENT,
    },
  });

  if (!record.check_in) {
    record.check_in = new Date();
    record.shift_id = shift?.id || record.shift_id;
    record.status = ATTENDANCE_STATUS.PRESENT;
    await record.save();
  }

  return record;
}

async function checkOut({ employeeId }) {
  const date = dayjs().format('YYYY-MM-DD');
  const record = await AttendanceRecord.findOne({
    where: { employee_id: employeeId, date },
    include: [{ model: Shift, as: 'shift' }],
  });

  if (!record) {
    const err = new Error('No check-in found for today');
    err.statusCode = 400;
    throw err;
  }

  record.check_out = new Date();

  if (record.shift) {
    const minutes = computeMinutes({
      checkIn: record.check_in,
      checkOut: record.check_out,
      shiftStart: record.shift.start_time,
      shiftEnd: record.shift.end_time,
      dateStr: date,
    });
    Object.assign(record, {
      regular_minutes: minutes.regularMinutes,
      late_minutes: minutes.lateMinutes,
      early_leave_minutes: minutes.earlyLeaveMinutes,
      overtime_minutes: minutes.overtimeMinutes,
    });
  }

  await record.save();
  return record;
}

async function markManualAttendance({ employee_id, date, status, shift_id, check_in, check_out }) {
  const [record] = await AttendanceRecord.findOrCreate({
    where: { employee_id, date },
    defaults: { employee_id, date, status, shift_id: shift_id || null },
  });

  await record.update({
    status,
    shift_id: shift_id ?? record.shift_id,
    check_in: check_in ?? record.check_in,
    check_out: check_out ?? record.check_out,
  });

  return record;
}

async function listAttendance(query) {
  const { page, pageSize, limit, offset } = getPagination(query);
  const where = {};

  if (query.employee_id) where.employee_id = query.employee_id;
  if (query.from && query.to) where.date = { [Op.between]: [query.from, query.to] };
  else if (query.date) where.date = query.date;

  const include = [
    { model: Shift, as: 'shift' },
    {
      model: Employee,
      as: 'employee',
      attributes: ['id', 'employee_code', 'first_name', 'last_name', 'department_id'],
      where: query.department_id ? { department_id: query.department_id } : undefined,
    },
  ];

  const { rows, count } = await AttendanceRecord.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [['date', 'DESC']],
    distinct: true,
  });

  return { rows, meta: buildPaginationMeta({ total: count, page, pageSize }) };
}

/**
 * Aggregates attendance for one employee over a date range - the shared
 * building block used by payrollService (attendance deductions) and
 * kpiCalculationService (Attendance Rate / Punctuality automatic KPIs).
 */
async function getAttendanceSummary(employeeId, startDate, endDate) {
  const records = await AttendanceRecord.findAll({
    where: { employee_id: employeeId, date: { [Op.between]: [startDate, endDate] } },
  });

  const totalDays = records.length;
  const presentDays = records.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT || r.status === ATTENDANCE_STATUS.HALF_DAY).length;
  const absentDays = records.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT).length;
  const leaveDays = records.filter((r) => r.status === ATTENDANCE_STATUS.LEAVE).length;

  const totalLateMinutes = records.reduce((s, r) => s + r.late_minutes, 0);
  const totalEarlyLeaveMinutes = records.reduce((s, r) => s + r.early_leave_minutes, 0);
  const totalOvertimeMinutes = records.reduce((s, r) => s + r.overtime_minutes, 0);
  const onTimeDays = records.filter((r) => r.late_minutes === 0 && r.status === ATTENDANCE_STATUS.PRESENT).length;

  const workableDays = totalDays - records.filter((r) => r.status === ATTENDANCE_STATUS.HOLIDAY || r.status === ATTENDANCE_STATUS.OFF_DAY).length;

  const attendanceRate = workableDays > 0 ? Math.round((presentDays / workableDays) * 10000) / 100 : 0;
  const punctualityRate = presentDays > 0 ? Math.round((onTimeDays / presentDays) * 10000) / 100 : 0;
  const absenteeismRate = workableDays > 0 ? Math.round((absentDays / workableDays) * 10000) / 100 : 0;

  return {
    totalDays,
    workableDays,
    presentDays,
    absentDays,
    leaveDays,
    totalLateMinutes,
    totalEarlyLeaveMinutes,
    totalOvertimeMinutes,
    deductibleMinutes: totalLateMinutes + totalEarlyLeaveMinutes,
    attendanceRate,
    punctualityRate,
    absenteeismRate,
  };
}

module.exports = {
  getAssignedShift,
  computeMinutes,
  checkIn,
  checkOut,
  markManualAttendance,
  listAttendance,
  getAttendanceSummary,
};