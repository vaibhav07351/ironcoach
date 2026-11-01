import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { CoachLocationFields } from '@/components/CoachLocationFields';
import { ErrorState } from '@/components/ErrorState';
import { IconBadge } from '@/components/IconBadge';
import { ListRow } from '@/components/ListRow';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { StarRating } from '@/components/StarRating';
import { SwitchRow } from '@/components/SwitchRow';
import { TextField } from '@/components/TextField';
import { Spacing } from '@/constants/theme';
import { EXPERTISE_OPTIONS } from '../constants/expertise';
import { useCoachLocation } from '../hooks/useCoachLocation';
import { errorMessage } from '../services/http';
import { fetchTrainerProfile, updateTrainerProfile } from '../services/trainerService';
import type { TrainerProfile } from '../types/coach';

/** Deselecting the last category falls back to "other", so a coach always has at least one. */
function toggleExpertise(prev: string[], code: string): string[] {
  if (prev.includes(code)) {
    const next = prev.filter((c) => c !== code);
    return next.length === 0 ? ['other'] : next;
  }
  return [...prev, code];
}

/** The trainer's own coach profile: photo, bio, categories, area and rate. */
export default function TrainerProfileScreen(): React.JSX.Element {
  const [trainer, setTrainer] = useState<TrainerProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [expertises, setExpertises] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [discoveryVisible, setDiscoveryVisible] = useState(false);
  const markDiscoverable = useCallback(() => setDiscoveryVisible(true), []);
  const location = useCoachLocation(markDiscoverable);
  const resetLocation = location.reset;

  const load = useCallback(async () => {
    try {
      const data = await fetchTrainerProfile();
      setLoadError(null);
      setTrainer(data);
      setHeadline(data.headline || '');
      setBio(data.bio || '');
      setSpeciality(data.speciality || '');
      setExpertises(data.expertises?.length ? data.expertises : ['other']);
      setHourlyRate(data.hourly_rate !== undefined ? String(data.hourly_rate) : '');
      setImageUrl(data.image_url || '');
      setDiscoveryVisible(data.discovery_visible !== false);
      resetLocation({
        city: data.city || '',
        area: data.area || '',
        pincode: data.pincode || '',
        latitude: data.latitude,
        longitude: data.longitude,
      });
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [resetLocation]);

  // Initial load on mount; load() only sets state after the awaited request resolves.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const rateText = hourlyRate.trim();
  const rate = rateText === '' ? undefined : Number(rateText);
  const rateError = rate !== undefined && (!Number.isFinite(rate) || rate < 0) ? 'Enter a number, e.g. 1500' : undefined;

  const onSave = async (): Promise<void> => {
    if (rateError) {
      Toast.show({ type: 'error', text1: 'Check the hourly rate', text2: rateError });
      return;
    }
    const { place } = location;
    setSaving(true);
    try {
      const updated = await updateTrainerProfile({
        headline: headline.trim(),
        bio: bio.trim(),
        speciality: speciality.trim(),
        expertises,
        city: place.city.trim(),
        area: place.area.trim(),
        pincode: place.pincode.trim(),
        image_url: imageUrl.trim(),
        discovery_visible: discoveryVisible,
        latitude: place.latitude,
        longitude: place.longitude,
        hourly_rate: rate,
      });
      setTrainer(updated);
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Profile updated.' });
    } catch (error: unknown) {
      Toast.show({ type: 'error', text1: 'Save failed', text2: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }
  if (!trainer) {
    return <ErrorState message={loadError ?? 'Profile not found.'} onRetry={() => void load()} />;
  }

  const ratingCount = trainer.rating_count ?? 0;

  return (
    <Screen footer={<Button title="Save profile" icon="checkmark" onPress={() => void onSave()} loading={saving} />}>
      <Card style={styles.header}>
        <Avatar name={trainer.name} uri={imageUrl || trainer.image_url || undefined} size={88} />
        <AppText variant="heading" center style={styles.name}>
          {trainer.name}
        </AppText>
        <AppText variant="caption" tone="secondary" center>
          {trainer.email}
        </AppText>
        <View style={styles.rating}>
          {ratingCount > 0 || (trainer.rating ?? 0) > 0 ? (
            <>
              <StarRating value={trainer.rating ?? 0} readonly size={22} showValue />
              <AppText variant="caption" tone="secondary" style={styles.ratingMeta}>
                {ratingCount} client rating{ratingCount === 1 ? '' : 's'}
              </AppText>
            </>
          ) : (
            <AppText variant="caption" tone="muted">
              No ratings from clients yet
            </AppText>
          )}
        </View>
      </Card>

      <SectionHeader title="Discovery profile" />
      <AppText tone="secondary" style={styles.lead}>
        Clients nearby see this when they look for a coach.
      </AppText>
      <TextField label="Headline" value={headline} onChangeText={setHeadline} placeholder="Strength coach, 8 years" />
      <TextField
        label="Bio"
        value={bio}
        onChangeText={setBio}
        multiline
        placeholder="What you help clients achieve"
      />

      <AppText variant="label" tone="secondary" style={styles.label}>
        What you coach
      </AppText>
      <AppText variant="caption" tone="muted" style={styles.labelHint}>
        Clients looking for these sports see you first.
      </AppText>
      <View style={styles.chips}>
        {EXPERTISE_OPTIONS.map((opt) => (
          <Chip
            key={opt.code}
            label={opt.label}
            selected={expertises.includes(opt.code)}
            onPress={() => setExpertises((prev) => toggleExpertise(prev, opt.code))}
          />
        ))}
      </View>

      <TextField label="Speciality (optional)" value={speciality} onChangeText={setSpeciality} placeholder="Hypertrophy, rehab" />
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label="Hourly rate (rupees)"
            value={hourlyRate}
            onChangeText={setHourlyRate}
            keyboardType="decimal-pad"
            placeholder="1500"
            error={rateError}
          />
        </View>
        <View style={styles.flex}>
          <TextField
            label="Photo link"
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://"
          />
        </View>
      </View>

      <SectionHeader title="Location" />
      <AppText tone="secondary" style={styles.lead}>
        Enter your PIN and tap Autofill, or use your current location.
      </AppText>
      <CoachLocationFields location={location} />

      <Card style={styles.switchCard}>
        <SwitchRow
          label="Visible in discovery"
          hint="Needs a location or city"
          value={discoveryVisible}
          onValueChange={setDiscoveryVisible}
        />
      </Card>

      {trainer.social_handle ? (
        <ListRow
          leading={<IconBadge name="logo-instagram" tone="accent" size={40} />}
          title="Instagram"
          subtitle={`@${trainer.social_handle}`}
          onPress={() => void Linking.openURL(`https://www.instagram.com/${trainer.social_handle}`)}
          style={styles.social}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingVertical: Spacing.large },
  name: { marginTop: Spacing.small + 4 },
  rating: { alignItems: 'center', marginTop: Spacing.small + 4 },
  ratingMeta: { marginTop: Spacing.xs },
  lead: { marginBottom: Spacing.medium },
  label: { marginBottom: 2 },
  labelHint: { marginBottom: Spacing.small },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.small },
  row: { flexDirection: 'row', gap: Spacing.small },
  flex: { flex: 1, minWidth: 0 },
  switchCard: { paddingVertical: 0, marginTop: Spacing.medium },
  social: { marginTop: Spacing.medium },
});
