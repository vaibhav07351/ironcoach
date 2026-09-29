import React, { useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';
import { apiFetch, parseApiError } from '../services/api';
import { expertiseLabel } from '../constants/expertise';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LogSession'>;

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function LogSessionScreen({
  route,
  navigation,
}: Props): React.JSX.Element {
  const { traineeId, selectedDate, activityType } = route.params;
  const { token } = useContext(AuthContext);
  const [saving, setSaving] = useState(false);
  const [durationMin, setDurationMin] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [distanceM, setDistanceM] = useState('');
  const [laps, setLaps] = useState('');
  const [stroke, setStroke] = useState('');
  const [intensity, setIntensity] = useState('');
  const [style, setStyle] = useState('');
  const [gamesWon, setGamesWon] = useState('');
  const [gamesLost, setGamesLost] = useState('');
  const [rounds, setRounds] = useState('');
  const [sessionKind, setSessionKind] = useState('');
  const [title, setTitle] = useState('');
  const [roleNote, setRoleNote] = useState('');
  const [notes, setNotes] = useState('');

  const label = useMemo(() => expertiseLabel(activityType), [activityType]);

  const onSave = async (): Promise<void> => {
    if (!token) {
      return;
    }
    const metrics: Record<string, unknown> = {};
    const dur = Number(durationMin);
    if (Number.isFinite(dur) && dur > 0) {
      metrics.duration_min = dur;
    }

    switch (activityType) {
      case 'swimming':
        if (distanceM) metrics.distance_m = Number(distanceM);
        if (laps) metrics.laps = Number(laps);
        if (stroke) metrics.stroke = stroke.trim();
        break;
      case 'running':
        if (distanceKm) metrics.distance_km = Number(distanceKm);
        break;
      case 'badminton':
        if (gamesWon) metrics.games_won = Number(gamesWon);
        if (gamesLost) metrics.games_lost = Number(gamesLost);
        if (intensity) metrics.intensity = intensity.trim();
        break;
      case 'yoga':
        if (style) metrics.style = style.trim();
        if (intensity) metrics.intensity = intensity.trim();
        break;
      case 'cricket':
        if (sessionKind) metrics.session_kind = sessionKind.trim();
        if (roleNote) metrics.role_note = roleNote.trim();
        break;
      case 'boxing':
      case 'mma':
        if (rounds) metrics.rounds = Number(rounds);
        if (intensity) metrics.intensity = intensity.trim();
        break;
      default:
        if (title) metrics.title = title.trim();
        break;
    }

    if (!metrics.duration_min && activityType !== 'gym') {
      Toast.show({
        type: 'error',
        text1: 'Duration needed',
        text2: 'Enter how many minutes you trained.',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await apiFetch(
        '/workout_logs',
        {
          method: 'POST',
          body: JSON.stringify({
            trainee_id: traineeId,
            date: toISODate(selectedDate),
            activity_type: activityType,
            metrics,
            notes: notes.trim(),
            workouts: [],
          }),
        },
        token
      );
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      Toast.show({ type: 'success', text1: 'Logged', text2: `${label} session saved.` });
      navigation.goBack();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not save session';
      Toast.show({ type: 'error', text1: 'Log failed', text2: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{label}</Text>
      <Text style={styles.hint}>Quick log — only what you actually track.</Text>

      <Text style={styles.label}>Duration (min)</Text>
      <TextInput
        style={styles.input}
        value={durationMin}
        onChangeText={setDurationMin}
        keyboardType="decimal-pad"
        placeholder="45"
        placeholderTextColor={Colors.textSecondary}
      />

      {activityType === 'swimming' && (
        <>
          <Text style={styles.label}>Distance (m)</Text>
          <TextInput
            style={styles.input}
            value={distanceM}
            onChangeText={setDistanceM}
            keyboardType="decimal-pad"
            placeholder="1000"
            placeholderTextColor={Colors.textSecondary}
          />
          <Text style={styles.label}>Laps</Text>
          <TextInput
            style={styles.input}
            value={laps}
            onChangeText={setLaps}
            keyboardType="number-pad"
            placeholder="40"
            placeholderTextColor={Colors.textSecondary}
          />
          <Text style={styles.label}>Stroke</Text>
          <TextInput
            style={styles.input}
            value={stroke}
            onChangeText={setStroke}
            placeholder="Freestyle"
            placeholderTextColor={Colors.textSecondary}
          />
        </>
      )}

      {activityType === 'running' && (
        <>
          <Text style={styles.label}>Distance (km)</Text>
          <TextInput
            style={styles.input}
            value={distanceKm}
            onChangeText={setDistanceKm}
            keyboardType="decimal-pad"
            placeholder="5"
            placeholderTextColor={Colors.textSecondary}
          />
        </>
      )}

      {activityType === 'badminton' && (
        <>
          <Text style={styles.label}>Games won</Text>
          <TextInput
            style={styles.input}
            value={gamesWon}
            onChangeText={setGamesWon}
            keyboardType="number-pad"
            placeholder="2"
            placeholderTextColor={Colors.textSecondary}
          />
          <Text style={styles.label}>Games lost</Text>
          <TextInput
            style={styles.input}
            value={gamesLost}
            onChangeText={setGamesLost}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={Colors.textSecondary}
          />
          <Text style={styles.label}>Intensity</Text>
          <TextInput
            style={styles.input}
            value={intensity}
            onChangeText={setIntensity}
            placeholder="Easy / Moderate / Hard"
            placeholderTextColor={Colors.textSecondary}
          />
        </>
      )}

      {activityType === 'yoga' && (
        <>
          <Text style={styles.label}>Style</Text>
          <TextInput
            style={styles.input}
            value={style}
            onChangeText={setStyle}
            placeholder="Hatha, Vinyasa…"
            placeholderTextColor={Colors.textSecondary}
          />
          <Text style={styles.label}>Intensity</Text>
          <TextInput
            style={styles.input}
            value={intensity}
            onChangeText={setIntensity}
            placeholder="Gentle / Strong"
            placeholderTextColor={Colors.textSecondary}
          />
        </>
      )}

      {activityType === 'cricket' && (
        <>
          <Text style={styles.label}>Session type</Text>
          <TextInput
            style={styles.input}
            value={sessionKind}
            onChangeText={setSessionKind}
            placeholder="Nets / Match / Practice"
            placeholderTextColor={Colors.textSecondary}
          />
          <Text style={styles.label}>Role note</Text>
          <TextInput
            style={styles.input}
            value={roleNote}
            onChangeText={setRoleNote}
            placeholder="Batting, bowling…"
            placeholderTextColor={Colors.textSecondary}
          />
        </>
      )}

      {(activityType === 'boxing' || activityType === 'mma') && (
        <>
          <Text style={styles.label}>Rounds</Text>
          <TextInput
            style={styles.input}
            value={rounds}
            onChangeText={setRounds}
            keyboardType="number-pad"
            placeholder="6"
            placeholderTextColor={Colors.textSecondary}
          />
          <Text style={styles.label}>Intensity</Text>
          <TextInput
            style={styles.input}
            value={intensity}
            onChangeText={setIntensity}
            placeholder="Light / Sparring / Hard"
            placeholderTextColor={Colors.textSecondary}
          />
        </>
      )}

      {activityType === 'other' && (
        <>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What did you train?"
            placeholderTextColor={Colors.textSecondary}
          />
        </>
      )}

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Anything to remember"
        placeholderTextColor={Colors.textSecondary}
      />

      <TouchableOpacity
        style={styles.cta}
        onPress={() => void onSave()}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={Colors.textOnPrimary} />
        ) : (
          <Text style={styles.ctaText}>Save session</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.large, paddingBottom: Spacing.xl * 2 },
  heading: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.textPrimary,
  },
  hint: {
    color: Colors.textSecondary,
    marginBottom: Spacing.large,
    marginTop: Spacing.small,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
    marginTop: Spacing.small,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.medium,
    paddingVertical: 12,
    color: Colors.textPrimary,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  cta: {
    marginTop: Spacing.large,
    backgroundColor: Colors.primary,
    borderRadius: Radii.md,
    paddingVertical: Spacing.medium,
    alignItems: 'center',
  },
  ctaText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
});
