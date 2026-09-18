import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';

type Food = {
    name: string;
    quantity: number;
    units: string;
    calories: number;
    proteins: number;
};

type Meal = {
    name: string;
    foods: Food[];
};

type Props = NativeStackScreenProps<RootStackParamList, 'AddFood'>;

export default function AddFoodScreen({ route, navigation }: Props) {
    const { dietEntryId, trainee, mealName, date, existingFoods } = route.params;
    const [currentFood, setCurrentFood] = useState<Food>({
        name: '',
        quantity: 0,
        units: '',
        calories: 0,
        proteins: 0,
    });
    const [meals, setMeals] = useState<Meal[]>([]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    useEffect(() => {
        if (dietEntryId) {
            handleExistingDietEntry(dietEntryId);
        }
    }, [dietEntryId]);

    const handleExistingDietEntry = async (entryId: string) => {
        const backendUrl = Constants.expoConfig?.extra?.backendUrl;
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
               Toast.show({
                    type: 'error',
                    text1: 'Authentication Token not found',
                    text2: 'Please log in again.',
                });

                navigation.navigate('Login');
                return;
            }
            const response = await fetch(`${backendUrl}/diet_entries/entry/${entryId}`, {
                headers: {
                    Authorization: `${token}`,
                },
            });
            if (!response.ok) {
                throw new Error('Diet entry not found.');
            }
            const data = await response.json();

            if (data?.meals) {
                setMeals(data.meals);
            }
        } catch (error) {
            console.error('Error fetching existing diet entry:', error);
            Toast.show({
                type: 'error',
                text1: 'Failed to Load',
                text2: 'Could not fetch diet entry.',
            });

        }
    };

    const handleAddOrEditFood = () => {
        if (!currentFood.name || currentFood.quantity <= 0 || !currentFood.units) {
            Toast.show({
                type: 'error',
                text1: 'Missing Fields',
                text2: 'Please fill all the fields.',
            });

            return;
        }
    
        const updatedFoods = editingIndex !== null
            ? meals.find((meal) => meal.name === mealName)?.foods?.map((food, index) =>
                  index === editingIndex ? currentFood : food
              ) || []
            : [...(meals.find((meal) => meal.name === mealName)?.foods || []), currentFood];
    
        setMeals((prevMeals) => {
            const otherMeals = prevMeals.filter((meal) => meal.name !== mealName);
            return [...otherMeals, { name: mealName, foods: updatedFoods }];
        });
    
        setCurrentFood({ name: '', quantity: 0, units: '', calories: 0, proteins: 0 });
        setEditingIndex(null);
    };

    const handleEditFood = (index: number) => {
        const meal = meals.find((meal) => meal.name === mealName);
        if (meal) {
            setCurrentFood(meal.foods[index]);
            setEditingIndex(index);
        }
    };

    const handleDeleteFood = (index: number) => {
        setMeals((prevMeals) => {
            const otherMeals = prevMeals.filter((meal) => meal.name !== mealName);
            const updatedFoods = prevMeals
                .find((meal) => meal.name === mealName)
                ?.foods?.filter((_, i) => i !== index) || [];
    
            return [...otherMeals, { name: mealName, foods: updatedFoods }];
        });
    };

    const saveMeal = async () => {
        const backendUrl = Constants.expoConfig?.extra?.backendUrl;
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
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

            if (dietEntryId) {
                const response = await fetch(`${backendUrl}/diet_entries/${dietEntryId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `${token}`,
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error('Failed to update diet entry.');
                }

                Toast.show({
                    type: 'success',
                    text1: 'Diet Entry Updated',
                });

            } else {
                const response = await fetch(`${backendUrl}/diet_entries`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `${token}`,
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error('Failed to create diet entry.');
                }

                Toast.show({
                    type: 'success',
                    text1: 'Diet Entry Created',
                });
            }

            navigation.goBack();
        } catch (error) {
            console.error('Error saving meal:', error);
            Toast.show({
                type: 'error',
                text1: 'Save Failed',
                text2: 'Unable to save Meal.',
            });

        }
    };

    const renderFoodItem = ({ item, index }: { item: Food; index: number }) => (
        <View style={styles.foodItem}>
            <View style={{ flex: 1 }}>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodStats}>
                    {item.quantity} {item.units} · {item.calories} cal · {item.proteins} g protein
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

    const currentMealFoods = meals.find((meal) => meal.name === mealName)?.foods || [];

    return (
        <View style={styles.container}>
            <Text style={styles.eyebrow}>Diet</Text>
            <Text style={styles.title}>{mealName}</Text>
            <Text style={styles.date}>{date}</Text>

            <View style={styles.inputForm}>
                <TextInput
                    style={styles.input}
                    placeholder="Food name"
                    placeholderTextColor={Colors.textSecondary}
                    value={currentFood.name}
                    onChangeText={(text) => setCurrentFood({ ...currentFood, name: text })}
                />
                <View style={styles.row}>
                    <TextInput
                        style={[styles.input, styles.half]}
                        placeholder="Qty"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="numeric"
                        value={currentFood.quantity === 0 ? '' : currentFood.quantity.toString()}
                        onChangeText={(text) =>
                            setCurrentFood({ ...currentFood, quantity: parseFloat(text) || 0 })
                        }
                    />
                    <TextInput
                        style={[styles.input, styles.half]}
                        placeholder="Units"
                        placeholderTextColor={Colors.textSecondary}
                        value={currentFood.units}
                        onChangeText={(text) => setCurrentFood({ ...currentFood, units: text })}
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
                            setCurrentFood({ ...currentFood, calories: parseFloat(text) || 0 })
                        }
                    />
                    <TextInput
                        style={[styles.input, styles.half]}
                        placeholder="Protein (g)"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="numeric"
                        value={currentFood.proteins === 0 ? '' : currentFood.proteins.toString()}
                        onChangeText={(text) =>
                            setCurrentFood({ ...currentFood, proteins: parseFloat(text) || 0 })
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
                ListEmptyComponent={<Text style={styles.emptyText}>No foods added yet.</Text>}
                style={{ flex: 1 }}
            />

            <TouchableOpacity style={styles.saveMeal} onPress={saveMeal} activeOpacity={0.88}>
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
