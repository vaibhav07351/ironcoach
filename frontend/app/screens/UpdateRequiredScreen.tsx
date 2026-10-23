import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { config } from '../config';

/** Blocking screen shown when this app version is no longer supported by the server. */
export default function UpdateRequiredScreen(): React.JSX.Element {
  return (
    <Screen noHeader contentStyle={styles.content}>
      <Ionicons name="cloud-download-outline" size={56} color={Colors.primary} style={styles.icon} />
      <AppText variant="title" center>
        Update needed
      </AppText>
      <AppText tone="secondary" center style={styles.body}>
        This version of TrainerNearMe is no longer supported. Please update to keep using the app.
      </AppText>
      <Button title="Update on Google Play" onPress={() => void Linking.openURL(config.playStoreUrl)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  icon: {
    alignSelf: 'center',
    marginBottom: Spacing.medium,
  },
  body: {
    marginTop: Spacing.small,
    marginBottom: Spacing.large,
  },
});
