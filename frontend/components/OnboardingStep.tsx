import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { ExpertiseCode } from '../app/constants/expertise';
import { AppText } from './AppText';
import { Button } from './Button';
import { InterestPicker } from './InterestPicker';
import { Screen } from './Screen';

type Props = {
  title: string;
  subtitle: string;
  initial?: string[];
  /** Saves the selection; throw to keep the user on the step. */
  onSave: (codes: ExpertiseCode[]) => Promise<void>;
  onSignOut: () => void;
};

/** One onboarding step: pick categories, continue. Sign out is always available. */
export function OnboardingStep({ title, subtitle, initial = [], onSave, onSignOut }: Props): React.JSX.Element {
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
            title="Continue"
            onPress={() => void onContinue()}
            loading={saving}
            disabled={selected.length === 0}
          />
          <Button title="Sign out" variant="ghost" onPress={onSignOut} disabled={saving} />
        </>
      }
    >
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      <AppText tone="secondary" style={styles.subtitle}>
        {subtitle}
      </AppText>
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
  title: {
    marginTop: Spacing.large,
  },
  subtitle: {
    marginTop: Spacing.small,
    marginBottom: Spacing.large,
  },
  error: {
    marginTop: Spacing.medium,
  },
});
