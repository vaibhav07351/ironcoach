import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radii } from '@/constants/theme';
import { useTheme } from '../app/contexts/ThemeContext';

export type IconTone = 'brand' | 'accent' | 'success' | 'danger' | 'warning' | 'neutral';

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  tone?: IconTone;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** An icon on a soft tinted square: the visual anchor for empty states, banners and settings rows. */
export function IconBadge({ name, tone = 'brand', size = 44, style }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const [bg, fg] = {
    brand: [colors.tintSoft, colors.tint],
    accent: [colors.accentSoft, colors.onAccentSoft],
    success: [colors.successSoft, colors.success],
    danger: [colors.dangerSoft, colors.danger],
    warning: [colors.warningSoft, colors.warning],
    neutral: [colors.surfaceMuted, colors.textSecondary],
  }[tone];
  return (
    <View
      style={[styles.box, { width: size, height: size, borderRadius: size >= 64 ? Radii.xl : Radii.md, backgroundColor: bg }, style]}
    >
      <Ionicons name={name} size={Math.round(size * 0.48)} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
