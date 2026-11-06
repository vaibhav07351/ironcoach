import type { DatedValue } from './progress';

/** Body metrics in display order. Bodyweight is kg, body fat %, the rest are lengths (stored in cm). */
export type BodyMetric =
  | 'bodyweight'
  | 'body_fat'
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'upper_arm'
  | 'forearm'
  | 'thigh'
  | 'calf';

/** GET /body_measurements/:trainee_id/summary row. */
export type BodyMetricSummary = {
  metric: BodyMetric;
  latest: DatedValue | null;
  previous: DatedValue | null;
};

/** POST /body_measurements (value in kg, %, or cm). */
export type BodyMeasurementInput = {
  trainee_id: string;
  metric: BodyMetric;
  date: string;
  value: number;
};
