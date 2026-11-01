import React from 'react';
import { Linking, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconBadge } from '@/components/IconBadge';
import { Screen } from '@/components/Screen';
import { Spacing } from '@/constants/theme';
import { config } from '../config';

/** Blocking screen shown when this app version is no longer supported by the server. */
export default function UpdateRequiredScreen(): React.JSX.Element {
  return (
    <Screen noHeader contentStyle={styles.content}>
      <IconBadge name="cloud-download-outline" size={88} style={styles.icon} />
      <AppText variant="title" center accessibilityRole="header">
        Time to update
      </AppText>
      <AppText tone="secondary" center style={styles.body}>
        This version of TrainerNearMe is no longer supported. Update from Google Play to keep going; your data is
        safe.
      </AppText>
      <Button title="Update on Google Play" icon="logo-google-playstore" onPress={() => void Linking.openURL(config.playStoreUrl)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.large,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: Spacing.large,
  },
  body: {
    marginTop: Spacing.small,
    marginBottom: Spacing.xl,
  },
});
