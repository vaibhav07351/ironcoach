import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing } from '@/constants/theme';
import { useTheme } from '../app/contexts/ThemeContext';
import { AppText, type TextTone } from './AppText';
import { Card } from './Card';

type Props = {
  title: string;
  subtitle?: string;
  subtitleTone?: TextTone;
  /** Shown at the left: an Avatar or IconBadge. */
  leading?: ReactNode;
  /** Shown at the right (an amount, a badge, a button). Replaces the chevron. */
  right?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** A row card: something to identify it, one or two lines of text, and what tapping does. */
export function ListRow({
  title,
  subtitle,
  subtitleTone = 'secondary',
  leading,
  right,
  onPress,
  accessibilityLabel,
  style,
}: Props): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={accessibilityLabel ?? title} style={[styles.card, style]}>
      <View style={styles.row}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <View style={styles.body}>
          <AppText variant="subheading" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" tone={subtitleTone} numberOfLines={2} style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null)}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.small + 2,
    paddingVertical: Spacing.small + 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leading: {
    marginRight: Spacing.small + 4,
  },
  body: {
    flex: 1,
    minWidth: 0,
    marginRight: Spacing.small,
  },
  subtitle: {
    marginTop: 2,
  },
});
