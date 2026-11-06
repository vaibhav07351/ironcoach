import type { ExerciseType, SeriesKey, SetEntry } from '../types/workout';

/** 100 -> "100", 7.5 -> "7.5", 126.66 -> "126.7". */
export function formatNumber(n: number, maxDecimals = 1): string {
  if (!Number.isFinite(n)) return '0';
  const factor = 10 ** maxDecimals;
  return String(Math.round(n * factor) / factor);
}

export function formatKg(kg: number): string {
  return `${formatNumber(kg)} kg`;
}

/** Seconds as "1:05:30" (an hour or more) or "5:30". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (v: number): string => String(v).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Metres as "5.25 km" from 1 km up, otherwise "800 m". */
export function formatDistance(metres: number): string {
  if (metres >= 1000) return `${formatNumber(metres / 1000, 2)} km`;
  return `${formatNumber(metres, 0)} m`;
}

/** Seconds per km as "6:10 /km". */
export function formatPace(secondsPerKm: number): string {
  return `${formatDuration(secondsPerKm)} /km`;
}

/** Seconds per km for a set with both distance and time, else 0. */
export function paceOf(entry: SetEntry): number {
  const d = entry.distance_m ?? 0;
  const t = entry.duration_s ?? 0;
  return d > 0 && t > 0 ? Math.round(t / (d / 1000)) : 0;
}

/** Epley estimated one-rep max; a single rep is the weight itself. */
export function estimatedOneRM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/** A set in one short line, e.g. "100 kg x 8", "12 reps", "5 km in 30:00", "1:30". */
export function formatSet(type: ExerciseType, e: SetEntry): string {
  switch (type) {
    case 'reps':
      return e.weight_kg > 0 ? `+${formatKg(e.weight_kg)} x ${e.reps}` : `${e.reps} reps`;
    case 'distance_time': {
      const parts: string[] = [];
      if (e.distance_m) parts.push(formatDistance(e.distance_m));
      if (e.duration_s) parts.push(e.distance_m ? `in ${formatDuration(e.duration_s)}` : formatDuration(e.duration_s));
      return parts.join(' ');
    }
    case 'time':
      return formatDuration(e.duration_s ?? 0);
    default:
      return `${formatKg(e.weight_kg)} x ${e.reps}`;
  }
}

/** Compact sets for the "last time" line: "80x12, 85x10, 90x10". */
export function formatSetsCompact(type: ExerciseType, entries: SetEntry[]): string {
  if (type === 'weight_reps') {
    return entries.map((e) => `${formatNumber(e.weight_kg)}x${e.reps}`).join(', ');
  }
  return entries.map((e) => formatSet(type, e)).join(', ');
}

/** Whole seconds from hours, minutes and seconds typed as text (blank = 0). Null if invalid. */
export function partsToSeconds(h: string, m: string, s: string): number | null {
  const nums = [h, m, s].map((v) => (v.trim() === '' ? 0 : Number(v)));
  if (nums.some((n) => !Number.isInteger(n) || n < 0)) return null;
  const [hh, mm, ss] = nums;
  if (mm > 59 || ss > 59) return null;
  return hh * 3600 + mm * 60 + ss;
}

/** Splits seconds into text parts for the h / m / s inputs (blank for leading zeros). */
export function secondsToParts(total: number): { h: string; m: string; s: string } {
  if (!total || total <= 0) return { h: '', m: '', s: '' };
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { h: h ? String(h) : '', m: h || m ? String(m) : '', s: String(s) };
}

export type SeriesOption = { key: SeriesKey; label: string };

/** The graph metrics offered per exercise type, in menu order. */
export function seriesOptions(type: ExerciseType): SeriesOption[] {
  switch (type) {
    case 'distance_time':
      return [
        { key: 'distance_m', label: 'Distance' },
        { key: 'duration_s', label: 'Time' },
        { key: 'pace_s_per_km', label: 'Pace' },
        { key: 'speed_kmh', label: 'Speed' },
      ];
    case 'time':
      return [
        { key: 'max_duration_s', label: 'Longest hold' },
        { key: 'duration_s', label: 'Total time' },
      ];
    case 'reps':
      return [
        { key: 'max_reps', label: 'Max reps' },
        { key: 'workout_reps', label: 'Workout reps' },
        { key: 'max_weight', label: 'Added weight' },
      ];
    default:
      return [
        { key: 'e1rm', label: 'Estimated 1RM' },
        { key: 'max_weight', label: 'Max weight' },
        { key: 'max_reps', label: 'Max reps' },
        { key: 'max_volume', label: 'Best set volume' },
        { key: 'workout_volume', label: 'Workout volume' },
        { key: 'workout_reps', label: 'Workout reps' },
      ];
  }
}

/** A series value with its unit, e.g. "126.7 kg", "6:10 /km", "5.2 km". */
export function formatSeriesValue(key: SeriesKey, v: number): string {
  switch (key) {
    case 'e1rm':
    case 'max_weight':
    case 'max_volume':
    case 'workout_volume':
      return formatKg(v);
    case 'max_reps':
    case 'workout_reps':
      return `${formatNumber(v, 0)} reps`;
    case 'distance_m':
      return formatDistance(v);
    case 'duration_s':
    case 'max_duration_s':
      return formatDuration(v);
    case 'pace_s_per_km':
      return formatPace(v);
    case 'speed_kmh':
      return `${formatNumber(v)} km/h`;
  }
}

/** Chart axis values: distances in km, times in minutes, so axis labels stay short. */
export function chartScale(key: SeriesKey): { factor: number; suffix: string; decimals: number } {
  switch (key) {
    case 'distance_m':
      return { factor: 1 / 1000, suffix: '', decimals: 1 };
    case 'duration_s':
    case 'max_duration_s':
    case 'pace_s_per_km':
      return { factor: 1 / 60, suffix: '', decimals: 1 };
    case 'max_reps':
    case 'workout_reps':
      return { factor: 1, suffix: '', decimals: 0 };
    default:
      return { factor: 1, suffix: '', decimals: 1 };
  }
}

/** A lift's score by what it is judged on: est. 1RM (kg), reps, distance or time. */
export function formatScore(kind: 'e1rm' | 'reps' | 'distance' | 'duration' | undefined, v: number): string {
  switch (kind) {
    case 'reps':
      return `${formatNumber(v, 0)} reps`;
    case 'distance':
      return formatDistance(v);
    case 'duration':
      return formatDuration(v);
    default:
      return formatKg(v);
  }
}

/** Signed change between two scores, e.g. "+11.3 kg", "+2 reps", "+1.5 km"; null when equal. */
export function formatScoreChange(kind: 'e1rm' | 'reps' | 'distance' | 'duration' | undefined, from: number, to: number): string | null {
  const diff = to - from;
  if (Math.abs(diff) < 0.05) return null;
  const sign = diff > 0 ? '+' : '-';
  return `${sign}${formatScore(kind, Math.abs(diff))}`;
}
