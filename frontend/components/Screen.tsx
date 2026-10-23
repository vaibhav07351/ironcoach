import React, { type ReactNode } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';

type Props = {
  children: ReactNode;
  /** Scrollable content (default). Use false when the screen owns a FlatList. */
  scroll?: boolean;
  /** Apply horizontal and vertical padding (default true). */
  padded?: boolean;
  /** Set when the screen has no navigation header so content clears the status bar. */
  noHeader?: boolean;
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
  refreshing,
  onRefresh,
  footer,
  contentStyle,
}: Props): React.JSX.Element {
  const edges: Edge[] = noHeader ? ['top', 'left', 'right'] : ['left', 'right'];
  const padding = padded ? styles.padded : undefined;

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[padding, styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // On web a ScrollView with only flex: 1 does not scroll; height: 0 lets flex size it.
  scroll: Platform.select({ web: { flex: 1, height: 0 }, default: { flex: 1 } }),
  scrollContent: {
    paddingBottom: Platform.OS === 'web' ? Spacing.large : 120,
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
    paddingTop: Spacing.small,
    paddingBottom: Spacing.medium,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
