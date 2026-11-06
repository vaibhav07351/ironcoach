/** Which numbers a set of this exercise holds. */
export type ExerciseType = 'weight_reps' | 'reps' | 'distance_time' | 'time';

/** One set. Fields unused by the exercise type are 0 or absent. */
export type SetEntry = {
  weight_kg: number;
  reps: number;
  distance_m?: number;
  duration_s?: number;
  note?: string;
};

/**
 * One exercise inside a log. `entries` is the current set format; `reps` / `weight` are the
 * original parallel arrays (still written by the server, and the only data on old logs).
 */
export type Workout = {
  exercise: string;
  exercise_id?: string;
  type?: ExerciseType;
  sets: number;
  reps: number[];
  weight: number[];
  entries?: SetEntry[];
  notes?: string;
};

/** Sport-specific fields for non-gym sessions (only the relevant ones are set). */
export type SessionMetrics = {
  duration_min?: number;
  distance_m?: number;
  distance_km?: number;
  laps?: number;
  stroke?: string;
  intensity?: string;
  style?: string;
  games_won?: number;
  games_lost?: number;
  rounds?: number;
  session_kind?: string;
  title?: string;
  role_note?: string;
};

export type WorkoutLog = {
  id: string;
  trainee_id: string;
  /** Local calendar date YYYY-MM-DD. */
  date: string;
  activity_type?: string;
  workouts?: Workout[];
  metrics?: SessionMetrics;
  notes?: string;
  /** Set on logs written by the per-exercise flow: one exercise, unique per day. */
  exercise_key?: string;
  created_at: string;
  updated_at: string;
};

export type WorkoutLogInput = {
  trainee_id: string;
  date: string;
  activity_type?: string;
  workouts?: Workout[];
  metrics?: SessionMetrics;
  notes?: string;
  /** Idempotency key so a retried create never duplicates (see utils/ids). */
  client_id?: string;
};

export type WorkoutLogUpdate = {
  date?: string;
  workouts?: Workout[];
  metrics?: SessionMetrics;
  notes?: string;
};

export type Category = {
  id: string;
  name: string;
  trainee_id: string;
};

export type Exercise = {
  id: string;
  name: string;
  category: string;
  category_id: string;
  type: ExerciseType;
};

/** One day of one exercise. */
export type ExerciseSession = {
  date: string;
  log_id?: string;
  entries: SetEntry[];
  notes?: string;
};

/** GET /exercise_logs/:trainee/:exercise/day/:date */
export type ExerciseDay = {
  exercise: Exercise;
  log: WorkoutLog | null;
  previous: ExerciseSession | null;
  pr_flags: boolean[];
};

/** PUT /exercise_logs/:trainee/:exercise/day/:date */
export type ExerciseDaySaved = {
  log: WorkoutLog | null;
  pr_flags: boolean[];
  new_pr: boolean;
};

export type StatsRange = '1m' | '3m' | '6m' | '1y' | 'all';

export type StatPoint = { date: string; value: number };

export type RepRecord = { reps: number; weight_kg: number; date: string };

export type ExerciseBests = {
  e1rm: number;
  e1rm_date?: string;
  max_weight: number;
  max_reps: number;
  max_volume: number;
  max_distance_m: number;
  max_duration_s: number;
  best_pace_s_per_km: number;
  sessions: number;
};

/** Series keys returned by the stats endpoint. */
export type SeriesKey =
  | 'e1rm'
  | 'max_weight'
  | 'max_reps'
  | 'max_volume'
  | 'workout_volume'
  | 'workout_reps'
  | 'distance_m'
  | 'duration_s'
  | 'pace_s_per_km'
  | 'speed_kmh'
  | 'max_duration_s';

/** GET /exercise_logs/:trainee/:exercise/stats */
export type ExerciseStats = {
  exercise_type: ExerciseType;
  range: StatsRange;
  series: Partial<Record<SeriesKey, StatPoint[]>>;
  bests: ExerciseBests;
  rep_records: RepRecord[];
};

/** Days an activity was logged in a window. */
export type ActivityCount = { activity_type: string; days: number };
