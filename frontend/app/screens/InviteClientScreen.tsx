import React, { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { config } from '../config';
import { errorMessage } from '../services/http';
import { createInvite } from '../services/inviteService';
import type { Invite } from '../types/auth';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'InviteClient'>;

function inviteMessage(invite: Invite, trainerName: string): string {
  return (
    `Hi! ${trainerName} invited you to TrainerNearMe to track your workouts, meals and progress.\n\n` +
    `1. Install the app: ${config.playStoreUrl}\n` +
    `2. Sign in with Google and choose "I'm training with a coach"\n` +
    `3. Enter code ${invite.code}\n\n` +
    'The code works once and expires in 7 days.'
  );
}

/** Creates a single-use invite code for a client and shares it (WhatsApp or any app). */
export default function InviteClientScreen({ route }: Props): React.JSX.Element {
  const { traineeId, traineeName } = route.params;
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async (): Promise<void> => {
    setLoading(true);
    try {
      setInvite(await createInvite(traineeId));
    } catch (error: unknown) {
      Toast.show({ type: 'error', text1: 'Could not create invite', text2: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const share = async (current: Invite): Promise<void> => {
    try {
      await Share.share({ message: inviteMessage(current, 'Your coach') });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not open sharing', text2: `Send the code ${current.code} yourself.` });
    }
  };

  return (
    <Screen>
      <AppText variant="heading">Invite {traineeName}</AppText>
      <AppText tone="secondary" style={styles.subtitle}>
        Create a one-time code and send it on WhatsApp. When {traineeName.split(' ')[0]} joins, their logs
        appear here automatically.
      </AppText>

      {invite ? (
        <>
          <Card style={styles.codeCard}>
            <AppText variant="caption" tone="secondary" center>
              Invite code
            </AppText>
            <AppText style={styles.code} center selectable accessibilityLabel={`Invite code ${invite.code.split('').join(' ')}`}>
              {invite.code}
            </AppText>
            <AppText variant="caption" tone="muted" center>
              Works once · expires {new Date(invite.expires_at).toLocaleDateString('en-IN')}
            </AppText>
          </Card>
          <Button title="Share invite" icon="share-social-outline" onPress={() => void share(invite)} />
          <View style={styles.gap}>
            <Button title="Create a new code" variant="ghost" onPress={() => void generate()} loading={loading} />
            <AppText variant="caption" tone="muted" center>
              A new code replaces this one.
            </AppText>
          </View>
        </>
      ) : (
        <Button title="Create invite code" onPress={() => void generate()} loading={loading} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: Spacing.small,
    marginBottom: Spacing.large,
  },
  codeCard: {
    marginBottom: Spacing.medium,
    paddingVertical: Spacing.large,
  },
  code: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: 6,
    color: Colors.primary,
    marginVertical: Spacing.small,
  },
  gap: {
    marginTop: Spacing.medium,
  },
});
