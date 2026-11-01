import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';

import { resolvePlaceFromCoords, resolvePlaceFromPincode, type PlaceParts } from '../services/locationService';

export type CoachLocation = {
  place: PlaceParts;
  /** Edits one or more fields by hand. */
  update: (changes: Partial<PlaceParts>) => void;
  /** Replaces everything (e.g. after loading the saved profile). */
  reset: (place: PlaceParts) => void;
  locating: boolean;
  lookingUpPin: boolean;
  fillFromGps: () => Promise<void>;
  fillFromPincode: () => Promise<void>;
};

const EMPTY: PlaceParts = { city: '', area: '', pincode: '' };

/**
 * The coach profile's area: typed by hand, looked up from a PIN code or read from GPS. `onFound`
 * runs whenever a lookup fills something in (a located coach usually wants to be discoverable).
 */
export function useCoachLocation(onFound: () => void): CoachLocation {
  const [place, setPlace] = useState<PlaceParts>(EMPTY);
  const [locating, setLocating] = useState(false);
  const [lookingUpPin, setLookingUpPin] = useState(false);

  const update = useCallback((changes: Partial<PlaceParts>) => setPlace((prev) => ({ ...prev, ...changes })), []);

  /** Merges a lookup result, keeping typed values where the lookup came back empty. */
  const apply = useCallback(
    (found: PlaceParts): void => {
      setPlace((prev) => ({
        city: found.city || prev.city,
        area: found.area || prev.area,
        pincode: found.pincode || prev.pincode,
        latitude: found.latitude ?? prev.latitude,
        longitude: found.longitude ?? prev.longitude,
      }));
      onFound();
    },
    [onFound]
  );

  const fillFromGps = useCallback(async (): Promise<void> => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location not allowed', text2: 'Enter your PIN code or city instead.' });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      // Keep the map position even if the address lookup below fails.
      update({ latitude, longitude });
      const found = await resolvePlaceFromCoords(latitude, longitude);
      apply(found);
      const named = [found.area, found.city, found.pincode].filter(Boolean);
      Toast.show(
        named.length > 0
          ? { type: 'success', text1: 'Location filled', text2: `${named.join(', ')}. Tap Save.` }
          : { type: 'info', text1: 'Map position saved', text2: 'Could not find the address. Enter city or PIN.' }
      );
    } catch (e: unknown) {
      console.warn('gps location failed', e instanceof Error ? e.message : String(e));
      Toast.show({ type: 'error', text1: 'Could not read your location', text2: 'Enter your PIN code or city instead.' });
    } finally {
      setLocating(false);
    }
  }, [apply, update]);

  const fillFromPincode = useCallback(async (): Promise<void> => {
    const code = place.pincode.trim();
    if (code.length < 4) {
      Toast.show({ type: 'error', text1: 'PIN code', text2: 'Enter a valid PIN / postal code first.' });
      return;
    }
    setLookingUpPin(true);
    try {
      const found = await resolvePlaceFromPincode(code);
      if (!found || (!found.city && found.latitude === undefined)) {
        Toast.show({ type: 'error', text1: 'PIN code', text2: 'No place found for that PIN.' });
        return;
      }
      apply({ ...found, pincode: found.pincode || code });
      Toast.show({
        type: 'success',
        text1: 'PIN looked up',
        text2: [found.area, found.city].filter(Boolean).join(', ') || 'Map position set. Tap Save.',
      });
    } catch (e: unknown) {
      console.warn('pincode lookup failed', code, e instanceof Error ? e.message : String(e));
      Toast.show({ type: 'error', text1: 'PIN code', text2: 'Lookup failed. Check your connection.' });
    } finally {
      setLookingUpPin(false);
    }
  }, [apply, place.pincode]);

  return { place, update, reset: setPlace, locating, lookingUpPin, fillFromGps, fillFromPincode };
}
