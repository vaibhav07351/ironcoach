import React, { useLayoutEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Colors, Spacing } from '@/constants/theme';
import { addFoodToDay } from '../services/dietService';
import { errorMessage } from '../services/http';
import { searchNutrition, type NutritionFood } from '../services/nutritionService';
import type { Food } from '../types/food';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'AddFood'>;

type Draft = { name: string; quantity: string; units: string; calories: string; proteins: string; carbs: string; fats: string };

const empty: Draft = { name: '', quantity: '', units: 'g', calories: '', proteins: '', carbs: '', fats: '' };
const r1 = (n: number): string => String(Math.round(n * 10) / 10);

/** Add one food to a meal: search the food database (values scale with grams) or type macros. */
export default function AddFoodScreen({ route, navigation }: Props): React.JSX.Element {
  const { traineeId, date, mealName, existingFoods } = route.params;
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<NutritionFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [per100, setPer100] = useState<NutritionFood | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: `Add to ${mealName}` });
  }, [navigation, mealName]);

  const runSearch = async (): Promise<void> => {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const foods = await searchNutrition(query.trim());
      setHits(foods);
      if (foods.length === 0) Toast.show({ type: 'info', text1: 'No foods found', text2: 'Enter the values yourself.' });
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Search failed', text2: errorMessage(e) });
    } finally {
      setSearching(false);
    }
  };

  const scaled = (hit: NutritionFood, grams: number): Draft => {
    const f = hit.per_100g ? grams / 100 : 1;
    return {
      name: hit.brand ? `${hit.name} (${hit.brand})` : hit.name,
      quantity: String(grams),
      units: 'g',
      calories: r1(hit.calories * f),
      proteins: r1(hit.proteins * f),
      carbs: r1(hit.carbs * f),
      fats: r1(hit.fats * f),
    };
  };

  const pick = (hit: NutritionFood): void => {
    setPer100(hit);
    setDraft(scaled(hit, 100));
    setHits([]);
  };

  const setQuantity = (v: string): void => {
    const grams = Number(v);
    if (per100 && per100.per_100g && Number.isFinite(grams) && grams > 0 && draft.units === 'g') {
      setDraft({ ...scaled(per100, grams), quantity: v });
    } else {
      setDraft({ ...draft, quantity: v });
    }
  };

  const onSave = async (): Promise<void> => {
    const nums = ['quantity', 'calories', 'proteins', 'carbs', 'fats'] as const;
    const parsed: Record<(typeof nums)[number], number> = { quantity: 0, calories: 0, proteins: 0, carbs: 0, fats: 0 };
    for (const k of nums) {
      const n = draft[k].trim() === '' ? 0 : Number(draft[k]);
      if (!Number.isFinite(n) || n < 0) {
        setError(`${k} must be a positive number`);
        return;
      }
      parsed[k] = n;
    }
    if (!draft.name.trim() || parsed.quantity <= 0) {
      setError('Enter the food name and quantity');
      return;
    }
    const food: Food = {
      name: draft.name.trim(),
      quantity: parsed.quantity,
      units: draft.units.trim() || 'g',
      calories: parsed.calories,
      proteins: parsed.proteins,
      carbs: parsed.carbs,
      fats: parsed.fats,
      external_id: per100?.external_id,
    };
    setError(null);
    setSaving(true);
    try {
      await addFoodToDay(traineeId, date, mealName, food);
      navigation.goBack();
    } catch (e: unknown) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  const field = (key: keyof Draft, label: string, numeric = true): React.JSX.Element => (
    <TextField
      label={label}
      value={draft[key]}
      onChangeText={key === 'quantity' ? setQuantity : (v) => setDraft({ ...draft, [key]: v })}
      keyboardType={numeric ? 'decimal-pad' : 'default'}
      style={styles.half}
    />
  );

  return (
    <Screen footer={<Button title="Add food" onPress={() => void onSave()} loading={saving} />}>
      <TextField
        label="Search foods"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => void runSearch()}
        returnKeyType="search"
        placeholder="e.g. paneer, banana, oats"
      />
      <Button title="Search" variant="secondary" onPress={() => void runSearch()} loading={searching} />
      {hits.map((h) => (
        <Pressable key={h.external_id} onPress={() => pick(h)} accessibilityRole="button" style={styles.hit}>
          <AppText>{h.name}</AppText>
          <AppText variant="caption" tone="muted">
            {h.brand ? `${h.brand} · ` : ''}
            {Math.round(h.calories)} kcal · {Math.round(h.proteins)} g protein {h.per_100g ? 'per 100 g' : h.serving_desc ?? ''}
          </AppText>
        </Pressable>
      ))}

      <AppText variant="label" tone="secondary" style={styles.section}>
        Food details
      </AppText>
      <TextField label="Name" value={draft.name} onChangeText={(v) => setDraft({ ...draft, name: v })} maxLength={120} />
      <View style={styles.row}>
        {field('quantity', 'Quantity')}
        {field('units', 'Unit', false)}
      </View>
      <View style={styles.row}>
        {field('calories', 'Calories (kcal)')}
        {field('proteins', 'Protein (g)')}
      </View>
      <View style={styles.row}>
        {field('carbs', 'Carbs (g)')}
        {field('fats', 'Fat (g)')}
      </View>
      {error ? <AppText tone="error">{error}</AppText> : null}

      {existingFoods.length > 0 ? (
        <Card style={styles.section}>
          <AppText variant="label" tone="secondary">
            Already in {mealName}
          </AppText>
          {existingFoods.map((f, i) => (
            <AppText key={`${f.name}-${i}`} variant="caption">
              {f.name} · {f.quantity} {f.units}
            </AppText>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hit: {
    paddingVertical: Spacing.small,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  section: { marginTop: Spacing.large, marginBottom: Spacing.small },
  row: { flexDirection: 'row', gap: Spacing.small },
  half: {},
});
