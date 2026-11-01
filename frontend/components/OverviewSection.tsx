import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { IconBadge } from '@/components/IconBadge';
import { LoadingState } from '@/components/LoadingState';
import { QuickLogChips } from '@/components/QuickLogChips';
import { SectionHeader } from '@/components/SectionHeader';
import { StatTile } from '@/components/StatTile';
import { Spacing, webScrollFix } from '@/constants/theme';
import { useTheme } from '../app/contexts/ThemeContext';
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
  const { colors } = useTheme();
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
  const due = fees.due_paise > 0;

  return (
    <ScrollView
      style={webScrollFix}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={colors.tint}
          colors={[colors.tint]}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      <SectionHeader title="This week" style={styles.firstSection} />
      <View style={styles.stats}>
        <StatTile value={`${week.workout_days}/${week.expected_days}`} label="workouts" />
        <StatTile value={`${week.diet_days}/7`} label="diet days" />
        <StatTile value={week.streak_days} label="day streak" />
      </View>
      <View style={styles.activity}>
        <Ionicons
          name={week.at_risk ? 'alert-circle' : 'time-outline'}
          size={16}
          color={week.at_risk ? colors.danger : colors.textSecondary}
          style={styles.activityIcon}
        />
        <AppText variant="caption" tone={week.at_risk ? 'error' : 'secondary'}>
          {lastLoggedLabel(week.last_activity_date)}
          {week.at_risk ? ', slipping' : ''}
        </AppText>
      </View>

      <SectionHeader title="Fees" />
      <Card onPress={() => onOpenSection('fees')} accessibilityLabel="Open fees">
        <View style={styles.feeRow}>
          <IconBadge name="wallet" tone={due ? 'danger' : 'success'} />
          <View style={styles.flex}>
            <AppText variant="subheading" tone={due ? 'error' : 'success'}>
              {due ? `${formatRupees(fees.due_paise)} due` : 'Nothing due'}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {activePackage
                ? `${activePackage.name}: ${activePackage.sessions_left} sessions left`
                : 'No active session package'}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Card>

      <SectionHeader title={`Log for ${record.name}`} />
      <QuickLogChips traineeId={record.id} />
      <Button
        title={markedToday ? 'Attended today' : 'Mark attended today'}
        icon={markedToday ? 'checkmark-circle' : 'checkmark-circle-outline'}
        variant="secondary"
        loading={marking}
        disabled={markedToday}
        onPress={() => void markToday()}
        style={styles.markButton}
      />
      <Button
        title="Invite or edit client"
        variant="ghost"
        icon="person-outline"
        onPress={() => onOpenSection('profile')}
        accessibilityHint="Opens the profile section where you can edit details and invite the client"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.medium,
    paddingBottom: 120,
  },
  firstSection: {
    marginTop: 0,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.small,
  },
  activity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.small + 4,
  },
  activityIcon: {
    marginRight: Spacing.xs + 2,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.small + 4,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  markButton: {
    marginTop: Spacing.small,
  },
});
