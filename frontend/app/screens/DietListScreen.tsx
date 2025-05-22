import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Trainee } from '../types/trainee';
import DateTimePicker from '@react-native-community/datetimepicker'; // Import DateTimePicker
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';

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
  date: string;
  trainee_id: string;
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
  const dateInIST = new Date();
  dateInIST.setMinutes(dateInIST.getMinutes() + 330);
  const [selectedDate, setSelectedDate] = useState(dateInIST);
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false); // State to control DateTimePicker visibility

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
         Toast.show({
          type: 'error',
          text1: 'Authentication Failed',
          text2: 'Please log in again.',
        });
        navigation.navigate('Login');
        return;
      }
      const backendUrl = Constants.expoConfig?.extra?.backendUrl;
      const response = await fetch(
        `${backendUrl}/diet_entries/${trainee.id}?date=${date}`,
        {
          headers: { Authorization: `${token}` },
        }
      );

      if (!response.ok) {
        setDietEntry(null);
        throw new Error('No diet entry found.');
      }

      const data = await response.json();
      setDietEntry(Array.isArray(data) ? data[0] : data);
    } catch (error) {
      console.error('Error fetching diet entry:', error);
      Toast.show({
          type: 'info',
          text1: 'Failed to load Diet Entry',
          text2: 'No diet data found for this date.',
        });
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
    if (dietEntry != null) {
      const currentDietEntry = dietEntry; // Access first item if it's an array
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

  const defaultMeals: Meal[] = [
    { name: 'Breakfast', foods: [], calories: 0, proteins: 0 },
    { name: 'Morning Snack', foods: [], calories: 0, proteins: 0 },
    { name: 'Lunch', foods: [], calories: 0, proteins: 0 },
    { name: 'Evening Snack', foods: [], calories: 0, proteins: 0 },
    { name: 'Dinner', foods: [], calories: 0, proteins: 0 },
  ];

  const mergedMeals = defaultMeals.map((defaultMeal) => {
    const existingMeal = dietEntry?.meals?.find((meal) => meal.name === defaultMeal.name);
    return existingMeal || defaultMeal;
  });

  if (isLoading) {
    return <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.title}>
            <Text style={styles.titleText}>Diet Entry Logs for {trainee.name}</Text>
        </View>
      {/* Header for navigation between dates */}
      <View style={styles.header}>
        
        <TouchableOpacity onPress={() => navigateDate('previous')}>
          <Icon name="chevron-left" size={30} color="#6200ee" />
        </TouchableOpacity>
        <Text style={styles.headerDate}>{formatDate(selectedDate)}</Text>
        {/* Show DateTimePicker when clicked */}
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
          <Icon name="calendar" size={30} color="#6200ee" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigateDate('next')}>
          <Icon name="chevron-right" size={30} color="#6200ee" />
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            if (selectedDate) {
              setSelectedDate(selectedDate);
              setShowDatePicker(false);
            }
          }}
        />
      )}

      {/* Top Page Diet Summary Section */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>Total Calories: {dietEntry?.total_calories || 0}</Text>
        <Text style={styles.summaryText}>Total Proteins: {dietEntry?.total_proteins || 0} g</Text>
      </View>

      {/* Meal List */}
      <FlatList
        data={mergedMeals}
        keyExtractor={(meal) => meal.name}
        renderItem={renderMeal}
        contentContainerStyle={styles.listContent}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: {
    justifyContent: 'center', // Align items vertically in the center
    alignItems: 'center', // Align items horizontally in the center
},
titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    // color: isDarkMode ? '#fff' : '#000',
    marginBottom: 16,
    textAlign: 'center'
},

  container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerDate: { fontSize: 20, fontWeight: 'bold', color: '#000' },
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
