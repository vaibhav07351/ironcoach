import React from 'react';
import { StyleSheet, View } from 'react-native';

import { EXPERTISE_OPTIONS, type ExpertiseCode } from '../app/constants/expertise';
import { Chip } from './Chip';

type Props = {
  selected: ExpertiseCode[];
  onChange: (selected: ExpertiseCode[]) => void;
};

/** Multi-select of sports/coaching categories (shared by trainer and client onboarding). */
export function InterestPicker({ selected, onChange }: Props): React.JSX.Element {
  const toggle = (code: ExpertiseCode): void => {
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
  };
  return (
    <View style={styles.wrap}>
      {EXPERTISE_OPTIONS.map((opt) => (
        <Chip key={opt.code} label={opt.label} selected={selected.includes(opt.code)} onPress={() => toggle(opt.code)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
