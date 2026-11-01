import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

/** A selectable pill (filters, multi-select options, quick actions). */
export function Chip({ label, selected = false, onPress, icon }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const fg = selected ? colors.onTint : colors.text;
  const content = (
    <>
      {selected ? (
        <Ionicons name="checkmark" size={16} color={fg} style={styles.icon} />
      ) : icon ? (
        <Ionicons name={icon} size={16} color={colors.tint} style={styles.icon} />
      ) : null}
      <AppText variant="label" style={{ color: fg }}>
        {label}
      </AppText>
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.chip, selected ? styles.selected : null]} accessibilityRole="text" accessibilityLabel={label}>
        {content}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      haptic="select"
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      hitSlop={4}
      style={[styles.chip, selected ? styles.selected : null]}
    >
      {content}
    </PressableScale>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.medium - 2,
      minHeight: 40,
      borderRadius: Radii.pill,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginRight: Spacing.small,
      marginBottom: Spacing.small,
    },
    selected: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    icon: {
      marginRight: Spacing.xs + 2,
    },
  });
