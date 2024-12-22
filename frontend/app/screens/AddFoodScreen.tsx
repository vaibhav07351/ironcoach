import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Button,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Food = {
    name: string;
    quantity: number;
    units: string;
    calories: number;
    proteins: number;
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
    const [foods, setFoods] = useState<Food[]>(existingFoods || []);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    useEffect(() => {
        if (dietEntryId) {
            handleExistingDietEntry(dietEntryId);
        }
    }, [dietEntryId]);

    const handleExistingDietEntry = async (entryId: string) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Authentication token not found. Please log in again.');
                navigation.navigate('Login');
                return;
            }
            const response = await fetch(`http://192.168.1.10:8080/diet_entries/entry/${entryId}`, {
                headers: {
                    Authorization: `${token}`,
                },
            });
            if (!response.ok) {
                throw new Error('Diet entry not found.');
            }
            const data = await response.json();
            console.log('Fetched Existing Diet Entry:', data);

            // Populate the food list with the existing foods
            if (data?.meals) {
                const meal = data.meals.find((meal: any) => meal.name === mealName);
                if (meal) {
                    setFoods(meal.foods || []);
                }
            }
        } catch (error) {
            console.error('Error fetching existing diet entry:', error);
            Alert.alert('Error', 'Failed to fetch existing diet entry.');
        }
    };

    const handleAddOrEditFood = () => {
        if (!currentFood.name || currentFood.quantity <= 0 || !currentFood.units) {
            Alert.alert('Validation Error', 'Please fill all fields for the food item.');
            return;
        }

        if (editingIndex !== null) {
            const updatedFoods = [...foods];
            updatedFoods[editingIndex] = currentFood;
            setFoods(updatedFoods);
            setEditingIndex(null);
        } else {
            setFoods((prevFoods) => [...prevFoods, currentFood]);
        }

        setCurrentFood({ name: '', quantity: 0, units: '', calories: 0, proteins: 0 });
    };

    const handleEditFood = (index: number) => {
        setCurrentFood(foods[index]);
        setEditingIndex(index);
    };

    const handleDeleteFood = (index: number) => {
        setFoods((prevFoods) => prevFoods.filter((_, i) => i !== index));
    };

    const saveMeal = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Authentication token not found. Please log in again.');
                navigation.navigate('Login');
                return;
            }

            const payload = {
                trainee_id: trainee.id,
                date,
                meals: [
                    {
                        name: mealName,
                        foods,
                    },
                ],
            };

            if (dietEntryId) {
                // Update existing diet entry
                const response = await fetch(`http://192.168.1.10:8080/diet_entries/${dietEntryId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `${token}`,
                    },
                    body: JSON.stringify(payload),
                });
                
                console.log("update body is: ", JSON.stringify(payload))

                if (!response.ok) {
                    throw new Error('Failed to update diet entry.');
                }

                console.log('Updated Diet Entry Payload:', JSON.stringify(payload));
                Alert.alert('Success', 'Diet entry updated successfully!');
            } else {
                // Create a new diet entry
                const response = await fetch('http://192.168.1.10:8080/diet_entries', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `${token}`,
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error('Failed to create new diet entry.');
                }

                console.log('Created New Diet Entry Payload:', JSON.stringify(payload));
                Alert.alert('Success', 'New diet entry created successfully!');
            }

            navigation.goBack();
        } catch (error) {
            console.error('Error saving meal:', error);
            Alert.alert('Error', 'Failed to save meal.');
        }
    };

    const renderFoodItem = ({ item, index }: { item: Food; index: number }) => (
        <View style={styles.foodItem}>
            <View>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodStats}>
                    {item.quantity} {item.units} | {item.calories} cal | {item.proteins} g protein
                </Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleEditFood(index)}>
                    <Icon name="pencil-outline" size={24} color="#007bff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteFood(index)}>
                    <Icon name="trash-can-outline" size={24} color="#ff0000" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Text style={styles.title}>Add Foods to {mealName}</Text>
            <Text>Date: {date}</Text>

            <View style={styles.inputForm}>
                <TextInput
                    style={styles.input}
                    placeholder="Food Name"
                    value={currentFood.name}
                    onChangeText={(text) => setCurrentFood({ ...currentFood, name: text })}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Quantity"
                    keyboardType="numeric"
                    value={currentFood.quantity === 0 ? '' : currentFood.quantity.toString()}
                    onChangeText={(text) =>
                        setCurrentFood({ ...currentFood, quantity: parseFloat(text) || 0 })
                    }
                />
                <TextInput
                    style={styles.input}
                    placeholder="Units (e.g., grams, piece)"
                    value={currentFood.units}
                    onChangeText={(text) => setCurrentFood({ ...currentFood, units: text })}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Calories"
                    keyboardType="numeric"
                    value={currentFood.calories === 0 ? '' : currentFood.calories.toString()}
                    onChangeText={(text) =>
                        setCurrentFood({ ...currentFood, calories: parseFloat(text) || 0 })
                    }
                />
                <TextInput
                    style={styles.input}
                    placeholder="Proteins"
                    keyboardType="numeric"
                    value={currentFood.proteins === 0 ? '' : currentFood.proteins.toString()}
                    onChangeText={(text) =>
                        setCurrentFood({ ...currentFood, proteins: parseFloat(text) || 0 })
                    }
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddOrEditFood}>
                    <Text style={styles.addButtonText}>
                        {editingIndex !== null ? 'Update Food' : 'Add Food'}
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={foods}
                keyExtractor={(_, index) => index.toString()}
                renderItem={renderFoodItem}
                ListEmptyComponent={<Text style={styles.emptyText}>No foods added yet.</Text>}
            />

            <Button title="Save Meal" onPress={saveMeal} />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    inputForm: { marginBottom: 16 },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
    },
    addButton: {
        backgroundColor: '#6200ee',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16,
    },
    addButtonText: { color: '#fff', fontWeight: 'bold' },
    foodItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#e3f2fd',
        borderRadius: 8,
        marginBottom: 8,
    },
    foodName: { fontSize: 16, fontWeight: 'bold' },
    foodStats: { fontSize: 14, color: '#555' },
    actions: { flexDirection: 'row', justifyContent: 'space-between', width: 60 },
    emptyText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 20 },
});
