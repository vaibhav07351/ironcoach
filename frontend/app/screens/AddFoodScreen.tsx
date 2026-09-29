import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { AuthContext } from '../contexts/AuthContext';
import {
  searchNutrition,
  type NutritionFood,
} from '../services/nutritionService';

type Food = {
  name: string;
  quantity: number;
  units: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  external_id?: string;
  brand?: string;
};

type Meal = {
  name: string;
  foods: Food[];
};

type Props = NativeStackScreenProps<RootStackParamList, 'AddFood'>;

const emptyFood = (): Food => ({
  name: '',
  quantity: 0,
  units: 'g',
  calories: 0,
  proteins: 0,
  carbs: 0,
  fats: 0,
});

export default function AddFoodScreen({ route, navigation }: Props): React.JSX.Element {
  const { dietEntryId, trainee, mealName, date } = route.params;
  const { token } = useContext(AuthContext);
  const [currentFood, setCurrentFood] = useState<Food>(emptyFood());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<NutritionFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [per100, setPer100] = useState<NutritionFood | null>(null);

  useEffect(() => {
    if (dietEntryId) {
      void handleExistingDietEntry(dietEntryId);
    }
  }, [dietEntryId]);

  const handleExistingDietEntry = async (entryId: string): Promise<void> => {
    const backendUrl = Constants.expoConfig?.extra?.backendUrl;
    try {
      const authToken = token || (await AsyncStorage.getItem('token'));
      if (!authToken) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Token not found',
          text2: 'Please log in again.',
        });
        navigation.navigate('Login');
        return;
      }
      const response = await fetch(`${backendUrl}/diet_entries/entry/${entryId}`, {
        headers: { Authorization: `${authToken}` },
      });
      if (!response.ok) {
        throw new Error('Diet entry not found.');
      }
      const data = (await response.json()) as { meals?: Meal[] };
      if (data?.meals) {
        setMeals(data.meals);
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Failed to Load',
        text2: 'Could not fetch diet entry.',
      });
    }
  };

  const runSearch = async (): Promise<void> => {
    if (!token || searchQuery.trim().length < 2) {
      return;
    }
    setSearching(true);
    try {
      const foods = await searchNutrition(token, searchQuery.trim());
      setSearchHits(foods);
      if (foods.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No foods found',
          text2: 'Try another name, or enter macros manually.',
        });
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Nutrition search failed';
      Toast.show({ type: 'error', text1: 'Search', text2: message });
    } finally {
      setSearching(false);
    }
  };

  const applyNutritionHit = (hit: NutritionFood): void => {
    setPer100(hit);
    setCurrentFood({
      name: hit.name,
      quantity: 100,
      units: 'g',
      calories: Math.round(hit.calories * 10) / 10,
      proteins: Math.round(hit.proteins * 10) / 10,
      carbs: Math.round(hit.carbs * 10) / 10,
      fats: Math.round(hit.fats * 10) / 10,
      external_id: hit.external_id,
      brand: hit.brand,
    });
    setSearchHits([]);
    setSearchQuery(hit.name);
  };

  const scaleFromQuantity = (qty: number): void => {
    if (!per100 || !per100.per_100g || qty <= 0) {
      setCurrentFood((f) => ({ ...f, quantity: qty }));
      return;
    }
    const factor = qty / 100;
    setCurrentFood((f) => ({
      ...f,
      quantity: qty,
      calories: Math.round(per100.calories * factor * 10) / 10,
      proteins: Math.round(per100.proteins * factor * 10) / 10,
      carbs: Math.round(per100.carbs * factor * 10) / 10,
      fats: Math.round(per100.fats * factor * 10) / 10,
    }));
  };

  const handleAddOrEditFood = (): void => {
    if (!currentFood.name || currentFood.quantity <= 0 || !currentFood.units) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill name, quantity, and units.',
      });
      return;
    }

    const updatedFoods =
      editingIndex !== null
        ? meals
            .find((meal) => meal.name === mealName)
            ?.foods?.map((food, index) =>
              index === editingIndex ? currentFood : food
            ) || []
        : [
            ...(meals.find((meal) => meal.name === mealName)?.foods || []),
            currentFood,
          ];

    setMeals((prevMeals) => {
      const otherMeals = prevMeals.filter((meal) => meal.name !== mealName);
      return [...otherMeals, { name: mealName, foods: updatedFoods }];
    });

    setCurrentFood(emptyFood());
    setPer100(null);
    setEditingIndex(null);
    setSearchQuery('');
  };

  const handleEditFood = (index: number): void => {
    const meal = meals.find((m) => m.name === mealName);
    if (meal) {
      const food = meal.foods[index];
      setCurrentFood({
        name: food.name,
        quantity: food.quantity,
        units: food.units,
        calories: food.calories,
        proteins: food.proteins,
        carbs: food.carbs ?? 0,
        fats: food.fats ?? 0,
        external_id: food.external_id,
        brand: food.brand,
      });
      setEditingIndex(index);
      setPer100(null);
    }
  };

  const handleDeleteFood = (index: number): void => {
    setMeals((prevMeals) => {
      const otherMeals = prevMeals.filter((meal) => meal.name !== mealName);
      const updatedFoods =
        prevMeals
          .find((meal) => meal.name === mealName)
          ?.foods?.filter((_, i) => i !== index) || [];
      return [...otherMeals, { name: mealName, foods: updatedFoods }];
    });
  };

  const saveMeal = async (): Promise<void> => {
    const backendUrl = Constants.expoConfig?.extra?.backendUrl;
    try {
      const authToken = token || (await AsyncStorage.getItem('token'));
      if (!authToken) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'Please log in again.',
        });
        navigation.navigate('Login');
        return;
      }

      const payload = {
        trainee_id: trainee.id,
        date,
        meals,
      };

      const response = await fetch(
        dietEntryId
          ? `${backendUrl}/diet_entries/${dietEntryId}`
          : `${backendUrl}/diet_entries`,
        {
          method: dietEntryId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `${authToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save diet entry.');
      }

      Toast.show({
        type: 'success',
        text1: dietEntryId ? 'Diet Entry Updated' : 'Diet Entry Created',
      });
      navigation.goBack();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: 'Unable to save Meal.',
      });
    }
  };

  const renderFoodItem = ({
    item,
    index,
  }: {
    item: Food;
    index: number;
  }): React.JSX.Element => (
    <View style={styles.foodItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.foodName}>{item.name}</Text>
        <Text style={styles.foodStats}>
          {item.quantity} {item.units} · {item.calories} kcal · P{' '}
          {item.proteins}g · C {item.carbs ?? 0}g · F {item.fats ?? 0}g
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleEditFood(index)} hitSlop={8}>
          <Icon name="pencil-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteFood(index)} hitSlop={8}>
          <Icon name="trash-can-outline" size={22} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const currentMealFoods =
    meals.find((meal) => meal.name === mealName)?.foods || [];

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Diet</Text>
      <Text style={styles.title}>{mealName}</Text>
      <Text style={styles.date}>{date}</Text>

      <View style={styles.inputForm}>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Search food (e.g. chicken breast)"
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={() => void runSearch()}>
            {searching ? (
              <ActivityIndicator color={Colors.textOnPrimary} />
            ) : (
              <Text style={styles.searchBtnText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {searchHits.length > 0 ? (
          <View style={styles.hits}>
            {searchHits.map((hit) => (
              <TouchableOpacity
                key={hit.external_id}
                style={styles.hit}
                onPress={() => applyNutritionHit(hit)}
              >
                <Text style={styles.hitName} numberOfLines={1}>
                  {hit.name}
                </Text>
                <Text style={styles.hitMeta}>
                  {Math.round(hit.calories)} kcal · P {hit.proteins}g / 100g
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Food name"
          placeholderTextColor={Colors.textSecondary}
          value={currentFood.name}
          onChangeText={(text) => {
            setPer100(null);
            setCurrentFood({ ...currentFood, name: text });
          }}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="Qty"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric"
            value={currentFood.quantity === 0 ? '' : currentFood.quantity.toString()}
            onChangeText={(text) => scaleFromQuantity(parseFloat(text) || 0)}
          />
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="Units"
            placeholderTextColor={Colors.textSecondary}
            value={currentFood.units}
            onChangeText={(text) =>
              setCurrentFood({ ...currentFood, units: text })
            }
          />
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="Calories"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric"
            value={currentFood.calories === 0 ? '' : currentFood.calories.toString()}
            onChangeText={(text) =>
              setCurrentFood({
                ...currentFood,
                calories: parseFloat(text) || 0,
              })
            }
          />
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="Protein (g)"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric"
            value={currentFood.proteins === 0 ? '' : currentFood.proteins.toString()}
            onChangeText={(text) =>
              setCurrentFood({
                ...currentFood,
                proteins: parseFloat(text) || 0,
              })
            }
          />
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="Carbs (g)"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric"
            value={currentFood.carbs === 0 ? '' : currentFood.carbs.toString()}
            onChangeText={(text) =>
              setCurrentFood({ ...currentFood, carbs: parseFloat(text) || 0 })
            }
          />
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="Fat (g)"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric"
            value={currentFood.fats === 0 ? '' : currentFood.fats.toString()}
            onChangeText={(text) =>
              setCurrentFood({ ...currentFood, fats: parseFloat(text) || 0 })
            }
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddOrEditFood}
          activeOpacity={0.88}
        >
          <Text style={styles.addButtonText}>
            {editingIndex !== null ? 'Update food' : 'Add food'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentMealFoods}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderFoodItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No foods added yet.</Text>
        }
        style={{ flex: 1 }}
      />

      <TouchableOpacity
        style={styles.saveMeal}
        onPress={() => void saveMeal()}
        activeOpacity={0.88}
      >
        <Text style={styles.saveMealText}>Save meal</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.medium,
    backgroundColor: Colors.background,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.accent,
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  date: {
    color: Colors.textSecondary,
    marginBottom: Spacing.medium,
  },
  inputForm: {
    marginBottom: Spacing.medium,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.medium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.small,
    marginBottom: Spacing.small,
    alignItems: 'center',
  },
  searchBtn: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radii.sm,
    minWidth: 72,
    alignItems: 'center',
  },
  searchBtnText: { color: Colors.textOnPrimary, fontWeight: '700' },
  hits: {
    marginBottom: Spacing.small,
    maxHeight: 140,
  },
  hit: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  hitName: { color: Colors.textPrimary, fontWeight: '600' },
  hitMeta: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  row: {
    flexDirection: 'row',
    gap: Spacing.small,
  },
  half: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    padding: 12,
    marginBottom: Spacing.small,
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  addButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: Radii.sm,
    alignItems: 'center',
    marginTop: 4,
  },
  addButtonText: { color: Colors.textOnPrimary, fontWeight: '800' },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.medium,
    backgroundColor: Colors.surface,
    borderRadius: Radii.sm,
    marginBottom: Spacing.small,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.small,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  foodStats: { fontSize: 13, color: Colors.textSecondary },
  actions: { flexDirection: 'row', gap: 14 },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.large,
  },
  saveMeal: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginTop: Spacing.small,
  },
  saveMealText: {
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
});
