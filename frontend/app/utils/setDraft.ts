import type { ExerciseType, SetEntry } from '../types/workout';
import { formatNumber, partsToSeconds, secondsToParts } from './exerciseFormat';

export type DistanceUnit = 'km' | 'm';

/** A set as typed in the Track inputs (text until saved). */
export type SetDraft = {
  weight: string;
  reps: string;
  distance: string;
  distanceUnit: DistanceUnit;
  duration: { h: string; m: string; s: string };
  note: string;
};

export const EMPTY_DRAFT: SetDraft = {
  weight: '',
  reps: '',
  distance: '',
  distanceUnit: 'km',
  duration: { h: '', m: '', s: '' },
  note: '',
};

/** Fills the inputs from a set (to pre-fill the next one, or to edit a saved one). */
export function draftFromEntry(entry: SetEntry | undefined, keepNote = false): SetDraft {
  if (!entry) return EMPTY_DRAFT;
  const metres = entry.distance_m ?? 0;
  const useKm = metres === 0 || metres >= 1000;
  return {
    weight: entry.weight_kg ? formatNumber(entry.weight_kg, 2) : '',
    reps: entry.reps ? String(entry.reps) : '',
    distance: metres ? (useKm ? formatNumber(metres / 1000, 3) : formatNumber(metres, 0)) : '',
    distanceUnit: useKm ? 'km' : 'm',
    duration: secondsToParts(entry.duration_s ?? 0),
    note: keepNote ? entry.note ?? '' : '',
  };
}

const num = (v: string): number => (v.trim() === '' ? 0 : Number(v));

/** Turns typed inputs into a set for the exercise type, or returns what is wrong. */
export function draftToEntry(type: ExerciseType, d: SetDraft): SetEntry | string {
  const note = d.note.trim().slice(0, 200);
  const base: SetEntry = { weight_kg: 0, reps: 0, ...(note ? { note } : {}) };

  if (type === 'weight_reps' || type === 'reps') {
    const reps = num(d.reps);
    const weight = num(d.weight);
    if (!Number.isInteger(reps) || reps < 1 || reps > 1000) return 'Enter the reps (1 or more)';
    if (!Number.isFinite(weight) || weight < 0 || weight > 1000) return 'Weight must be between 0 and 1000 kg';
    if (type === 'weight_reps' && d.weight.trim() === '') return 'Enter the weight (0 for bodyweight)';
    return { ...base, weight_kg: weight, reps };
  }

  const seconds = partsToSeconds(d.duration.h, d.duration.m, d.duration.s);
  if (seconds === null) return 'Time must be whole numbers, minutes and seconds under 60';
  if (seconds > 24 * 3600) return 'Time must be under 24 hours';

  if (type === 'time') {
    if (seconds <= 0) return 'Enter the time';
    return { ...base, duration_s: seconds };
  }

  const dist = num(d.distance);
  if (!Number.isFinite(dist) || dist < 0) return 'Distance must be a positive number';
  const metres = Math.round(d.distanceUnit === 'km' ? dist * 1000 : dist);
  if (metres > 500_000) return 'Distance must be under 500 km';
  if (metres <= 0 && seconds <= 0) return 'Enter a distance or a time';
  return { ...base, ...(metres > 0 ? { distance_m: metres } : {}), ...(seconds > 0 ? { duration_s: seconds } : {}) };
}

/**
 * Which set pre-fills the inputs for the next set: the same set number from last session (so
 * set 3 starts at last week's set 3), else the last set logged today, else last session's last.
 */
export function prefillSource(today: SetEntry[], previous: SetEntry[] | undefined): SetEntry | undefined {
  const prev = previous ?? [];
  return prev[today.length] ?? today[today.length - 1] ?? prev[prev.length - 1];
}
