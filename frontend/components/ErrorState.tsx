import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { AppText } from './AppText';
import { Button } from './Button';
import { IconBadge } from './IconBadge';

type Props = {
  message: string;
  onRetry?: () => void;
};

/** Shown when loading failed: what happened and, when possible, a way to try again. */
export function ErrorState({ message, onRetry }: Props): React.JSX.Element {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.center} accessibilityRole="alert">
      <IconBadge name="cloud-offline-outline" tone="danger" size={72} />
      <AppText variant="heading" center style={styles.title}>
        Could not load this
      </AppText>
      <AppText tone="secondary" center style={styles.message}>
        {message}
      </AppText>
      {onRetry ? (
        <Button title="Try again" icon="refresh" variant="secondary" onPress={onRetry} style={styles.action} />
      ) : null}
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.large,
      paddingVertical: Spacing.xl,
      minHeight: 260,
      backgroundColor: colors.bg,
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
