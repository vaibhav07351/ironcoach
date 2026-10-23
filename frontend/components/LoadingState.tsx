import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { AppText } from './AppText';

/** Centered spinner with an optional message. */
export function LoadingState({ message }: { message?: string }): React.JSX.Element {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={message ?? 'Loading'}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {message ? (
        <AppText tone="secondary" center style={styles.gap}>
          {message}
        </AppText>
      ) : null}
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
});
