import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StarRating } from '@/components/StarRating';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useTraineeRecord } from '../contexts/TraineeRecordContext';
import { errorMessage } from '../services/http';
import { fetchMyRating, upsertRating } from '../services/ratingService';
import { getTrainee } from '../services/traineeService';
import type { RootStackParamList } from '../types/navigation';
import type { Trainee } from '../types/trainee';

type DetailRow = { label: string; value: string };

const dash = (v?: string | null): string => (v && v.trim() ? v : '-');

/** Profile of the current client record. Trainers can edit, invite and rate the client. */
export default function AboutDetailsScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const record = useTraineeRecord();
  const { user } = useAuth();
  const isTrainer = user?.role === 'trainer';
  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [savingRating, setSavingRating] = useState(false);

  const load = useCallback(async () => {
    try {
      setTrainee(await getTrainee(record.id));
      setLoadError(null);
      if (isTrainer) {
        const mine = await fetchMyRating('client', record.id);
        setMyScore(mine.score ?? 0);
      }
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    }
  }, [record.id, isTrainer]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRateClient = async (score: number): Promise<void> => {
    const previous = myScore;
    setMyScore(score);
    setSavingRating(true);
    try {
      await upsertRating('client', record.id, score);
      await load();
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Client rating updated.' });
    } catch (error: unknown) {
      setMyScore(previous);
      Toast.show({ type: 'error', text1: 'Rating not saved', text2: errorMessage(error) });
    } finally {
      setSavingRating(false);
    }
  };

  if (!trainee) {
    return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;
  }

  const heightCm = trainee.height ?? 0;
  const heightFt = Math.floor(heightCm / 2.54 / 12);
  const heightIn = Math.round((heightCm / 2.54) % 12);

  const rows: DetailRow[] = [
    { label: 'Name', value: dash(trainee.name) },
    { label: 'Phone', value: dash(trainee.phone_number) },
    { label: 'Goals', value: dash(trainee.goals) },
    ...(isTrainer ? [{ label: 'Notes (only you see these)', value: dash(trainee.notes) }] : []),
    { label: 'Supplements', value: dash(trainee.active_supplements) },
    { label: 'Gender', value: dash(trainee.gender) },
    { label: 'Date of birth', value: dash(trainee.dob) },
    { label: 'Height', value: heightCm ? `${heightCm} cm (${heightFt}'${heightIn}")` : '-' },
    { label: 'Profession', value: dash(trainee.profession) },
    { label: 'Start date', value: dash(trainee.start_date) },
    { label: 'Membership', value: dash(trainee.membership_type) },
    { label: 'Emergency contact', value: dash(trainee.emergency_contact) },
    { label: 'Social', value: dash(trainee.social_handle) },
    { label: 'Status', value: trainee.active_status ? 'Active' : 'Inactive' },
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        {trainee.image_url ? (
          <Image source={{ uri: trainee.image_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.initial}>{(trainee.name || 'C').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.heroText}>
          <Text style={styles.title}>{isTrainer ? 'Client profile' : 'My profile'}</Text>
          <Text style={styles.name}>{trainee.name}</Text>
          <View style={[styles.statusPill, trainee.active_status ? styles.statusActive : styles.statusInactive]}>
            <Text
              style={[styles.statusText, trainee.active_status ? styles.statusTextActive : styles.statusTextInactive]}
            >
              {trainee.active_status ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        {isTrainer ? (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('TraineeForm', { traineeId: trainee.id })}
            accessibilityRole="button"
            accessibilityLabel="Edit client"
          >
            <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.textOnPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isTrainer ? (
        trainee.user_id ? (
          <View style={styles.linkedBanner}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.linkedText}>On the app: their logs show up here</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => navigation.navigate('InviteClient', { traineeId: trainee.id, traineeName: trainee.name })}
            activeOpacity={0.88}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="whatsapp" size={18} color={Colors.textPrimary} />
            <Text style={styles.inviteButtonText}>Invite client to the app</Text>
          </TouchableOpacity>
        )
      ) : null}

      {isTrainer ? (
        <View style={styles.ratingBlock}>
          <Text style={styles.ratingTitle}>Your rating for this client</Text>
          <StarRating value={myScore} onChange={(score) => void onRateClient(score)} size={30} />
          {savingRating ? (
            <ActivityIndicator color={Colors.primary} style={styles.ratingSpinner} />
          ) : (
            <Text style={styles.ratingHint}>Tap the left or right half of a star for half ratings</Text>
          )}
        </View>
      ) : (trainee.rating_count ?? 0) > 0 ? (
        <View style={styles.ratingBlock}>
          <Text style={styles.ratingTitle}>Your coach&apos;s rating of you</Text>
          <StarRating value={trainee.rating ?? 0} readonly size={22} showValue />
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Details</Text>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <View key={row.label} style={[styles.row, index === rows.length - 1 ? styles.rowLast : null]}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value}>{row.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.medium,
    paddingBottom: Spacing.xl,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.medium,
    marginBottom: Spacing.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.medium,
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: Radii.lg,
    backgroundColor: Colors.backgroundAlt,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  initial: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.small,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  statusActive: {
    backgroundColor: Colors.activeCard,
  },
  statusInactive: {
    backgroundColor: Colors.inactiveCard,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextActive: {
    color: Colors.success,
  },
  statusTextInactive: {
    color: Colors.atRisk,
  },
  editButton: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: Radii.md,
    marginBottom: Spacing.medium,
  },
  inviteButtonText: {
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  linkedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.activeCard,
    paddingVertical: 12,
    borderRadius: Radii.md,
    marginBottom: Spacing.medium,
  },
  linkedText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  ratingBlock: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.medium,
    marginBottom: Spacing.medium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ratingTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: Spacing.small,
  },
  ratingSpinner: {
    marginTop: Spacing.small,
  },
  ratingHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: Spacing.small,
  },
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.small,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: Spacing.medium,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
});
