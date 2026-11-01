import React from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radii, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

/**
 * primary: gold, the one main action on a screen. secondary: tinted, supporting actions.
 * ghost: text only. danger: destructive. onBrand: solid, for use on hero blocks (navy in light,
 * white in dark).
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'onBrand';
type Size = 'regular' | 'small';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and blocks presses (prevents double submits). The button keeps its width. */
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'regular',
  loading = false,
  disabled = false,
  icon,
  style,
  accessibilityHint,
}: Props): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const fg = foreground(variant, colors);
  const inactive = disabled || loading;
  const small = size === 'small';

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      haptic={variant === 'primary' || variant === 'danger' ? 'tap' : undefined}
      hitSlop={small ? 6 : undefined}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[styles.base, small ? styles.small : null, styles[variant], disabled && !loading ? styles.disabled : null, style]}
    >
      <View style={[styles.row, loading ? styles.hidden : null]}>
        {icon ? <Ionicons name={icon} size={small ? 16 : 19} color={fg} style={styles.icon} /> : null}
        <AppText variant="label" numberOfLines={1} style={[small ? styles.labelSmall : styles.label, { color: fg }]}>
          {title}
        </AppText>
      </View>
      {loading ? <ActivityIndicator color={fg} style={StyleSheet.absoluteFill} /> : null}
    </PressableScale>
  );
}

function foreground(variant: Variant, colors: Theme['colors']): string {
  switch (variant) {
    case 'primary':
      return colors.onAccent;
    case 'secondary':
    case 'ghost':
      return colors.tint;
    case 'danger':
      return colors.onDanger;
    case 'onBrand':
      return colors.onBrandAction;
  }
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: 52,
      borderRadius: Radii.md,
      paddingHorizontal: Spacing.large,
      alignItems: 'center',
      justifyContent: 'center',
    },
    small: {
      minHeight: 36,
      paddingHorizontal: Spacing.medium,
      borderRadius: Radii.sm,
    },
    primary: {
      backgroundColor: colors.accent,
    },
    secondary: {
      backgroundColor: colors.tintSoft,
    },
    ghost: {
      backgroundColor: 'transparent',
      minHeight: TouchTarget,
    },
    danger: {
      backgroundColor: colors.danger,
    },
    onBrand: {
      backgroundColor: colors.brandAction,
    },
    disabled: {
      opacity: 0.45,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    hidden: {
      opacity: 0,
    },
    icon: {
      marginRight: Spacing.small,
    },
    label: {
      fontSize: 16,
      fontWeight: '700',
    },
    labelSmall: {
      fontSize: 14,
      fontWeight: '700',
    },
  });
