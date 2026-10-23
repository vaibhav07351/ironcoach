import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import { AppText } from './AppText';
import { Button } from './Button';

type Props = {
  message: string;
  onRetry?: () => void;
};

/** Shown when loading failed; offers a retry. */
export function ErrorState({ message, onRetry }: Props): React.JSX.Element {
  return (
    <View style={styles.center} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={40} color={Colors.error} />
      <AppText variant="subheading" center style={styles.gap}>
        Could not load this
      </AppText>
      <AppText tone="secondary" center style={styles.smallGap}>
        {message}
      </AppText>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} style={styles.action} /> : null}
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
