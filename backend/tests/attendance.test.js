const { computeMinutes } = require('../src/services/attendanceService');

describe('attendanceService - computeMinutes', () => {
  const shiftStart = '08:30:00';
  const shiftEnd = '17:30:00';
  const dateStr = '2026-03-02';

  test('on-time check-in and check-out yields full regular minutes, no late/early/OT', () => {
    const result = computeMinutes({
      checkIn: `${dateStr} 08:30:00`,
      checkOut: `${dateStr} 17:30:00`,
      shiftStart, shiftEnd, dateStr,
    });
    expect(result.lateMinutes).toBe(0);
    expect(result.earlyLeaveMinutes).toBe(0);
    expect(result.overtimeMinutes).toBe(0);
    expect(result.regularMinutes).toBe(540); // 9 hours
  });

  test('late check-in reduces regular minutes and records late minutes', () => {
    const result = computeMinutes({
      checkIn: `${dateStr} 08:45:00`,
      checkOut: `${dateStr} 17:30:00`,
      shiftStart, shiftEnd, dateStr,
    });
    expect(result.lateMinutes).toBe(15);
    expect(result.regularMinutes).toBe(525);
  });

  test('early leave records early-leave minutes', () => {
    const result = computeMinutes({
      checkIn: `${dateStr} 08:30:00`,
      checkOut: `${dateStr} 17:00:00`,
      shiftStart, shiftEnd, dateStr,
    });
    expect(result.earlyLeaveMinutes).toBe(30);
  });

  test('staying past shift end records overtime minutes', () => {
    const result = computeMinutes({
      checkIn: `${dateStr} 08:30:00`,
      checkOut: `${dateStr} 19:00:00`,
      shiftStart, shiftEnd, dateStr,
    });
    expect(result.overtimeMinutes).toBe(90);
  });

  test('missing check-in or check-out yields all zeros', () => {
    const result = computeMinutes({ checkIn: null, checkOut: null, shiftStart, shiftEnd, dateStr });
    expect(result).toEqual({ regularMinutes: 0, lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0 });
  });
});
