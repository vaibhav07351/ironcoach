import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import FirstRunHints, { hasCompletedFirstRunHints } from '@/components/FirstRunHints';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { ErrorState } from '@/components/ErrorState';
import { HeroHeader } from '@/components/HeroHeader';
import { IconBadge, type IconTone } from '@/components/IconBadge';
import { ListRow } from '@/components/ListRow';
import { LoadingState } from '@/components/LoadingState';
import { QuickLogChips } from '@/components/QuickLogChips';
import { RateCoachCard } from '@/components/RateCoachCard';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { StatTile } from '@/components/StatTile';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, useThemedStyles, type Theme } from '../contexts/ThemeContext';
import { useReviewPrompt } from '../hooks/useReviewPrompt';
import { fetchMyAdherence } from '../services/adherenceService';
import { getFees } from '../services/feesService';
import { errorMessage } from '../services/http';
import { getProgress } from '../services/progressService';
import { listWorkoutLogs } from '../services/workoutService';
import type { AdherenceSummary } from '../types/auth';
import type { FeeSummary } from '../types/fees';
import type { ClientSection, RootStackParamList } from '../types/navigation';
import { greetingForHour, todayLocal, weekdayDateLabel } from '../utils/date';
import { formatRupees } from '../utils/money';
import { REVIEW_AFTER_WORKOUTS } from '../utils/review';

const HINT_STEPS = [
  {
    title: 'Your day at a glance',
    body: 'This is your Today screen: whether you have logged, your streak and your week.',
  },
  {
    title: 'Log in seconds',
    body: 'Tap a sport under Log a session. Gym opens the exercise picker; other sports use a short form.',
  },
  {
    title: 'Everything else',
    body: 'History, meals, weight, attendance and fees are one tap away below.',
  },
];

type Snapshot = {
  week: AdherenceSummary;
  fees: FeeSummary;
  latestWeight?: number;
};

type Shortcut = {
  section: ClientSection;
  label: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: IconTone;
  alert?: boolean;
};

/** A client's home: today's status, quick logging, streak, weight and shortcuts to their record. */
export default function ClientTodayScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const askForReview = useReviewPrompt(user?.id);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const traineeId = user?.trainee_id;
  const hintsKey = `first_run_hints_client_v2_${user?.id ?? ''}`;

  const load = useCallback(async () => {
    if (!traineeId) {
      return;
    }
    try {
      const [week, fees, progress, recent] = await Promise.all([
        fetchMyAdherence(),
        getFees(traineeId),
        getProgress(traineeId),
        listWorkoutLogs(traineeId, undefined, REVIEW_AFTER_WORKOUTS),
      ]);
      const weights = progress.weight_bmi ?? [];
      setSnapshot({ week, fees, latestWeight: weights.length > 0 ? weights[weights.length - 1].weight : undefined });
      setLoadError(null);
      setShowHints(!(await hasCompletedFirstRunHints(hintsKey)));
      void askForReview({ workoutCount: recent.length, trainedToday: week.trained_today });
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [traineeId, hintsKey, askForReview]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const open = (section: ClientSection): void => {
    if (traineeId) {
      navigation.navigate('TraineeDetail', { trainee: { id: traineeId, name: user?.name || 'Me' }, section });
    }
  };

  if (!traineeId) {
    return <ErrorState message="Your account is not linked to a coach yet." />;
  }
  if (!snapshot) {
    return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;
  }

  const { week, fees, latestWeight } = snapshot;
  const activePackage = fees.packages.find((p) => p.status === 'active' && p.kind === 'sessions');
  const firstName = user?.name?.split(' ')[0] || 'there';

  const shortcuts: Shortcut[] = [
    { section: 'workouts', label: 'History', detail: 'Your workouts', icon: 'barbell', tone: 'brand' },
    { section: 'diet', label: 'Meals', detail: 'Log and review your diet', icon: 'restaurant', tone: 'success' },
    {
      section: 'weight',
      label: 'Weight',
      detail: latestWeight !== undefined ? `Latest: ${latestWeight} kg` : 'Add your first weigh-in',
      icon: 'scale',
      tone: 'neutral',
    },
    {
      section: 'attendance',
      label: 'Attendance',
      detail: activePackage ? `${activePackage.sessions_left} sessions left in ${activePackage.name}` : 'Sessions with your coach',
      icon: 'calendar',
      tone: 'accent',
    },
    {
      section: 'fees',
      label: 'Fees',
      detail: fees.due_paise > 0 ? `${formatRupees(fees.due_paise)} due` : 'Nothing due',
      icon: 'wallet',
      tone: fees.due_paise > 0 ? 'danger' : 'neutral',
      alert: fees.due_paise > 0,
    },
  ];

  return (
    <>
      <Screen
        hero
        padded={false}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load();
        }}
      >
        <HeroHeader
          title={`${greetingForHour(new Date().getHours())}, ${firstName}`}
          subtitle={weekdayDateLabel(todayLocal())}
          accessory={<Avatar name={user?.name} uri={user?.picture} size={44} />}
        >
          <View style={styles.status} accessibilityRole="summary">
            <Ionicons
              name={week.trained_today ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={week.trained_today ? colors.onBrandAccent : colors.onBrandMuted}
            />
            <AppText variant="label" tone="onBrand" style={styles.statusText}>
              {week.trained_today ? 'Workout logged today. Nice.' : 'No workout logged yet today'}
            </AppText>
          </View>
          <View style={styles.stats}>
            <StatTile on="hero" value={week.streak_days} label="day streak" alert={week.streak_days >= 3} />
            <StatTile on="hero" value={`${week.workout_days}/${week.expected_days}`} label="workouts this week" />
            <StatTile on="hero" value={`${week.diet_days}/7`} label="diet days" />
          </View>
        </HeroHeader>

        <View style={styles.body}>
          <SectionHeader title="Log a session" style={styles.firstSection} />
          <QuickLogChips traineeId={traineeId} codes={user?.interests} />

          <SectionHeader title="Your record" />
          {shortcuts.map((s) => (
            <ListRow
              key={s.section}
              leading={<IconBadge name={s.icon} tone={s.tone} size={40} />}
              title={s.label}
              subtitle={s.detail}
              subtitleTone={s.alert ? 'error' : 'secondary'}
              accessibilityLabel={`${s.label}. ${s.detail}`}
              onPress={() => open(s.section)}
            />
          ))}

          {user?.trainer_id ? (
            <View style={styles.rate}>
              <RateCoachCard coachId={user.trainer_id} />
            </View>
          ) : null}
        </View>
      </Screen>

      <FirstRunHints
        storageKey={hintsKey}
        steps={HINT_STEPS}
        visible={showHints}
        onDismiss={() => setShowHints(false)}
        onPrimary={() => undefined}
      />
    </>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    status: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.brandRaised,
      borderRadius: Radii.pill,
      paddingVertical: Spacing.small,
      paddingLeft: Spacing.small + 2,
      paddingRight: Spacing.medium,
      marginBottom: Spacing.medium,
    },
    statusText: {
      marginLeft: Spacing.small,
    },
    stats: {
      flexDirection: 'row',
      gap: Spacing.small,
    },
    body: {
      paddingHorizontal: Spacing.medium,
      paddingTop: Spacing.medium,
    },
    firstSection: {
      marginTop: Spacing.small,
    },
    rate: {
      marginTop: Spacing.large,
    },
  });
