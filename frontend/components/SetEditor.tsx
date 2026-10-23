import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radii, Spacing, TouchTarget } from '@/constants/theme';
import type { Workout } from '../app/types/workout';
import { AppText } from './AppText';
import { Button } from './Button';

/** One set as typed (strings until saved). */
export type SetRow = { reps: string; weight: string };

const MAX_SETS = 50;

/** Converts typed rows to a Workout, or returns an error message. */
export function rowsToWorkout(exercise: string, exerciseId: string | undefined, rows: SetRow[]): Workout | string {
  const filled = rows.filter((r) => r.reps.trim() !== '' || r.weight.trim() !== '');
  if (filled.length === 0) {
    return 'Add at least one set';
  }
  const reps: number[] = [];
  const weight: number[] = [];
  for (const [i, r] of filled.entries()) {
    const rep = Number(r.reps);
    const kg = r.weight.trim() === '' ? 0 : Number(r.weight);
    if (!Number.isInteger(rep) || rep < 0 || rep > 1000) return `Set ${i + 1}: reps must be a whole number`;
    if (!Number.isFinite(kg) || kg < 0 || kg > 1000) return `Set ${i + 1}: weight must be between 0 and 1000 kg`;
    reps.push(rep);
    weight.push(kg);
  }
  return { exercise, exercise_id: exerciseId, sets: reps.length, reps, weight };
}

export function workoutToRows(w: Workout): SetRow[] {
  return w.reps.map((r, i) => ({ reps: String(r), weight: String(w.weight[i] ?? 0) }));
}

type Props = {
  rows: SetRow[];
  onChange: (rows: SetRow[]) => void;
};

/** Editable table of sets (reps × kg). "Add set" copies the previous set to speed up logging. */
export function SetEditor({ rows, onChange }: Props): React.JSX.Element {
  const update = (index: number, key: keyof SetRow, value: string): void => {
    onChange(rows.map((r, i) => (i === index ? { ...r, [key]: value.replace(/[^0-9.]/g, '') } : r)));
  };

  return (
    <View>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          <AppText variant="label" tone="secondary" style={styles.setLabel}>
            Set {index + 1}
          </AppText>
          <TextInput
            value={row.reps}
            onChangeText={(v) => update(index, 'reps', v)}
            keyboardType="number-pad"
            placeholder="Reps"
            placeholderTextColor={Colors.textMuted}
            accessibilityLabel={`Set ${index + 1} reps`}
            style={styles.input}
            maxLength={4}
          />
          <AppText tone="muted">×</AppText>
          <TextInput
            value={row.weight}
            onChangeText={(v) => update(index, 'weight', v)}
            keyboardType="decimal-pad"
            placeholder="kg"
            placeholderTextColor={Colors.textMuted}
            accessibilityLabel={`Set ${index + 1} weight in kilograms`}
            style={styles.input}
            maxLength={6}
          />
          <Pressable
            onPress={() => onChange(rows.filter((_, i) => i !== index))}
            accessibilityRole="button"
            accessibilityLabel={`Remove set ${index + 1}`}
            style={styles.remove}
            hitSlop={6}
          >
            <Ionicons name="close-circle-outline" size={22} color={Colors.textMuted} />
          </Pressable>
        </View>
      ))}
      <Button
        title="Add set"
        variant="secondary"
        icon="add"
        disabled={rows.length >= MAX_SETS}
        onPress={() => onChange([...rows, rows.length ? { ...rows[rows.length - 1] } : { reps: '', weight: '' }])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.small,
    marginBottom: Spacing.small,
  },
  setLabel: {
    width: 52,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: TouchTarget,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.small,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  remove: {
    width: 32,
    alignItems: 'center',
  },
});
