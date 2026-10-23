import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import FirstRunHints, { hasCompletedFirstRunHints } from '@/components/FirstRunHints';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { QuickLogChips } from '@/components/QuickLogChips';
import { RateCoachCard } from '@/components/RateCoachCard';
import { Screen } from '@/components/Screen';
import { Spacing } from '@/constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useReviewPrompt } from '../hooks/useReviewPrompt';
import { fetchMyAdherence } from '../services/adherenceService';
import { getFees } from '../services/feesService';
import { errorMessage } from '../services/http';
import { getProgress } from '../services/progressService';
import { listWorkoutLogs } from '../services/workoutService';
import type { AdherenceSummary } from '../types/auth';
import type { FeeSummary } from '../types/fees';
import type { ClientSection, RootStackParamList } from '../types/navigation';
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

/** A client's home: today's status, quick logging, streak, weight and shortcuts to their record. */
export default function ClientTodayScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
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

  return (
    <>
      <Screen
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load();
        }}
      >
        <AppText variant="title" style={styles.greeting}>
          Hey {firstName}
        </AppText>

        <Card style={styles.card}>
          <AppText variant="heading" tone={week.trained_today ? 'success' : 'primary'}>
            {week.trained_today ? 'Workout logged today' : 'No workout logged yet today'}
          </AppText>
          <View style={styles.stats}>
            <Stat value={String(week.streak_days)} label="day streak" />
            <Stat value={`${week.workout_days}/${week.expected_days}`} label="workouts this week" />
            <Stat value={`${week.diet_days}/7`} label="diet days" />
          </View>
        </Card>

        <AppText variant="heading" style={styles.heading}>
          Log a session
        </AppText>
        <QuickLogChips traineeId={traineeId} codes={user?.interests} />

        <AppText variant="heading" style={styles.heading}>
          Your record
        </AppText>
        <Shortcut label="History" detail="Your workouts" onPress={() => open('workouts')} />
        <Shortcut label="Meals" detail="Log and review your diet" onPress={() => open('diet')} />
        <Shortcut
          label="Weight"
          detail={latestWeight !== undefined ? `Latest: ${latestWeight} kg` : 'Add your first weigh-in'}
          onPress={() => open('weight')}
        />
        <Shortcut
          label="Attendance"
          detail={activePackage ? `${activePackage.sessions_left} sessions left in ${activePackage.name}` : 'Sessions with your coach'}
          onPress={() => open('attendance')}
        />
        <Shortcut
          label="Fees"
          detail={fees.due_paise > 0 ? `${formatRupees(fees.due_paise)} due` : 'Nothing due'}
          onPress={() => open('fees')}
        />

        {user?.trainer_id ? (
          <View style={styles.rate}>
            <RateCoachCard coachId={user.trainer_id} />
          </View>
        ) : null}
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

function Stat({ value, label }: { value: string; label: string }): React.JSX.Element {
  return (
    <View style={styles.stat}>
      <AppText variant="title" tone="brand">
        {value}
      </AppText>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

function Shortcut({ label, detail, onPress }: { label: string; detail: string; onPress: () => void }): React.JSX.Element {
  return (
    <Card onPress={onPress} accessibilityLabel={`${label}. ${detail}`} style={styles.shortcut}>
      <AppText variant="subheading">{label}</AppText>
      <AppText variant="caption" tone="secondary">
        {detail}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  greeting: {
    marginBottom: Spacing.medium,
  },
  card: {
    marginBottom: Spacing.small,
  },
  stats: {
    flexDirection: 'row',
    marginTop: Spacing.medium,
  },
  stat: {
    flex: 1,
  },
  heading: {
    marginTop: Spacing.medium,
    marginBottom: Spacing.small,
  },
  shortcut: {
    marginBottom: Spacing.small,
  },
  rate: {
    marginTop: Spacing.medium,
  },
});
