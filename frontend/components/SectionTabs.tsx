import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { Chip } from './Chip';

export type SectionOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: SectionOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** A horizontally scrolling row of pills for switching between the sections of one screen. */
export function SectionTabs<T extends string>({ options, value, onChange }: Props<T>): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((o) => (
          <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  row: {
    paddingHorizontal: Spacing.medium,
    paddingTop: Spacing.small,
  },
});
