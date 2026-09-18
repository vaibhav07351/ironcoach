import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';
import { createInvite } from '../services/inviteService';
import { Invite } from '../types/auth';
import { Colors, Radii, Spacing } from '@/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'InviteClient'>;

export default function InviteClientScreen({ route }: Props) {
  const { traineeId, traineeName } = route.params;
  const { token } = useContext(AuthContext);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async (): Promise<void> => {
    if (!token) {
      return;
    }
    setLoading(true);
    try {
      const created = await createInvite(token, traineeId);
      setInvite(created);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not create invite';
      Toast.show({ type: 'error', text1: 'Invite', text2: message });
    } finally {
      setLoading(false);
    }
  };

  const share = async (): Promise<void> => {
    if (!invite) {
      return;
    }
    await Share.share({
      message: `Join me on IronCoach with code ${invite.code}. Open the app, sign in with Google as a client, and enter this code.`,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invite {traineeName}</Text>
      <Text style={styles.subtitle}>
        Generate a one-time code. Your client signs in with Google and enters it
        to unlock their training hub.
      </Text>

      {invite ? (
        <View style={styles.codeBox}>
          <Text style={styles.code}>{invite.code}</Text>
          <Text style={styles.expires}>
            Expires {new Date(invite.expires_at).toLocaleDateString()}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.btn}
          onPress={() => {
            void generate();
          }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.textOnPrimary} />
          ) : (
            <Text style={styles.btnText}>Generate invite code</Text>
          )}
        </TouchableOpacity>
      )}

      {invite && (
        <TouchableOpacity
          style={[styles.btn, styles.secondary]}
          onPress={() => {
            void share();
          }}
        >
          <Text style={[styles.btnText, styles.secondaryText]}>Share code</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.large,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.small,
  },
  subtitle: {
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.large,
  },
  codeBox: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  code: {
    fontSize: 40,
    letterSpacing: 6,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  expires: {
    marginTop: Spacing.small,
    color: Colors.accentSoft,
  },
  btn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  btnText: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryText: {
    color: Colors.primary,
  },
});
