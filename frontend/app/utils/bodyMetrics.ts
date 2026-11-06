import type { BodyMetric } from '../types/body';
import { formatNumber } from './exerciseFormat';

/** How lengths are shown. They are always stored in centimetres. */
export type LengthUnit = 'in' | 'cm';

export const DEFAULT_LENGTH_UNIT: LengthUnit = 'in';

const CM_PER_INCH = 2.54;

type MetricInfo = { label: string; kind: 'weight' | 'percent' | 'length'; step: number };

const INFO: Record<BodyMetric, MetricInfo> = {
  bodyweight: { label: 'Bodyweight', kind: 'weight', step: 0.1 },
  body_fat: { label: 'Body fat', kind: 'percent', step: 0.1 },
  neck: { label: 'Neck', kind: 'length', step: 0.1 },
  shoulders: { label: 'Shoulders', kind: 'length', step: 0.1 },
  chest: { label: 'Chest', kind: 'length', step: 0.1 },
  waist: { label: 'Waist', kind: 'length', step: 0.1 },
  hips: { label: 'Hips', kind: 'length', step: 0.1 },
  upper_arm: { label: 'Upper arm', kind: 'length', step: 0.1 },
  forearm: { label: 'Forearm', kind: 'length', step: 0.1 },
  thigh: { label: 'Thigh', kind: 'length', step: 0.1 },
  calf: { label: 'Calf', kind: 'length', step: 0.1 },
};

export const BODY_METRICS = Object.keys(INFO) as BodyMetric[];

export function isBodyMetric(v: string): v is BodyMetric {
  return v in INFO;
}

export function bodyMetricLabel(metric: string): string {
  return isBodyMetric(metric) ? INFO[metric].label : metric;
}

export function bodyMetricStep(metric: BodyMetric): number {
  return INFO[metric].step;
}

/** The unit shown for a metric: kg, %, or the chosen length unit. */
export function bodyMetricUnit(metric: string, lengthUnit: LengthUnit): string {
  if (!isBodyMetric(metric)) return '';
  switch (INFO[metric].kind) {
    case 'weight':
      return 'kg';
    case 'percent':
      return '%';
    default:
      return lengthUnit;
  }
}

/** Stored value (kg, %, cm) to the value shown. */
export function toDisplayValue(metric: string, stored: number, lengthUnit: LengthUnit): number {
  if (isBodyMetric(metric) && INFO[metric].kind === 'length' && lengthUnit === 'in') {
    return Math.round((stored / CM_PER_INCH) * 100) / 100;
  }
  return stored;
}

/** Value typed by the user to the stored value (kg, %, cm). */
export function toStoredValue(metric: BodyMetric, shown: number, lengthUnit: LengthUnit): number {
  if (INFO[metric].kind === 'length' && lengthUnit === 'in') {
    return Math.round(shown * CM_PER_INCH * 10) / 10;
  }
  return shown;
}

/** "31.1 in", "58.5 kg", "18.2 %". */
export function formatBodyValue(metric: string, stored: number, lengthUnit: LengthUnit): string {
  const shown = toDisplayValue(metric, stored, lengthUnit);
  const unit = bodyMetricUnit(metric, lengthUnit);
  return `${formatNumber(shown, metric === 'bodyweight' || unit === '%' ? 1 : 2)} ${unit}`;
}

/** Signed change between two stored values in display units, e.g. "-3.54 in"; null if none. */
export function formatBodyChange(metric: string, from: number, to: number, lengthUnit: LengthUnit): string | null {
  const diff = toDisplayValue(metric, to, lengthUnit) - toDisplayValue(metric, from, lengthUnit);
  const rounded = Math.round(diff * 100) / 100;
  if (rounded === 0) return null;
  return `${rounded > 0 ? '+' : ''}${formatNumber(rounded, 2)} ${bodyMetricUnit(metric, lengthUnit)}`;
}
