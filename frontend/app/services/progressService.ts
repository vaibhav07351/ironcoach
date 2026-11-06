import type { CompareResult, Progress, ProgressSummary, WeightInput } from '../types/progress';
import { http } from './http';

/** Weight history (oldest first) and per-exercise records. */
export function getProgress(traineeId: string): Promise<Progress> {
  return http.get<Progress>(`/progress/${encodeURIComponent(traineeId)}`);
}

/** Records the day's weight; logging again on the same day replaces it. */
export function logWeight(input: WeightInput): Promise<void> {
  return http.post<void>('/progress', input);
}

/** "Since joining" and month-on-month progress. */
export function getProgressSummary(traineeId: string): Promise<ProgressSummary> {
  return http.get<ProgressSummary>(`/progress/${encodeURIComponent(traineeId)}/summary`);
}

/** Body metrics and lifts at two dates (YYYY-MM-DD). */
export function compareProgress(traineeId: string, from: string, to: string): Promise<CompareResult> {
  return http.get<CompareResult>(`/progress/${encodeURIComponent(traineeId)}/compare`, { query: { from, to } });
}
