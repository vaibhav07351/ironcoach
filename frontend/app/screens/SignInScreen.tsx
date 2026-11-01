import React, { useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { IconBadge } from '@/components/IconBadge';
import { PressableScale } from '@/components/PressableScale';
import { Radii, Spacing, webScrollFix } from '@/constants/theme';
import { config } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, useThemedStyles, type Theme } from '../contexts/ThemeContext';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import { useLightStatusBar } from '../hooks/useLightStatusBar';
import { signInWithGoogle } from '../services/authService';
import { ApiError, errorMessage } from '../services/http';
import type { UserRole } from '../types/auth';
import { deviceTimeZone } from '../utils/date';

type Step = { kind: 'start' } | { kind: 'createAccount'; idToken: string };

const ROLES: { role: UserRole; title: string; detail: string; icon: 'barbell' | 'body' }[] = [
  { role: 'trainer', title: "I'm a trainer", detail: 'Manage clients, workouts, diet, fees and progress.', icon: 'barbell' },
  { role: 'client', title: "I'm training with a coach", detail: 'Log workouts and meals; your coach follows along.', icon: 'body' },
];

const FEATURES: { icon: 'people' | 'wallet' | 'trending-up'; text: string }[] = [
  { icon: 'people', text: 'Every client, workout and meal in one place' },
  { icon: 'wallet', text: 'Fees, packages and WhatsApp reminders' },
  { icon: 'trending-up', text: 'Attendance, streaks and progress at a glance' },
];

/**
 * Sign in with Google. Returning users go straight in. For a new Google account the server asks
 * for a role and consent; the same ID token is reused for the second call.
 */
export default function SignInScreen(): React.JSX.Element {
  const { signIn, state } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const google = useGoogleSignIn();
  const [step, setStep] = useState<Step>({ kind: 'start' });
  const [role, setRole] = useState<UserRole | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    state.status === 'signedOut' && state.reason === 'expired' ? 'Your session ended. Please sign in again.' : null
  );
  useLightStatusBar();

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

  const errorBanner = error ? (
    <View style={styles.error} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={18} color={colors.danger} style={styles.errorIcon} />
      <AppText variant="label" tone="error" style={styles.flex}>
        {error}
      </AppText>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView style={webScrollFix} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(500)} style={styles.brand}>
          <Image
            source={require('../../assets/images/trainernearme-icon.png')}
            style={styles.logo}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            accessible={false}
          />
          <AppText variant="largeTitle" tone="onBrand" center accessibilityRole="header" accessibilityLabel="TrainerNearMe">
            Trainer<AppText variant="largeTitle" style={styles.wordmarkAccent}>NearMe</AppText>
          </AppText>
          <AppText tone="onBrandMuted" center style={styles.tagline}>
            Find. Train. Get stronger.
          </AppText>
        </Animated.View>

        {step.kind === 'start' ? (
          <>
            <Animated.View entering={FadeInDown.duration(500).delay(120)} style={styles.features}>
              {FEATURES.map((f) => (
                <View key={f.icon} style={styles.feature}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={f.icon} size={18} color={colors.accent} />
                  </View>
                  <AppText tone="onBrand" style={styles.flex}>
                    {f.text}
                  </AppText>
                </View>
              ))}
            </Animated.View>

            <View style={styles.spacer} />

            <Animated.View entering={FadeInUp.duration(500).delay(220)}>
              {errorBanner}
              <Button
                title="Continue with Google"
                icon="logo-google"
                variant="onBrand"
                onPress={() => void onGoogle()}
                loading={busy}
                disabled={!google.ready}
              />
              <AppText variant="caption" tone="onBrandMuted" center style={styles.fine}>
                New here? You choose trainer or client on the next step.
              </AppText>
            </Animated.View>
          </>
        ) : (
          <Animated.View entering={FadeInUp.duration(420)} style={styles.panel}>
            <AppText variant="title" accessibilityRole="header">
              Create your account
            </AppText>
            <AppText tone="secondary" style={styles.panelLead}>
              How will you use TrainerNearMe?
            </AppText>
            {ROLES.map((option) => {
              const selected = role === option.role;
              return (
                <PressableScale
                  key={option.role}
                  onPress={() => setRole(option.role)}
                  haptic="select"
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${option.title}. ${option.detail}`}
                  style={[styles.roleCard, selected ? styles.roleSelected : null]}
                >
                  <IconBadge name={option.icon} tone={selected ? 'accent' : 'brand'} />
                  <View style={styles.roleText}>
                    <AppText variant="subheading">{option.title}</AppText>
                    <AppText variant="caption" tone="secondary">
                      {option.detail}
                    </AppText>
                  </View>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selected ? colors.tint : colors.border}
                  />
                </PressableScale>
              );
            })}
            <Checkbox
              checked={accepted}
              onChange={setAccepted}
              accessibilityLabel="I am 18 or older and I agree to the Terms and Privacy Policy"
              label={
                <AppText variant="label" tone="secondary" style={styles.terms}>
                  I am 18 or older and I agree to the{' '}
                  <AppText variant="label" tone="brand" style={styles.link} onPress={() => void Linking.openURL(config.termsUrl)}>
                    Terms
                  </AppText>{' '}
                  and{' '}
                  <AppText
                    variant="label"
                    tone="brand"
                    style={styles.link}
                    onPress={() => void Linking.openURL(config.privacyPolicyUrl)}
                  >
                    Privacy Policy
                  </AppText>
                  .
                </AppText>
              }
            />
            {errorBanner}
            <Button
              title="Create account"
              onPress={() => void onCreateAccount(step.idToken)}
              loading={busy}
              disabled={!role || !accepted}
              style={styles.createButton}
            />
            <Button title="Back" variant="ghost" onPress={() => setStep({ kind: 'start' })} disabled={busy} />
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = ({ colors, elevation }: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.brand,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: Spacing.large,
      paddingTop: Spacing.xxl,
      paddingBottom: Spacing.large,
    },
    brand: {
      alignItems: 'center',
    },
    logo: {
      width: 104,
      height: 104,
      borderRadius: Radii.xl,
      marginBottom: Spacing.large,
    },
    wordmarkAccent: {
      color: colors.accent,
    },
    tagline: {
      marginTop: Spacing.small,
      letterSpacing: 0.4,
    },
    features: {
      marginTop: Spacing.xxl,
      gap: Spacing.medium,
    },
    feature: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    featureIcon: {
      width: 36,
      height: 36,
      borderRadius: Radii.sm,
      backgroundColor: colors.brandRaised,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.medium,
    },
    spacer: {
      flexGrow: 1,
      minHeight: Spacing.xl,
    },
    fine: {
      marginTop: Spacing.medium,
    },
    flex: {
      flex: 1,
      minWidth: 0,
    },
    error: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.dangerSoft,
      borderRadius: Radii.md,
      padding: Spacing.small + 4,
      marginBottom: Spacing.medium,
    },
    errorIcon: {
      marginRight: Spacing.small,
    },
    panel: {
      marginTop: Spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: Radii.xl,
      padding: Spacing.large,
      ...elevation(3),
    },
    panelLead: {
      marginTop: Spacing.xs,
      marginBottom: Spacing.medium,
    },
    roleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.separator,
      borderRadius: Radii.lg,
      padding: Spacing.small + 4,
      marginBottom: Spacing.small + 2,
      backgroundColor: colors.surface,
    },
    roleSelected: {
      borderColor: colors.tint,
      backgroundColor: colors.tintSoft,
    },
    roleText: {
      flex: 1,
      minWidth: 0,
      marginHorizontal: Spacing.small + 4,
    },
    terms: {
      fontWeight: '400',
    },
    link: {
      textDecorationLine: 'underline',
    },
    createButton: {
      marginTop: Spacing.small,
    },
  });
