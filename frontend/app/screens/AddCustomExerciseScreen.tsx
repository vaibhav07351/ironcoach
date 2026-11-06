import React, { useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '../services/http';
import { addExercise, renameExercise } from '../services/workoutService';
import type { RootStackParamList } from '../types/navigation';
import type { ExerciseType } from '../types/workout';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCustomExercise'>;

const TYPES: { value: ExerciseType; label: string; hint: string }[] = [
  { value: 'weight_reps', label: 'Weight and reps', hint: 'Bench press, rows, curls' },
  { value: 'reps', label: 'Reps only', hint: 'Pull-ups, push-ups, dips' },
  { value: 'distance_time', label: 'Distance and time', hint: 'Treadmill, cycling, rowing' },
  { value: 'time', label: 'Time only', hint: 'Plank, wall sit' },
];

/** Add an exercise to a category (choosing what its sets record), or rename one. */
export default function AddCustomExerciseScreen({ route, navigation }: Props): React.JSX.Element {
  const { traineeId, categoryId, categoryName, exerciseId, currentName } = route.params;
  const [name, setName] = useState(currentName ?? '');
  const [type, setType] = useState<ExerciseType>(categoryName.trim().toLowerCase() === 'cardio' ? 'distance_time' : 'weight_reps');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: exerciseId ? 'Rename exercise' : `New ${categoryName} exercise` });
  }, [navigation, exerciseId, categoryName]);

  const onSave = async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a name');
      return;
    }
    setSaving(true);
    try {
      if (exerciseId) await renameExercise(exerciseId, traineeId, trimmed);
      else await addExercise(traineeId, categoryId, categoryName, trimmed, type);
      navigation.goBack();
    } catch (e: unknown) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  const hint = TYPES.find((t) => t.value === type)?.hint;

  return (
    <Screen footer={<Button title="Save" onPress={() => void onSave()} loading={saving} />}>
      <TextField label="Exercise name" value={name} onChangeText={setName} maxLength={100} autoFocus />
      {!exerciseId ? (
        <>
          <AppText variant="label" tone="secondary" style={styles.label}>
            Each set records
          </AppText>
          <View style={styles.chips}>
            {TYPES.map((t) => (
              <Chip key={t.value} label={t.label} selected={type === t.value} onPress={() => setType(t.value)} />
            ))}
          </View>
          {hint ? (
            <AppText variant="caption" tone="secondary" style={styles.hint}>
              {`For example: ${hint}. This cannot be changed later.`}
            </AppText>
          ) : null}
        </>
      ) : null}
      {error ? <AppText tone="error">{error}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: Spacing.small - 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  hint: { marginBottom: Spacing.medium },
});
