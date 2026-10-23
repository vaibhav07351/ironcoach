import type { AdherenceSummary } from '../types/auth';
import { http } from './http';

/** The signed-in client's current week. */
export function fetchMyAdherence(): Promise<AdherenceSummary> {
  return http.get<AdherenceSummary>('/adherence/me');
}

/** The trainer's active clients, most at-risk first. */
export async function fetchAdherenceRoster(limit = 50): Promise<AdherenceSummary[]> {
  const res = await http.get<{ items: AdherenceSummary[] }>('/adherence/roster', { query: { limit } });
  return res.items ?? [];
}

/** One client's current week (trainer view). */
export function fetchClientAdherence(traineeId: string): Promise<AdherenceSummary> {
  return http.get<AdherenceSummary>(`/adherence/trainees/${encodeURIComponent(traineeId)}`);
}
