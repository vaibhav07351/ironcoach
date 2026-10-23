import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { QuickLogChips } from '@/components/QuickLogChips';
import { Colors, Spacing } from '@/constants/theme';
import { useTraineeRecord } from '../app/contexts/TraineeRecordContext';
import { fetchClientAdherence } from '../app/services/adherenceService';
import { markAttended } from '../app/services/attendanceService';
import { getFees } from '../app/services/feesService';
import { errorMessage } from '../app/services/http';
import type { AdherenceSummary } from '../app/types/auth';
import type { FeeSummary } from '../app/types/fees';
import type { ClientSection } from '../app/types/navigation';
import { todayLocal } from '../app/utils/date';
import { lastLoggedLabel } from '../app/utils/lastLogged';
import { formatRupees } from '../app/utils/money';

type Props = {
  onOpenSection: (section: ClientSection) => void;
};

/** Trainer view of one client: how the week is going, what is due, and shortcuts to act. */
export function OverviewSection({ onOpenSection }: Props): React.JSX.Element {
  const record = useTraineeRecord();
  const [week, setWeek] = useState<AdherenceSummary | null>(null);
  const [fees, setFees] = useState<FeeSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);
  const [markedToday, setMarkedToday] = useState(false);

  const load = useCallback(async () => {
    try {
      const [adherence, summary] = await Promise.all([fetchClientAdherence(record.id), getFees(record.id)]);
      setWeek(adherence);
      setFees(summary);
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [record.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const markToday = async (): Promise<void> => {
    setMarking(true);
    try {
      await markAttended(record.id, todayLocal());
      setMarkedToday(true);
      Toast.show({ type: 'success', text1: 'Marked attended today' });
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not saved', text2: errorMessage(e) });
    } finally {
      setMarking(false);
    }
  };

  if (!week || !fees) {
    return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;
  }

  const activePackage = fees.packages.find((p) => p.status === 'active' && p.kind === 'sessions');

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={Colors.primary}
        />
      }
    >
      <Card style={styles.card}>
        <AppText variant="label" tone="secondary">
          This week
        </AppText>
        <View style={styles.stats}>
          <Stat value={`${week.workout_days}/${week.expected_days}`} label="workouts" />
          <Stat value={`${week.diet_days}/7`} label="diet days" />
          <Stat value={String(week.streak_days)} label="day streak" />
        </View>
        <AppText variant="caption" tone={week.at_risk ? 'error' : 'secondary'}>
          {lastLoggedLabel(week.last_activity_date)}
          {week.at_risk ? ', slipping' : ''}
        </AppText>
      </Card>

      <Card style={styles.card} onPress={() => onOpenSection('fees')} accessibilityLabel="Open fees">
        <AppText variant="label" tone="secondary">
          Fees
        </AppText>
        <AppText variant="heading" tone={fees.due_paise > 0 ? 'error' : 'success'}>
          {fees.due_paise > 0 ? `${formatRupees(fees.due_paise)} due` : 'Nothing due'}
        </AppText>
        {activePackage ? (
          <AppText variant="caption" tone="secondary">
            {activePackage.name}: {activePackage.sessions_left} sessions left
          </AppText>
        ) : (
          <AppText variant="caption" tone="secondary">
            No active session package
          </AppText>
        )}
      </Card>

      <Card style={styles.card}>
        <AppText variant="label" tone="secondary">
          Log for {record.name}
        </AppText>
        <QuickLogChips traineeId={record.id} />
        <Button
          title={markedToday ? 'Attended today' : 'Mark attended today'}
          icon="checkmark-circle-outline"
          variant="secondary"
          loading={marking}
          disabled={markedToday}
          onPress={() => void markToday()}
          style={styles.markButton}
        />
        <Button
          title="Invite or edit client"
          variant="ghost"
          onPress={() => onOpenSection('profile')}
          accessibilityHint="Opens the profile section where you can edit details and invite the client"
        />
      </Card>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }): React.JSX.Element {
  return (
    <View style={styles.stat}>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.medium,
    paddingBottom: 120,
  },
  card: {
    marginBottom: Spacing.medium,
  },
  stats: {
    flexDirection: 'row',
    marginVertical: Spacing.small,
  },
  stat: {
    flex: 1,
  },
  markButton: {
    marginTop: Spacing.small,
  },
});
