import type { BodyMeasurementInput, BodyMetric, BodyMetricSummary } from '../types/body';
import type { DatedValue } from '../types/progress';
import type { StatsRange } from '../types/workout';
import { http } from './http';

/** Every body metric (bodyweight first) with its latest and previous value. */
export function getBodySummary(traineeId: string): Promise<BodyMetricSummary[]> {
  return http.get<BodyMetricSummary[]>(`/body_measurements/${encodeURIComponent(traineeId)}/summary`);
}

/** One metric's values over a range, oldest first (kg, % or cm). */
export function getBodySeries(traineeId: string, metric: BodyMetric, range: StatsRange): Promise<DatedValue[]> {
  return http.get<DatedValue[]>(`/body_measurements/${encodeURIComponent(traineeId)}/series`, { query: { metric, range } });
}

/** Records the day's value; recording again the same day replaces it. */
export function recordBodyMeasurement(input: BodyMeasurementInput): Promise<void> {
  return http.post<void>('/body_measurements', input);
}

/** Deletes one day's value of a body metric (not bodyweight). */
export function deleteBodyMeasurement(traineeId: string, metric: BodyMetric, date: string): Promise<void> {
  return http.delete<void>(
    `/body_measurements/${encodeURIComponent(traineeId)}/${encodeURIComponent(metric)}/${encodeURIComponent(date)}`
  );
}
