import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { TextField } from '@/components/TextField';
import { Colors, Spacing } from '@/constants/theme';
import { useTraineeRecord } from '../contexts/TraineeRecordContext';
import { errorMessage } from '../services/http';
import { getProgress, logWeight } from '../services/progressService';
import type { Progress } from '../types/progress';
import { relativeDayLabel, todayLocal } from '../utils/date';

const CHART_POINTS = 12;

/** Weight trend, today's weigh-in and best lifts for the current client record. */
export default function ProgressScreen(): React.JSX.Element {
  const record = useTraineeRecord();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<Progress | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getProgress(record.id));
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

  const onLogWeight = async (): Promise<void> => {
    const kg = Number(weight);
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
      Toast.show({ type: 'error', text1: 'Enter weight in kg', text2: 'Between 20 and 400' });
      return;
    }
    setSaving(true);
    try {
      await logWeight({ trainee_id: record.id, date: todayLocal(), weight: kg });
      setWeight('');
      await load();
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not saved', text2: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  if (!data) return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;

  const weights = (data.weight_bmi ?? []).slice(-CHART_POINTS);
  const latest = weights[weights.length - 1];
  const exercises = [...(data.exercises ?? [])].sort((a, b) => b.max_weight - a.max_weight);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
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
        <AppText variant="subheading">Weight</AppText>
        {latest ? (
          <AppText tone="secondary">
            {latest.weight} kg on {relativeDayLabel(latest.date)}
            {latest.bmi ? ` · BMI ${latest.bmi.toFixed(1)}` : ''}
          </AppText>
        ) : (
          <AppText tone="secondary">No weigh-ins yet.</AppText>
        )}
        {weights.length >= 2 ? (
          <LineChart
            data={{ labels: weights.map((w) => w.date.slice(5)), datasets: [{ data: weights.map((w) => w.weight) }] }}
            width={width - Spacing.medium * 4}
            height={180}
            yAxisSuffix=""
            withInnerLines={false}
            chartConfig={{
              backgroundGradientFrom: Colors.surface,
              backgroundGradientTo: Colors.surface,
              decimalPlaces: 1,
              color: () => Colors.primary,
              labelColor: () => Colors.textSecondary,
              propsForDots: { r: '3' },
            }}
            bezier
            style={styles.chart}
          />
        ) : null}
        <View style={styles.weighIn}>
          <View style={styles.flex}>
            <TextField label="Today's weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" maxLength={6} />
          </View>
          <Button title="Save" onPress={() => void onLogWeight()} loading={saving} style={styles.save} />
        </View>
      </Card>

      <Card style={styles.card}>
        <AppText variant="subheading">Best lifts</AppText>
        {exercises.length === 0 ? (
          <AppText tone="secondary">Logged gym exercises show their best weight here.</AppText>
        ) : (
          exercises.map((e) => (
            <View key={e.exercise} style={styles.lift}>
              <AppText style={styles.flex}>{e.exercise}</AppText>
              <AppText variant="label">{e.max_weight} kg</AppText>
              <AppText variant="caption" tone="muted" style={styles.avg}>
                avg {Math.round(e.avg_weight)}
              </AppText>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.medium, paddingBottom: Spacing.xl },
  card: { marginBottom: Spacing.medium },
  chart: { marginTop: Spacing.small, marginLeft: -Spacing.medium },
  weighIn: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.small, marginTop: Spacing.medium },
  save: { marginBottom: Spacing.medium },
  flex: { flex: 1, minWidth: 0 },
  lift: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs },
  avg: { width: 64, textAlign: 'right' },
});
