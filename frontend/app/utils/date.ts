/**
 * Calendar dates. Everything the app stores is a local calendar date "YYYY-MM-DD" in the device's
 * time zone (never `toISOString()`, which is UTC and puts early-morning logs on the wrong day).
 */

const pad = (n: number): string => String(n).padStart(2, '0');

/** Formats a Date as YYYY-MM-DD in the device's local time zone. */
export function toLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today's local calendar date. */
export function todayLocal(now: Date = new Date()): string {
  return toLocalDate(now);
}

/** Parses YYYY-MM-DD as local midnight. Returns null for anything else. */
export function parseLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) {
    return null;
  }
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Reject overflow such as 2026-02-31.
  return toLocalDate(date) === value ? date : null;
}

/** Adds days to a YYYY-MM-DD date, returning YYYY-MM-DD. */
export function addDays(value: string, days: number): string {
  const date = parseLocalDate(value);
  if (!date) {
    throw new Error(`invalid date: ${value}`);
  }
  date.setDate(date.getDate() + days);
  return toLocalDate(date);
}

/** "Today", "Yesterday", "Tomorrow" or e.g. "Mon, 12 Oct". */
export function relativeDayLabel(value: string, now: Date = new Date()): string {
  const today = todayLocal(now);
  if (value === today) {
    return 'Today';
  }
  if (value === addDays(today, -1)) {
    return 'Yesterday';
  }
  if (value === addDays(today, 1)) {
    return 'Tomorrow';
  }
  const date = parseLocalDate(value);
  if (!date) {
    return value;
  }
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Long form, e.g. "12 October 2026". */
export function longDateLabel(value: string): string {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : value;
}

/** True if the date is after today (no future logging). */
export function isFuture(value: string, now: Date = new Date()): boolean {
  return value > todayLocal(now);
}

/** The device's IANA time zone (e.g. "Asia/Kolkata"), or undefined if unavailable. */
export function deviceTimeZone(): string | undefined {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Last day of a monthly package that starts on `start` and runs `months` months: the day before
 * the same day-of-month `months` later (clamped to that month's length). 2026-10-01 for 1 month
 * ends 2026-10-31; 2026-01-31 for 1 month ends 2026-02-27 (28 Feb is the clamped renewal day).
 */
export function packageEndDate(start: string, months: number): string {
  const date = parseLocalDate(start);
  if (!date) {
    throw new Error(`invalid date: ${start}`);
  }
  const targetMonth = date.getMonth() + months;
  const daysInTarget = new Date(date.getFullYear(), targetMonth + 1, 0).getDate();
  const renewal = new Date(date.getFullYear(), targetMonth, Math.min(date.getDate(), daysInTarget));
  renewal.setDate(renewal.getDate() - 1);
  return toLocalDate(renewal);
}
