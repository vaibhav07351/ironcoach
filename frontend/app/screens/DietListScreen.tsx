import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DayNavigator } from '@/components/DayNavigator';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Colors, Spacing } from '@/constants/theme';
import { useTraineeRecord } from '../contexts/TraineeRecordContext';
import { getDietForDay, removeFoodFromDay } from '../services/dietService';
import { errorMessage } from '../services/http';
import type { DietEntry } from '../types/diet';
import type { RootStackParamList } from '../types/navigation';
import { todayLocal } from '../utils/date';

const MEALS = ['Breakfast', 'Morning snack', 'Lunch', 'Evening snack', 'Dinner', 'Post workout'];

const round = (n: number): number => Math.round(n);

/** One day's meals and totals for the current client record. */
export default function DietListScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const record = useTraineeRecord();
  const [date, setDate] = useState(todayLocal());
  const [entry, setEntry] = useState<DietEntry | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setEntry(await getDietForDay(record.id, date));
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [record.id, date]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRemove = async (mealName: string, index: number): Promise<void> => {
    setBusy(true);
    try {
      await removeFoodFromDay(record.id, date, mealName, index);
      await load();
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not removed', text2: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  // Show the standard meals plus any custom-named meals already logged.
  const mealNames = [...MEALS, ...(entry?.meals ?? []).map((m) => m.name).filter((n) => !MEALS.includes(n))];

  return (
    <ScrollView
      style={styles.root}
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
      <DayNavigator
        date={date}
        onChange={(d) => {
          setEntry(undefined);
          setDate(d);
        }}
      />

      {entry === undefined ? (
        loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />
      ) : (
        <>
          <View style={styles.totals}>
            {[
              ['Calories', round(entry?.total_calories ?? 0), 'kcal'],
              ['Protein', round(entry?.total_proteins ?? 0), 'g'],
              ['Carbs', round(entry?.total_carbs ?? 0), 'g'],
              ['Fat', round(entry?.total_fats ?? 0), 'g'],
            ].map(([label, value, unit]) => (
              <Card key={String(label)} style={styles.total}>
                <AppText variant="heading" tone="brand" center>
                  {value}
                </AppText>
                <AppText variant="caption" tone="secondary" center>
                  {label} ({unit})
                </AppText>
              </Card>
            ))}
          </View>

          {mealNames.map((name) => {
            const meal = entry?.meals.find((m) => m.name === name);
            return (
              <Card key={name} style={styles.meal}>
                <View style={styles.mealHeader}>
                  <View style={styles.flex}>
                    <AppText variant="subheading">{name}</AppText>
                    {meal ? (
                      <AppText variant="caption" tone="secondary">
                        {round(meal.calories)} kcal · {round(meal.proteins)} g protein
                      </AppText>
                    ) : null}
                  </View>
                  <Button
                    title="Add"
                    variant="ghost"
                    icon="add"
                    disabled={busy}
                    onPress={() =>
                      navigation.navigate('AddFood', { traineeId: record.id, date, mealName: name, existingFoods: meal?.foods ?? [] })
                    }
                  />
                </View>
                {(meal?.foods ?? []).map((f, i) => (
                  <View key={`${f.name}-${i}`} style={styles.food}>
                    <View style={styles.flex}>
                      <AppText>{f.name}</AppText>
                      <AppText variant="caption" tone="muted">
                        {f.quantity} {f.units} · {round(f.calories)} kcal · {round(f.proteins)} g protein
                      </AppText>
                    </View>
                    <Pressable
                      onPress={() => void onRemove(name, i)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${f.name}`}
                      hitSlop={8}
                      style={styles.remove}
                    >
                      <Ionicons name="close-circle-outline" size={22} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                ))}
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.medium, paddingBottom: Spacing.xl },
  flex: { flex: 1, minWidth: 0 },
  totals: { flexDirection: 'row', gap: Spacing.small, marginBottom: Spacing.medium },
  total: { flex: 1, paddingHorizontal: Spacing.xs },
  meal: { marginBottom: Spacing.small },
  mealHeader: { flexDirection: 'row', alignItems: 'center' },
  food: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs },
  remove: { width: 40, alignItems: 'center' },
});
