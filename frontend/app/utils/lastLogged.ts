import { addDays, parseLocalDate, todayLocal } from './date';

/** Whole days between two local dates (b - a). */
function daysBetween(a: string, b: string): number | null {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  if (!da || !db) {
    return null;
  }
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/**
 * "Logged today", "Logged yesterday", "Logged 3 days ago", or "No logs yet". The server only looks
 * back about four months, so a missing date reads as "No logs yet".
 */
export function lastLoggedLabel(lastActivityDate: string | undefined, now: Date = new Date()): string {
  if (!lastActivityDate || !parseLocalDate(lastActivityDate)) {
    return 'No logs yet';
  }
  const today = todayLocal(now);
  if (lastActivityDate >= today) {
    return 'Logged today';
  }
  if (lastActivityDate === addDays(today, -1)) {
    return 'Logged yesterday';
  }
  const days = daysBetween(lastActivityDate, today);
  return days === null ? 'No logs yet' : `Logged ${days} days ago`;
}
