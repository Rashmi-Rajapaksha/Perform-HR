const dayjs = require('dayjs');

/** Fixed-date public holidays applied every year within the seed window. */
const FIXED_HOLIDAYS_MM_DD = [
  { md: '01-01', name: "New Year's Day" },
  { md: '02-04', name: 'Independence Day' },
  { md: '05-01', name: 'Labour Day' },
  { md: '12-25', name: 'Christmas Day' },
  { md: '12-31', name: "Year End Holiday" },
];

/** Builds the concrete holiday-date list (YYYY-MM-DD) covering [from, to]. */
function buildHolidayDates(from, to) {
  const start = dayjs(from);
  const end = dayjs(to);
  const dates = [];
  for (let year = start.year(); year <= end.year(); year += 1) {
    FIXED_HOLIDAYS_MM_DD.forEach(({ md, name }) => {
      const date = dayjs(`${year}-${md}`);
      if ((date.isAfter(start) || date.isSame(start)) && (date.isBefore(end) || date.isSame(end))) {
        dates.push({ date: date.format('YYYY-MM-DD'), name });
      }
    });
  }
  return dates;
}

function isWeekend(dateStr) {
  const day = dayjs(dateStr).day();
  return day === 0 || day === 6;
}

/** Iterates every calendar day between [from, to] inclusive, calling cb(dateStr). */
function eachDay(from, to, cb) {
  let current = dayjs(from);
  const end = dayjs(to);
  while (current.isBefore(end) || current.isSame(end)) {
    cb(current.format('YYYY-MM-DD'));
    current = current.add(1, 'day');
  }
}

module.exports = { buildHolidayDates, isWeekend, eachDay, FIXED_HOLIDAYS_MM_DD };
