import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { deleteAccount } from '../services/accountService';
import { errorMessage } from '../services/http';

const CONFIRM_WORD = 'DELETE';

/** Permanent account deletion (Play Store requirement). The user types DELETE to confirm. */
export default function DeleteAccountScreen(): React.JSX.Element {
  const { user, signOut } = useAuth();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isTrainer = user?.role === 'trainer';

  const onDelete = async (): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      await deleteAccount();
      await signOut();
    } catch (e: unknown) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppText variant="heading">Delete your account</AppText>
      <Card style={styles.warning}>
        <AppText variant="subheading" tone="error">
          This cannot be undone.
        </AppText>
        {isTrainer ? (
          <AppText style={styles.body}>
            Your coach profile, all your clients and everything logged for them (workouts, meals, weight,
            assessments, photos) will be permanently deleted. Clients who joined through the app keep their
            login but are disconnected from you.
          </AppText>
        ) : (
          <AppText style={styles.body}>
            Your login, your coaching requests and the ratings you gave will be permanently deleted, and you
            will be disconnected from your coach. Your coach keeps their own client record about you; ask
            them if you want it removed.
          </AppText>
        )}
      </Card>
      <TextField
        label={`Type ${CONFIRM_WORD} to confirm`}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {error ? (
        <AppText tone="error" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
      <Button
        title="Delete account permanently"
        variant="danger"
        onPress={() => void onDelete()}
        loading={busy}
        disabled={typed.trim().toUpperCase() !== CONFIRM_WORD}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  warning: {
    marginTop: Spacing.medium,
    marginBottom: Spacing.large,
    backgroundColor: Colors.errorSoft,
    borderColor: Colors.error,
  },
  body: {
    marginTop: Spacing.small,
  },
  error: {
    marginBottom: Spacing.small,
  },
});
