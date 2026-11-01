import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing } from '@/constants/theme';
import type { ExpertiseCode } from '../app/constants/expertise';
import { AppText } from './AppText';
import { Button } from './Button';
import { IconBadge } from './IconBadge';
import { InterestPicker } from './InterestPicker';
import { Screen } from './Screen';
import { StepProgress } from './StepProgress';

type Props = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Position in a multi-step setup flow, e.g. { current: 1, total: 2 }. */
  step?: { current: number; total: number };
  initial?: string[];
  /** Saves the selection; throw to keep the user on the step. */
  onSave: (codes: ExpertiseCode[]) => Promise<void>;
  onSignOut: () => void;
};

/** One onboarding step: pick categories, continue. Sign out is always available. */
export function OnboardingStep({ title, subtitle, icon, step, initial = [], onSave, onSignOut }: Props): React.JSX.Element {
  const [selected, setSelected] = useState<ExpertiseCode[]>(initial as ExpertiseCode[]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onContinue = async (): Promise<void> => {
    setError(null);
    setSaving(true);
    try {
      await onSave(selected);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Screen
      noHeader
      footer={
        <>
          <Button
            title={selected.length > 0 ? `Continue with ${selected.length} selected` : 'Pick at least one'}
            onPress={() => void onContinue()}
            loading={saving}
            disabled={selected.length === 0}
          />
          <Button title="Sign out" variant="ghost" onPress={onSignOut} disabled={saving} />
        </>
      }
    >
      {step ? <StepProgress current={step.current} total={step.total} /> : null}
      <View style={styles.head}>
        <IconBadge name={icon} tone="accent" size={56} />
        <AppText variant="title" style={styles.title} accessibilityRole="header">
          {title}
        </AppText>
        <AppText tone="secondary" style={styles.subtitle}>
          {subtitle}
        </AppText>
      </View>
      <InterestPicker selected={selected} onChange={setSelected} />
      {error ? (
        <AppText tone="error" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    marginTop: Spacing.large,
    marginBottom: Spacing.large,
  },
  title: {
    marginTop: Spacing.medium,
  },
  subtitle: {
    marginTop: Spacing.small,
  },
  error: {
    marginTop: Spacing.medium,
  },
});
