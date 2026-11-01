import React from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MaxFontScale, Radii, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import type { SetRow } from '../app/utils/sets';
import { AppText } from './AppText';
import { Button } from './Button';

const MAX_SETS = 50;

type Props = {
  rows: SetRow[];
  onChange: (rows: SetRow[]) => void;
};

/** Editable table of sets (reps x kg). "Add set" copies the previous set to speed up logging. */
export function SetEditor({ rows, onChange }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const update = (index: number, key: keyof SetRow, value: string): void => {
    onChange(rows.map((r, i) => (i === index ? { ...r, [key]: value.replace(/[^0-9.]/g, '') } : r)));
  };

  return (
    <View>
      {rows.length > 0 ? (
        <View style={styles.headRow}>
          <View style={styles.setLabel} />
          <AppText variant="caption" tone="muted" center style={styles.flex}>
            Reps
          </AppText>
          <View style={styles.times} />
          <AppText variant="caption" tone="muted" center style={styles.flex}>
            Weight (kg)
          </AppText>
          <View style={styles.remove} />
        </View>
      ) : null}
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.setLabel}>
            <View style={styles.setNumber}>
              <AppText variant="label" tone="brand">
                {index + 1}
              </AppText>
            </View>
          </View>
          <TextInput
            value={row.reps}
            onChangeText={(v) => update(index, 'reps', v)}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.tint}
            maxFontSizeMultiplier={MaxFontScale}
            accessibilityLabel={`Set ${index + 1} reps`}
            style={styles.input}
            maxLength={4}
          />
          <View style={styles.times}>
            <Ionicons name="close" size={14} color={colors.textMuted} />
          </View>
          <TextInput
            value={row.weight}
            onChangeText={(v) => update(index, 'weight', v)}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.tint}
            maxFontSizeMultiplier={MaxFontScale}
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
            <Ionicons name="remove-circle-outline" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}
      <Button
        title="Add set"
        variant="secondary"
        icon="add"
        disabled={rows.length >= MAX_SETS}
        onPress={() => onChange([...rows, rows.length ? { ...rows[rows.length - 1] } : { reps: '', weight: '' }])}
        style={styles.add}
      />
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    headRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.small,
    },
    flex: {
      flex: 1,
    },
    setLabel: {
      width: 40,
    },
    setNumber: {
      width: 30,
      height: 30,
      borderRadius: Radii.pill,
      backgroundColor: colors.tintSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    times: {
      width: 24,
      alignItems: 'center',
    },
    input: {
      flex: 1,
      minWidth: 0,
      minHeight: TouchTarget,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: Radii.md,
      backgroundColor: colors.surface,
      paddingHorizontal: Spacing.small,
      fontSize: 17,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
      color: colors.text,
      textAlign: 'center',
      ...Platform.select({ web: { outlineStyle: 'none' } as object, default: {} }),
    },
    remove: {
      width: 40,
      alignItems: 'center',
    },
    add: {
      marginTop: Spacing.xs,
    },
  });
