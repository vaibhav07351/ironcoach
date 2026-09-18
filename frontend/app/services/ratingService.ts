import { apiFetch, parseApiError } from './api';

export type RatingUpsert = {
  to_kind: 'trainer' | 'client';
  to_id: string;
  score: number;
};

export type MineRatingResponse = {
  score: number | null;
  average: number;
  rating_count: number;
};

export async function upsertRating(
  token: string,
  body: RatingUpsert
): Promise<void> {
  const response = await apiFetch(
    '/ratings',
    { method: 'PUT', body: JSON.stringify(body) },
    token
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

export async function fetchMyRating(
  token: string,
  toKind: 'trainer' | 'client',
  toId: string
): Promise<MineRatingResponse> {
  const params = new URLSearchParams({
    to_kind: toKind,
    to_id: toId,
  });
  const response = await apiFetch(
    `/ratings/mine?${params.toString()}`,
    { method: 'GET' },
    token
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return (await response.json()) as MineRatingResponse;
}
