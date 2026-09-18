import { AdherenceSummary } from '../types/auth';
import { apiFetch, parseApiError } from './api';

export async function fetchMyAdherence(token: string): Promise<AdherenceSummary> {
  const response = await apiFetch('/adherence/me', { method: 'GET' }, token);
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return (await response.json()) as AdherenceSummary;
}

export async function fetchAdherenceRoster(
  token: string,
  limit = 50
): Promise<AdherenceSummary[]> {
  const response = await apiFetch(
    `/adherence/roster?limit=${limit}`,
    { method: 'GET' },
    token
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  const body = (await response.json()) as { items: AdherenceSummary[] };
  return body.items ?? [];
}
