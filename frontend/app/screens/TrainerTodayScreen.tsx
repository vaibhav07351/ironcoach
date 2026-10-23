import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import FirstRunHints, { hasCompletedFirstRunHints } from '@/components/FirstRunHints';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { TodayRow } from '@/components/TodayRow';
import { Spacing } from '@/constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useFeeReminder } from '../hooks/useFeeReminder';
import { errorMessage } from '../services/http';
import { getTodayOverview } from '../services/todayService';
import type { TodayOverview } from '../types/fees';
import type { RootStackParamList } from '../types/navigation';
import { lastLoggedLabel } from '../utils/lastLogged';
import { formatRupees } from '../utils/money';

const HINT_STEPS = [
  {
    title: 'Add your clients',
    body: 'Add a client even if they never install the app. You can log their workouts and attendance yourself.',
  },
  {
    title: 'Track fees',
    body: 'Open a client, then Fees, to sell a package and record payments. One tap sends a WhatsApp reminder.',
  },
  {
    title: 'Start your day here',
    body: 'Today shows who trained, who is slipping and who owes fees.',
  },
];

function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** The trainer's home: who trained, who is slipping, coaching requests and fees due. */
export default function TrainerTodayScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { remind, busy } = useFeeReminder();
  const [today, setToday] = useState<TodayOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const hintsKey = `first_run_hints_trainer_v2_${user?.id ?? ''}`;

  const load = useCallback(async () => {
    try {
      setToday(await getTodayOverview());
      setLoadError(null);
      setShowHints(!(await hasCompletedFirstRunHints(hintsKey)));
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [hintsKey]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openClient = (id: string, name: string, section?: 'fees'): void =>
    navigation.navigate('TraineeDetail', { trainee: { id, name }, section });

  if (!today) {
    return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;
  }

  const firstName = user?.name?.split(' ')[0] || 'Coach';

  return (
    <>
      <Screen
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load();
        }}
        footer={<Button title="Add client" icon="person-add-outline" onPress={() => navigation.navigate('TraineeForm')} />}
      >
        <AppText variant="title" style={styles.greeting}>
          {greetingForHour(new Date().getHours())}, {firstName}
        </AppText>

        {today.client_count === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No clients yet"
            message="Add your first client. They do not need the app: you can log their sessions and fees yourself."
          />
        ) : (
          <>
            <Card style={styles.stats}>
              <Stat value={today.client_count} label="clients" />
              <Stat value={today.trained_today.length} label="trained today" />
              <Stat value={today.attended_today.length} label="attended today" />
            </Card>

            {today.pending_requests > 0 ? (
              <Card onPress={() => navigation.navigate('CoachRequests')} accessibilityLabel="Review coaching requests" style={styles.banner}>
                <AppText variant="subheading">
                  {today.pending_requests} new coaching request{today.pending_requests === 1 ? '' : 's'}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  Tap to review
                </AppText>
              </Card>
            ) : null}

            <AppText variant="heading" style={styles.heading}>
              Slipping
            </AppText>
            {today.slipping.length === 0 ? (
              <AppText tone="secondary" style={styles.none}>
                Nobody is slipping. Nice work.
              </AppText>
            ) : (
              today.slipping.map((s) => (
                <TodayRow
                  key={s.trainee_id}
                  title={s.trainee_name || 'Client'}
                  subtitle={`${lastLoggedLabel(s.last_activity_date)}${s.missed_yesterday ? ', missed yesterday' : ''}`}
                  subtitleTone="error"
                  accessibilityLabel={`Open ${s.trainee_name || 'client'}`}
                  onPress={() => openClient(s.trainee_id, s.trainee_name || 'Client')}
                />
              ))
            )}

            <AppText variant="heading" style={styles.heading}>
              Fees due{today.dues_total_paise > 0 ? `: ${formatRupees(today.dues_total_paise)}` : ''}
            </AppText>
            {today.dues.length === 0 ? (
              <AppText tone="secondary" style={styles.none}>
                No fees due.
              </AppText>
            ) : (
              today.dues.map((d) => (
                <TodayRow
                  key={d.trainee_id}
                  title={d.name}
                  subtitle={`${formatRupees(d.due_paise)} due`}
                  accessibilityLabel={`Open fees of ${d.name}`}
                  onPress={() => openClient(d.trainee_id, d.name, 'fees')}
                  right={
                    <Button
                      title="Remind"
                      icon="logo-whatsapp"
                      variant="secondary"
                      disabled={busy}
                      onPress={() => void remind({ clientName: d.name, phone: d.phone_number, duePaise: d.due_paise })}
                    />
                  }
                />
              ))
            )}

            {today.trained_today.length > 0 ? (
              <>
                <AppText variant="heading" style={styles.heading}>
                  Trained today
                </AppText>
                <View>
                  {today.trained_today.map((c) => (
                    <TodayRow
                      key={c.trainee_id}
                      title={c.name}
                      accessibilityLabel={`Open ${c.name}`}
                      onPress={() => openClient(c.trainee_id, c.name)}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </Screen>

      <FirstRunHints
        storageKey={hintsKey}
        steps={HINT_STEPS}
        visible={showHints}
        onDismiss={() => setShowHints(false)}
        onPrimary={(stepIndex) => {
          if (stepIndex === 0) {
            navigation.navigate('TraineeForm');
          }
        }}
        primaryLabel={(stepIndex, isLast) => (stepIndex === 0 ? 'Add client' : isLast ? 'Got it' : 'Next')}
      />
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }): React.JSX.Element {
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

const styles = StyleSheet.create({
  greeting: {
    marginBottom: Spacing.medium,
  },
  stats: {
    flexDirection: 'row',
    marginBottom: Spacing.medium,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  banner: {
    marginBottom: Spacing.medium,
  },
  heading: {
    marginTop: Spacing.medium,
    marginBottom: Spacing.small,
  },
  none: {
    marginBottom: Spacing.small,
  },
});
