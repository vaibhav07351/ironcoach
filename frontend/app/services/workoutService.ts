import type { Category, Exercise, WorkoutLog, WorkoutLogInput, WorkoutLogUpdate } from '../types/workout';
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

export function addExercise(traineeId: string, categoryId: string, category: string, name: string): Promise<void> {
  return http.post<void>('/exercises', { trainee_id: traineeId, category_id: categoryId, category, name });
}

export function renameExercise(id: string, traineeId: string, name: string): Promise<void> {
  return http.put<void>(`/exercises/${encodeURIComponent(id)}`, { trainee_id: traineeId, name });
}

export function deleteExercise(id: string, traineeId: string): Promise<void> {
  return http.delete<void>(`/exercises/${encodeURIComponent(id)}`, undefined, { query: { trainee_id: traineeId } });
}
