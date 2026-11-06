import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ACTIVITY_OPTIONS } from '../app/constants/expertise';
import { Chip } from './Chip';

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
};

/** Multi-select chips for what a client trains (gym, cardio, swimming...), in the order picked. */
export function ActivityPicker({ value, onChange }: Props): React.JSX.Element {
  const toggle = (code: string): void => {
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
  };
  return (
    <View style={styles.chips}>
      {ACTIVITY_OPTIONS.map((o) => (
        <Chip key={o.code} label={o.label} selected={value.includes(o.code)} onPress={() => toggle(o.code)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.small },
});
