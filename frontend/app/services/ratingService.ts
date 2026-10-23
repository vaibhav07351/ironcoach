import type { MyRating, RatingTarget } from '../types/coach';
import { http } from './http';

/** Rates the client's coach or one of the trainer's clients (0.5 to 5 in half steps). */
export function upsertRating(toKind: RatingTarget, toId: string, score: number): Promise<void> {
  return http.put<void>('/ratings', { to_kind: toKind, to_id: toId, score });
}

/** The caller's own score for a target plus the target's average. */
export function fetchMyRating(toKind: RatingTarget, toId: string): Promise<MyRating> {
  return http.get<MyRating>('/ratings/mine', { query: { to_kind: toKind, to_id: toId } });
}
