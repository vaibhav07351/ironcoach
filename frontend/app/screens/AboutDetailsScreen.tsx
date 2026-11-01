import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { SectionHeader } from '@/components/SectionHeader';
import { StarRating } from '@/components/StarRating';
import { Radii, Spacing, webScrollFix } from '@/constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, useThemedStyles, type Theme } from '../contexts/ThemeContext';
import { useTraineeRecord } from '../contexts/TraineeRecordContext';
import { errorMessage } from '../services/http';
import { fetchMyRating, upsertRating } from '../services/ratingService';
import { getTrainee } from '../services/traineeService';
import type { RootStackParamList } from '../types/navigation';
import type { Trainee } from '../types/trainee';

type DetailRow = { label: string; value: string };

const filled = (v?: string | null): string => (v && v.trim() ? v.trim() : '');

/** Profile of the current client record. Trainers can edit, invite and rate the client. */
export default function AboutDetailsScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const record = useTraineeRecord();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isTrainer = user?.role === 'trainer';
  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [savingRating, setSavingRating] = useState(false);

  const loadMyRating = useCallback(async () => {
    try {
      const mine = await fetchMyRating('client', record.id);
      setMyScore(mine.score ?? 0);
    } catch (e: unknown) {
      // The profile is still useful without it; the stars just start empty.
      console.warn('client rating not loaded', record.id, errorMessage(e));
    }
  }, [record.id]);

  const load = useCallback(async () => {
    try {
      setTrainee(await getTrainee(record.id));
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
      return;
    }
    if (isTrainer) {
      await loadMyRating();
    }
  }, [record.id, isTrainer, loadMyRating]);

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
    { label: 'Phone', value: filled(trainee.phone_number) },
    { label: 'Goals', value: filled(trainee.goals) },
    ...(isTrainer ? [{ label: 'Notes (only you see these)', value: filled(trainee.notes) }] : []),
    { label: 'Supplements', value: filled(trainee.active_supplements) },
    { label: 'Gender', value: filled(trainee.gender) },
    { label: 'Date of birth', value: filled(trainee.dob) },
    { label: 'Height', value: heightCm ? `${heightCm} cm (${heightFt}'${heightIn}")` : '' },
    { label: 'Profession', value: filled(trainee.profession) },
    { label: 'Start date', value: filled(trainee.start_date) },
    { label: 'Membership', value: filled(trainee.membership_type) },
    { label: 'Emergency contact', value: filled(trainee.emergency_contact) },
    { label: 'Social', value: filled(trainee.social_handle) },
  ];
  const missing = rows.filter((r) => !r.value).length;

  return (
    <ScrollView style={[webScrollFix, styles.scroll]} contentContainerStyle={styles.container}>
      <Card style={styles.hero}>
        <Avatar name={trainee.name} uri={trainee.image_url} size={72} />
        <View style={styles.heroText}>
          <AppText variant="heading" numberOfLines={2}>
            {trainee.name}
          </AppText>
          <View style={styles.badges}>
            <Badge label={trainee.active_status ? 'Active' : 'Inactive'} tone={trainee.active_status ? 'success' : 'warning'} />
            {isTrainer ? (
              <Badge label={trainee.user_id ? 'On app' : 'Not on app yet'} tone={trainee.user_id ? 'brand' : 'neutral'} />
            ) : null}
          </View>
        </View>
        {isTrainer ? (
          <IconButton
            icon="create-outline"
            accessibilityLabel="Edit client"
            onPress={() => navigation.navigate('TraineeForm', { traineeId: trainee.id })}
          />
        ) : null}
      </Card>

      {isTrainer ? (
        trainee.user_id ? (
          <View style={styles.linkedBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <AppText variant="label" style={styles.linkedText}>
              On the app: their logs show up here
            </AppText>
          </View>
        ) : (
          <Button
            title="Invite client to the app"
            icon="logo-whatsapp"
            onPress={() => navigation.navigate('InviteClient', { traineeId: trainee.id, traineeName: trainee.name })}
            style={styles.invite}
          />
        )
      ) : null}

      {isTrainer ? (
        <Card style={styles.ratingBlock}>
          <AppText variant="subheading">Your rating for this client</AppText>
          <View style={styles.stars}>
            <StarRating value={myScore} onChange={(score) => void onRateClient(score)} size={30} />
            {savingRating ? <ActivityIndicator color={colors.tint} style={styles.ratingSpinner} /> : null}
          </View>
          <AppText variant="caption" tone="secondary">
            Tap the left or right half of a star for half ratings
          </AppText>
        </Card>
      ) : (trainee.rating_count ?? 0) > 0 ? (
        <Card style={styles.ratingBlock}>
          <AppText variant="subheading">Your coach&apos;s rating of you</AppText>
          <View style={styles.stars}>
            <StarRating value={trainee.rating ?? 0} readonly size={22} showValue />
          </View>
        </Card>
      ) : null}

      <SectionHeader
        title="Details"
        right={isTrainer && missing > 0 ? <Badge label={`${missing} not filled`} tone="neutral" /> : null}
      />
      <Card style={styles.card}>
        {rows.map((row, index) => (
          <View key={row.label} style={[styles.row, index > 0 ? styles.rowDivider : null]}>
            <AppText variant="caption" tone="secondary">
              {row.label}
            </AppText>
            <AppText tone={row.value ? 'primary' : 'muted'} style={styles.value}>
              {row.value || 'Not added'}
            </AppText>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    scroll: {
      backgroundColor: colors.bg,
    },
    container: {
      padding: Spacing.medium,
      paddingBottom: Spacing.xxl,
    },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.medium,
      marginBottom: Spacing.medium,
    },
    heroText: {
      flex: 1,
      minWidth: 0,
    },
    badges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs + 2,
      marginTop: Spacing.small - 2,
    },
    invite: {
      marginBottom: Spacing.medium,
    },
    linkedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.small,
      backgroundColor: colors.successSoft,
      paddingVertical: Spacing.small + 4,
      paddingHorizontal: Spacing.medium,
      borderRadius: Radii.md,
      marginBottom: Spacing.medium,
    },
    linkedText: {
      color: colors.text,
    },
    ratingBlock: {
      marginBottom: Spacing.small,
    },
    stars: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: Spacing.small,
    },
    ratingSpinner: {
      marginLeft: Spacing.small + 4,
    },
    card: {
      paddingVertical: Spacing.xs,
    },
    row: {
      paddingVertical: Spacing.small + 4,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
    },
    value: {
      marginTop: 2,
    },
  });
