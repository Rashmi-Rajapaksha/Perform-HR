const dayjs = require('dayjs');
const { createRng } = require('../src/utils/seedData/seededRandom');
const { FIRST_NAMES_MALE, FIRST_NAMES_FEMALE, LAST_NAMES } = require('../src/utils/seedData/names');

const rng = createRng(1001);
const TODAY = dayjs();

function randomName() {
  const isMale = rng.bool(0.55);
  const first = isMale ? rng.choice(FIRST_NAMES_MALE) : rng.choice(FIRST_NAMES_FEMALE);
  const last = rng.choice(LAST_NAMES);
  return { first_name: first, last_name: last, gender: isMale ? 'MALE' : 'FEMALE' };
}

function randomJoinDate(minYearsAgo, maxYearsAgo) {
  const daysAgo = rng.int(minYearsAgo * 365, maxYearsAgo * 365);
  return TODAY.subtract(daysAgo, 'day').format('YYYY-MM-DD');
}

function salaryWithVariance(base, variancePct = 0.12) {
  const delta = base * variancePct;
  return Math.round(rng.float(base - delta, base + delta, 0) / 100) * 100;
}

/**
 * Org chart blueprint. Each entry is one employee "slot" with a temporary
 * key (used to wire up reporting_manager_id before real DB ids exist) and
 * a reportsTo key referencing another slot's tempKey (or null for the
 * CEO). department/designation are codes matched against the tables
 * seeded in 004/005.
 */
function buildOrgChart() {
  const slots = [];

  slots.push({
    key: 'CEO', department: 'ADMIN', designation: 'CEO', reportsTo: null,
    salaryBase: 380000, joinRange: [6, 9], schedule: 'FIXED',
  });
  slots.push({
    key: 'ADMIN-MGR', department: 'ADMIN', designation: 'DEPT_MGR', reportsTo: 'CEO',
    salaryBase: 210000, joinRange: [5, 8], schedule: 'FIXED',
  });
  for (let i = 1; i <= 6; i += 1) {
    slots.push({
      key: `ADMIN-ASST-${i}`, department: 'ADMIN', designation: 'ADMIN_ASST', reportsTo: 'ADMIN-MGR',
      salaryBase: 55000, joinRange: [0, 6], schedule: 'FIXED',
    });
  }

  slots.push({
    key: 'PROD-MGR', department: 'PROD', designation: 'DEPT_MGR', reportsTo: 'CEO',
    salaryBase: 220000, joinRange: [5, 9], schedule: 'FIXED',
  });
  for (let i = 1; i <= 3; i += 1) {
    slots.push({
      key: `PROD-SUP-${i}`, department: 'PROD', designation: 'SUPERVISOR', reportsTo: 'PROD-MGR',
      salaryBase: 105000, joinRange: [3, 7], schedule: 'ROTATING', shiftHint: ['SHIFT_A', 'SHIFT_B', 'SHIFT_C'][i - 1],
    });
  }
  for (let i = 1; i <= 4; i += 1) {
    slots.push({
      key: `PROD-SR-${i}`, department: 'PROD', designation: 'SR_OFFICER', reportsTo: 'PROD-MGR',
      salaryBase: 82000, joinRange: [2, 6], schedule: 'ROTATING',
    });
  }
  for (let i = 1; i <= 30; i += 1) {
    const sup = `PROD-SUP-${((i - 1) % 3) + 1}`;
    const designation = i <= 20 ? 'MACHINE_OP' : 'PROD_OP';
    slots.push({
      key: `PROD-OP-${i}`, department: 'PROD', designation, reportsTo: sup,
      salaryBase: designation === 'MACHINE_OP' ? 58000 : 42000, joinRange: [0, 5], schedule: 'ROTATING',
    });
  }
  for (let i = 1; i <= 2; i += 1) {
    slots.push({
      key: `PROD-TR-${i}`, department: 'PROD', designation: 'TRAINEE', reportsTo: `PROD-SUP-${i}`,
      salaryBase: 32000, joinRange: [0, 1], schedule: 'ROTATING',
    });
  }

  slots.push({
    key: 'QA-MGR', department: 'QA', designation: 'DEPT_MGR', reportsTo: 'CEO',
    salaryBase: 195000, joinRange: [4, 8], schedule: 'FIXED',
  });
  for (let i = 1; i <= 2; i += 1) {
    slots.push({
      key: `QA-SUP-${i}`, department: 'QA', designation: 'SUPERVISOR', reportsTo: 'QA-MGR',
      salaryBase: 98000, joinRange: [3, 6], schedule: 'ROTATING',
    });
  }
  for (let i = 1; i <= 9; i += 1) {
    slots.push({
      key: `QA-INS-${i}`, department: 'QA', designation: 'QC_INSPECTOR', reportsTo: `QA-SUP-${((i - 1) % 2) + 1}`,
      salaryBase: 56000, joinRange: [0, 5], schedule: 'ROTATING',
    });
  }

  slots.push({
    key: 'MAINT-MGR', department: 'MAINT', designation: 'DEPT_MGR', reportsTo: 'CEO',
    salaryBase: 190000, joinRange: [4, 8], schedule: 'FIXED',
  });
  for (let i = 1; i <= 2; i += 1) {
    slots.push({
      key: `MAINT-SUP-${i}`, department: 'MAINT', designation: 'SUPERVISOR', reportsTo: 'MAINT-MGR',
      salaryBase: 100000, joinRange: [3, 7], schedule: 'ROTATING',
    });
  }
  for (let i = 1; i <= 7; i += 1) {
    slots.push({
      key: `MAINT-TECH-${i}`, department: 'MAINT', designation: 'MAINT_TECH', reportsTo: `MAINT-SUP-${((i - 1) % 2) + 1}`,
      salaryBase: 60000, joinRange: [0, 6], schedule: 'ROTATING',
    });
  }

  slots.push({
    key: 'WH-MGR', department: 'WH', designation: 'DEPT_MGR', reportsTo: 'CEO',
    salaryBase: 185000, joinRange: [4, 8], schedule: 'FIXED',
  });
  for (let i = 1; i <= 2; i += 1) {
    slots.push({
      key: `WH-SUP-${i}`, department: 'WH', designation: 'SUPERVISOR', reportsTo: 'WH-MGR',
      salaryBase: 95000, joinRange: [3, 6], schedule: 'FIXED',
    });
  }
  for (let i = 1; i <= 9; i += 1) {
    slots.push({
      key: `WH-ASST-${i}`, department: 'WH', designation: 'WH_ASSISTANT', reportsTo: `WH-SUP-${((i - 1) % 2) + 1}`,
      salaryBase: 48000, joinRange: [0, 5], schedule: 'FIXED',
    });
  }

  slots.push({
    key: 'HR-MGR', department: 'HR', designation: 'DEPT_MGR', reportsTo: 'CEO',
    salaryBase: 200000, joinRange: [4, 8], schedule: 'FIXED',
  });
  slots.push({
    key: 'HR-ASST-MGR', department: 'HR', designation: 'ASST_MGR', reportsTo: 'HR-MGR',
    salaryBase: 140000, joinRange: [3, 6], schedule: 'FIXED',
  });
  for (let i = 1; i <= 6; i += 1) {
    slots.push({
      key: `HR-OFF-${i}`, department: 'HR', designation: 'HR_OFFICER', reportsTo: 'HR-ASST-MGR',
      salaryBase: 72000, joinRange: [0, 5], schedule: 'FIXED',
    });
  }

  slots.push({
    key: 'FIN-MGR', department: 'FIN', designation: 'DEPT_MGR', reportsTo: 'CEO',
    salaryBase: 210000, joinRange: [4, 8], schedule: 'FIXED',
  });
  slots.push({
    key: 'FIN-ASST-MGR', department: 'FIN', designation: 'ASST_MGR', reportsTo: 'FIN-MGR',
    salaryBase: 145000, joinRange: [3, 6], schedule: 'FIXED',
  });
  for (let i = 1; i <= 8; i += 1) {
    slots.push({
      key: `FIN-OFF-${i}`, department: 'FIN', designation: 'FIN_OFFICER', reportsTo: 'FIN-ASST-MGR',
      salaryBase: 75000, joinRange: [0, 5], schedule: 'FIXED',
    });
  }

  return slots;
}

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const [departments] = await queryInterface.sequelize.query('SELECT id, code FROM departments');
    const [designations] = await queryInterface.sequelize.query('SELECT id, code FROM designations');
    const [employmentTypes] = await queryInterface.sequelize.query('SELECT id, name FROM employment_types');
    const [shifts] = await queryInterface.sequelize.query('SELECT id, code FROM shifts');

    const deptId = Object.fromEntries(departments.map((d) => [d.code, d.id]));
    const desigId = Object.fromEntries(designations.map((d) => [d.code, d.id]));
    const empTypeId = Object.fromEntries(employmentTypes.map((t) => [t.name, t.id]));
    const shiftId = Object.fromEntries(shifts.map((s) => [s.code, s.id]));

    const slots = buildOrgChart();

    // ----- Build employee rows (employee_code = EMP0001..EMP0100 in slot order) -----
    const employeeRows = slots.map((slot, idx) => {
      const code = `EMP${String(idx + 1).padStart(4, '0')}`;
      const { first_name, last_name, gender } = randomName();
      const employmentType = rng.weightedChoice([
        { value: 'PERMANENT', weight: 80 },
        { value: 'CONTRACT', weight: 12 },
        { value: 'PROBATION', weight: 5 },
        { value: 'INTERN', weight: 3 },
      ]);

      let employment_status = 'ACTIVE';
      let end_date = null;
      const statusRoll = rng.next();
      if (slot.designation !== 'CEO' && slot.designation !== 'DEPT_MGR') {
        if (statusRoll < 0.02) { employment_status = 'ON_LEAVE'; }
        else if (statusRoll < 0.03) { employment_status = 'SUSPENDED'; }
        else if (statusRoll < 0.045) {
          employment_status = 'RESIGNED';
          end_date = TODAY.subtract(rng.int(10, 75), 'day').format('YYYY-MM-DD');
        }
      }

      return {
        __key: slot.key,
        __reportsTo: slot.reportsTo,
        __schedule: slot.schedule,
        __shiftHint: slot.shiftHint || null,
        __department: slot.department,
        employee_code: code,
        first_name,
        last_name,
        gender,
        date_of_birth: TODAY.subtract(rng.int(23, 58), 'year').subtract(rng.int(0, 364), 'day').format('YYYY-MM-DD'),
        phone: `07${rng.int(1, 9)}${rng.int(1000000, 9999999)}`,
        email: `${first_name}.${last_name}${idx + 1}@hrplus-demo.local`.toLowerCase(),
        address: `No. ${rng.int(1, 250)}, ${rng.choice(['Main Street', 'Factory Road', 'Park Avenue', 'Lake View', 'Temple Lane'])}, Colombo`,
        department_id: deptId[slot.department],
        section_id: null,
        designation_id: desigId[slot.designation],
        reporting_manager_id: null, // resolved in the update pass below
        employment_type_id: empTypeId[employmentType],
        employment_status,
        join_date: randomJoinDate(slot.joinRange[0], slot.joinRange[1]),
        end_date,
        work_schedule_type: slot.schedule,
        basic_salary: salaryWithVariance(slot.salaryBase),
        created_at: now,
        updated_at: now,
      };
    });

    const insertRows = employeeRows.map(({ __key, __reportsTo, __schedule, __shiftHint, __department, ...row }) => row);
    await queryInterface.bulkInsert('employees', insertRows);

    // ----- Resolve real ids and wire up manager relationships -----
    const [inserted] = await queryInterface.sequelize.query('SELECT id, employee_code FROM employees');
    const idByCode = Object.fromEntries(inserted.map((r) => [r.employee_code, r.id]));
    const idByKey = Object.fromEntries(employeeRows.map((r) => [r.__key, idByCode[r.employee_code]]));

    for (const row of employeeRows) {
      const managerId = row.__reportsTo ? idByKey[row.__reportsTo] : null;
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.bulkUpdate('employees', { reporting_manager_id: managerId }, { id: idByCode[row.employee_code] });
    }

    // ----- Employment history (HIRE record for every employee) -----
    const historyRows = employeeRows.map((row) => ({
      employee_id: idByCode[row.employee_code],
      department_id: row.department_id,
      designation_id: row.designation_id,
      effective_date: row.join_date,
      change_type: 'HIRE',
      remarks: 'Initial hire record (seed data)',
      created_at: now,
      updated_at: now,
    }));
    await queryInterface.bulkInsert('employee_employment_history', historyRows);

    // ----- Shift assignments: rotating-schedule staff get one of Shift A/B/C, fixed-schedule staff get GENERAL -----
    const shiftAssignmentRows = employeeRows.map((row) => {
      let assignedShiftCode;
      if (row.__schedule === 'ROTATING') {
        assignedShiftCode = row.__shiftHint || rng.choice(['SHIFT_A', 'SHIFT_B', 'SHIFT_C']);
      } else {
        assignedShiftCode = 'GENERAL';
      }
      return {
        employee_id: idByCode[row.employee_code],
        shift_id: shiftId[assignedShiftCode],
        effective_date: row.join_date,
        end_date: null,
        created_at: now,
        updated_at: now,
      };
    });
    await queryInterface.bulkInsert('employee_shift_assignments', shiftAssignmentRows);

    // ----- Link demo login accounts (seeded in 003-admin-user.js) to real employees -----
    const hrManagerEmployeeId = idByKey['HR-MGR'];
    const deptManagerEmployeeId = idByKey['PROD-MGR'];
    const demoEmployeeId = idByKey['PROD-OP-1'];

    await queryInterface.bulkUpdate('users', { employee_id: hrManagerEmployeeId }, { username: 'hr.manager' });
    await queryInterface.bulkUpdate('users', { employee_id: deptManagerEmployeeId }, { username: 'dept.manager' });
    await queryInterface.bulkUpdate('users', { employee_id: demoEmployeeId }, { username: 'employee.demo' });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkUpdate('users', { employee_id: null }, {});
    await queryInterface.bulkDelete('employee_shift_assignments', null, {});
    await queryInterface.bulkDelete('employee_employment_history', null, {});
    await queryInterface.bulkDelete('employees', null, {});
  },
};