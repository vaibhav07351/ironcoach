import type { ExerciseSession } from '../types/workout';

/** Appends a history page, merging a day that was split across the page boundary. */
export function mergeSessions(current: ExerciseSession[], page: ExerciseSession[]): ExerciseSession[] {
  const out = [...current];
  for (const s of page) {
    const last = out[out.length - 1];
    if (last && last.date === s.date) {
      out[out.length - 1] = { ...last, entries: [...last.entries, ...s.entries] };
    } else {
      out.push(s);
    }
  }
  return out;
}
