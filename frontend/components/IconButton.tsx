import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radii, TouchTarget } from '@/constants/theme';
import { useTheme } from '../app/contexts/ThemeContext';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  /** What the button does, read by screen readers (the icon has no visible label). */
  accessibilityLabel: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A compact icon-only action for rows (edit, delete), with a full-size touch target. */
export function IconButton({ icon, accessibilityLabel, onPress, tone = 'default', disabled, style }: Props): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        pressed ? { backgroundColor: colors.surfaceMuted } : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Ionicons name={icon} size={20} color={tone === 'danger' ? colors.danger : colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: TouchTarget - 8,
    height: TouchTarget - 8,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
