const SHIFTS = [
  { name: 'Shift A (Morning)', code: 'SHIFT_A', start_time: '06:00:00', end_time: '14:00:00', is_night_shift: false },
  { name: 'Shift B (Afternoon)', code: 'SHIFT_B', start_time: '14:00:00', end_time: '22:00:00', is_night_shift: false },
  { name: 'Shift C (Night)', code: 'SHIFT_C', start_time: '22:00:00', end_time: '06:00:00', is_night_shift: true },
  { name: 'General / Day Shift', code: 'GENERAL', start_time: '08:30:00', end_time: '17:30:00', is_night_shift: false },
];

const WORK_SCHEDULES = [
  { name: 'Fixed Day Schedule', type: 'FIXED', description: 'Standard fixed hours, Monday-Friday' },
  { name: 'Rotating 3-Shift Schedule', type: 'ROTATING', description: 'Rotates weekly across Shift A / B / C' },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert('shifts', SHIFTS.map((s) => ({ ...s, is_active: true, created_at: now, updated_at: now })));
    await queryInterface.bulkInsert('work_schedules', WORK_SCHEDULES.map((w) => ({ ...w, created_at: now, updated_at: now })));
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('work_schedules', null, {});
    await queryInterface.bulkDelete('shifts', null, {});
  },
};