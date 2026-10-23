import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { AppText } from './AppText';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

/** A selectable pill (filters, multi-select options). */
export function Chip({ label, selected = false, onPress }: Props): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'checkbox' : 'text'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.chip, selected ? styles.selected : null]}
    >
      <AppText variant="label" style={{ color: selected ? Colors.textOnPrimary : Colors.textPrimary }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: Spacing.small,
    marginBottom: Spacing.small,
  },
  selected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});
