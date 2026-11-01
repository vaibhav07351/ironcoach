import {
  addDays,
  greetingForHour,
  isFuture,
  packageEndDate,
  parseLocalDate,
  relativeDayLabel,
  toLocalDate,
  todayLocal,
  weekdayDateLabel,
} from '../app/utils/date';

describe('date utils', () => {
  it('formats local calendar dates, not UTC', () => {
    // 00:30 local on 12 Oct: toISOString() would give the previous day in zones east of UTC.
    const d = new Date(2026, 9, 12, 0, 30);
    expect(toLocalDate(d)).toBe('2026-10-12');
    expect(todayLocal(d)).toBe('2026-10-12');
  });

  it('parses valid dates and rejects overflow or bad formats', () => {
    expect(parseLocalDate('2026-02-28')).not.toBeNull();
    expect(parseLocalDate('2026-02-31')).toBeNull();
    expect(parseLocalDate('12/10/2026')).toBeNull();
    expect(parseLocalDate('2026-10-12T05:00:00Z')).toBeNull();
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(() => addDays('nope', 1)).toThrow();
  });

  it('labels relative days', () => {
    const now = new Date(2026, 9, 12, 12, 0);
    expect(relativeDayLabel('2026-10-12', now)).toBe('Today');
    expect(relativeDayLabel('2026-10-11', now)).toBe('Yesterday');
    expect(relativeDayLabel('2026-10-13', now)).toBe('Tomorrow');
    expect(relativeDayLabel('2026-10-01', now)).not.toBe('Today');
  });

  it('detects future dates', () => {
    const now = new Date(2026, 9, 12, 12, 0);
    expect(isFuture('2026-10-12', now)).toBe(false);
    expect(isFuture('2026-10-13', now)).toBe(true);
  });
});

describe('packageEndDate', () => {
  it('ends the day before the same day next period', () => {
    expect(packageEndDate('2026-10-01', 1)).toBe('2026-10-31');
    expect(packageEndDate('2026-10-15', 1)).toBe('2026-11-14');
    expect(packageEndDate('2026-10-15', 3)).toBe('2027-01-14');
    expect(packageEndDate('2026-10-15', 12)).toBe('2027-10-14');
  });

  it('clamps to the end of a shorter month', () => {
    expect(packageEndDate('2026-01-31', 1)).toBe('2026-02-27');
    expect(packageEndDate('2028-01-31', 1)).toBe('2028-02-28');
  });

  it('rejects an invalid start date', () => {
    expect(() => packageEndDate('nope', 1)).toThrow();
  });

  it('greets by time of day at the boundaries', () => {
    expect(greetingForHour(4)).toBe('Good evening');
    expect(greetingForHour(5)).toBe('Good morning');
    expect(greetingForHour(11)).toBe('Good morning');
    expect(greetingForHour(12)).toBe('Good afternoon');
    expect(greetingForHour(16)).toBe('Good afternoon');
    expect(greetingForHour(17)).toBe('Good evening');
  });

  it('labels a date with its weekday and falls back to the raw value', () => {
    expect(weekdayDateLabel('2026-11-01')).toMatch(/Sunday/);
    expect(weekdayDateLabel('2026-11-01')).toMatch(/November/);
    expect(weekdayDateLabel('not-a-date')).toBe('not-a-date');
  });
});
