import React, { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconBadge } from '@/components/IconBadge';
import { Screen } from '@/components/Screen';
import { Radii, Spacing } from '@/constants/theme';
import { config } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useThemedStyles, type Theme } from '../contexts/ThemeContext';
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
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);
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
      await Share.share({ message: inviteMessage(current, user?.name || 'Your coach') });
    } catch (e: unknown) {
      console.warn('invite share failed', e instanceof Error ? e.message : String(e));
      Toast.show({ type: 'error', text1: 'Could not open sharing', text2: `Send the code ${current.code} yourself.` });
    }
  };

  return (
    <Screen>
      <IconBadge name="paper-plane" tone="accent" size={56} />
      <AppText variant="title" style={styles.title} accessibilityRole="header">
        Invite {traineeName}
      </AppText>
      <AppText tone="secondary" style={styles.subtitle}>
        Create a one-time code and send it on WhatsApp. When {traineeName.split(' ')[0]} joins, their logs appear
        here automatically.
      </AppText>

      {invite ? (
        <>
          <Card style={styles.codeCard}>
            <AppText variant="label" tone="secondary" center>
              Invite code
            </AppText>
            <AppText style={styles.code} center selectable accessibilityLabel={`Invite code ${invite.code.split('').join(' ')}`}>
              {invite.code}
            </AppText>
            <AppText variant="caption" tone="muted" center>
              Works once, expires {new Date(invite.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
            </AppText>
          </Card>
          <Button title="Share on WhatsApp or any app" icon="share-social" onPress={() => void share(invite)} />
          <View style={styles.gap}>
            <Button title="Create a new code" variant="ghost" onPress={() => void generate()} loading={loading} />
            <AppText variant="caption" tone="muted" center>
              A new code replaces this one.
            </AppText>
          </View>
        </>
      ) : (
        <Button title="Create invite code" icon="key" onPress={() => void generate()} loading={loading} />
      )}
    </Screen>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    title: {
      marginTop: Spacing.medium,
    },
    subtitle: {
      marginTop: Spacing.small,
      marginBottom: Spacing.large,
    },
    codeCard: {
      marginBottom: Spacing.medium,
      paddingVertical: Spacing.large,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.accent,
      borderRadius: Radii.xl,
    },
    code: {
      fontSize: 40,
      lineHeight: 48,
      fontWeight: '800',
      letterSpacing: 8,
      fontVariant: ['tabular-nums'],
      color: colors.tint,
      marginVertical: Spacing.small,
    },
    gap: {
      marginTop: Spacing.medium,
    },
  });
