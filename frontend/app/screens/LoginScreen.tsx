import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';
import { googleAuth } from '../services/authService';
import { UserRole } from '../types/auth';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

function routeAfterAuth(
  navigation: NavigationProp,
  needsInvite: boolean,
  role: UserRole
): void {
  if (role === 'client' && needsInvite) {
    navigation.replace('FindCoachHub');
    return;
  }
  if (role === 'client') {
    navigation.replace('ClientHome');
    return;
  }
  navigation.replace('Dashboard');
}

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { login, isAuthenticated, user, state } = useContext(AuthContext);
  const [role, setRole] = useState<UserRole>('trainer');
  const [isLoading, setIsLoading] = useState(false);

  const extra = Constants.expoConfig?.extra ?? {};
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: (extra.googleWebClientId as string) || undefined,
    androidClientId: (extra.googleAndroidClientId as string) || undefined,
    iosClientId: (extra.googleIosClientId as string) || undefined,
    webClientId: (extra.googleWebClientId as string) || undefined,
  });

  useEffect(() => {
    if (state.status === 'signedIn' && user) {
      routeAfterAuth(navigation, user.needs_invite, user.role);
    }
  }, [state.status, user, navigation]);

  useEffect(() => {
    const handleResponse = async (): Promise<void> => {
      if (response?.type !== 'success') {
        return;
      }
      const idToken = response.params.id_token;
      if (!idToken) {
        Toast.show({
          type: 'error',
          text1: 'Google Sign-In failed',
          text2: 'No ID token returned.',
        });
        return;
      }

      setIsLoading(true);
      try {
        const auth = await googleAuth(idToken, role);
        await login(auth.token, auth.user);
        Toast.show({
          type: 'success',
          text1: 'Welcome to IronCoach',
          text2: auth.user.name || auth.user.email,
        });
        routeAfterAuth(navigation, auth.user.needs_invite, auth.user.role);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Sign-in failed';
        Toast.show({ type: 'error', text1: 'Sign-in failed', text2: message });
      } finally {
        setIsLoading(false);
      }
    };

    void handleResponse();
  }, [response, role, login, navigation]);

  if (state.status === 'loading' || isAuthenticated) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const googleReady = !!request && !isLoading;

  return (
    <View style={styles.container}>
      <View style={styles.heroGlow} />
      <View style={styles.brandBlock}>
        <Image
          source={require('../../assets/images/ironcoach.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brand}>IronCoach</Text>
        <Text style={styles.tagline}>
          Stay accountable. Train with intent. Show up this week.
        </Text>
      </View>

      <View style={styles.roleRow}>
        <TouchableOpacity
          style={[styles.roleChip, role === 'trainer' && styles.roleChipActive]}
          onPress={() => setRole('trainer')}
        >
          <Text
            style={[
              styles.roleText,
              role === 'trainer' && styles.roleTextActive,
            ]}
          >
            I&apos;m a trainer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleChip, role === 'client' && styles.roleChipActive]}
          onPress={() => setRole('client')}
        >
          <Text
            style={[
              styles.roleText,
              role === 'client' && styles.roleTextActive,
            ]}
          >
            I&apos;m a client
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.googleBtn, !googleReady && styles.googleBtnDisabled]}
        disabled={!googleReady}
        onPress={() => {
          void promptAsync();
        }}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.textOnPrimary} />
        ) : (
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>
        {role === 'client'
          ? 'After sign-in, enter the invite code from your trainer.'
          : 'One tap to start coaching — no password to remember.'}
      </Text>

      {!extra.googleWebClientId && (
        <Text style={styles.configWarning}>
          Set googleWebClientId (and platform IDs) in app.json extra to enable
          Google Sign-In.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.large,
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    top: -80,
    left: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.primaryMuted,
    opacity: 0.18,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: Spacing.medium,
  },
  brand: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : Fonts.display,
    fontSize: 42,
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: Spacing.small,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    maxWidth: 300,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.small,
    marginBottom: Spacing.large,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  roleChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleText: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  roleTextActive: {
    color: Colors.textOnPrimary,
  },
  googleBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  googleBtnDisabled: {
    opacity: 0.5,
  },
  googleBtnText: {
    color: Colors.textOnPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  hint: {
    marginTop: Spacing.medium,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 13,
  },
  configWarning: {
    marginTop: Spacing.large,
    textAlign: 'center',
    color: Colors.warning,
    fontSize: 12,
  },
});
