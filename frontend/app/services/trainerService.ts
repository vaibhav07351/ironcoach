import { apiFetch, parseApiError } from './api';

export type TrainerDetails = {
  name: string;
  email: string;
  image_url?: string;
  bio?: string;
  speciality?: string;
  experience?: number;
  hourly_rate?: number;
  phone_number?: string;
  address?: string;
  headline?: string;
  city?: string;
  area?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  discovery_visible?: boolean;
  trainer_type?: string;
  availability?: string;
  social_handle?: string;
  rating?: number;
  rating_count?: number;
};

export type DiscoverTrainer = {
  name: string;
  email: string;
  image_url?: string;
  headline?: string;
  bio?: string;
  speciality?: string;
  experience: number;
  hourly_rate: number;
  trainer_type?: string;
  city?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  distance_km: number;
  rating: number;
  rating_count?: number;
};

export type CoachRequest = {
  id: string;
  client_user_id: string;
  client_name?: string;
  client_email?: string;
  trainer_email: string;
  status: string;
  created_at: string;
};

export async function fetchTrainerDetails(token: string): Promise<TrainerDetails> {
  const response = await apiFetch('/getTrainerDetails', { method: 'GET' }, token);
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return (await response.json()) as TrainerDetails;
}

export async function updateTrainerDiscovery(
  token: string,
  body: Partial<TrainerDetails>
): Promise<TrainerDetails> {
  const response = await apiFetch(
    '/trainers/me/discovery',
    { method: 'PUT', body: JSON.stringify(body) },
    token
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return (await response.json()) as TrainerDetails;
}

export async function discoverTrainers(
  token: string,
  lat?: number,
  lng?: number
): Promise<DiscoverTrainer[]> {
  const params = new URLSearchParams();
  if (lat !== undefined) params.set('lat', String(lat));
  if (lng !== undefined) params.set('lng', String(lng));
  params.set('limit', '50');
  const response = await apiFetch(
    `/trainers/discover?${params.toString()}`,
    { method: 'GET' },
    token
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return (await response.json()) as DiscoverTrainer[];
}

export async function createCoachRequest(
  token: string,
  trainerEmail: string
): Promise<CoachRequest> {
  const response = await apiFetch(
    '/coach_requests',
    { method: 'POST', body: JSON.stringify({ trainer_email: trainerEmail }) },
    token
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return (await response.json()) as CoachRequest;
}

export async function listCoachRequests(token: string): Promise<CoachRequest[]> {
  const response = await apiFetch('/coach_requests', { method: 'GET' }, token);
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return (await response.json()) as CoachRequest[];
}

export async function countCoachRequests(token: string): Promise<number> {
  const response = await apiFetch('/coach_requests/count', { method: 'GET' }, token);
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  const body = (await response.json()) as { count: number };
  return body.count;
}

export async function acceptCoachRequest(
  token: string,
  id: string
): Promise<void> {
  const response = await apiFetch(
    `/coach_requests/${id}/accept`,
    { method: 'POST' },
    token
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

export async function rejectCoachRequest(
  token: string,
  id: string
): Promise<void> {
  const response = await apiFetch(
    `/coach_requests/${id}/reject`,
    { method: 'POST' },
    token
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}
