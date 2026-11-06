import { useCallback, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';

import { errorMessage } from '../services/http';
import { getExerciseDay, saveExerciseDay } from '../services/workoutService';
import type { ExerciseDay, SetEntry } from '../types/workout';
import { haptic } from '../utils/haptics';

export type ExerciseDayState = {
  /** Null while the current day loads. */
  day: ExerciseDay | null;
  entries: SetEntry[];
  prFlags: boolean[];
  loadError: string | null;
  /** True while a save is in flight. */
  saving: boolean;
  load: () => Promise<void>;
  /** Shows `next` at once and saves it; on failure the list goes back to the last saved one. */
  commit: (next: SetEntry[]) => void;
};

type Loaded = { key: string; day: ExerciseDay; entries: SetEntry[]; prFlags: boolean[] };

/**
 * One exercise on one day for the Track tab. Every change sends the whole list (the server
 * replaces it), and saves run one after another, so a fast tap-tap-tap can never land out of order.
 * State is tagged with the day it belongs to, so switching days shows loading, never the old sets.
 */
export function useExerciseDay(traineeId: string, exerciseId: string, date: string): ExerciseDayState {
  const key = `${traineeId}|${exerciseId}|${date}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState(0);
  const saved = useRef<{ key: string; entries: SetEntry[] }>({ key: '', entries: [] });
  const queue = useRef<Promise<void>>(Promise.resolve());

  const load = useCallback(async () => {
    try {
      const d = await getExerciseDay(traineeId, exerciseId, date);
      const list = d.log?.workouts?.[0]?.entries ?? [];
      saved.current = { key, entries: list };
      setLoaded({ key, day: d, entries: list, prFlags: d.pr_flags ?? [] });
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    }
  }, [traineeId, exerciseId, date, key]);

  const current = loaded && loaded.key === key ? loaded : null;

  const commit = useCallback(
    (next: SetEntry[]) => {
      if (!current) return;
      const hadPR = current.prFlags.some(Boolean);
      // Flags of the old list no longer line up with `next`; they return with the save.
      setLoaded({ ...current, entries: next, prFlags: [] });
      setInFlight((n) => n + 1);
      queue.current = queue.current.then(async () => {
        try {
          const res = await saveExerciseDay(traineeId, exerciseId, date, next);
          saved.current = { key, entries: next };
          setLoaded((prev) => (prev && prev.key === key ? { ...prev, prFlags: res.pr_flags ?? [] } : prev));
          if (res.new_pr && !hadPR) {
            haptic('success');
            Toast.show({ type: 'success', text1: 'New personal record', text2: 'Best ever on this exercise.' });
          }
        } catch (e: unknown) {
          const rollback = saved.current.key === key ? saved.current.entries : [];
          setLoaded((prev) => (prev && prev.key === key ? { ...prev, entries: rollback } : prev));
          Toast.show({ type: 'error', text1: 'Set not saved', text2: errorMessage(e) });
        } finally {
          setInFlight((n) => n - 1);
        }
      });
    },
    [traineeId, exerciseId, date, key, current]
  );

  return {
    day: current?.day ?? null,
    entries: current?.entries ?? [],
    prFlags: current?.prFlags ?? [],
    loadError,
    saving: inFlight > 0,
    load,
    commit,
  };
}
