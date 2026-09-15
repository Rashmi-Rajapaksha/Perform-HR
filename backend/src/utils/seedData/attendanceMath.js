const dayjs = require('dayjs');

/**
 * Standalone (DB-free) mirror of attendanceService.computeMinutes, kept
 * separate so seeders don't need to load the full Sequelize model graph
 * just to reuse this one pure calculation.
 */
function computeMinutes({ checkIn, checkOut, shiftStart, shiftEnd, dateStr }) {
  const scheduledStart = dayjs(`${dateStr} ${shiftStart}`);
  const scheduledEnd = dayjs(`${dateStr} ${shiftEnd}`);
  const actualIn = dayjs(`${dateStr} ${checkIn}`);
  const actualOut = dayjs(`${dateStr} ${checkOut}`);

  const lateMinutes = Math.max(0, actualIn.diff(scheduledStart, 'minute'));
  const earlyLeaveMinutes = Math.max(0, scheduledEnd.diff(actualOut, 'minute'));
  const overtimeMinutes = Math.max(0, actualOut.diff(scheduledEnd, 'minute'));

  const scheduledMinutes = Math.max(0, scheduledEnd.diff(scheduledStart, 'minute'));
  const regularMinutes = Math.max(0, scheduledMinutes - lateMinutes - earlyLeaveMinutes);

  return { regularMinutes, lateMinutes, earlyLeaveMinutes, overtimeMinutes };
}

function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const base = dayjs().hour(h).minute(m).second(0);
  return base.add(minutes, 'minute').format('HH:mm:ss');
}

module.exports = { computeMinutes, addMinutesToTime };
