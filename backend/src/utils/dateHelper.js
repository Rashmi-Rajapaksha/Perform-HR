const dayjs = require('dayjs');

const DATE_FORMAT = 'YYYY-MM-DD';
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

function today() {
  return dayjs().format(DATE_FORMAT);
}

function formatDate(date, format = DATE_FORMAT) {
  return dayjs(date).format(format);
}

function diffInMinutes(startTime, endTime) {
  const start = dayjs(startTime);
  const end = dayjs(endTime);
  return Math.max(0, end.diff(start, 'minute'));
}

/** Number of calendar days between two dates, inclusive. */
function daysBetweenInclusive(start, end) {
  return dayjs(end).diff(dayjs(start), 'day') + 1;
}

/** Returns [{start, end}] boundaries for a given month (YYYY-MM). */
function getMonthRange(yearMonth) {
  const start = dayjs(`${yearMonth}-01`);
  const end = start.endOf('month');
  return { start: start.format(DATE_FORMAT), end: end.format(DATE_FORMAT) };
}

/** Returns the quarter (1-4) boundaries for a given year + quarter number. */
function getQuarterRange(year, quarter) {
  const startMonth = (quarter - 1) * 3;
  const start = dayjs(`${year}-01-01`).month(startMonth).startOf('month');
  const end = start.add(2, 'month').endOf('month');
  return { start: start.format(DATE_FORMAT), end: end.format(DATE_FORMAT) };
}

function isWeekend(date) {
  const day = dayjs(date).day();
  return day === 0 || day === 6; // Sunday=0, Saturday=6
}

function isSameOrBefore(a, b) {
  return dayjs(a).valueOf() <= dayjs(b).valueOf();
}

function addDays(date, amount) {
  return dayjs(date).add(amount, 'day').format(DATE_FORMAT);
}

module.exports = {
  DATE_FORMAT,
  DATETIME_FORMAT,
  today,
  formatDate,
  diffInMinutes,
  daysBetweenInclusive,
  getMonthRange,
  getQuarterRange,
  isWeekend,
  isSameOrBefore,
  addDays,
};