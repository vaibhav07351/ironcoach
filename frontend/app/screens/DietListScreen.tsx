import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DayNavigator } from '@/components/DayNavigator';
import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { StatTile } from '@/components/StatTile';
import { Spacing, webScrollFix } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../contexts/ThemeContext';
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
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
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
      style={[webScrollFix, styles.root]}
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
      <DayNavigator
        date={date}
        onChange={(d) => {
          setEntry(undefined);
          setDate(d);
        }}
      />

      {entry === undefined ? (
        loadError ? (
          <ErrorState message={loadError} onRetry={() => void load()} />
        ) : (
          <LoadingState />
        )
      ) : (
        <>
          <View style={styles.totals}>
            <StatTile value={round(entry?.total_calories ?? 0)} label="kcal" />
            <StatTile value={round(entry?.total_proteins ?? 0)} label="protein g" />
            <StatTile value={round(entry?.total_carbs ?? 0)} label="carbs g" />
            <StatTile value={round(entry?.total_fats ?? 0)} label="fat g" />
          </View>

          {mealNames.map((name) => {
            const meal = entry?.meals.find((m) => m.name === name);
            const foods = meal?.foods ?? [];
            return (
              <Card key={name} style={styles.meal}>
                <View style={styles.mealHeader}>
                  <View style={styles.flex}>
                    <AppText variant="subheading">{name}</AppText>
                    <AppText variant="caption" tone={meal ? 'secondary' : 'muted'}>
                      {meal ? `${round(meal.calories)} kcal, ${round(meal.proteins)} g protein` : 'Nothing logged'}
                    </AppText>
                  </View>
                  <Button
                    title="Add"
                    variant="secondary"
                    size="small"
                    icon="add"
                    disabled={busy}
                    onPress={() =>
                      navigation.navigate('AddFood', { traineeId: record.id, date, mealName: name, existingFoods: foods })
                    }
                  />
                </View>
                {foods.map((f, i) => (
                  <View key={`${f.name}-${i}`} style={styles.food}>
                    <View style={styles.flex}>
                      <AppText numberOfLines={2}>{f.name}</AppText>
                      <AppText variant="caption" tone="secondary">
                        {f.quantity} {f.units}, {round(f.calories)} kcal, {round(f.proteins)} g protein
                      </AppText>
                    </View>
                    <IconButton
                      icon="close-circle-outline"
                      accessibilityLabel={`Remove ${f.name}`}
                      disabled={busy}
                      onPress={() => void onRemove(name, i)}
                    />
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

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { backgroundColor: colors.bg },
    content: { padding: Spacing.medium, paddingBottom: Spacing.xxl },
    flex: { flex: 1, minWidth: 0 },
    totals: { flexDirection: 'row', gap: Spacing.small, marginBottom: Spacing.medium },
    meal: { marginBottom: Spacing.small + 4 },
    mealHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.small },
    food: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: Spacing.small + 2,
      marginTop: Spacing.small + 2,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
    },
  });
