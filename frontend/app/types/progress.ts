import type { ExerciseType } from './workout';

export type WeightEntry = {
  trainee_id: string;
  date: string;
  weight: number;
  bmi: number;
  body_fat?: number;
};

export type ExerciseRecord = {
  date: string;
  weight: number;
  reps: number;
};

export type ExerciseProgress = {
  exercise: string;
  max_weight: number;
  avg_weight: number;
  records: ExerciseRecord[];
};

/** GET /progress/:trainee_id */
export type Progress = {
  trainee_id: string;
  weight_bmi: WeightEntry[] | null;
  exercises: ExerciseProgress[] | null;
};

export type WeightInput = {
  trainee_id: string;
  date: string;
  weight: number;
  body_fat?: number;
};

/** A personal record set on a day. */
export type PREvent = {
  trainee_id: string;
  trainee_name?: string;
  date: string;
  exercise: string;
  exercise_id: string;
  kind: 'e1rm' | 'reps' | 'distance' | 'duration';
  value: number;
  previous: number;
};

export type DatedValue = { date: string; value: number };

export type MonthStats = {
  month: string;
  workout_days: number;
  volume_kg: number;
  sets: number;
  prs: number;
};

export type ValueChange = { metric: string; first: DatedValue; latest: DatedValue };

export type LiftChange = {
  exercise_id: string;
  exercise: string;
  type: ExerciseType;
  kind: PREvent['kind'];
  sessions: number;
  first: DatedValue;
  latest: DatedValue;
  best: DatedValue;
};

/** GET /progress/:trainee_id/summary */
export type ProgressSummary = {
  since: string;
  workout_days_total: number;
  this_month: MonthStats;
  last_month: MonthStats;
  bodyweight: ValueChange | null;
  measurements: ValueChange[];
  lifts: LiftChange[];
  recent_prs: PREvent[];
};

export type CompareRow = {
  kind: 'body' | 'lift';
  key: string;
  label?: string;
  type?: ExerciseType;
  score?: PREvent['kind'];
  from: DatedValue | null;
  to: DatedValue | null;
};

/** GET /progress/:trainee_id/compare */
export type CompareResult = { from: string; to: string; rows: CompareRow[] };
