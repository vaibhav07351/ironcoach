import type {
  ActivityCount,
  Category,
  Exercise,
  ExerciseDay,
  ExerciseDaySaved,
  ExerciseSession,
  ExerciseStats,
  ExerciseType,
  SetEntry,
  StatsRange,
  WorkoutLog,
  WorkoutLogInput,
  WorkoutLogUpdate,
} from '../types/workout';
import { newClientId } from '../utils/ids';
import { http } from './http';

/** A client's logs, newest first; `date` (YYYY-MM-DD) narrows to one day. */
export function listWorkoutLogs(traineeId: string, date?: string, limit = 50): Promise<WorkoutLog[]> {
  return http.get<WorkoutLog[]>(`/workout_logs/${encodeURIComponent(traineeId)}`, { query: { date, limit } });
}

/**
 * Creates a log. A client_id is attached automatically, so retrying the same call (same input
 * object) after a timeout returns the original log instead of creating a duplicate.
 */
export async function createWorkoutLog(input: WorkoutLogInput): Promise<WorkoutLog> {
  const body: WorkoutLogInput = { ...input, client_id: input.client_id ?? newClientId() };
  const res = await http.post<{ log: WorkoutLog }>('/workout_logs', body);
  return res.log;
}

export function updateWorkoutLog(id: string, update: WorkoutLogUpdate): Promise<void> {
  return http.put<void>(`/workout_logs/${encodeURIComponent(id)}`, update);
}

export function deleteWorkoutLog(id: string): Promise<void> {
  return http.delete<void>(`/workout_logs/${encodeURIComponent(id)}`);
}

// Exercise catalog (per client).

export function listCategories(traineeId: string): Promise<Category[]> {
  return http.get<Category[]>('/categories', { query: { trainee_id: traineeId } });
}

export function addCategory(traineeId: string, name: string): Promise<void> {
  return http.post<void>('/categories', { trainee_id: traineeId, name });
}

export function renameCategory(id: string, traineeId: string, name: string): Promise<void> {
  return http.put<void>(`/categories/${encodeURIComponent(id)}`, { trainee_id: traineeId, name });
}

export function deleteCategory(id: string, traineeId: string): Promise<void> {
  return http.delete<void>(`/categories/${encodeURIComponent(id)}`, undefined, { query: { trainee_id: traineeId } });
}

export function listExercises(categoryId: string, traineeId: string): Promise<Exercise[]> {
  return http.get<Exercise[]>(`/exercises/category/${encodeURIComponent(categoryId)}`, {
    query: { trainee_id: traineeId },
  });
}

export function addExercise(
  traineeId: string,
  categoryId: string,
  category: string,
  name: string,
  type: ExerciseType = 'weight_reps'
): Promise<void> {
  return http.post<void>('/exercises', { trainee_id: traineeId, category_id: categoryId, category, name, type });
}

/** Exercises across all of a client's categories whose name contains `q`. */
export function searchExercises(traineeId: string, q: string): Promise<Exercise[]> {
  return http.get<Exercise[]>('/exercises/search', { query: { trainee_id: traineeId, q } });
}

export function renameExercise(id: string, traineeId: string, name: string): Promise<void> {
  return http.put<void>(`/exercises/${encodeURIComponent(id)}`, { trainee_id: traineeId, name });
}

export function deleteExercise(id: string, traineeId: string): Promise<void> {
  return http.delete<void>(`/exercises/${encodeURIComponent(id)}`, undefined, { query: { trainee_id: traineeId } });
}

// Per-exercise logging (Track / History / Graph).

function exercisePath(traineeId: string, exerciseId: string): string {
  return `/exercise_logs/${encodeURIComponent(traineeId)}/${encodeURIComponent(exerciseId)}`;
}

/** One exercise's sets on a day, the previous session and PR flags. */
export function getExerciseDay(traineeId: string, exerciseId: string, date: string): Promise<ExerciseDay> {
  return http.get<ExerciseDay>(`${exercisePath(traineeId, exerciseId)}/day/${encodeURIComponent(date)}`);
}

/**
 * Replaces all sets of one exercise on a day. Sending the full list makes a retry harmless; an
 * empty list removes the exercise from that day.
 */
export function saveExerciseDay(traineeId: string, exerciseId: string, date: string, entries: SetEntry[]): Promise<ExerciseDaySaved> {
  return http.put<ExerciseDaySaved>(`${exercisePath(traineeId, exerciseId)}/day/${encodeURIComponent(date)}`, { entries });
}

/** Past sessions of an exercise, newest first. */
export function listExerciseHistory(traineeId: string, exerciseId: string, limit = 30, offset = 0): Promise<ExerciseSession[]> {
  return http.get<ExerciseSession[]>(`${exercisePath(traineeId, exerciseId)}/history`, { query: { limit, offset } });
}

/** Graph series, all-time bests and the rep-max table. */
export function getExerciseStats(traineeId: string, exerciseId: string, range: StatsRange): Promise<ExerciseStats> {
  return http.get<ExerciseStats>(`${exercisePath(traineeId, exerciseId)}/stats`, { query: { range } });
}

/** Days each activity was logged in the last `days` days. */
export function getActivityMix(traineeId: string, days = 30): Promise<ActivityCount[]> {
  return http.get<ActivityCount[]>(`/workout_logs/${encodeURIComponent(traineeId)}/activity_mix`, { query: { days } });
}

/** Days with any log between two dates (YYYY-MM-DD, at most 62 days apart), for the calendar. */
export function listLoggedDates(traineeId: string, from: string, to: string): Promise<string[]> {
  return http.get<string[]>(`/workout_logs/${encodeURIComponent(traineeId)}/dates`, { query: { from, to } });
}
