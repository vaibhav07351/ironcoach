import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { PressableScale } from './PressableScale';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/** A raised surface for grouping content. Pressable (with press feedback) when `onPress` is given. */
export function Card({ children, onPress, accessibilityLabel, accessibilityHint, style }: Props): React.JSX.Element {
  const styles = useThemedStyles(makeStyles);
  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={[styles.card, style]}
      >
        {children}
      </PressableScale>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

const makeStyles = ({ colors, elevation }: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radii.lg,
      padding: Spacing.medium,
      ...elevation(1),
    },
  });
