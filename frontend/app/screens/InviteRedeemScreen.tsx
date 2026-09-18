import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';
import { redeemInvite } from '../services/inviteService';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'InviteRedeem'>;

export default function InviteRedeemScreen({ navigation }: Props) {
  const { token, login, logout } = useContext(AuthContext);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onRedeem = async (): Promise<void> => {
    if (!token) {
      navigation.replace('Login');
      return;
    }
    setLoading(true);
    try {
      const result = await redeemInvite(token, code.trim().toUpperCase());
      await login(result.token, result.user);
      Toast.show({
        type: 'success',
        text1: 'Connected',
        text2: 'You are linked to your trainer.',
      });
      navigation.replace('ClientHome');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not redeem invite';
      Toast.show({ type: 'error', text1: 'Invite failed', text2: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryMuted]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.title}>Join your coach</Text>
        <Text style={styles.subtitle}>
          Enter the code they shared with you.
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.label}>Invite code</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          maxLength={8}
          placeholder="ABC123"
          placeholderTextColor={Colors.textSecondary}
        />
        <TouchableOpacity
          style={[
            styles.btn,
            (loading || code.trim().length < 4) && styles.btnDisabled,
          ]}
          onPress={() => {
            void onRedeem();
          }}
          disabled={loading || code.trim().length < 4}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color={Colors.textOnPrimary} />
          ) : (
            <Text style={styles.btnText}>Link account</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            void logout().then(() => navigation.replace('Login'));
          }}
          style={styles.signOut}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  hero: {
    paddingHorizontal: Spacing.large,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: Radii.lg,
    borderBottomRightRadius: Radii.lg,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.textOnPrimary,
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(247, 244, 236, 0.78)',
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    padding: Spacing.large,
  },
  label: {
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.medium,
    fontSize: 24,
    letterSpacing: 6,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.large,
  },
  btn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  signOut: { marginTop: Spacing.large, alignItems: 'center', padding: 12 },
  signOutText: { color: Colors.textSecondary },
});
