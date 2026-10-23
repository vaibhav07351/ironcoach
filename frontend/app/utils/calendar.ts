import { toLocalDate } from './date';

export type MonthCell = {
  /** YYYY-MM-DD, or null for the blank cells before the 1st. */
  date: string | null;
  day: number | null;
};

/**
 * The cells of a month grid, Monday first, padded with blanks so every row has seven cells.
 * `month` is 0-11 like JavaScript dates.
 */
export function buildMonthCells(year: number, month: number): MonthCell[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7;

  const cells: MonthCell[] = [];
  for (let i = 0; i < leading; i++) {
    cells.push({ date: null, day: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: toLocalDate(new Date(year, month, day)), day });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null });
  }
  return cells;
}

/** First and last date (YYYY-MM-DD) of a month. */
export function monthRange(year: number, month: number): { from: string; to: string } {
  return {
    from: toLocalDate(new Date(year, month, 1)),
    to: toLocalDate(new Date(year, month + 1, 0)),
  };
}

/** "October 2026". */
export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/** Moves a (year, month) pair by delta months, wrapping the year. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}
