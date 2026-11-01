import React, { type ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Spacing, webScrollFix } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';

type Props = {
  children: ReactNode;
  /** Scrollable content (default). Use false when the screen owns a FlatList. */
  scroll?: boolean;
  /** Apply horizontal and vertical padding (default true). */
  padded?: boolean;
  /** Set when the screen has no navigation header so content clears the status bar. */
  noHeader?: boolean;
  /** Set when the first child is a HeroHeader, which handles the status bar area itself. */
  hero?: boolean;
  /** Pull-to-refresh. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Pinned below the content (e.g. a primary action button). */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * The one screen wrapper: safe area, background, scrolling that keeps taps on buttons while the
 * keyboard is open, extra bottom space so the last field can scroll above the keyboard, and an
 * optional pinned footer. Keyboard avoidance itself is applied by the navigator.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  noHeader = false,
  hero = false,
  refreshing,
  onRefresh,
  footer,
  contentStyle,
}: Props): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const edges: Edge[] = noHeader && !hero ? ['top', 'left', 'right'] : ['left', 'right'];
  const padding = padded ? styles.padded : undefined;

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView
          style={webScrollFix}
          contentContainerStyle={[padding, styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={hero ? colors.onBrand : colors.tint}
                colors={[colors.tint]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, padding, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      paddingBottom: Platform.OS === 'web' ? Spacing.xl : 120,
    },
    fill: {
      flex: 1,
      minHeight: 0,
    },
    padded: {
      paddingHorizontal: Spacing.medium,
      paddingTop: Spacing.medium,
    },
    footer: {
      paddingHorizontal: Spacing.medium,
      paddingTop: Spacing.small + Spacing.xs,
      paddingBottom: Spacing.medium,
      backgroundColor: colors.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
      gap: Spacing.xs,
    },
  });
