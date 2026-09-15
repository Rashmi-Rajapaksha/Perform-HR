const dayjs = require('dayjs');
const { createRng } = require('../src/utils/seedData/seededRandom');
const { buildHolidayDates, isWeekend, eachDay } = require('../src/utils/seedData/calendar');

const rng = createRng(2002);
const TODAY = dayjs();
const WINDOW_START = TODAY.subtract(12, 'month').startOf('day');

/** Deterministic hidden "performance profile" per employee so their numbers are internally consistent across the whole seed run. */
function performanceProfileFor(employeeId) {
  const roll = rng.next();
  // Calibrated so that, combined across all of an employee's weighted KPIs, MID
  // (the majority tier) lands in the Good/Very Good band, LOW lands in
  // Satisfactory/Needs Improvement, and only HIGH reliably reaches Outstanding -
  // producing a realistic performance-rating spread rather than everyone scoring near 100%.
  if (roll < 0.15) return { tier: 'LOW', factor: rng.float(0.40, 0.62), defectBase: rng.float(0.06, 0.10) };
  if (roll < 0.80) return { tier: 'MID', factor: rng.float(0.68, 0.85), defectBase: rng.float(0.02, 0.04) };
  return { tier: 'HIGH', factor: rng.float(1.00, 1.18), defectBase: rng.float(0.002, 0.012) };
}

const TARGET_BY_DESIGNATION = {
  TRAINEE: [50, 70],
  PROD_OP: [90, 130],
  MACHINE_OP: [110, 150],
  SR_OFFICER: [80, 120],
  SUPERVISOR: [70, 100],
  DEPT_MGR: [40, 60],
};

const SHIFT_MULTIPLIER = { SHIFT_A: 1.0, SHIFT_B: 0.97, SHIFT_C: 0.92, GENERAL: 1.0 };

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const holidayDates = new Set(buildHolidayDates(WINDOW_START, TODAY).map((h) => h.date));

    const [employees] = await queryInterface.sequelize.query(`
      SELECT e.id, e.join_date, des.code AS desig_code
      FROM employees e
      JOIN departments d ON d.id = e.department_id
      JOIN designations des ON des.id = e.designation_id
      WHERE d.code = 'PROD' AND e.employment_status = 'ACTIVE'
    `);

    const [assignments] = await queryInterface.sequelize.query(`
      SELECT employee_id, shift_id FROM employee_shift_assignments
    `);
    const [shifts] = await queryInterface.sequelize.query('SELECT id, code FROM shifts');
    const shiftCodeById = Object.fromEntries(shifts.map((s) => [s.id, s.code]));
    const shiftIdByEmployee = Object.fromEntries(assignments.map((a) => [a.employee_id, a.shift_id]));

    const rows = [];

    employees.forEach((emp) => {
      const profile = performanceProfileFor(emp.id);
      const [minTarget, maxTarget] = TARGET_BY_DESIGNATION[emp.desig_code] || [80, 110];
      const shiftCode = shiftCodeById[shiftIdByEmployee[emp.id]] || 'GENERAL';
      const shiftMult = SHIFT_MULTIPLIER[shiftCode] || 1.0;

      const startDate = dayjs(emp.join_date).isAfter(WINDOW_START) ? dayjs(emp.join_date) : WINDOW_START;

      eachDay(startDate.format('YYYY-MM-DD'), TODAY.format('YYYY-MM-DD'), (dateStr) => {
        if (isWeekend(dateStr) || holidayDates.has(dateStr)) return;

        // Small chance the employee was absent/on leave that day - no production record generated (mirrors real absence).
        if (rng.next() < 0.03) return;

        const targetUnits = rng.int(minTarget, maxTarget);
        const dailyNoise = rng.float(0.9, 1.1);
        let producedUnits = Math.round(targetUnits * profile.factor * dailyNoise);
        producedUnits = Math.round(producedUnits * shiftMult);
        producedUnits = Math.max(0, producedUnits);

        const defectRate = Math.max(0, profile.defectBase + rng.float(-0.005, 0.01));
        const defectiveUnits = Math.round(producedUnits * defectRate);
        const reworkUnits = Math.round(defectiveUnits * rng.float(0.3, 0.7));

        const downtimeMinutes = profile.tier === 'LOW' ? rng.int(10, 75) : rng.int(0, 30);
        const safetyIncidentRoll = rng.next();
        const safetyIncidents = safetyIncidentRoll < (profile.tier === 'LOW' ? 0.02 : 0.005) ? 1 : 0;

        rows.push({
          employee_id: emp.id,
          date: dateStr,
          shift_id: shiftIdByEmployee[emp.id] || null,
          target_units: targetUnits,
          produced_units: producedUnits,
          defective_units: defectiveUnits,
          rework_units: reworkUnits,
          downtime_minutes: downtimeMinutes,
          safety_incidents: safetyIncidents,
          created_at: now,
          updated_at: now,
        });
      });
    });

    // Bulk insert in chunks to avoid oversized single queries against MySQL.
    const CHUNK_SIZE = 2000;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.bulkInsert('production_records', rows.slice(i, i + CHUNK_SIZE));
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('production_records', null, {});
  },
};
