import { buildMonthCells, monthRange, shiftMonth } from '../app/utils/calendar';
import { lastLoggedLabel } from '../app/utils/lastLogged';
import { shouldAskForReview } from '../app/utils/review';

describe('calendar', () => {
  it('lays out October 2026 Monday first (the 1st is a Thursday)', () => {
    const cells = buildMonthCells(2026, 9);
    expect(cells.length % 7).toBe(0);
    expect(cells.slice(0, 3).every((c) => c.date === null)).toBe(true);
    expect(cells[3]).toEqual({ date: '2026-10-01', day: 1 });
    expect(cells.filter((c) => c.date !== null)).toHaveLength(31);
  });

  it('handles a month that starts on Monday and leap February', () => {
    expect(buildMonthCells(2026, 5)[0].date).toBe('2026-06-01');
    expect(buildMonthCells(2028, 1).filter((c) => c.date !== null)).toHaveLength(29);
  });

  it('gives month bounds and shifts across years', () => {
    expect(monthRange(2026, 1)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });
});

describe('lastLoggedLabel', () => {
  const now = new Date(2026, 9, 24, 12, 0);
  it('words recent and old activity', () => {
    expect(lastLoggedLabel('2026-10-24', now)).toBe('Logged today');
    expect(lastLoggedLabel('2026-10-23', now)).toBe('Logged yesterday');
    expect(lastLoggedLabel('2026-10-19', now)).toBe('Logged 5 days ago');
    expect(lastLoggedLabel(undefined, now)).toBe('No logs yet');
    expect(lastLoggedLabel('garbage', now)).toBe('No logs yet');
  });
});

describe('shouldAskForReview', () => {
  it('asks only after a fresh log once at least four workouts exist, and only once', () => {
    expect(shouldAskForReview({ workoutCount: 4, trainedToday: true, alreadyAsked: false })).toBe(true);
    expect(shouldAskForReview({ workoutCount: 3, trainedToday: true, alreadyAsked: false })).toBe(false);
    expect(shouldAskForReview({ workoutCount: 9, trainedToday: false, alreadyAsked: false })).toBe(false);
    expect(shouldAskForReview({ workoutCount: 9, trainedToday: true, alreadyAsked: true })).toBe(false);
  });
});
