import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing } from '@/constants/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { IconBadge } from './IconBadge';

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
      <IconBadge name={icon} size={72} />
      <AppText variant="heading" center style={styles.title}>
        {title}
      </AppText>
      {message ? (
        <AppText tone="secondary" center style={styles.message}>
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
    paddingHorizontal: Spacing.large,
    paddingVertical: Spacing.xl,
    minHeight: 260,
  },
  title: {
    marginTop: Spacing.large,
  },
  message: {
    marginTop: Spacing.small,
    maxWidth: 320,
  },
  action: {
    marginTop: Spacing.large,
    alignSelf: 'stretch',
  },
});
