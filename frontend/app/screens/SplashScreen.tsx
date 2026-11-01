import React from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useLightStatusBar } from '../hooks/useLightStatusBar';

/** The native splash color (app.config.js); the same in both themes. */
const SPLASH_NAVY = '#07173D';

/**
 * Shown while the saved session is restored. Mirrors the native splash (same logo, same navy), so
 * the hand-off from the OS splash to the app is invisible.
 */
export default function SplashScreen(): React.JSX.Element {
  useLightStatusBar();
  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel="Loading TrainerNearMe">
      <Image
        source={require('../../assets/images/trainernearme-logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessible={false}
      />
      <ActivityIndicator color="rgba(255, 255, 255, 0.7)" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SPLASH_NAVY,
  },
  logo: {
    width: 240,
    height: 240,
  },
  spinner: {
    position: 'absolute',
    bottom: Spacing.xxl + Spacing.xl,
  },
});
