import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radii, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import type { ExerciseType, SetEntry } from '../app/types/workout';
import { formatDistance, formatDuration, formatNumber, formatPace, paceOf } from '../app/utils/exerciseFormat';
import { AppText } from './AppText';

type Props = {
  index: number;
  type: ExerciseType;
  entry: SetEntry;
  pr?: boolean;
  selected?: boolean;
  onPress?: () => void;
};

/** One number with its unit, e.g. "100 kg"; `sub` is a small line under it (a pace). */
type Cell = { value: string; unit?: string; sub?: string };

/** The two columns of a set, laid out like a gym notebook: "100 kg   8 reps". */
function cells(type: ExerciseType, e: SetEntry): [Cell, Cell] {
  switch (type) {
    case 'reps':
      return [e.weight_kg > 0 ? { value: `+${formatNumber(e.weight_kg)}`, unit: 'kg' } : { value: '' }, { value: String(e.reps), unit: 'reps' }];
    case 'distance_time': {
      const [distance, unit] = e.distance_m ? formatDistance(e.distance_m).split(' ') : ['', ''];
      const pace = paceOf(e);
      return [
        { value: distance, unit: unit || undefined },
        { value: e.duration_s ? formatDuration(e.duration_s) : '', sub: pace ? formatPace(pace) : undefined },
      ];
    }
    case 'time':
      return [{ value: '' }, { value: formatDuration(e.duration_s ?? 0) }];
    default:
      return [
        { value: formatNumber(e.weight_kg), unit: 'kg' },
        { value: String(e.reps), unit: 'reps' },
      ];
  }
}

const spokenCell = (c: Cell): string => [c.value, c.unit, c.sub].filter(Boolean).join(' ');

/** One set in a list: number, values, note and PR markers. Tappable when `onPress` is given. */
export function SetRowItem({ index, type, entry, pr = false, selected = false, onPress }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [a, b] = cells(type, entry);
  const spoken = `Set ${index + 1}: ${[spokenCell(a), spokenCell(b)].filter(Boolean).join(', ')}${pr ? ', personal record' : ''}${entry.note ? `, note: ${entry.note}` : ''}`;

  const renderCell = (c: Cell): React.JSX.Element => (
    <View style={styles.cell}>
      <View style={styles.valueRow}>
        <AppText variant="subheading" style={styles.value}>
          {c.value}
        </AppText>
        {c.unit && c.value ? (
          <AppText variant="caption" tone="secondary" style={styles.unit}>
            {c.unit}
          </AppText>
        ) : null}
      </View>
      {c.sub ? (
        <AppText variant="caption" tone="secondary" style={styles.value}>
          {c.sub}
        </AppText>
      ) : null}
    </View>
  );

  const content = (
    <>
      <View style={styles.markers}>
        {entry.note ? <Ionicons name="chatbox-ellipses" size={18} color={colors.textMuted} /> : null}
        {pr ? <Ionicons name="trophy" size={18} color={colors.onAccentSoft} /> : null}
      </View>
      <AppText variant="label" tone="muted" style={styles.index}>
        {index + 1}
      </AppText>
      {renderCell(a)}
      {renderCell(b)}
    </>
  );

  // Read-only rows (history, day view) are plain views so taps reach whatever wraps them.
  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={spoken}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${spoken}. Tap to edit.`}
      style={({ pressed }) => [styles.row, styles.tappable, selected ? styles.selected : null, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: TouchTarget,
      paddingHorizontal: Spacing.small,
      paddingVertical: Spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
    },
    tappable: { minHeight: TouchTarget + 8 },
    selected: { backgroundColor: colors.tintSoft, borderRadius: Radii.md, borderBottomColor: 'transparent' },
    pressed: { backgroundColor: colors.surfaceMuted },
    markers: { width: 44, flexDirection: 'row', gap: 4 },
    index: { width: 28, fontVariant: ['tabular-nums'] },
    cell: { flex: 1, alignItems: 'flex-end' },
    valueRow: { flexDirection: 'row', alignItems: 'baseline' },
    value: { fontVariant: ['tabular-nums'] },
    unit: { marginLeft: 4, minWidth: 26 },
  });
