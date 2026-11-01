import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconBadge } from '@/components/IconBadge';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useThemedStyles, type Theme } from '../contexts/ThemeContext';
import { deleteAccount } from '../services/accountService';
import { errorMessage } from '../services/http';

const CONFIRM_WORD = 'DELETE';

/** Permanent account deletion (Play Store requirement). The user types DELETE to confirm. */
export default function DeleteAccountScreen(): React.JSX.Element {
  const { user, signOut } = useAuth();
  const styles = useThemedStyles(makeStyles);
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
      <IconBadge name="warning" tone="danger" size={56} />
      <AppText variant="title" style={styles.title} accessibilityRole="header">
        Delete your account
      </AppText>
      <View style={styles.warning}>
        <AppText variant="subheading" tone="error">
          This cannot be undone.
        </AppText>
        {isTrainer ? (
          <AppText style={styles.body}>
            Your coach profile, all your clients and everything logged for them (workouts, meals, weight,
            assessments, photos) will be permanently deleted. Clients who joined through the app keep their login but
            are disconnected from you.
          </AppText>
        ) : (
          <AppText style={styles.body}>
            Your login, your coaching requests and the ratings you gave will be permanently deleted, and you will be
            disconnected from your coach. Your coach keeps their own client record about you; ask them if you want it
            removed.
          </AppText>
        )}
      </View>
      <TextField
        label={`Type ${CONFIRM_WORD} to confirm`}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
        error={error ?? undefined}
      />
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

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    title: {
      marginTop: Spacing.medium,
    },
    warning: {
      marginTop: Spacing.medium,
      marginBottom: Spacing.large,
      padding: Spacing.medium,
      borderRadius: Radii.lg,
      backgroundColor: colors.dangerSoft,
    },
    body: {
      marginTop: Spacing.small,
    },
  });
