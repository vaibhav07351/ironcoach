import { rowsToWorkout, workoutToRows } from '../components/SetEditor';

describe('set editor conversion', () => {
  it('builds a workout with one reps and weight value per set', () => {
    const w = rowsToWorkout('Squats', 'ex1', [
      { reps: '10', weight: '60' },
      { reps: '8', weight: '65.5' },
    ]);
    expect(w).toEqual({ exercise: 'Squats', exercise_id: 'ex1', sets: 2, reps: [10, 8], weight: [60, 65.5] });
  });

  it('treats a blank weight as bodyweight and ignores empty rows', () => {
    const w = rowsToWorkout('Push-ups', undefined, [
      { reps: '20', weight: '' },
      { reps: '', weight: '' },
    ]);
    expect(w).toMatchObject({ sets: 1, reps: [20], weight: [0] });
  });

  it('returns a message instead of a workout for bad input', () => {
    expect(typeof rowsToWorkout('x', undefined, [])).toBe('string');
    expect(typeof rowsToWorkout('x', undefined, [{ reps: '1.5', weight: '10' }])).toBe('string');
    expect(typeof rowsToWorkout('x', undefined, [{ reps: '5', weight: '5000' }])).toBe('string');
  });

  it('round-trips an existing workout', () => {
    const rows = workoutToRows({ exercise: 'Bench', sets: 2, reps: [5, 5], weight: [80, 82.5] });
    expect(rows).toEqual([
      { reps: '5', weight: '80' },
      { reps: '5', weight: '82.5' },
    ]);
  });
});
