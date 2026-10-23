import type { SessionMetrics } from '../types/workout';

type NumberKey = 'duration_min' | 'distance_m' | 'distance_km' | 'laps' | 'games_won' | 'games_lost' | 'rounds';
type TextKey = 'stroke' | 'intensity' | 'style' | 'session_kind' | 'title' | 'role_note';

export type ActivityField =
  | { key: NumberKey; label: string; kind: 'number'; unit?: string; placeholder: string; integer?: boolean }
  | { key: TextKey; label: string; kind: 'text'; placeholder: string };

const duration: ActivityField = { key: 'duration_min', label: 'Duration', kind: 'number', unit: 'min', placeholder: '45', integer: true };
const intensity: ActivityField = { key: 'intensity', label: 'Intensity', kind: 'text', placeholder: 'Easy, moderate, hard' };

/** The quick-log fields per sport (gym uses the exercise flow instead). */
export const ACTIVITY_FIELDS: Record<string, ActivityField[]> = {
  swimming: [
    duration,
    { key: 'distance_m', label: 'Distance', kind: 'number', unit: 'm', placeholder: '1000', integer: true },
    { key: 'laps', label: 'Laps', kind: 'number', placeholder: '40', integer: true },
    { key: 'stroke', label: 'Stroke', kind: 'text', placeholder: 'Freestyle' },
  ],
  running: [duration, { key: 'distance_km', label: 'Distance', kind: 'number', unit: 'km', placeholder: '5' }],
  badminton: [
    duration,
    { key: 'games_won', label: 'Games won', kind: 'number', placeholder: '2', integer: true },
    { key: 'games_lost', label: 'Games lost', kind: 'number', placeholder: '1', integer: true },
    intensity,
  ],
  yoga: [duration, { key: 'style', label: 'Style', kind: 'text', placeholder: 'Hatha, vinyasa' }, intensity],
  cricket: [
    duration,
    { key: 'session_kind', label: 'Session', kind: 'text', placeholder: 'Nets, match, fielding' },
    { key: 'role_note', label: 'Focus', kind: 'text', placeholder: 'Batting, bowling' },
  ],
  boxing: [duration, { key: 'rounds', label: 'Rounds', kind: 'number', placeholder: '6', integer: true }, intensity],
  mma: [duration, { key: 'rounds', label: 'Rounds', kind: 'number', placeholder: '6', integer: true }, intensity],
  other: [duration, { key: 'title', label: 'What did you do?', kind: 'text', placeholder: 'Cycling, hike, sport' }],
};

export function fieldsFor(activity: string): ActivityField[] {
  return ACTIVITY_FIELDS[activity] ?? ACTIVITY_FIELDS.other;
}

/** One-line summary of a sport session, e.g. "45 min · 5 km". */
export function summarizeMetrics(activity: string, metrics?: SessionMetrics): string {
  if (!metrics) {
    return '';
  }
  return fieldsFor(activity)
    .map((f) => {
      const value = metrics[f.key];
      if (value === undefined || value === '' || value === 0) return null;
      if (f.kind === 'number') return `${value}${f.unit ? ` ${f.unit}` : ` ${f.label.toLowerCase()}`}`;
      return String(value);
    })
    .filter((s): s is string => !!s)
    .join(' · ');
}
