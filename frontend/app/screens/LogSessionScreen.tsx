import React, { useLayoutEffect, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Spacing } from '@/constants/theme';
import { fieldsFor } from '../constants/activityFields';
import { expertiseLabel } from '../constants/expertise';
import { errorMessage } from '../services/http';
import { createWorkoutLog } from '../services/workoutService';
import type { RootStackParamList } from '../types/navigation';
import type { SessionMetrics } from '../types/workout';
import { newClientId } from '../utils/ids';
import { relativeDayLabel } from '../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'LogSession'>;

/** Quick log for a non-gym session (swim, run, badminton...). */
export default function LogSessionScreen({ route, navigation }: Props): React.JSX.Element {
  const { traineeId, date, activityType } = route.params;
  const fields = fieldsFor(activityType);
  const label = expertiseLabel(activityType);
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One idempotency key per screen: retrying after a timeout never logs the session twice.
  const clientId = useRef(newClientId()).current;

  useLayoutEffect(() => {
    navigation.setOptions({ title: `Log ${label.toLowerCase()}` });
  }, [navigation, label]);

  const onSave = async (): Promise<void> => {
    const metrics: SessionMetrics = {};
    for (const f of fields) {
      const raw = (values[f.key] ?? '').trim();
      if (!raw) continue;
      if (f.kind === 'number') {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) {
          setError(`${f.label} must be a positive number`);
          return;
        }
        (metrics as Record<string, number>)[f.key] = f.integer ? Math.round(n) : n;
      } else {
        (metrics as Record<string, string>)[f.key] = raw;
      }
    }
    if (!metrics.duration_min) {
      setError('Enter how many minutes you trained.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createWorkoutLog({
        trainee_id: traineeId,
        date,
        activity_type: activityType,
        metrics,
        notes: notes.trim(),
        client_id: clientId,
      });
      Toast.show({ type: 'success', text1: 'Logged', text2: `${label} session saved.` });
      navigation.goBack();
    } catch (e: unknown) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Screen footer={<Button title="Save session" onPress={() => void onSave()} loading={saving} />}>
      <AppText tone="secondary" style={{ marginBottom: Spacing.medium }}>
        {relativeDayLabel(date)} · only fill in what you track.
      </AppText>
      {fields.map((f) => (
        <TextField
          key={f.key}
          label={f.kind === 'number' && f.unit ? `${f.label} (${f.unit})` : f.label}
          value={values[f.key] ?? ''}
          onChangeText={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
          keyboardType={f.kind === 'number' ? (f.integer ? 'number-pad' : 'decimal-pad') : 'default'}
          placeholder={f.placeholder}
          maxLength={f.kind === 'number' ? 7 : 120}
        />
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
