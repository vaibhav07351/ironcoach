import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { rowsToWorkout, SetEditor, workoutToRows, type SetRow } from '@/components/SetEditor';
import { TextField } from '@/components/TextField';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '../services/http';
import { updateWorkoutLog } from '../services/workoutService';
import type { RootStackParamList } from '../types/navigation';
import type { Workout } from '../types/workout';
import { relativeDayLabel } from '../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutLogForm'>;

type ExerciseDraft = { exercise: string; exerciseId?: string; rows: SetRow[] };

/** Edit every exercise of a gym log (the old screen kept only the first one). */
export default function WorkoutLogFormScreen({ route, navigation }: Props): React.JSX.Element {
  const { log } = route.params;
  const [drafts, setDrafts] = useState<ExerciseDraft[]>(
    (log.workouts ?? []).map((w) => ({ exercise: w.exercise, exerciseId: w.exercise_id, rows: workoutToRows(w) }))
  );
  const [notes, setNotes] = useState(log.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async (): Promise<void> => {
    const workouts: Workout[] = [];
    for (const d of drafts) {
      const w = rowsToWorkout(d.exercise, d.exerciseId, d.rows);
      if (typeof w === 'string') {
        setError(`${d.exercise}: ${w}`);
        return;
      }
      workouts.push(w);
    }
    if (workouts.length === 0) {
      setError('Keep at least one exercise, or delete the log from the list.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateWorkoutLog(log.id, { workouts, notes: notes.trim() });
      Toast.show({ type: 'success', text1: 'Workout updated' });
      navigation.goBack();
    } catch (e: unknown) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Screen footer={<Button title="Save changes" onPress={() => void onSave()} loading={saving} />}>
      <AppText tone="secondary" style={styles.date}>
        {relativeDayLabel(log.date)}
      </AppText>
      {drafts.map((d, index) => (
        <Card key={`${d.exercise}-${index}`} style={styles.card}>
          <View style={styles.header}>
            <AppText variant="subheading" style={styles.flex}>
              {d.exercise}
            </AppText>
            <Button
              title="Remove"
              variant="ghost"
              onPress={() => setDrafts(drafts.filter((_, i) => i !== index))}
            />
          </View>
          <SetEditor
            rows={d.rows}
            onChange={(rows) => setDrafts(drafts.map((x, i) => (i === index ? { ...x, rows } : x)))}
          />
        </Card>
      ))}
      <TextField label="Notes" value={notes} onChangeText={setNotes} multiline maxLength={2000} />
      {error ? (
        <AppText tone="error" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  date: { marginBottom: Spacing.medium },
  card: { marginBottom: Spacing.medium },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.small },
});
