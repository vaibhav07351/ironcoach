import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { formatRupees } from '../app/utils/money';
import { longDateLabel } from '../app/utils/date';
import type { FeePackage } from '../app/types/fees';
import { AppText } from './AppText';
import { Card } from './Card';

type Props = {
  pkg: FeePackage;
  /** Shown to trainers only. */
  onDelete?: () => void;
};

const STATUS_LABEL: Record<FeePackage['status'], string> = {
  active: 'Active',
  used_up: 'Used up',
  expired: 'Ended',
};

/** What was sold to the client and how much of it is used. */
export function PackageCard({ pkg, onDelete }: Props): React.JSX.Element {
  const isSessions = pkg.kind === 'sessions';
  const usage = isSessions
    ? `${pkg.sessions_used} of ${pkg.sessions ?? 0} sessions used, ${pkg.sessions_left} left`
    : `${longDateLabel(pkg.start_date)} to ${longDateLabel(pkg.end_date ?? pkg.start_date)}, ${pkg.attended} sessions attended`;

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <AppText variant="subheading" numberOfLines={1}>
            {pkg.name}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {usage}
          </AppText>
        </View>
        <View style={styles.right}>
          <AppText variant="subheading">{formatRupees(pkg.amount_paise)}</AppText>
          <View style={[styles.badge, pkg.status === 'active' ? styles.badgeActive : styles.badgeDone]}>
            <AppText variant="caption" tone={pkg.status === 'active' ? 'success' : 'secondary'}>
              {STATUS_LABEL[pkg.status]}
            </AppText>
          </View>
        </View>
        {onDelete ? (
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={`Delete package ${pkg.name}`}
            hitSlop={10}
            style={styles.delete}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.small,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: Spacing.small,
  },
  badge: {
    paddingHorizontal: Spacing.small,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    marginTop: Spacing.xs,
  },
  badgeActive: {
    backgroundColor: Colors.activeCard,
  },
  badgeDone: {
    backgroundColor: Colors.backgroundAlt,
  },
  delete: {
    marginLeft: Spacing.medium,
  },
});
