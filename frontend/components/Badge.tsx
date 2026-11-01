import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '../app/contexts/ThemeContext';
import { AppText } from './AppText';

export type BadgeTone = 'neutral' | 'brand' | 'accent' | 'success' | 'danger' | 'warning';

type Props = {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
};

/** A small status pill (Active, 3 due, Used up). */
export function Badge({ label, tone = 'neutral', style }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const [bg, fg] = {
    neutral: [colors.surfaceMuted, colors.textSecondary],
    brand: [colors.tintSoft, colors.tint],
    accent: [colors.accentSoft, colors.onAccentSoft],
    success: [colors.successSoft, colors.success],
    danger: [colors.dangerSoft, colors.danger],
    warning: [colors.warningSoft, colors.warning],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <AppText variant="caption" numberOfLines={1} style={[styles.text, { color: fg }]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.small + 2,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  text: {
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 16,
  },
});
