export const EXPERTISE_OPTIONS = [
  { code: 'gym', label: 'Gym' },
  { code: 'swimming', label: 'Swimming' },
  { code: 'badminton', label: 'Badminton' },
  { code: 'yoga', label: 'Yoga' },
  { code: 'running', label: 'Running' },
  { code: 'cricket', label: 'Cricket' },
  { code: 'boxing', label: 'Boxing' },
  { code: 'mma', label: 'MMA' },
  { code: 'other', label: 'Other' },
] as const;

export type ExpertiseCode = (typeof EXPERTISE_OPTIONS)[number]['code'];

/**
 * What can be logged: every expertise plus Cardio (machines and runs logged as exercises in the
 * Cardio category). Cardio is not a coaching expertise, so it is not in EXPERTISE_OPTIONS.
 */
export const ACTIVITY_OPTIONS = [
  EXPERTISE_OPTIONS[0],
  { code: 'cardio', label: 'Cardio' },
  ...EXPERTISE_OPTIONS.slice(1),
] as const;

export type ActivityCode = (typeof ACTIVITY_OPTIONS)[number]['code'];

export const ACTIVITY_CODES: readonly string[] = ACTIVITY_OPTIONS.map((o) => o.code);

/** Label for an activity or expertise code ("cardio" -> "Cardio"). */
export function expertiseLabel(code: string): string {
  const found = ACTIVITY_OPTIONS.find((o) => o.code === code);
  return found?.label ?? code;
}
