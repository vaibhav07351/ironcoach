import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radii, Spacing, TouchTarget } from '@/constants/theme';
import { AppText } from './AppText';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Plain label, or custom content (e.g. text with links). */
  label: string | ReactNode;
  accessibilityLabel?: string;
};

/** A labelled checkbox; the whole row is the touch target. */
export function Checkbox({ checked, onChange, label, accessibilityLabel }: Props): React.JSX.Element {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel ?? (typeof label === 'string' ? label : undefined)}
      style={styles.row}
    >
      <View style={[styles.box, checked ? styles.boxChecked : null]}>
        {checked ? <Ionicons name="checkmark" size={18} color={Colors.textOnPrimary} /> : null}
      </View>
      <View style={styles.label}>{typeof label === 'string' ? <AppText>{label}</AppText> : label}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TouchTarget,
    paddingVertical: Spacing.xs,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: Radii.sm / 2,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.medium,
    backgroundColor: Colors.surface,
  },
  boxChecked: {
    backgroundColor: Colors.primary,
  },
  label: {
    flex: 1,
    minWidth: 0,
  },
});
