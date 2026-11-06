import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { ActivityPicker } from '@/components/ActivityPicker';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SwitchRow } from '@/components/SwitchRow';
import { TextField } from '@/components/TextField';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../contexts/ThemeContext';
import { errorMessage } from '../services/http';
import { createTrainee, deleteTrainee, getTrainee, updateTrainee } from '../services/traineeService';
import { uploadImage } from '../services/uploadService';
import type { RootStackParamList } from '../types/navigation';
import type { Trainee, TraineeInput } from '../types/trainee';
import { confirmAction } from '../utils/confirm';
import { parseLocalDate, todayLocal } from '../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'TraineeForm'>;

type Form = {
  name: string;
  phone_number: string;
  dob: string;
  gender: string;
  profession: string;
  height: string;
  start_date: string;
  membership_type: string;
  emergency_contact: string;
  goals: string;
  notes: string;
  active_supplements: string;
  active_status: boolean;
  image_url: string;
  activities: string[];
};

const GENDERS = ['Female', 'Male', 'Other'];

function toForm(t?: Trainee): Form {
  return {
    name: t?.name ?? '',
    phone_number: t?.phone_number ?? '',
    dob: t?.dob ?? '',
    gender: t?.gender ?? '',
    profession: t?.profession ?? '',
    height: t?.height ? String(t.height) : '',
    start_date: t?.start_date ?? todayLocal(),
    membership_type: t?.membership_type ?? '',
    emergency_contact: t?.emergency_contact ?? '',
    goals: t?.goals ?? '',
    notes: t?.notes ?? '',
    active_supplements: t?.active_supplements ?? '',
    active_status: t?.active_status ?? true,
    image_url: t?.image_url ?? '',
    activities: t?.activities ?? ['gym'],
  };
}

function validate(f: Form): Partial<Record<keyof Form, string>> {
  const errors: Partial<Record<keyof Form, string>> = {};
  if (!f.name.trim()) errors.name = 'Name is required';
  if (f.phone_number.trim() && !/^\+?[0-9 ]{7,15}$/.test(f.phone_number.trim())) errors.phone_number = 'Enter a valid phone number';
  const h = Number(f.height);
  if (f.height.trim() && (!Number.isFinite(h) || h < 50 || h > 250)) errors.height = 'Height in cm, between 50 and 250';
  if (f.start_date.trim() && !parseLocalDate(f.start_date.trim())) errors.start_date = 'Use the format YYYY-MM-DD';
  return errors;
}

/** The fields to send: everything for a new client, only changed fields when editing. */
function toInput(f: Form, original?: Form): TraineeInput {
  const full: TraineeInput = {
    name: f.name.trim(),
    phone_number: f.phone_number.trim(),
    dob: f.dob.trim(),
    gender: f.gender,
    profession: f.profession.trim(),
    height: f.height.trim() ? Number(f.height) : 0,
    start_date: f.start_date.trim(),
    membership_type: f.membership_type.trim(),
    emergency_contact: f.emergency_contact.trim(),
    goals: f.goals.trim(),
    notes: f.notes.trim(),
    active_supplements: f.active_supplements.trim(),
    active_status: f.active_status,
    image_url: f.image_url,
    activities: f.activities,
  };
  if (!original) return full;
  const before = toInput(original);
  const changed = Object.fromEntries(
    Object.entries(full).filter(([k, v]) => k !== 'activities' && before[k as keyof TraineeInput] !== v)
  ) as TraineeInput;
  // Arrays never compare equal by reference; send activities only when the selection changed.
  if (f.activities.join(',') !== original.activities.join(',')) changed.activities = f.activities;
  return changed;
}

/** Add or edit a client (trainer only). */
export default function TraineeFormScreen({ navigation, route }: Props): React.JSX.Element {
  const traineeId = route.params?.traineeId;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [original, setOriginal] = useState<Form | undefined>(undefined);
  const [form, setForm] = useState<Form>(toForm());
  const [loading, setLoading] = useState(!!traineeId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: traineeId ? 'Edit client' : 'Add client' });
  }, [navigation, traineeId]);

  useEffect(() => {
    if (!traineeId) return;
    getTrainee(traineeId)
      .then((t) => {
        const f = toForm(t);
        setOriginal(f);
        setForm(f);
      })
      .catch((e: unknown) => setLoadError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [traineeId]);

  const set = <K extends keyof Form>(key: K, value: Form[K]): void => setForm((prev) => ({ ...prev, [key]: value }));
  const errors = touched ? validate(form) : {};

  const pickPhoto = async (): Promise<void> => {
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
    } catch (e: unknown) {
      console.warn('photo picker failed', e instanceof Error ? e.message : String(e));
      Toast.show({ type: 'error', text1: 'Could not open photos', text2: errorMessage(e) });
      return;
    }
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      set('image_url', await uploadImage({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName ?? undefined }));
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Photo not uploaded', text2: errorMessage(e) });
    } finally {
      setUploading(false);
    }
  };

  const onSave = async (): Promise<void> => {
    setTouched(true);
    if (Object.keys(validate(form)).length > 0) {
      Toast.show({ type: 'error', text1: 'Check the highlighted fields' });
      return;
    }
    setSaving(true);
    try {
      if (traineeId) {
        const changes = toInput(form, original);
        if (Object.keys(changes).length > 0) await updateTrainee(traineeId, changes);
        Toast.show({ type: 'success', text1: 'Client updated' });
        navigation.goBack();
      } else {
        const id = await createTrainee(toInput(form));
        Toast.show({ type: 'success', text1: 'Client added', text2: 'Invite them so their logs reach you.' });
        navigation.replace('TraineeDetail', { trainee: { id, name: form.name.trim() } });
      }
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not saved', text2: errorMessage(e) });
      setSaving(false);
    }
  };

  const onDelete = async (): Promise<void> => {
    if (!traineeId) return;
    const ok = await confirmAction({
      title: `Delete ${form.name}?`,
      message: 'All their workouts, meals, weight and assessments are deleted permanently. This cannot be undone.',
      confirmLabel: 'Delete client',
      destructive: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await deleteTrainee(traineeId);
      Toast.show({ type: 'success', text1: 'Client deleted' });
      navigation.popToTop();
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not deleted', text2: errorMessage(e) });
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;
  if (loadError) return <ErrorState message={loadError} />;

  const field = (key: keyof Form, label: string, extra: Partial<React.ComponentProps<typeof TextField>> = {}): React.JSX.Element => (
    <TextField label={label} value={String(form[key])} onChangeText={(v) => set(key, v as never)} error={errors[key]} {...extra} />
  );

  return (
    <Screen
      footer={
        <Button
          title={traineeId ? 'Save changes' : 'Add client'}
          icon={traineeId ? 'checkmark' : 'person-add'}
          onPress={() => void onSave()}
          loading={saving}
          disabled={uploading}
        />
      }
    >
      <View style={styles.photoBlock}>
        <Pressable
          onPress={() => void pickPhoto()}
          style={styles.photoWrap}
          accessibilityRole="button"
          accessibilityLabel={form.image_url ? 'Change photo' : 'Add photo'}
        >
          <Avatar name={form.name || undefined} uri={form.image_url || undefined} size={96} />
          <View style={styles.camera}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.onAccent} />
            ) : (
              <Ionicons name="camera" size={16} color={colors.onAccent} />
            )}
          </View>
        </Pressable>
        {form.image_url ? (
          <Button title="Remove photo" variant="ghost" size="small" onPress={() => set('image_url', '')} />
        ) : (
          <AppText variant="caption" tone="secondary" style={styles.photoHint}>
            Tap to add a photo
          </AppText>
        )}
      </View>

      <SectionHeader title="Basics" style={styles.firstSection} />
      {field('name', 'Full name *', { autoCapitalize: 'words', placeholder: 'e.g. Rahul Sharma' })}
      {field('phone_number', 'Phone', { keyboardType: 'phone-pad', hint: 'Used for WhatsApp fee reminders' })}
      <AppText variant="label" tone="secondary" style={styles.label}>
        Gender
      </AppText>
      <View style={styles.chips}>
        {GENDERS.map((g) => (
          <Chip key={g} label={g} selected={form.gender.toLowerCase() === g.toLowerCase()} onPress={() => set('gender', g.toLowerCase())} />
        ))}
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>{field('dob', 'Date of birth', { placeholder: 'DD/MM/YYYY' })}</View>
        <View style={styles.flex}>{field('height', 'Height (cm)', { keyboardType: 'decimal-pad' })}</View>
      </View>
      {field('profession', 'Profession')}

      <SectionHeader title="Training" />
      <AppText variant="label" tone="secondary" style={styles.label}>
        What they train (shown first when logging)
      </AppText>
      <ActivityPicker value={form.activities} onChange={(v) => set('activities', v)} />
      {field('goals', 'Goals', { multiline: true, placeholder: 'e.g. Lose 5 kg, run a 10K' })}
      <View style={styles.row}>
        <View style={styles.flex}>{field('start_date', 'Start date', { placeholder: 'YYYY-MM-DD' })}</View>
        <View style={styles.flex}>{field('membership_type', 'Plan', { placeholder: 'e.g. Monthly' })}</View>
      </View>
      {field('active_supplements', 'Supplements')}
      <Card style={styles.switchCard}>
        <SwitchRow
          label="Active client"
          value={form.active_status}
          onValueChange={(v) => set('active_status', v)}
        />
      </Card>

      <SectionHeader title="Private" />
      {field('emergency_contact', 'Emergency contact')}
      {field('notes', 'Notes (only you see these)', { multiline: true })}

      {traineeId ? (
        <Pressable
          onPress={() => void onDelete()}
          disabled={saving}
          accessibilityRole="button"
          style={styles.delete}
          hitSlop={8}
        >
          <AppText variant="label" tone="error" center>
            Delete client
          </AppText>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    row: { flexDirection: 'row', gap: Spacing.small },
    photoBlock: { alignItems: 'center', marginBottom: Spacing.small },
    photoWrap: { alignSelf: 'center' },
    camera: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 32,
      height: 32,
      borderRadius: Radii.pill,
      backgroundColor: colors.accent,
      borderWidth: 3,
      borderColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoHint: { marginTop: Spacing.small },
    firstSection: { marginTop: Spacing.small },
    label: { marginBottom: Spacing.small - 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.small },
    switchCard: { paddingVertical: 0, marginBottom: Spacing.medium },
    delete: { minHeight: 48, justifyContent: 'center', marginTop: Spacing.large },
  });
