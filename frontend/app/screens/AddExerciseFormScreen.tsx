import React, { useLayoutEffect, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { rowsToWorkout, SetEditor, type SetRow } from '@/components/SetEditor';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '../services/http';
import { createWorkoutLog } from '../services/workoutService';
import type { RootStackParamList } from '../types/navigation';
import { relativeDayLabel } from '../utils/date';
import { newClientId } from '../utils/ids';

type Props = NativeStackScreenProps<RootStackParamList, 'AddExerciseForm'>;

/** Log sets for one exercise. Saving returns to the exercise list to log the next one. */
export default function AddExerciseFormScreen({ route, navigation }: Props): React.JSX.Element {
  const { traineeId, exercise, exerciseId, date } = route.params;
  const [rows, setRows] = useState<SetRow[]>([{ reps: '', weight: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stable idempotency key: a retried save never creates a second log.
  const clientId = useRef(newClientId()).current;

  useLayoutEffect(() => {
    navigation.setOptions({ title: exercise });
  }, [navigation, exercise]);

  const onSave = async (): Promise<void> => {
    const workout = rowsToWorkout(exercise, exerciseId, rows);
    if (typeof workout === 'string') {
      setError(workout);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createWorkoutLog({ trainee_id: traineeId, date, activity_type: 'gym', workouts: [workout], client_id: clientId });
      Toast.show({ type: 'success', text1: `${exercise} logged`, text2: `${workout.sets} sets` });
      navigation.goBack();
    } catch (e: unknown) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Screen footer={<Button title="Save exercise" onPress={() => void onSave()} loading={saving} />}>
      <AppText tone="secondary" style={{ marginBottom: Spacing.medium }}>
        {relativeDayLabel(date)} · enter reps and weight for each set.
      </AppText>
      <SetEditor rows={rows} onChange={setRows} />
      {error ? (
        <AppText tone="error" style={{ marginTop: Spacing.medium }} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}
