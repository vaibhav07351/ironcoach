/** One exercise inside a gym log: one reps and one weight value per set. */
export type Workout = {
  exercise: string;
  exercise_id?: string;
  sets: number;
  reps: number[];
  weight: number[];
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
};
