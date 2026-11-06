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

/** Weekday with the date, e.g. "Sunday, 1 November". */
export function weekdayDateLabel(value: string): string {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : value;
}

/** "Good morning" (5-11), "Good afternoon" (12-16) or "Good evening". */
export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
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

/** Short day and month for chart axes, e.g. "17 May". */
export function shortDayMonth(value: string): string {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : value;
}

/** Whole days from one date to another (b - a); null if either is invalid. */
export function daysBetween(a: string, b: string): number | null {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  if (!da || !db) return null;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/** "today", "yesterday", "3 days ago", "2 weeks ago", "5 months ago". */
export function agoLabel(value: string, now: Date = new Date()): string {
  const days = daysBetween(value, todayLocal(now));
  if (days === null) return value;
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return w === 1 ? '1 week ago' : `${w} weeks ago`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return m === 1 ? '1 month ago' : `${m} months ago`;
  }
  const y = Math.floor(days / 365);
  return y === 1 ? '1 year ago' : `${y} years ago`;
}
