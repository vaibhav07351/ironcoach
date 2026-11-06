import React from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MaxFontScale, Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { formatNumber } from '../app/utils/exerciseFormat';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type Props = {
  label: string;
  /** The typed text (kept as text so "7." can be typed). */
  value: string;
  onChange: (value: string) => void;
  step: number;
  min?: number;
  max: number;
  /** Whole numbers only (reps). */
  integer?: boolean;
  /** Spoken unit for screen readers, e.g. "kilograms". */
  unitLabel?: string;
};

/**
 * A big "- value +" number input, sized for one-handed use between sets. The buttons step by
 * `step`; the field can also be typed into.
 */
export function Stepper({ label, value, onChange, step, min = 0, max, integer = false, unitLabel }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const current = Number(value);
  const base = Number.isFinite(current) ? current : 0;

  const bump = (dir: 1 | -1): void => {
    const next = Math.min(max, Math.max(min, Math.round((base + dir * step) * 100) / 100));
    onChange(integer ? String(Math.round(next)) : formatNumber(next, 2));
  };

  const clean = (text: string): string => {
    const allowed = integer ? text.replace(/[^0-9]/g, '') : text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    return allowed.slice(0, 7);
  };

  return (
    <View style={styles.block}>
      <AppText variant="label" tone="secondary" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.row}>
        <PressableScale
          onPress={() => bump(-1)}
          haptic="tap"
          disabled={base <= min}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label} by ${step}`}
          style={[styles.button, base <= min ? styles.disabled : null]}
        >
          <Ionicons name="remove" size={28} color={colors.tint} />
        </PressableScale>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(clean(t))}
          keyboardType={integer ? 'number-pad' : 'decimal-pad'}
          selectTextOnFocus
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.tint}
          maxFontSizeMultiplier={MaxFontScale}
          accessibilityLabel={unitLabel ? `${label} in ${unitLabel}` : label}
          style={styles.input}
        />
        <PressableScale
          onPress={() => bump(1)}
          haptic="tap"
          disabled={base >= max}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label} by ${step}`}
          style={[styles.button, base >= max ? styles.disabled : null]}
        >
          <Ionicons name="add" size={28} color={colors.tint} />
        </PressableScale>
      </View>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    block: { marginBottom: Spacing.medium },
    label: { marginBottom: Spacing.xs + 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.small },
    button: {
      width: 64,
      height: 64,
      borderRadius: Radii.md,
      backgroundColor: colors.tintSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabled: { opacity: 0.4 },
    input: {
      flex: 1,
      minWidth: 0,
      height: 64,
      borderRadius: Radii.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 32,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      textAlign: 'center',
      ...Platform.select({ web: { outlineStyle: 'none' } as object, default: {} }),
    },
  });
