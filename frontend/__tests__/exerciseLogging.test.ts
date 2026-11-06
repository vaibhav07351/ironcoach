import AsyncStorage from '@react-native-async-storage/async-storage';

import { resolveActivities } from '../app/utils/activities';
import { formatBodyChange, formatBodyValue, toDisplayValue, toStoredValue } from '../app/utils/bodyMetrics';
import { agoLabel, daysBetween } from '../app/utils/date';
import {
  estimatedOneRM,
  formatDistance,
  formatDuration,
  formatPace,
  formatScoreChange,
  formatSet,
  formatSetsCompact,
  partsToSeconds,
  secondsToParts,
} from '../app/utils/exerciseFormat';
import { DEFAULT_REST_SECONDS, loadRestSeconds, nextRestChoice, saveRestSeconds } from '../app/utils/restTimer';
import { mergeSessions } from '../app/utils/sessions';
import { EMPTY_DRAFT, draftFromEntry, draftToEntry, prefillSource } from '../app/utils/setDraft';
import { entriesOf } from '../app/utils/sets';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const KNOWN = ['gym', 'cardio', 'swimming', 'badminton', 'yoga', 'running', 'cricket', 'boxing', 'mma', 'other'];

describe('exercise formatting', () => {
  it('formats times, distances and pace', () => {
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(3930)).toBe('1:05:30');
    expect(formatDistance(800)).toBe('800 m');
    expect(formatDistance(5250)).toBe('5.25 km');
    expect(formatPace(370)).toBe('6:10 /km');
  });

  it('estimates one-rep max with Epley, a single rep being the weight', () => {
    expect(estimatedOneRM(100, 1)).toBe(100);
    expect(estimatedOneRM(100, 8)).toBe(126.7);
    expect(estimatedOneRM(0, 8)).toBe(0);
  });

  it('formats sets per exercise type', () => {
    expect(formatSet('weight_reps', { weight_kg: 100, reps: 8 })).toBe('100 kg x 8');
    expect(formatSet('reps', { weight_kg: 0, reps: 12 })).toBe('12 reps');
    expect(formatSet('reps', { weight_kg: 10, reps: 6 })).toBe('+10 kg x 6');
    expect(formatSet('distance_time', { weight_kg: 0, reps: 0, distance_m: 5000, duration_s: 1800 })).toBe('5 km in 30:00');
    expect(formatSet('time', { weight_kg: 0, reps: 0, duration_s: 75 })).toBe('1:15');
    expect(formatSetsCompact('weight_reps', [{ weight_kg: 80, reps: 12 }, { weight_kg: 85, reps: 10 }])).toBe('80x12, 85x10');
  });

  it('formats score changes with a sign, or null when equal', () => {
    expect(formatScoreChange('e1rm', 112, 123.3)).toBe('+11.3 kg');
    expect(formatScoreChange('reps', 12, 10)).toBe('-2 reps');
    expect(formatScoreChange('e1rm', 100, 100)).toBeNull();
  });

  it('converts duration parts both ways and rejects bad input', () => {
    expect(partsToSeconds('', '30', '05')).toBe(1805);
    expect(partsToSeconds('1', '', '')).toBe(3600);
    expect(partsToSeconds('', '75', '')).toBeNull();
    expect(partsToSeconds('', '1.5', '')).toBeNull();
    expect(secondsToParts(1805)).toEqual({ h: '', m: '30', s: '5' });
    expect(secondsToParts(0)).toEqual({ h: '', m: '', s: '' });
  });
});

describe('set drafts', () => {
  it('turns typed weight and reps into a set', () => {
    expect(draftToEntry('weight_reps', { ...EMPTY_DRAFT, weight: '100', reps: '8' })).toEqual({ weight_kg: 100, reps: 8 });
  });

  it('requires reps, and a weight for loaded lifts', () => {
    expect(typeof draftToEntry('weight_reps', { ...EMPTY_DRAFT, weight: '100', reps: '' })).toBe('string');
    expect(typeof draftToEntry('weight_reps', { ...EMPTY_DRAFT, weight: '', reps: '8' })).toBe('string');
    expect(draftToEntry('reps', { ...EMPTY_DRAFT, reps: '12' })).toEqual({ weight_kg: 0, reps: 12 });
  });

  it('builds cardio sets in metres from km or m', () => {
    const km = draftToEntry('distance_time', { ...EMPTY_DRAFT, distance: '5.2', distanceUnit: 'km', duration: { h: '', m: '30', s: '' } });
    expect(km).toEqual({ weight_kg: 0, reps: 0, distance_m: 5200, duration_s: 1800 });
    const m = draftToEntry('distance_time', { ...EMPTY_DRAFT, distance: '800', distanceUnit: 'm' });
    expect(m).toEqual({ weight_kg: 0, reps: 0, distance_m: 800 });
    expect(typeof draftToEntry('distance_time', EMPTY_DRAFT)).toBe('string');
  });

  it('keeps a note and round-trips a saved set for editing', () => {
    const entry = { weight_kg: 7.5, reps: 12, note: 'slow' };
    const draft = draftFromEntry(entry, true);
    expect(draft).toMatchObject({ weight: '7.5', reps: '12', note: 'slow' });
    expect(draftToEntry('weight_reps', draft)).toEqual(entry);
    expect(draftFromEntry(entry).note).toBe('');
  });

  it('pre-fills from the same set number last session, then today, then last session', () => {
    const prev = [{ weight_kg: 80, reps: 12 }, { weight_kg: 85, reps: 10 }];
    expect(prefillSource([], prev)).toEqual(prev[0]);
    expect(prefillSource([{ weight_kg: 80, reps: 12 }], prev)).toEqual(prev[1]);
    const today = [{ weight_kg: 80, reps: 12 }, { weight_kg: 85, reps: 10 }, { weight_kg: 90, reps: 8 }];
    expect(prefillSource(today, prev)).toEqual(today[2]);
    expect(prefillSource([], undefined)).toBeUndefined();
  });
});

describe('legacy sets', () => {
  it('reads entries, or pairs the old reps and weight arrays', () => {
    expect(entriesOf({ exercise: 'Row', sets: 2, reps: [10, 8, 6], weight: [50, 55] })).toEqual([
      { weight_kg: 50, reps: 10 },
      { weight_kg: 55, reps: 8 },
    ]);
    const entries = [{ weight_kg: 100, reps: 5 }];
    expect(entriesOf({ exercise: 'Row', sets: 1, reps: [5], weight: [100], entries })).toBe(entries);
  });
});

describe('history paging', () => {
  it('merges a day split across two pages', () => {
    const a = [{ date: '2026-11-03', entries: [{ weight_kg: 100, reps: 4 }] }];
    const b = [
      { date: '2026-11-03', entries: [{ weight_kg: 100, reps: 8 }] },
      { date: '2026-10-27', entries: [{ weight_kg: 90, reps: 10 }] },
    ];
    const merged = mergeSessions(a, b);
    expect(merged).toHaveLength(2);
    expect(merged[0].entries).toHaveLength(2);
  });
});

describe('body metrics', () => {
  it('stores lengths in cm and shows inches', () => {
    expect(toStoredValue('waist', 31.1, 'in')).toBe(79);
    expect(toDisplayValue('waist', 79, 'in')).toBe(31.1);
    expect(toStoredValue('waist', 79, 'cm')).toBe(79);
    expect(toStoredValue('bodyweight', 58.5, 'in')).toBe(58.5);
    expect(formatBodyValue('waist', 79, 'in')).toBe('31.1 in');
    expect(formatBodyValue('bodyweight', 58.5, 'in')).toBe('58.5 kg');
  });

  it('formats a signed change, or null when nothing changed', () => {
    expect(formatBodyChange('bodyweight', 59, 58.5, 'cm')).toBe('-0.5 kg');
    expect(formatBodyChange('waist', 80, 82.54, 'in')).toBe('+1 in');
    expect(formatBodyChange('waist', 80, 80, 'in')).toBeNull();
  });
});

describe('activities', () => {
  it('uses the saved list and suggests a frequent extra activity', () => {
    const r = resolveActivities(['gym', 'cardio'], [{ activity_type: 'badminton', days: 3 }, { activity_type: 'gym', days: 10 }], KNOWN);
    expect(r).toEqual({ primary: ['gym', 'cardio'], suggestion: 'badminton', fromList: true });
  });

  it('does not suggest an activity logged only once or twice', () => {
    expect(resolveActivities(['gym'], [{ activity_type: 'yoga', days: 2 }], KNOWN).suggestion).toBeNull();
  });

  it('falls back to what was logged, then to gym', () => {
    expect(resolveActivities(null, [{ activity_type: 'swimming', days: 4 }, { activity_type: 'gym', days: 6 }], KNOWN).primary).toEqual([
      'gym',
      'swimming',
    ]);
    expect(resolveActivities([], [], KNOWN)).toEqual({ primary: ['gym'], suggestion: null, fromList: false });
  });

  it('ignores codes the app cannot log', () => {
    expect(resolveActivities(['golf'], [], KNOWN).primary).toEqual(['gym']);
  });
});

describe('dates and rest timer', () => {
  it('describes how long ago a date was', () => {
    const now = new Date(2026, 10, 6);
    expect(agoLabel('2026-11-06', now)).toBe('today');
    expect(agoLabel('2026-11-03', now)).toBe('3 days ago');
    expect(agoLabel('2026-10-27', now)).toBe('1 week ago');
    expect(agoLabel('2026-05-06', now)).toBe('6 months ago');
    expect(daysBetween('2026-11-01', '2026-11-06')).toBe(5);
  });

  it('cycles the rest choices', () => {
    expect(nextRestChoice(90)).toBe(120);
    expect(nextRestChoice(180)).toBe(0);
    expect(nextRestChoice(45)).toBe(0);
  });

  it('remembers rest time per exercise and ignores bad stored values', async () => {
    expect(await loadRestSeconds('ex1')).toBe(DEFAULT_REST_SECONDS);
    await saveRestSeconds('ex1', 120);
    expect(await loadRestSeconds('ex1')).toBe(120);
    await AsyncStorage.setItem('ironcoach.rest.ex2', 'abc');
    expect(await loadRestSeconds('ex2')).toBe(DEFAULT_REST_SECONDS);
  });
});
