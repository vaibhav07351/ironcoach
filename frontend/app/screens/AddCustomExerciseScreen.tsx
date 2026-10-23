import React, { useLayoutEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { errorMessage } from '../services/http';
import { addExercise, renameExercise } from '../services/workoutService';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCustomExercise'>;

/** Add or rename an exercise in a category. */
export default function AddCustomExerciseScreen({ route, navigation }: Props): React.JSX.Element {
  const { traineeId, categoryId, categoryName, exerciseId, currentName } = route.params;
  const [name, setName] = useState(currentName ?? '');
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
      else await addExercise(traineeId, categoryId, categoryName, trimmed);
      navigation.goBack();
    } catch (e: unknown) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Screen footer={<Button title="Save" onPress={() => void onSave()} loading={saving} />}>
      <TextField label="Exercise name" value={name} onChangeText={setName} maxLength={100} autoFocus />
      {error ? <AppText tone="error">{error}</AppText> : null}
    </Screen>
  );
}
