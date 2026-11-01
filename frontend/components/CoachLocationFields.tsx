import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing } from '@/constants/theme';
import { useTheme } from '../app/contexts/ThemeContext';
import type { CoachLocation } from '../app/hooks/useCoachLocation';
import { AppText } from './AppText';
import { Button } from './Button';
import { TextField } from './TextField';

/** PIN lookup, city and area, and a GPS fallback for the coach profile. */
export function CoachLocationFields({ location }: { location: CoachLocation }): React.JSX.Element {
  const { colors } = useTheme();
  const { place, update, locating, lookingUpPin, fillFromGps, fillFromPincode } = location;
  const hasCoords = place.latitude !== undefined && place.longitude !== undefined;

  return (
    <View>
      <View style={styles.pinRow}>
        <View style={styles.flex}>
          <TextField
            label="PIN code"
            value={place.pincode}
            onChangeText={(v) => update({ pincode: v })}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="560001"
            returnKeyType="search"
            onSubmitEditing={() => void fillFromPincode()}
          />
        </View>
        <Button
          title="Autofill"
          variant="secondary"
          icon="search"
          onPress={() => void fillFromPincode()}
          loading={lookingUpPin}
          style={styles.pinButton}
        />
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label="City" value={place.city} onChangeText={(v) => update({ city: v })} placeholder="From PIN or GPS" />
        </View>
        <View style={styles.flex}>
          <TextField label="Area" value={place.area} onChangeText={(v) => update({ area: v })} placeholder="From PIN or GPS" />
        </View>
      </View>
      <Button
        title="Use my current location"
        variant="ghost"
        icon="navigate-outline"
        onPress={() => void fillFromGps()}
        loading={locating}
      />
      {hasCoords ? (
        <View style={styles.coords}>
          <Ionicons name="location" size={14} color={colors.success} />
          <AppText variant="caption" tone="secondary" style={styles.coordsText}>
            Map position set
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', gap: Spacing.small },
  pinRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.small },
  pinButton: { marginBottom: Spacing.medium, minHeight: 52 },
  coords: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs },
  coordsText: { marginLeft: Spacing.xs },
});
