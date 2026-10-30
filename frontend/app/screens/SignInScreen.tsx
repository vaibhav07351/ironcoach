import React, { useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Checkbox } from '@/components/Checkbox';
import { Screen } from '@/components/Screen';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { config } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import { signInWithGoogle } from '../services/authService';
import { ApiError, errorMessage } from '../services/http';
import type { UserRole } from '../types/auth';
import { deviceTimeZone } from '../utils/date';

type Step = { kind: 'start' } | { kind: 'createAccount'; idToken: string };

const ROLES: { role: UserRole; title: string; detail: string }[] = [
  { role: 'trainer', title: "I'm a trainer", detail: 'Manage clients, workouts, diet and progress.' },
  { role: 'client', title: "I'm training with a coach", detail: 'Log workouts and meals; your coach follows along.' },
];

/**
 * Sign in with Google. Returning users go straight in. For a new Google account the server asks
 * for a role and consent; the same ID token is reused for the second call.
 */
export default function SignInScreen(): React.JSX.Element {
  const { signIn, state } = useAuth();
  const google = useGoogleSignIn();
  const [step, setStep] = useState<Step>({ kind: 'start' });
  const [role, setRole] = useState<UserRole | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    state.status === 'signedOut' && state.reason === 'expired' ? 'Your session ended. Please sign in again.' : null
  );

  const finish = async (idToken: string, options: { role?: UserRole; acceptTerms?: boolean }): Promise<void> => {
    const auth = await signInWithGoogle(idToken, { ...options, timezone: deviceTimeZone() });
    await signIn(auth);
  };

  const onGoogle = async (): Promise<void> => {
    setError(null);
    let idToken: string | null;
    try {
      // Open the account picker first; only show progress once Google returns.
      idToken = await google.promptIdToken();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed.');
      return;
    }
    if (!idToken) {
      return; // cancelled
    }
    setBusy(true);
    try {
      await finish(idToken, {});
    } catch (e: unknown) {
      if (e instanceof ApiError && (e.code === 'role_required' || e.code === 'terms_required')) {
        setStep({ kind: 'createAccount', idToken });
      } else {
        setError(errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const onCreateAccount = async (idToken: string): Promise<void> => {
    if (!role || !accepted) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await finish(idToken, { role, acceptTerms: true });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === 'google_token_invalid') {
        // The Google token expired while choosing; start again.
        setStep({ kind: 'start' });
        setError('That took a while. Please continue with Google again.');
      } else {
        setError(errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen noHeader>
      <View style={styles.brand}>
        <Image source={require('../../assets/images/trainernearme-icon.png')} style={styles.logo} resizeMode="contain" />
        <AppText variant="title" center>
          TrainerNearMe
        </AppText>
        <AppText tone="secondary" center style={styles.tagline}>
          Your clients, workouts, diet and progress in one place.
        </AppText>
      </View>

      {step.kind === 'start' ? (
        <View>
          <Button
            title="Continue with Google"
            icon="logo-google"
            onPress={() => void onGoogle()}
            loading={busy}
            disabled={!google.ready}
          />
          <AppText variant="caption" tone="muted" center style={styles.fine}>
            New here? You can choose trainer or client on the next step.
          </AppText>
        </View>
      ) : (
        <View>
          <AppText variant="heading" style={styles.sectionTitle}>
            Create your account
          </AppText>
          {ROLES.map((option) => (
            <Card
              key={option.role}
              onPress={() => setRole(option.role)}
              accessibilityLabel={option.title}
              style={[styles.roleCard, role === option.role ? styles.roleSelected : null]}
            >
              <AppText variant="subheading">{option.title}</AppText>
              <AppText tone="secondary">{option.detail}</AppText>
            </Card>
          ))}
          <Checkbox
            checked={accepted}
            onChange={setAccepted}
            accessibilityLabel="I am 18 or older and I agree to the Terms and Privacy Policy"
            label={
              <AppText>
                I am 18 or older and I agree to the{' '}
                <AppText tone="brand" onPress={() => void Linking.openURL(config.termsUrl)}>
                  Terms
                </AppText>{' '}
                and{' '}
                <AppText tone="brand" onPress={() => void Linking.openURL(config.privacyPolicyUrl)}>
                  Privacy Policy
                </AppText>
                .
              </AppText>
            }
          />
          <Button
            title="Create account"
            onPress={() => void onCreateAccount(step.idToken)}
            loading={busy}
            disabled={!role || !accepted}
            style={styles.createButton}
          />
          <Button title="Back" variant="ghost" onPress={() => setStep({ kind: 'start' })} disabled={busy} />
        </View>
      )}

      {error ? (
        <AppText tone="error" center style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: Spacing.medium,
    borderRadius: Radii.lg,
  },
  tagline: {
    marginTop: Spacing.small,
    maxWidth: 320,
  },
  fine: {
    marginTop: Spacing.medium,
  },
  sectionTitle: {
    marginBottom: Spacing.medium,
  },
  roleCard: {
    marginBottom: Spacing.small,
  },
  roleSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primarySoft,
  },
  createButton: {
    marginTop: Spacing.medium,
  },
  error: {
    marginTop: Spacing.large,
  },
});
