import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, TouchTarget } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { haptic } from '../app/utils/haptics';
import { AppText } from './AppText';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Plain label, or custom content (e.g. text with links). */
  label: string | ReactNode;
  accessibilityLabel?: string;
};

/** A labelled checkbox; the whole row is the touch target. */
export function Checkbox({ checked, onChange, label, accessibilityLabel }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={() => {
        haptic('select');
        onChange(!checked);
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel ?? (typeof label === 'string' ? label : undefined)}
      style={styles.row}
    >
      <View style={[styles.box, checked ? styles.boxChecked : null]}>
        {checked ? <Ionicons name="checkmark" size={17} color={colors.onTint} /> : null}
      </View>
      <View style={styles.label}>{typeof label === 'string' ? <AppText>{label}</AppText> : label}</View>
    </Pressable>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: TouchTarget,
      paddingVertical: Spacing.xs,
    },
    box: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.medium,
      backgroundColor: colors.surface,
    },
    boxChecked: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    label: {
      flex: 1,
      minWidth: 0,
    },
  });
