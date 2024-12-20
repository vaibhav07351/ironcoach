import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
    calories: number;
    proteins: number;
    foods: Food[];
};

type DietEntry = {
    id?: string;
    trainee_id: string;
    date: string;
    meals: Meal[];
    total_calories: number;
    total_proteins: number;
};

type Props = {
    route: { params: { trainee: any } };
    navigation: any;
    trainee: Trainee;
};

export default function DietEntryScreen({ route, navigation, trainee }: Props) {
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
                throw new Error('No diet entry found for this date.');
            }

            const data: DietEntry = await response.json();
            setDietEntry(data);
        } catch (error) {
            console.error('Error fetching diet entry:', error);
            Alert.alert('Error', 'Failed to fetch diet entry.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle date navigation (swipe left/right)
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

    // Render individual meals
    const renderMeal = ({ item }: { item: Meal }) => (
        <View style={styles.mealCard}>
            <Text style={styles.mealTitle}>{item.name}</Text>
            <Text style={styles.mealStats}>
                Calories: {item.calories} | Proteins: {item.proteins}
            </Text>
            <FlatList
                data={item.foods}
                keyExtractor={(food, index) => index.toString()}
                renderItem={({ item: food }) => (
                    <View style={styles.foodItem}>
                        <Text style={styles.foodName}>{food.name}</Text>
                        <Text style={styles.foodStats}>
                            {food.quantity} {food.units} | {food.calories} cal | {food.proteins} g
                            protein
                        </Text>
                    </View>
                )}
            />
        </View>
    );

    // Navigate to log or update screen
    const handleLogDiet = () => {
        navigation.navigate('LogDiet', {
            trainee,
            date: formatDate(selectedDate),
        });
    };

    if (isLoading) {
        return <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />;
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigateDate('previous')}>
                    <Icon name="chevron-left" size={30} color="#6200ee" />
                </TouchableOpacity>
                <Text style={styles.headerDate}>{formatDate(selectedDate)}</Text>
                <TouchableOpacity onPress={() => navigateDate('next')}>
                    <Icon name="chevron-right" size={30} color="#6200ee" />
                </TouchableOpacity>
            </View>

            {dietEntry ? (
                <FlatList
                    data={dietEntry.meals}
                    keyExtractor={(meal, index) => index.toString()}
                    renderItem={renderMeal}
                    ListHeaderComponent={() => (
                        <View style={styles.summary}>
                            <Text style={styles.summaryText}>
                                Total Calories: {dietEntry.total_calories}
                            </Text>
                            <Text style={styles.summaryText}>
                                Total Proteins: {dietEntry.total_proteins} g
                            </Text>
                        </View>
                    )}
                />
            ) : (
                <Text style={styles.emptyMessage}>No diet entry for this date.</Text>
            )}

            <TouchableOpacity style={styles.logButton} onPress={handleLogDiet}>
                <Text style={styles.logButtonText}>Log Today's Diet</Text>
            </TouchableOpacity>
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
    summary: { marginBottom: 16, padding: 10, backgroundColor: '#e1f5fe', borderRadius: 8 },
    summaryText: { fontSize: 16, color: '#333' },
    mealCard: { marginBottom: 16, padding: 12, backgroundColor: '#fff', borderRadius: 8 },
    mealTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    mealStats: { fontSize: 14, color: '#555', marginBottom: 8 },
    foodItem: { marginBottom: 4 },
    foodName: { fontSize: 16, fontWeight: '500' },
    foodStats: { fontSize: 14, color: '#555' },
    logButton: {
        backgroundColor: '#6200ee',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    logButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    emptyMessage: { fontSize: 16, textAlign: 'center', color: '#999', marginTop: 20 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
