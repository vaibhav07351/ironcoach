import { addDays, daysBetween, parseLocalDate, todayLocal } from './date';

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
