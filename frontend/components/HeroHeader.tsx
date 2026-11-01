import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Radii, Spacing } from '@/constants/theme';
import { useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { useLightStatusBar } from '../app/hooks/useLightStatusBar';
import { AppText } from './AppText';

type Props = {
  title: string;
  subtitle?: string;
  /** Shown at the top right (e.g. an avatar or icon button). */
  accessory?: ReactNode;
  /** Shown under the title (e.g. stat tiles). */
  children?: ReactNode;
};

/**
 * The navy block at the top of a home screen. It runs under the status bar, and a navy strip above
 * it fills the iOS overscroll gap so pulling down never shows a white seam.
 */
export function HeroHeader({ title, subtitle, accessory, children }: Props): React.JSX.Element {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  useLightStatusBar();

  return (
    <View style={[styles.hero, { paddingTop: insets.top + Spacing.medium }]}>
      <View style={styles.overscroll} />
      <Animated.View entering={FadeInDown.duration(420)} style={styles.titleRow}>
        <View style={styles.titles}>
          <AppText variant="largeTitle" tone="onBrand" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText tone="onBrandMuted" style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {accessory}
      </Animated.View>
      {children ? (
        <Animated.View entering={FadeInDown.duration(420).delay(80)} style={styles.children}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    hero: {
      backgroundColor: colors.brand,
      paddingHorizontal: Spacing.medium + 4,
      paddingBottom: Spacing.large,
      borderBottomLeftRadius: Radii.xl,
      borderBottomRightRadius: Radii.xl,
    },
    overscroll: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: -600,
      height: 600,
      backgroundColor: colors.brand,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    titles: {
      flex: 1,
      minWidth: 0,
    },
    subtitle: {
      marginTop: Spacing.xs,
    },
    children: {
      marginTop: Spacing.large,
    },
  });
