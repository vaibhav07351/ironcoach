import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import type { ExerciseType, SetEntry } from '../app/types/workout';
import { AppText } from './AppText';
import { Card } from './Card';
import { IconButton } from './IconButton';
import { SetRowItem } from './SetRowItem';

type Props = {
  name: string;
  type: ExerciseType;
  entries: SetEntry[];
  /** Opens the exercise (Track tab for this day). Omit for read-only cards. */
  onOpen?: () => void;
  /** Edit through the old multi-exercise form (logs from before per-exercise logging). */
  onEditLegacy?: () => void;
  onDelete?: () => void;
};

/**
 * One exercise of a workout day, like a page of a gym notebook: the name, then each set.
 * The open area and the action buttons are siblings (never a button inside a button).
 */
export function ExerciseDayCard({ name, type, entries, onOpen, onEditLegacy, onDelete }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const body = (
    <>
      <View style={styles.titleRow}>
        <AppText variant="subheading" numberOfLines={1} style={styles.flex}>
          {name}
        </AppText>
        {onOpen ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
      </View>
      {entries.map((e, i) => (
        <SetRowItem key={i} index={i} type={type} entry={e} />
      ))}
    </>
  );

  return (
    <Card style={styles.card}>
      <View style={styles.actions}>
        {onEditLegacy ? <IconButton icon="create-outline" accessibilityLabel={`Edit ${name}`} onPress={onEditLegacy} /> : null}
        {onDelete ? <IconButton icon="trash-outline" tone="danger" accessibilityLabel={`Delete ${name}`} onPress={onDelete} /> : null}
      </View>
      {onOpen ? (
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`Open ${name}: add sets, history and graph`}
          style={({ pressed }) => [styles.open, pressed ? styles.pressed : null]}
        >
          {body}
        </Pressable>
      ) : (
        <View style={styles.open}>{body}</View>
      )}
    </Card>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    card: {
      marginBottom: Spacing.small + 4,
      paddingTop: Spacing.small,
      paddingBottom: Spacing.xs,
      paddingHorizontal: Spacing.small,
    },
    actions: { position: 'absolute', top: Spacing.xs, right: Spacing.xs, flexDirection: 'row', zIndex: 1 },
    open: { borderRadius: 12 },
    pressed: { opacity: 0.7 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
      paddingLeft: Spacing.small,
      paddingRight: 96,
      paddingBottom: Spacing.small,
      borderBottomWidth: 2,
      borderBottomColor: colors.tint,
      gap: Spacing.xs,
    },
    flex: { flexShrink: 1 },
  });
