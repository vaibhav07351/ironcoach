import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Trainee } from '../types/trainee';

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
    calories: number;
    proteins: number;
};

type DietEntry = {
    id: string;
    meals: Meal[];
    total_calories: number;
    total_proteins: number;
};

type Props = {
    route: { params: { trainee: any } };
    navigation: any;
    trainee: Trainee;
};

export default function DietListScreen({ route, navigation, trainee }: Props) {

    const [dietEntry, setDietEntry] = useState<DietEntry | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);

    // Format date as YYYY-MM-DD
    const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    // Fetch diet entry for a specific date
    const fetchDietEntry = async (date: string) => {
        setIsLoading(true);
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

            if (!response.ok) {
                setDietEntry(null);
                throw new Error('No diet entry found.');
            }
            
           
            const data: DietEntry = await response.json();
            console.log("diet list screen data rec is: ", data)
            setDietEntry(data);
        } catch (error) {
            console.error('Error fetching diet entry:', error);
            Alert.alert('Error', 'Failed to load diet entry.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle date navigation
    const navigateDate = (direction: 'previous' | 'next') => {
        const newDate = new Date(selectedDate);
        newDate.setDate(
            direction === 'previous' ? newDate.getDate() - 1 : newDate.getDate() + 1
        );
        setSelectedDate(newDate);
    };

    // Fetch data on date change
    useFocusEffect(
        useCallback(() => {
            fetchDietEntry(formatDate(selectedDate));
        }, [selectedDate])
    );

    const navigateToAddFood = (mealName: string) => {
        console.log("diet list screen diet entry is : ", dietEntry);
    
        if (Array.isArray(dietEntry) && dietEntry.length > 0) {
            const currentDietEntry = dietEntry[0];  // Access first item if it's an array
            console.log("diet entry id is : ", currentDietEntry?.id);
    
            navigation.navigate('AddFood', {
                trainee,
                mealName,
                date: formatDate(selectedDate),
                existingFoods: currentDietEntry?.meals.find((meal: Meal) => meal.name === mealName)?.foods || [],
                dietEntryId: currentDietEntry?.id,
            });
        } else {
            navigation.navigate('AddFood', {
                trainee,
                mealName,
                date: formatDate(selectedDate),
                existingFoods: [],
                dietEntryId: null,
            });
        }
    };

    const renderMeal = ({ item }: { item: Meal }) => (
        <View style={styles.mealCard}>
            <View style={styles.mealHeader}>
                <Text style={styles.mealTitle}>{item.name}</Text>
                <TouchableOpacity onPress={() => navigateToAddFood(item.name)}>
                    <Icon name="plus" size={24} color="#6200ee" />
                </TouchableOpacity>
            </View>
            {item.foods.length > 0 ? (
                <FlatList
                    data={item.foods}
                    keyExtractor={(food, index) => index.toString()}
                    renderItem={({ item: food }) => (
                        <View style={styles.foodItem}>
                            <Text style={styles.foodName}>{food.name}</Text>
                            <Text style={styles.foodStats}>
                                {food.calories} cal | {food.proteins} g
                            </Text>
                        </View>
                    )}
                />
            ) : (
                <Text style={styles.emptyText}>No food logged yet.</Text>
            )}
        </View>
    );

    if (isLoading) {
        return <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />;
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header for navigation between dates */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigateDate('previous')}>
                    <Icon name="chevron-left" size={30} color="#6200ee" />
                </TouchableOpacity>
                <Text style={styles.headerDate}>{formatDate(selectedDate)}</Text>
                <TouchableOpacity onPress={() => navigateDate('next')}>
                    <Icon name="chevron-right" size={30} color="#6200ee" />
                </TouchableOpacity>
            </View>

            {/* Summary Section */}
            <View style={styles.summary}>
                <Text style={styles.summaryText}>
                    Total Calories: {dietEntry?.total_calories || 0}
                </Text>
                <Text style={styles.summaryText}>
                    Total Proteins: {dietEntry?.total_proteins || 0} g
                </Text>
            </View>

            {/* Meal List */}
            <FlatList
                data={dietEntry?.meals || [
                    { name: 'Breakfast', foods: [], calories: 0, proteins: 0 },
                    { name: 'Morning Snack', foods: [], calories: 0, proteins: 0 },
                    { name: 'Lunch', foods: [], calories: 0, proteins: 0 },
                    { name: 'Evening Snack', foods: [], calories: 0, proteins: 0 },
                    { name: 'Dinner', foods: [], calories: 0, proteins: 0 },
                ]}
                keyExtractor={(meal) => meal.name}
                renderItem={renderMeal}
                contentContainerStyle={styles.listContent}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerDate: { fontSize: 20, fontWeight: 'bold', color: '#6200ee' },
    summary: { marginBottom: 16, backgroundColor: '#e3f2fd', padding: 10, borderRadius: 8 },
    summaryText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    mealCard: { marginBottom: 16, backgroundColor: '#fff', padding: 12, borderRadius: 8 },
    mealHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    mealTitle: { fontSize: 18, fontWeight: 'bold', color: '#6200ee' },
    foodItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    foodName: { fontSize: 16 },
    foodStats: { fontSize: 14, color: '#555' },
    emptyText: { fontSize: 14, color: '#999' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingBottom: 16 },
});
