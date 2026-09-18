import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Linking,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';
import {
  fetchTrainerDetails,
  updateTrainerDiscovery,
  type TrainerDetails,
} from '../services/trainerService';
import {
  resolvePlaceFromCoords,
  resolvePlaceFromPincode,
} from '../services/locationService';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { StarRating } from '@/components/StarRating';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainerProfile'>;

export default function TrainerProfileScreen({ navigation }: Props) {
  const { token, logout } = useContext(AuthContext);
  const [trainer, setTrainer] = useState<TrainerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [lookingUpPin, setLookingUpPin] = useState(false);
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [discoveryVisible, setDiscoveryVisible] = useState(false);
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();

  const load = useCallback(async () => {
    if (!token) {
      navigation.replace('Login');
      return;
    }
    try {
      const data = await fetchTrainerDetails(token);
      setTrainer(data);
      setHeadline(data.headline || '');
      setBio(data.bio || '');
      setSpeciality(data.speciality || '');
      setCity(data.city || '');
      setArea(data.area || '');
      setPincode(data.pincode || '');
      setHourlyRate(
        data.hourly_rate !== undefined ? String(data.hourly_rate) : ''
      );
      setImageUrl(data.image_url || '');
      setDiscoveryVisible(data.discovery_visible !== false);
      setLatitude(data.latitude);
      setLongitude(data.longitude);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Profile',
        text2: 'Failed to load profile.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, navigation]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPlace = (parts: {
    city: string;
    area: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  }): void => {
    if (parts.city) {
      setCity(parts.city);
    }
    if (parts.area) {
      setArea(parts.area);
    }
    if (parts.pincode) {
      setPincode(parts.pincode);
    }
    if (parts.latitude !== undefined) {
      setLatitude(parts.latitude);
    }
    if (parts.longitude !== undefined) {
      setLongitude(parts.longitude);
    }
    // Location implies they want to be findable
    setDiscoveryVisible(true);
  };

  const useCurrentLocation = async (): Promise<void> => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Location',
          text2: 'Permission denied. Enter PIN code or city manually.',
        });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = pos.coords;
      setLatitude(lat);
      setLongitude(lng);

      const place = await resolvePlaceFromCoords(lat, lng);
      applyPlace(place);

      const filled = [place.city, place.area, place.pincode].filter(Boolean);
      Toast.show({
        type: filled.length > 0 ? 'success' : 'error',
        text1: filled.length > 0 ? 'Location filled' : 'GPS saved',
        text2:
          filled.length > 0
            ? filled.join(' · ') + ' — tap Save.'
            : 'Could not resolve address. Enter city or PIN manually.',
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Location',
        text2: 'Could not read GPS.',
      });
    } finally {
      setLocating(false);
    }
  };

  const lookupFromPincode = async (): Promise<void> => {
    const code = pincode.trim();
    if (code.length < 4) {
      Toast.show({
        type: 'error',
        text1: 'PIN code',
        text2: 'Enter a valid PIN / postal code first.',
      });
      return;
    }
    setLookingUpPin(true);
    try {
      const place = await resolvePlaceFromPincode(code);
      if (!place || (!place.city && place.latitude === undefined)) {
        Toast.show({
          type: 'error',
          text1: 'PIN code',
          text2: 'No place found for that PIN.',
        });
        return;
      }
      applyPlace({ ...place, pincode: place.pincode || code });
      Toast.show({
        type: 'success',
        text1: 'PIN looked up',
        text2:
          [place.area, place.city].filter(Boolean).join(', ') ||
          'Coordinates set — tap Save.',
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'PIN code',
        text2: 'Lookup failed. Check your connection.',
      });
    } finally {
      setLookingUpPin(false);
    }
  };

  const onSave = async (): Promise<void> => {
    if (!token) {
      return;
    }
    setSaving(true);
    try {
      const rate = hourlyRate.trim() === '' ? undefined : Number(hourlyRate);
      const updated = await updateTrainerDiscovery(token, {
        headline: headline.trim(),
        bio: bio.trim(),
        speciality: speciality.trim(),
        city: city.trim(),
        area: area.trim(),
        pincode: pincode.trim(),
        image_url: imageUrl.trim(),
        discovery_visible: discoveryVisible,
        latitude,
        longitude,
        hourly_rate: Number.isFinite(rate) ? rate : undefined,
      });
      setTrainer(updated);
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Profile updated.' });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not save profile';
      Toast.show({ type: 'error', text1: 'Save failed', text2: message });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ActivityIndicator
        size="large"
        color={Colors.primary}
        style={{ marginTop: 280 }}
      />
    );
  }

  if (!trainer) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Trainer details not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Image
        source={{
          uri: imageUrl || trainer.image_url || 'https://via.placeholder.com/150',
        }}
        style={styles.profileImage}
      />
      <Text style={styles.name}>{trainer.name}</Text>
      <Text style={styles.email}>{trainer.email}</Text>

      <View style={styles.ratingBlock}>
        <Text style={styles.ratingLabel}>Your rating</Text>
        {(trainer.rating_count ?? 0) > 0 || (trainer.rating ?? 0) > 0 ? (
          <>
            <StarRating
              value={trainer.rating ?? 0}
              readonly
              size={26}
              showValue
            />
            <Text style={styles.ratingMeta}>
              {trainer.rating_count ?? 0} client rating
              {(trainer.rating_count ?? 0) === 1 ? '' : 's'}
            </Text>
          </>
        ) : (
          <Text style={styles.ratingMeta}>No ratings from clients yet</Text>
        )}
      </View>

      <Text style={styles.section}>Discovery profile</Text>
      <Text style={styles.hint}>
        Clients nearby see this when they swipe for a coach.
      </Text>

      <Text style={styles.label}>Headline</Text>
      <TextInput
        style={styles.input}
        value={headline}
        onChangeText={setHeadline}
        placeholder="Strength coach · 8 yrs"
        placeholderTextColor={Colors.textSecondary}
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={bio}
        onChangeText={setBio}
        multiline
        placeholder="What you help clients achieve"
        placeholderTextColor={Colors.textSecondary}
      />

      <Text style={styles.label}>Speciality</Text>
      <TextInput
        style={styles.input}
        value={speciality}
        onChangeText={setSpeciality}
        placeholder="Hypertrophy, rehab, …"
        placeholderTextColor={Colors.textSecondary}
      />

      <Text style={styles.label}>Hourly rate (₹)</Text>
      <TextInput
        style={styles.input}
        value={hourlyRate}
        onChangeText={setHourlyRate}
        keyboardType="decimal-pad"
        placeholder="1500"
        placeholderTextColor={Colors.textSecondary}
      />

      <Text style={styles.label}>Photo URL</Text>
      <TextInput
        style={styles.input}
        value={imageUrl}
        onChangeText={setImageUrl}
        autoCapitalize="none"
        placeholder="https://…"
        placeholderTextColor={Colors.textSecondary}
      />

      <Text style={styles.section}>Location</Text>
      <Text style={styles.hint}>
        Enter your PIN and tap Autofill — city, area, and map position fill in
        below. Or use GPS instead.
      </Text>

      <Text style={styles.label}>PIN code</Text>
      <View style={styles.pinRow}>
        <TextInput
          style={[styles.input, styles.pinInput]}
          value={pincode}
          onChangeText={setPincode}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="560001"
          placeholderTextColor={Colors.textSecondary}
        />
        <TouchableOpacity
          style={styles.pinBtn}
          onPress={() => void lookupFromPincode()}
          disabled={lookingUpPin}
        >
          {lookingUpPin ? (
            <ActivityIndicator color={Colors.textOnPrimary} />
          ) : (
            <Text style={styles.pinBtnText}>Autofill</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { marginTop: Spacing.medium }]}>
        City (auto-filled)
      </Text>
      <TextInput
        style={styles.input}
        value={city}
        onChangeText={setCity}
        placeholder="Filled from PIN or GPS"
        placeholderTextColor={Colors.textSecondary}
      />

      <Text style={styles.label}>Area (auto-filled)</Text>
      <TextInput
        style={styles.input}
        value={area}
        onChangeText={setArea}
        placeholder="Filled from PIN or GPS"
        placeholderTextColor={Colors.textSecondary}
      />

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => void useCurrentLocation()}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Text style={styles.secondaryBtnText}>
            Or use current location instead
          </Text>
        )}
      </TouchableOpacity>
      {latitude !== undefined && longitude !== undefined && (
        <Text style={styles.coords}>
          GPS: {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </Text>
      )}

      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Visible in discovery</Text>
          <Text style={styles.hint}>Requires location or city</Text>
        </View>
        <Switch
          value={discoveryVisible}
          onValueChange={setDiscoveryVisible}
          trackColor={{ false: Colors.border, true: Colors.accentSoft }}
          thumbColor={discoveryVisible ? Colors.accent : Colors.surface}
        />
      </View>

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={() => void onSave()}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={Colors.textOnPrimary} />
        ) : (
          <Text style={styles.saveBtnText}>Save profile</Text>
        )}
      </TouchableOpacity>

      {trainer.social_handle ? (
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => {
            void Linking.openURL(
              `https://www.instagram.com/${trainer.social_handle}`
            );
          }}
        >
          <Text style={styles.socialButtonText}>Instagram</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.signOut}
        onPress={() => {
          void logout().then(() => navigation.replace('Login'));
        }}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    padding: Spacing.medium,
    paddingBottom: 48,
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: 'center',
    marginBottom: Spacing.small,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  email: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.medium,
  },
  ratingBlock: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.medium,
    marginBottom: Spacing.large,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ratingLabel: {
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    fontSize: 15,
  },
  ratingMeta: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  section: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  label: {
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.small,
    marginBottom: 4,
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: Spacing.small,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.medium,
    gap: 12,
  },
  secondaryBtn: {
    marginTop: Spacing.medium,
    padding: 12,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  secondaryBtnText: { color: Colors.primary, fontWeight: '600' },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinInput: { flex: 1 },
  pinBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBtnText: { color: Colors.textOnPrimary, fontWeight: '700' },
  coords: { color: Colors.textSecondary, marginTop: 6, fontSize: 12 },
  saveBtn: {
    marginTop: Spacing.large,
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  saveBtnText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
  socialButton: {
    marginTop: Spacing.medium,
    backgroundColor: '#E4405F',
    padding: 12,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  socialButtonText: { color: '#fff', fontWeight: '600' },
  signOut: { marginTop: Spacing.xl, alignItems: 'center', padding: 12 },
  signOutText: { color: Colors.error, fontWeight: '600' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: { fontSize: 16, color: Colors.error },
});
