import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import { AppText } from './AppText';
import { Button } from './Button';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Shown when a list or section has nothing yet; says what to do next. */
export function EmptyState({ icon = 'leaf-outline', title, message, actionLabel, onAction }: Props): React.JSX.Element {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={40} color={Colors.textMuted} />
      <AppText variant="subheading" center style={styles.gap}>
        {title}
      </AppText>
      {message ? (
        <AppText tone="secondary" center style={styles.smallGap}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.large,
    minHeight: 240,
  },
  gap: {
    marginTop: Spacing.medium,
  },
  smallGap: {
    marginTop: Spacing.small,
  },
  action: {
    marginTop: Spacing.large,
    alignSelf: 'stretch',
  },
});
