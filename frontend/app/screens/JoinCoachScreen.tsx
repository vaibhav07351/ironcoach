import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Checkbox } from '@/components/Checkbox';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Spacing } from '@/constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage } from '../services/http';
import { redeemInvite } from '../services/inviteService';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinCoach'>;

const CODE_LENGTH = 6;

/**
 * A client without a coach joins with the 6-character code their trainer shares. Joining shares
 * the client's logs with that coach, so consent is required. On success the client home opens.
 */
export default function JoinCoachScreen({ navigation }: Props): React.JSX.Element {
  const { signIn, signOut, user } = useAuth();
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = code.trim().toUpperCase();
  const canJoin = normalized.length === CODE_LENGTH && consent;

  const onJoin = async (): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      await signIn(await redeemInvite(normalized, consent));
    } catch (e: unknown) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen noHeader>
      <AppText variant="title" style={styles.title}>
        Join your coach
      </AppText>
      <AppText tone="secondary" style={styles.subtitle}>
        Hi {user?.name?.split(' ')[0] ?? 'there'}. Enter the code your trainer shared with you.
      </AppText>

      <TextField
        label="Invite code"
        value={code}
        onChangeText={(v) => setCode(v.replace(/[^a-zA-Z0-9]/g, '').slice(0, CODE_LENGTH))}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={CODE_LENGTH}
        placeholder="e.g. K7M2QX"
        returnKeyType="done"
        hint="6 letters or numbers"
      />

      <Checkbox
        checked={consent}
        onChange={setConsent}
        label="I agree to share my workouts, meals and progress with this coach."
      />

      {error ? (
        <AppText tone="error" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}

      <Button title="Join coach" onPress={() => void onJoin()} loading={busy} disabled={!canJoin} style={styles.join} />

      <Card style={styles.help}>
        <AppText variant="subheading">No code yet?</AppText>
        <AppText tone="secondary" style={styles.helpText}>
          Ask your trainer to open your profile in TrainerNearMe and tap Invite. They can send the code on
          WhatsApp.
        </AppText>
      </Card>

      <View style={styles.footerLinks}>
        <Button title="Sign out" variant="ghost" onPress={() => void signOut()} disabled={busy} />
        <Button title="Delete account" variant="ghost" onPress={() => navigation.navigate('DeleteAccount')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: Spacing.large,
  },
  subtitle: {
    marginTop: Spacing.small,
    marginBottom: Spacing.large,
  },
  error: {
    marginBottom: Spacing.small,
  },
  join: {
    marginTop: Spacing.medium,
  },
  help: {
    marginTop: Spacing.xl,
  },
  helpText: {
    marginTop: Spacing.xs,
  },
  footerLinks: {
    marginTop: Spacing.large,
  },
});
