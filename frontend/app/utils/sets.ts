import type { Workout } from '../types/workout';

/** One set as typed (strings until saved). */
export type SetRow = { reps: string; weight: string };

/** Converts typed rows to a Workout, or returns an error message. */
export function rowsToWorkout(exercise: string, exerciseId: string | undefined, rows: SetRow[]): Workout | string {
  const filled = rows.filter((r) => r.reps.trim() !== '' || r.weight.trim() !== '');
  if (filled.length === 0) {
    return 'Add at least one set';
  }
  const reps: number[] = [];
  const weight: number[] = [];
  for (const [i, r] of filled.entries()) {
    const rep = Number(r.reps);
    const kg = r.weight.trim() === '' ? 0 : Number(r.weight);
    if (!Number.isInteger(rep) || rep < 0 || rep > 1000) return `Set ${i + 1}: reps must be a whole number`;
    if (!Number.isFinite(kg) || kg < 0 || kg > 1000) return `Set ${i + 1}: weight must be between 0 and 1000 kg`;
    reps.push(rep);
    weight.push(kg);
  }
  return { exercise, exercise_id: exerciseId, sets: reps.length, reps, weight };
}

export function workoutToRows(w: Workout): SetRow[] {
  return w.reps.map((r, i) => ({ reps: String(r), weight: String(w.weight[i] ?? 0) }));
}
