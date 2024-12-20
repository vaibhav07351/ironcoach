import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Food = {
    name: string;
    quantity: number;
    units: string;
    calories: number;
    proteins: number;
};

type Meal = {
    name: string;
    calories: number;
    proteins: number;
    foods: Food[];
};

type Props = NativeStackScreenProps<RootStackParamList, 'LogDiet'>;

export default function LogDietScreen({ route, navigation }: Props) {
    const { trainee, date } = route.params;

    // Default meals template
    const defaultMeals: Meal[] = [
        { name: 'Breakfast', calories: 0, proteins: 0, foods: [] },
        { name: 'Lunch', calories: 0, proteins: 0, foods: [] },
        { name: 'Dinner', calories: 0, proteins: 0, foods: [] },
        { name: 'Snacks', calories: 0, proteins: 0, foods: [] },
    ];

    const [meals, setMeals] = useState<Meal[]>(defaultMeals);
    const [currentMeal, setCurrentMeal] = useState<Meal | null>(null);
    const [currentFood, setCurrentFood] = useState<Food>({
        name: '',
        quantity: 0,
        units: '',
        calories: 0,
        proteins: 0,
    });
    const [isNewEntry, setIsNewEntry] = useState(true); // Tracks whether the entry is new

    const fetchExistingDietEntry = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'User is not authenticated. Please log in again.');
                navigation.navigate('Login');
                return;
            }

            const response = await fetch(
                `http://192.168.1.10:8080/diet_entries/${trainee.id}?date=${date}`,
                {
                    headers: { Authorization: `${token}` },
                }
            );
            
            console.log("resp is: ", response.body);
            if (response.status === 404 || response.body == null) {
                console.log('No diet entry found for this date. Defaulting to empty meals.');
                setIsNewEntry(true); // New entry mode
                setMeals(defaultMeals);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch diet entry.');
            }

            const data = await response.json();
            console.log("data:",data)
            setIsNewEntry(false); // Editing existing entry
            
            if (data==null){
                setMeals(defaultMeals);
                return;
            }

            if (Array.isArray(data.meals)) {
                setMeals(data.meals.map((meal: Meal) => ({
                    ...meal,
                    foods: Array.isArray(meal.foods) ? meal.foods : [],
                })));
            } else {
                setMeals(defaultMeals);
            }
        } catch (error) {
            console.error('Error fetching diet entry:', error);
            Alert.alert('Error', 'Failed to load diet entry data. Defaulting to empty meals.');
            setMeals(defaultMeals);
        }
    };

    useEffect(() => {
        fetchExistingDietEntry();
    }, []);

    const calculateMealStats = (foods: Food[]) => {
        const calories = foods.reduce((sum, food) => sum + food.calories, 0);
        const proteins = foods.reduce((sum, food) => sum + food.proteins, 0);
        return { calories, proteins };
    };

    const handleAddFood = () => {
        if (!currentFood.name || currentFood.quantity <= 0 || !currentFood.units) {
            Alert.alert('Validation Error', 'Please fill all fields for the food item.');
            return;
        }

        if (!currentMeal) {
            Alert.alert('Error', 'No meal selected. Please select a meal.');
            return;
        }

        const updatedMeal: Meal = {
            ...currentMeal,
            foods: [...currentMeal.foods, currentFood],
        };

        const { calories, proteins } = calculateMealStats(updatedMeal.foods);
        updatedMeal.calories = calories;
        updatedMeal.proteins = proteins;

        const updatedMeals = meals.map((meal) =>
            meal.name === updatedMeal.name ? updatedMeal : meal
        );

        setMeals(updatedMeals);
        setCurrentFood({ name: '', quantity: 0, units: '', calories: 0, proteins: 0 });
        setCurrentMeal(null);
    };

    const handleSubmit = async () => {
        // const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
        // const totalProteins = meals.reduce((sum, meal) => sum + meal.proteins, 0);

        const dietEntry = {
            trainee_id: trainee.id,
            date,
            meals,
            // total_calories: totalCalories,
            // total_proteins: totalProteins,
        };

        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'User is not authenticated. Please log in again.');
                navigation.navigate('Login');
                return;
            }

            const method = isNewEntry ? 'POST' : 'PUT';
            const endpoint = isNewEntry
                ? `http://192.168.1.10:8080/diet_entries`
                : `http://192.168.1.10:8080/diet_entries/${trainee.id}?date=${date}`;
            
            console.log(method)
            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`,
                },
                body: JSON.stringify(dietEntry),
            });
            
            console.log(JSON.stringify(dietEntry))
            if (!response.ok) {
                throw new Error('Failed to save diet entry.');
            }
            
            Alert.alert('Success', 'Diet entry saved successfully.');
            navigation.goBack();
        } catch (error) {
            console.error('Error submitting diet entry:', error);
            Alert.alert('Error', 'Failed to save diet entry. Please try again.');
        }
    };

    const renderMeal = ({ item }: { item: Meal }) => (
        <TouchableOpacity
            style={styles.mealCard}
            onPress={() => setCurrentMeal(item)}
        >
            <Text style={styles.mealTitle}>{item.name}</Text>
            <Text style={styles.mealStats}>
                Calories: {item.calories} | Proteins: {item.proteins} g
            </Text>
        </TouchableOpacity>
    );

    const renderHeader = useMemo(() => (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View>
                <Text style={styles.title}>Log Diet Entry for {date}</Text>
                {currentMeal && (
                    <View style={styles.foodForm}>
                        <Text style={styles.formTitle}>Add Food to {currentMeal.name}</Text>
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
                            onChangeText={(text) => {
                                const newQuantity = parseFloat(text);
                                setCurrentFood({ ...currentFood, quantity: isNaN(newQuantity) ? 0 : newQuantity });
                            }}
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
                            onChangeText={(text) => {
                                const newCalories = parseFloat(text);
                                setCurrentFood({ ...currentFood, calories: isNaN(newCalories) ? 0 : newCalories });
                            }}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Proteins"
                            keyboardType="numeric"
                            value={currentFood.proteins === 0 ? '' : currentFood.proteins.toString()}
                            onChangeText={(text) => {
                                const newProteins = parseFloat(text);
                                setCurrentFood({ ...currentFood, proteins: isNaN(newProteins) ? 0 : newProteins });
                            }}
                        />
                        <TouchableOpacity style={styles.addButton} onPress={handleAddFood}>
                            <Text style={styles.addButtonText}>Add Food</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </TouchableWithoutFeedback>
    ), [currentMeal, currentFood, date]);
    

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <FlatList
                data={meals}
                keyExtractor={(item) => item.name}
                renderItem={renderMeal}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={
                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                        <Text style={styles.submitButtonText}>Save Diet Entry</Text>
                    </TouchableOpacity>
                }
                contentContainerStyle={styles.listContent}
            />
        </KeyboardAvoidingView>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    mealCard: {
        backgroundColor: '#e3f2fd',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    mealTitle: { fontSize: 18, fontWeight: 'bold' },
    mealStats: { fontSize: 14, color: '#555' },
    foodForm: { marginTop: 16, backgroundColor: '#fff', padding: 16, borderRadius: 8 },
    formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    input: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 12,
    },
    addButton: { backgroundColor: '#6200ee', padding: 12, borderRadius: 8 },
    addButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
    submitButton: {
        backgroundColor: '#03dac6',
        padding: 12,
        borderRadius: 8,
        marginTop: 20,
    },
    submitButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
    listContent: {
        paddingBottom: 20,
    },
});
