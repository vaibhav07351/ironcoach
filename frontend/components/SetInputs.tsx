import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { ExerciseType } from '../app/types/workout';
import type { DistanceUnit, SetDraft } from '../app/utils/setDraft';
import { DurationInput } from './DurationInput';
import { SegmentedControl } from './SegmentedControl';
import { Stepper } from './Stepper';
import { TextField } from './TextField';

type Props = {
  type: ExerciseType;
  draft: SetDraft;
  onChange: (draft: SetDraft) => void;
};

const WEIGHT_STEP_KG = 2.5;

const DISTANCE_UNITS: { value: DistanceUnit; label: string }[] = [
  { value: 'km', label: 'km' },
  { value: 'm', label: 'm' },
];

/** The inputs for one set, chosen by exercise type. */
export function SetInputs({ type, draft, onChange }: Props): React.JSX.Element {
  const set = <K extends keyof SetDraft>(key: K, value: SetDraft[K]): void => onChange({ ...draft, [key]: value });

  if (type === 'distance_time') {
    return (
      <View>
        <View style={styles.distanceRow}>
          <View style={styles.flex}>
            <TextField
              label={`Distance (${draft.distanceUnit})`}
              value={draft.distance}
              onChangeText={(t) => set('distance', t.replace(/[^0-9.]/g, '').slice(0, 7))}
              keyboardType="decimal-pad"
              placeholder={draft.distanceUnit === 'km' ? '5' : '800'}
            />
          </View>
          <SegmentedControl
            options={DISTANCE_UNITS}
            value={draft.distanceUnit}
            onChange={(u) => set('distanceUnit', u)}
            accessibilityLabel="Distance unit"
            style={styles.unit}
          />
        </View>
        <DurationInput label="Time" value={draft.duration} onChange={(v) => set('duration', v)} />
      </View>
    );
  }

  if (type === 'time') {
    return <DurationInput label="Time" value={draft.duration} onChange={(v) => set('duration', v)} />;
  }

  return (
    <View>
      <Stepper
        label={type === 'reps' ? 'Added weight (kg, optional)' : 'Weight (kg)'}
        value={draft.weight}
        onChange={(v) => set('weight', v)}
        step={WEIGHT_STEP_KG}
        max={1000}
        unitLabel="kilograms"
      />
      <Stepper label="Reps" value={draft.reps} onChange={(v) => set('reps', v)} step={1} min={0} max={1000} integer />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  distanceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.small },
  unit: { width: 120, marginTop: 26 },
});
