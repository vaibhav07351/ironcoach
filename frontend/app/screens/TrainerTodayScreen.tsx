import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import FirstRunHints, { hasCompletedFirstRunHints } from '@/components/FirstRunHints';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { HeroHeader } from '@/components/HeroHeader';
import { IconBadge } from '@/components/IconBadge';
import { ListRow } from '@/components/ListRow';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { StatTile } from '@/components/StatTile';
import { WinsList } from '@/components/WinsList';
import { Spacing } from '@/constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFeeReminder } from '../hooks/useFeeReminder';
import { errorMessage } from '../services/http';
import { getTodayOverview } from '../services/todayService';
import type { TodayOverview } from '../types/fees';
import type { RootStackParamList } from '../types/navigation';
import { greetingForHour, weekdayDateLabel } from '../utils/date';
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

/** The trainer's home: who trained, who is slipping, coaching requests and fees due. */
export default function TrainerTodayScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { colors } = useTheme();
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

  const openClient = (id: string, name: string, section?: 'fees' | 'progress'): void =>
    navigation.navigate('TraineeDetail', { trainee: { id, name }, section });

  if (!today) {
    return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;
  }

  const firstName = user?.name?.split(' ')[0] || 'Coach';
  const noClients = today.client_count === 0;

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
        footer={
          <Button
            title={noClients ? 'Add your first client' : 'Add client'}
            icon="person-add"
            onPress={() => navigation.navigate('TraineeForm')}
          />
        }
      >
        <HeroHeader
          title={`${greetingForHour(new Date().getHours())}, ${firstName}`}
          subtitle={weekdayDateLabel(today.date)}
          accessory={<Avatar name={user?.name} uri={user?.picture} size={44} />}
        >
          {noClients ? null : (
            <View style={styles.stats}>
              <StatTile
                on="hero"
                value={today.client_count}
                label={today.client_count === 1 ? 'client' : 'clients'}
                onPress={() => navigation.navigate('TrainerTabs', { screen: 'Clients' })}
                accessibilityHint="Opens your client list"
              />
              <StatTile on="hero" value={today.trained_today.length} label="trained today" />
              <StatTile on="hero" value={today.attended_today.length} label="attended today" />
            </View>
          )}
        </HeroHeader>

        <View style={styles.body}>
          {noClients ? (
            <EmptyState
              icon="people-outline"
              title="No clients yet"
              message="Add your first client. They do not need the app: you can log their sessions and fees yourself."
            />
          ) : (
            <>
              {today.pending_requests > 0 ? (
                <Card
                  onPress={() => navigation.navigate('CoachRequests')}
                  accessibilityLabel={`${today.pending_requests} new coaching requests. Review`}
                  style={styles.requests}
                >
                  <View style={styles.requestRow}>
                    <IconBadge name="mail-unread" tone="accent" />
                    <View style={styles.flex}>
                      <AppText variant="subheading">
                        {today.pending_requests} new coaching request{today.pending_requests === 1 ? '' : 's'}
                      </AppText>
                      <AppText variant="caption" tone="secondary">
                        Tap to review
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                </Card>
              ) : null}

              <SectionHeader
                title="Slipping"
                style={styles.firstSection}
                right={today.slipping.length > 0 ? <Badge label={String(today.slipping.length)} tone="danger" /> : null}
              />
              {today.slipping.length === 0 ? (
                <AllClear text="Nobody is slipping. Nice work." />
              ) : (
                today.slipping.map((s) => (
                  <ListRow
                    key={s.trainee_id}
                    leading={<Avatar name={s.trainee_name} />}
                    title={s.trainee_name || 'Client'}
                    subtitle={`${lastLoggedLabel(s.last_activity_date)}${s.missed_yesterday ? ', missed yesterday' : ''}`}
                    subtitleTone="error"
                    accessibilityLabel={`Open ${s.trainee_name || 'client'}`}
                    onPress={() => openClient(s.trainee_id, s.trainee_name || 'Client')}
                  />
                ))
              )}

              <SectionHeader
                title="Fees due"
                right={
                  today.dues_total_paise > 0 ? (
                    <AppText variant="subheading" tone="error" style={styles.amount}>
                      {formatRupees(today.dues_total_paise)}
                    </AppText>
                  ) : null
                }
              />
              {today.dues.length === 0 ? (
                <AllClear text="No fees due. Everyone is paid up." />
              ) : (
                today.dues.map((d) => (
                  <ListRow
                    key={d.trainee_id}
                    leading={<Avatar name={d.name} />}
                    title={d.name}
                    subtitle={`${formatRupees(d.due_paise)} due`}
                    accessibilityLabel={`Open fees of ${d.name}`}
                    onPress={() => openClient(d.trainee_id, d.name, 'fees')}
                    right={
                      <Button
                        title="Remind"
                        icon="logo-whatsapp"
                        variant="secondary"
                        size="small"
                        disabled={busy}
                        onPress={() => void remind({ clientName: d.name, phone: d.phone_number, duePaise: d.due_paise })}
                      />
                    }
                  />
                ))
              )}

              {today.trained_today.length > 0 ? (
                <>
                  <SectionHeader
                    title="Trained today"
                    right={<Badge label={String(today.trained_today.length)} tone="success" />}
                  />
                  {today.trained_today.map((c) => (
                    <ListRow
                      key={c.trainee_id}
                      leading={<Avatar name={c.name} />}
                      title={c.name}
                      subtitle="Logged a workout today"
                      subtitleTone="success"
                      accessibilityLabel={`Open ${c.name}`}
                      onPress={() => openClient(c.trainee_id, c.name)}
                    />
                  ))}
                </>
              ) : null}

              <WinsList wins={today.wins ?? []} onOpen={(id, name) => openClient(id, name, 'progress')} />
            </>
          )}
        </View>
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

/** A calm one-line "nothing to do here" for a section, so an empty section still reads as good news. */
function AllClear({ text }: { text: string }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.allClear}>
      <Ionicons name="checkmark-circle" size={18} color={colors.success} style={styles.allClearIcon} />
      <AppText tone="secondary" style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    gap: Spacing.small,
  },
  body: {
    paddingHorizontal: Spacing.medium,
    paddingTop: Spacing.medium,
  },
  requests: {
    marginBottom: Spacing.small,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.small + 4,
  },
  firstSection: {
    marginTop: Spacing.small,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
  allClear: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.small,
  },
  allClearIcon: {
    marginRight: Spacing.small,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
});
