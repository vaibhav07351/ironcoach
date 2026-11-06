import React from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { MaxFontScale, Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { AppText } from './AppText';

export type DurationParts = { h: string; m: string; s: string };

type Props = {
  label: string;
  value: DurationParts;
  onChange: (value: DurationParts) => void;
  /** Hide the hours box (short holds like a plank). */
  hideHours?: boolean;
};

const PARTS: { key: keyof DurationParts; placeholder: string; spoken: string }[] = [
  { key: 'h', placeholder: 'hh', spoken: 'hours' },
  { key: 'm', placeholder: 'mm', spoken: 'minutes' },
  { key: 's', placeholder: 'ss', spoken: 'seconds' },
];

/** Hours, minutes and seconds boxes for a time. */
export function DurationInput({ label, value, onChange, hideHours = false }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const parts = hideHours ? PARTS.slice(1) : PARTS;

  return (
    <View style={styles.block}>
      <AppText variant="label" tone="secondary" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.row}>
        {parts.map((p, i) => (
          <React.Fragment key={p.key}>
            {i > 0 ? (
              <AppText variant="heading" tone="muted">
                :
              </AppText>
            ) : null}
            <TextInput
              value={value[p.key]}
              onChangeText={(t) => onChange({ ...value, [p.key]: t.replace(/[^0-9]/g, '').slice(0, p.key === 'h' ? 2 : 2) })}
              keyboardType="number-pad"
              placeholder={p.placeholder}
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.tint}
              selectTextOnFocus
              maxFontSizeMultiplier={MaxFontScale}
              accessibilityLabel={`${label} ${p.spoken}`}
              style={styles.input}
            />
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    block: { marginBottom: Spacing.medium },
    label: { marginBottom: Spacing.xs + 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.small },
    input: {
      flex: 1,
      minWidth: 0,
      height: 64,
      borderRadius: Radii.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 28,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      textAlign: 'center',
      ...Platform.select({ web: { outlineStyle: 'none' } as object, default: {} }),
    },
  });
