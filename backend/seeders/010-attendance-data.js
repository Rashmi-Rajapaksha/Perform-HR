const dayjs = require('dayjs');
const { createRng } = require('../src/utils/seedData/seededRandom');
const { buildHolidayDates, isWeekend, eachDay } = require('../src/utils/seedData/calendar');
const { computeMinutes, addMinutesToTime } = require('../src/utils/seedData/attendanceMath');

const rng = createRng(3003);
const TODAY = dayjs();
const WINDOW_START = TODAY.subtract(12, 'month').startOf('day');

function punctualityProfileFor() {
  const roll = rng.next();
  // Calibrated (together with performanceProfileFor in 009 and
  // manualPerformanceProfileFor in 012) so the MID tier's Attendance Rate /
  // Punctuality typically sits a bit below their 95%/90% KPI targets rather
  // than comfortably above - see the comment in 009-production-data.js.
  if (roll < 0.15) return { tier: 'LOW', absentProb: 0.16, lateProb: 0.45, leaveProb: 0.03 };
  if (roll < 0.80) return { tier: 'MID', absentProb: 0.07, lateProb: 0.26, leaveProb: 0.02 };
  return { tier: 'HIGH', absentProb: 0.005, lateProb: 0.03, leaveProb: 0.015 };
}

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const holidays = buildHolidayDates(WINDOW_START, TODAY);
    const holidayDates = new Set(holidays.map((h) => h.date));

    await queryInterface.bulkInsert(
      'holidays',
      holidays.map((h) => ({ name: h.name, date: h.date, is_recurring: true, created_at: now, updated_at: now }))
    );

    const [employees] = await queryInterface.sequelize.query(`
      SELECT id, join_date, end_date, employment_status FROM employees
    `);
    const [assignments] = await queryInterface.sequelize.query('SELECT employee_id, shift_id FROM employee_shift_assignments');
    const [shifts] = await queryInterface.sequelize.query('SELECT id, start_time, end_time FROM shifts');
    const shiftById = Object.fromEntries(shifts.map((s) => [s.id, s]));
    const shiftIdByEmployee = Object.fromEntries(assignments.map((a) => [a.employee_id, a.shift_id]));

    const rows = [];
    const leaveApplicationCandidates = [];

    employees.forEach((emp) => {
      const profile = punctualityProfileFor();
      const shiftId = shiftIdByEmployee[emp.id];
      const shift = shiftById[shiftId];
      if (!shift) return;

      const startDate = dayjs(emp.join_date).isAfter(WINDOW_START) ? dayjs(emp.join_date) : WINDOW_START;
      const endDate = emp.end_date && dayjs(emp.end_date).isBefore(TODAY) ? dayjs(emp.end_date) : TODAY;
      if (endDate.isBefore(startDate)) return;

      eachDay(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'), (dateStr) => {
        if (isWeekend(dateStr)) return;

        if (holidayDates.has(dateStr)) {
          rows.push({
            employee_id: emp.id, date: dateStr, shift_id: shiftId,
            check_in: null, check_out: null, regular_minutes: 0, late_minutes: 0,
            early_leave_minutes: 0, overtime_minutes: 0, status: 'HOLIDAY',
            created_at: now, updated_at: now,
          });
          return;
        }

        const outcomeRoll = rng.next();

        if (outcomeRoll < profile.leaveProb) {
          rows.push({
            employee_id: emp.id, date: dateStr, shift_id: shiftId,
            check_in: null, check_out: null, regular_minutes: 0, late_minutes: 0,
            early_leave_minutes: 0, overtime_minutes: 0, status: 'LEAVE',
            created_at: now, updated_at: now,
          });
          if (rng.next() < 0.1) leaveApplicationCandidates.push({ employee_id: emp.id, date: dateStr });
          return;
        }

        if (outcomeRoll < profile.leaveProb + profile.absentProb) {
          rows.push({
            employee_id: emp.id, date: dateStr, shift_id: shiftId,
            check_in: null, check_out: null, regular_minutes: 0, late_minutes: 0,
            early_leave_minutes: 0, overtime_minutes: 0, status: 'ABSENT',
            created_at: now, updated_at: now,
          });
          return;
        }

        const isHalfDay = rng.next() < 0.02;
        const isLate = rng.next() < profile.lateProb;
        const lateBy = isLate ? rng.int(5, 45) : 0;
        const hasOvertime = rng.next() < 0.18;
        const overtimeBy = hasOvertime ? rng.int(15, 120) : 0;
        const leavesEarly = !isHalfDay && rng.next() < 0.06;
        const earlyBy = leavesEarly ? rng.int(5, 30) : 0;

        const checkInTime = addMinutesToTime(shift.start_time, lateBy);
        let checkOutTime;
        if (isHalfDay) {
          const halfMinutes = Math.round(
            dayjs(`2000-01-01 ${shift.end_time}`).diff(dayjs(`2000-01-01 ${shift.start_time}`), 'minute') / 2
          );
          checkOutTime = addMinutesToTime(shift.start_time, halfMinutes);
        } else if (earlyBy > 0) {
          checkOutTime = addMinutesToTime(shift.end_time, -earlyBy);
        } else {
          checkOutTime = addMinutesToTime(shift.end_time, overtimeBy);
        }

        const minutes = computeMinutes({
          checkIn: checkInTime, checkOut: checkOutTime, shiftStart: shift.start_time, shiftEnd: shift.end_time, dateStr,
        });

        rows.push({
          employee_id: emp.id,
          date: dateStr,
          shift_id: shiftId,
          check_in: `${dateStr} ${checkInTime}`,
          check_out: `${dateStr} ${checkOutTime}`,
          regular_minutes: minutes.regularMinutes,
          late_minutes: minutes.lateMinutes,
          early_leave_minutes: minutes.earlyLeaveMinutes,
          overtime_minutes: minutes.overtimeMinutes,
          status: isHalfDay ? 'HALF_DAY' : 'PRESENT',
          created_at: now,
          updated_at: now,
        });
      });
    });

    const CHUNK_SIZE = 2000;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.bulkInsert('attendance_records', rows.slice(i, i + CHUNK_SIZE));
    }

    // ----- Leave types (master data) + a modest set of real leave applications for demo purposes -----
    await queryInterface.bulkInsert('leave_types', [
      { name: 'Annual Leave', code: 'ANNUAL', is_paid: true, max_days_per_year: 14, created_at: now, updated_at: now },
      { name: 'Casual Leave', code: 'CASUAL', is_paid: true, max_days_per_year: 7, created_at: now, updated_at: now },
      { name: 'Sick Leave', code: 'SICK', is_paid: true, max_days_per_year: 10, created_at: now, updated_at: now },
      { name: 'No-Pay Leave', code: 'NO_PAY', is_paid: false, max_days_per_year: 30, created_at: now, updated_at: now },
    ]);
    const [types] = await queryInterface.sequelize.query('SELECT id, code FROM leave_types');
    const [admin] = await queryInterface.sequelize.query("SELECT id FROM users WHERE username = 'hr.manager' LIMIT 1");
    const approverId = admin[0]?.id || null;

    const leaveRows = rng.shuffle(leaveApplicationCandidates).slice(0, 40).map((c) => ({
      employee_id: c.employee_id,
      leave_type_id: rng.choice(types).id,
      start_date: c.date,
      end_date: c.date,
      days: 1,
      status: rng.weightedChoice([{ value: 'APPROVED', weight: 75 }, { value: 'PENDING', weight: 15 }, { value: 'REJECTED', weight: 10 }]),
      reason: rng.choice(['Personal matters', 'Medical appointment', 'Family emergency', 'Illness', 'Personal leave']),
      approved_by: approverId,
      created_at: now,
      updated_at: now,
    }));

    if (leaveRows.length) await queryInterface.bulkInsert('employee_leaves', leaveRows);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('employee_leaves', null, {});
    await queryInterface.bulkDelete('attendance_records', null, {});
    await queryInterface.bulkDelete('holidays', null, {});
  },
};
