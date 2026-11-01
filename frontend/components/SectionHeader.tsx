import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { AppText } from './AppText';

type Props = {
  title: string;
  /** Shown at the right: a count badge, an amount, a link. */
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Heading for a group of rows. More space above than below, so it belongs to what follows. */
export function SectionHeader({ title, right, style }: Props): React.JSX.Element {
  return (
    <View style={[styles.row, style]} accessibilityRole="header">
      <AppText variant="heading" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.large,
    marginBottom: Spacing.small + 4,
  },
  title: {
    flex: 1,
    minWidth: 0,
    marginRight: Spacing.small,
  },
});
