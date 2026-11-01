import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { Skeleton } from './Skeleton';

const ROWS = [0, 1, 2, 3];

/**
 * Placeholder shapes in the layout most screens take (a summary block, then rows), so loading
 * feels like the content arriving rather than a wait.
 */
export function LoadingState(): React.JSX.Element {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <Skeleton height={112} radius={Radii.lg} style={styles.block} />
      <Skeleton width="40%" height={18} style={styles.heading} />
      {ROWS.map((i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={44} height={44} radius={Radii.pill} />
          <View style={styles.lines}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="35%" height={12} style={styles.line2} />
          </View>
        </View>
      ))}
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      padding: Spacing.medium,
    },
    block: {
      marginBottom: Spacing.large,
    },
    heading: {
      marginBottom: Spacing.medium,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.medium,
    },
    lines: {
      flex: 1,
      marginLeft: Spacing.medium,
    },
    line2: {
      marginTop: Spacing.small,
    },
  });
