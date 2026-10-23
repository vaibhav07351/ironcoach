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
