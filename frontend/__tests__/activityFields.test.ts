import { ACTIVITY_FIELDS, fieldsFor, summarizeMetrics } from '../app/constants/activityFields';
import { EXPERTISE_OPTIONS } from '../app/constants/expertise';

describe('activity fields', () => {
  it('every non-gym sport has fields and starts with duration', () => {
    for (const { code } of EXPERTISE_OPTIONS) {
      if (code === 'gym') continue;
      expect(fieldsFor(code)[0].key).toBe('duration_min');
    }
    expect(Object.keys(ACTIVITY_FIELDS).length).toBeGreaterThanOrEqual(8);
  });

  it('falls back to the generic form for unknown sports', () => {
    expect(fieldsFor('curling').some((f) => f.key === 'title')).toBe(true);
  });

  it('summarizes a session in one line', () => {
    expect(summarizeMetrics('running', { duration_min: 30, distance_km: 5 })).toBe('30 min · 5 km');
    expect(summarizeMetrics('yoga', { duration_min: 45, style: 'Hatha' })).toBe('45 min · Hatha');
    expect(summarizeMetrics('running', undefined)).toBe('');
  });
});
