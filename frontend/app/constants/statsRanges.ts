import type { StatsRange } from '../types/workout';

/** Time ranges offered on every graph. */
export const STATS_RANGES: { value: StatsRange; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '3m', label: '3m' },
  { value: '6m', label: '6m' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
];

/** Days back from today per range (null = everything). Matches the server's ranges. */
export const STATS_RANGE_DAYS: Record<StatsRange, number | null> = { '1m': 30, '3m': 91, '6m': 182, '1y': 365, all: null };
