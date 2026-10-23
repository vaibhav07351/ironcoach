import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { AppText, type TextTone } from './AppText';
import { Card } from './Card';

type Props = {
  title: string;
  subtitle?: string;
  subtitleTone?: TextTone;
  /** Shown on the right (an amount, a button). */
  right?: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
};

/** A tappable row for the Today lists: a name, one line of detail and something on the right. */
export function TodayRow({ title, subtitle, subtitleTone = 'secondary', right, onPress, accessibilityLabel }: Props): React.JSX.Element {
  return (
    <Card onPress={onPress} accessibilityLabel={accessibilityLabel} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.body}>
          <AppText variant="subheading" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" tone={subtitleTone} numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {right}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.small,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    marginRight: Spacing.small,
  },
});
