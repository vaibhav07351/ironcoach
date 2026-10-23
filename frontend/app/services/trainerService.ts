import type { CoachRequest, DiscoverTrainer, TrainerProfile, TrainerProfileUpdate } from '../types/coach';
import { http } from './http';

/** The signed-in trainer's own profile. */
export function fetchTrainerProfile(): Promise<TrainerProfile> {
  return http.get<TrainerProfile>('/getTrainerDetails');
}

/** Updates only the provided profile fields and returns the saved profile. */
export function updateTrainerProfile(update: TrainerProfileUpdate): Promise<TrainerProfile> {
  return http.put<TrainerProfile>('/trainers/me/discovery', update);
}

/** Coaches for a client; interest matches first, then nearby. */
export function discoverTrainers(lat?: number, lng?: number): Promise<DiscoverTrainer[]> {
  return http.get<DiscoverTrainer[]>('/trainers/discover', { query: { lat, lng, limit: 50 } });
}

// Coaching requests.

/** Client asks a coach to take them on. `shareConsent` must be true. */
export function createCoachRequest(trainerId: string, shareConsent: boolean): Promise<CoachRequest> {
  return http.post<CoachRequest>('/coach_requests', { trainer_id: trainerId, share_consent: shareConsent });
}

/** The client's own requests with their status. */
export function listMyCoachRequests(): Promise<CoachRequest[]> {
  return http.get<CoachRequest[]>('/coach_requests/mine');
}

export function cancelCoachRequest(id: string): Promise<void> {
  return http.post<void>(`/coach_requests/${encodeURIComponent(id)}/cancel`);
}

/** Open requests for the trainer. */
export function listCoachRequests(): Promise<CoachRequest[]> {
  return http.get<CoachRequest[]>('/coach_requests');
}

export async function countCoachRequests(): Promise<number> {
  const res = await http.get<{ count: number }>('/coach_requests/count');
  return res.count;
}

export function acceptCoachRequest(id: string): Promise<void> {
  return http.post<void>(`/coach_requests/${encodeURIComponent(id)}/accept`);
}

export function rejectCoachRequest(id: string): Promise<void> {
  return http.post<void>(`/coach_requests/${encodeURIComponent(id)}/reject`);
}
