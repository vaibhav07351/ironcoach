import type { Trainee, TraineeInput } from '../types/trainee';
import { http } from './http';

export type TraineeStatusFilter = 'all' | 'active' | 'inactive';

/** The trainer's clients, sorted by name. */
export function listTrainees(status: TraineeStatusFilter = 'all', limit = 200, offset = 0): Promise<Trainee[]> {
  const activeStatus = status === 'all' ? undefined : String(status === 'active');
  return http.get<Trainee[]>('/trainees', { query: { active_status: activeStatus, limit, offset } });
}

export function getTrainee(id: string): Promise<Trainee> {
  return http.get<Trainee>(`/trainees/${encodeURIComponent(id)}`);
}

/** Creates a client and returns its id. */
export async function createTrainee(input: TraineeInput): Promise<string> {
  const res = await http.post<{ id: string }>('/trainees', input);
  return res.id;
}

/** Updates only the provided fields. */
export function updateTrainee(id: string, input: TraineeInput): Promise<void> {
  return http.put<void>(`/trainees/${encodeURIComponent(id)}`, input);
}

/** Deletes a client and all their data, and unlinks their account. */
export function deleteTrainee(id: string): Promise<void> {
  return http.delete<void>(`/trainees/${encodeURIComponent(id)}`);
}
