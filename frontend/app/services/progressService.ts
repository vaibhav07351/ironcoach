import type { Progress, WeightInput } from '../types/progress';
import { http } from './http';

/** Weight history (oldest first) and per-exercise records. */
export function getProgress(traineeId: string): Promise<Progress> {
  return http.get<Progress>(`/progress/${encodeURIComponent(traineeId)}`);
}

/** Records the day's weight; logging again on the same day replaces it. */
export function logWeight(input: WeightInput): Promise<void> {
  return http.post<void>('/progress', input);
}
