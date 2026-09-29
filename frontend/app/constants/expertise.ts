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

export const ACTIVITY_OPTIONS = EXPERTISE_OPTIONS;

export type ActivityCode = ExpertiseCode;

export function expertiseLabel(code: string): string {
  const found = EXPERTISE_OPTIONS.find((o) => o.code === code);
  return found?.label ?? code;
}
