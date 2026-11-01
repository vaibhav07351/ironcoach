import React from 'react';
import { Platform, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '../app/contexts/ThemeContext';
import { haptic } from '../app/utils/haptics';
import { AppText } from './AppText';

type Props = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  hint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A label with a themed on/off switch; the label is the switch's accessible name. */
export function SwitchRow({ label, value, onValueChange, hint, disabled, style }: Props): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, style]}>
      <View style={styles.text}>
        <AppText>{label}</AppText>
        {hint ? (
          <AppText variant="caption" tone="secondary">
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          haptic('select');
          onValueChange(v);
        }}
        accessibilityLabel={label}
        trackColor={{ true: colors.tint, false: colors.border }}
        thumbColor={Platform.OS === 'android' ? (value ? colors.accent : colors.surface) : undefined}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: Spacing.small,
  },
  text: {
    flex: 1,
    minWidth: 0,
    marginRight: Spacing.small + 4,
  },
});
