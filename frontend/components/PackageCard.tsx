import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { formatRupees } from '../app/utils/money';
import { longDateLabel } from '../app/utils/date';
import type { FeePackage } from '../app/types/fees';
import { AppText } from './AppText';
import { Badge, type BadgeTone } from './Badge';
import { Card } from './Card';

type Props = {
  pkg: FeePackage;
  /** Shown to trainers only. */
  onDelete?: () => void;
};

const STATUS: Record<FeePackage['status'], { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  used_up: { label: 'Used up', tone: 'neutral' },
  expired: { label: 'Ended', tone: 'neutral' },
};

/** What was sold to the client and how much of it is used. */
export function PackageCard({ pkg, onDelete }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isSessions = pkg.kind === 'sessions';
  const total = pkg.sessions ?? 0;
  const usage = isSessions
    ? `${pkg.sessions_used} of ${total} sessions used, ${pkg.sessions_left} left`
    : `${longDateLabel(pkg.start_date)} to ${longDateLabel(pkg.end_date ?? pkg.start_date)}, ${pkg.attended} sessions attended`;
  const progress = isSessions && total > 0 ? Math.min(1, pkg.sessions_used / total) : null;
  const status = STATUS[pkg.status];

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <AppText variant="subheading" numberOfLines={1}>
            {pkg.name}
          </AppText>
          <Badge label={status.label} tone={status.tone} style={styles.badge} />
        </View>
        <AppText variant="subheading" style={styles.amount}>
          {formatRupees(pkg.amount_paise)}
        </AppText>
        {onDelete ? (
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={`Delete package ${pkg.name}`}
            hitSlop={10}
            style={styles.delete}
          >
            <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {progress !== null ? (
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: total, now: pkg.sessions_used }}
        >
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      ) : null}
      <AppText variant="caption" tone="secondary" style={styles.usage}>
        {usage}
      </AppText>
    </Card>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    card: {
      marginBottom: Spacing.small + 2,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    flex: {
      flex: 1,
      minWidth: 0,
    },
    badge: {
      marginTop: Spacing.xs + 2,
    },
    amount: {
      marginLeft: Spacing.small,
      fontVariant: ['tabular-nums'],
    },
    delete: {
      marginLeft: Spacing.medium,
      marginTop: 2,
    },
    track: {
      height: 6,
      borderRadius: Radii.pill,
      backgroundColor: colors.surfaceMuted,
      marginTop: Spacing.small + 4,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: Radii.pill,
      backgroundColor: colors.tint,
    },
    usage: {
      marginTop: Spacing.small,
    },
  });
