import React, { useLayoutEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { errorMessage } from '../services/http';
import { addCategory, renameCategory } from '../services/workoutService';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCustomCategory'>;

/** Add or rename a workout category. */
export default function AddCustomCategoryScreen({ route, navigation }: Props): React.JSX.Element {
  const { traineeId, categoryId, currentName } = route.params;
  const [name, setName] = useState(currentName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: categoryId ? 'Rename category' : 'New category' });
  }, [navigation, categoryId]);

  const onSave = async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a name');
      return;
    }
    setSaving(true);
    try {
      if (categoryId) await renameCategory(categoryId, traineeId, trimmed);
      else await addCategory(traineeId, trimmed);
      navigation.goBack();
    } catch (e: unknown) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Screen footer={<Button title="Save" onPress={() => void onSave()} loading={saving} />}>
      <TextField label="Category name" value={name} onChangeText={setName} maxLength={60} autoFocus />
      {error ? <AppText tone="error">{error}</AppText> : null}
    </Screen>
  );
}
