import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '../services/http';
import { fetchTrainerProfile, updateTrainerProfile } from '../services/trainerService';

/** Same shape the server accepts: name@bank (letters, digits, dot, dash, underscore). */
const UPI_PATTERN = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.-]{1,31}$/;

/** The trainer's UPI id, used only to write fee reminders. Leave it empty to remove it. */
export default function UpiSettingsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [upiId, setUpiId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setUpiId((await fetchTrainerProfile()).upi_id ?? '');
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (upiId === null) {
    return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;
  }

  const onSave = async (): Promise<void> => {
    const value = upiId.trim();
    if (value && !UPI_PATTERN.test(value)) {
      setError('Enter it like name@bank');
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await updateTrainerProfile({ upi_id: value });
      Toast.show({ type: 'success', text1: value ? 'UPI id saved' : 'UPI id removed' });
      navigation.goBack();
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not saved', text2: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen footer={<Button title="Save" loading={saving} onPress={() => void onSave()} />}>
      <AppText tone="secondary" style={styles.intro}>
        Your UPI id goes into the WhatsApp fee reminder so clients know where to pay. TrainerNearMe never
        handles the money.
      </AppText>
      <TextField
        label="UPI id"
        value={upiId}
        onChangeText={setUpiId}
        placeholder="name@bank"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        error={error}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginBottom: Spacing.medium,
  },
});
