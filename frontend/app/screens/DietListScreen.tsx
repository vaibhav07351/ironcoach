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
  Modal,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Trainee } from '../types/trainee';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

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

// Enhanced Custom Date Picker Component for Web Compatibility
const CustomDatePicker = ({ 
  visible, 
  onClose, 
  selectedDate, 
  onDateChange 
}: {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}) => {
  const [tempDate, setTempDate] = useState(selectedDate);

  useEffect(() => {
    if (visible) {
      setTempDate(selectedDate);
    }
  }, [visible, selectedDate]);

  const handleConfirm = () => {
    onDateChange(tempDate);
    onClose();
  };

  const handleCancel = () => {
    setTempDate(selectedDate); // Reset to original date
    onClose();
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = (`0${date.getMonth() + 1}`).slice(-2);
    const day = (`0${date.getDate()}`).slice(-2);
    return `${year}-${month}-${day}`;
  };

  if (Platform.OS === 'web') {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.webDatePickerContainer}>
            {/* Header */}
            <View style={styles.datePickerHeader}>
              <Icon name="calendar" size={24} color="#6200ee" />
              <Text style={styles.datePickerTitle}>Select Date</Text>
            </View>
            
            {/* Date Input */}
            <View style={styles.dateInputContainer}>
              <input
                type="date"
                value={formatDateForInput(tempDate)}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setTempDate(newDate);
                }}
                style={{
                  width: '100%',
                  padding: 16,
                  fontSize: 16,
                  border: '2px solid #e9ecef',
                  borderRadius: 12,
                  outline: 'none',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  backgroundColor: '#f8f9fa',
                  color: '#2c3e50',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6200ee';
                  e.target.style.backgroundColor = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e9ecef';
                  e.target.style.backgroundColor = '#f8f9fa';
                }}
              />
            </View>

            {/* Selected Date Preview */}
            <View style={styles.datePreview}>
              <Text style={styles.datePreviewLabel}>Selected Date:</Text>
              <Text style={styles.datePreviewValue}>
                {tempDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]} 
                onPress={handleCancel}
              >
                <Icon name="close" size={16} color="#6c757d" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.confirmButton]} 
                onPress={handleConfirm}
              >
                <Icon name="check" size={16} color="#fff" />
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return visible ? (
    <DateTimePicker
      value={selectedDate}
      mode="date"
      display="default"
      onChange={(event, date) => {
        if (date) {
          onDateChange(date);
        }
        onClose();
      }}
    />
  ) : null;
};

export default function DietListScreen({ route, navigation, trainee }: Props) {
  const [dietEntry, setDietEntry] = useState<DietEntry | null>(null);
  
  // Get current date in IST properly and normalize to start of day
  const getCurrentDateIST = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const istTime = new Date(utc + istOffset);
    
    // Normalize to start of day (00:00:00)
    return new Date(istTime.getFullYear(), istTime.getMonth(), istTime.getDate());
  };

  // Normalize any date to start of day
  const normalizeDate = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const [selectedDate, setSelectedDate] = useState(getCurrentDateIST());
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Format date as YYYY-MM-DD (always use the date as-is, no timezone conversion)
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (`0${date.getMonth() + 1}`).slice(-2);
    const day = (`0${date.getDate()}`).slice(-2);
    return `${year}-${month}-${day}`;
  };

  // Get relative date label (Today, Tomorrow, Yesterday)
  const getRelativeDateLabel = (date: Date) => {
    const today = getCurrentDateIST();
    const normalizedDate = normalizeDate(date);
    
    // Calculate difference in days
    const diffTime = normalizedDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    return null;
  };

  // Format date for display
  const formatDisplayDate = (date: Date) => {
    const relativeLabel = getRelativeDateLabel(date);
    if (relativeLabel) {
      return relativeLabel;
    }
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format full date for header
  const formatFullDate = (date: Date) => {
    const relativeLabel = getRelativeDateLabel(date);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    return relativeLabel ? `${formattedDate}` : formattedDate;
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
        return;
      }

      const data = await response.json();
      setDietEntry(Array.isArray(data) ? data[0] : data);
    } catch (error) {
      console.error('Error fetching diet entry:', error);
      setDietEntry(null);
      Toast.show({
        type: 'info',
        text1: 'No Diet Data',
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

  // Handle date picker change
  const handleDateChange = (date: Date) => {
    // Normalize the selected date to ensure consistency
    const normalizedDate = normalizeDate(date);
    setSelectedDate(normalizedDate);
  };

  // Fetch data on date change
  useFocusEffect(
    useCallback(() => {
      const dateString = formatDate(selectedDate);
      console.log('Fetching data for date:', dateString, 'Selected date:', selectedDate);
      fetchDietEntry(dateString);
    }, [selectedDate, trainee.id])
  );

  const navigateToAddFood = (mealName: string) => {
    if (dietEntry != null) {
      const currentDietEntry = dietEntry;
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
        <View style={styles.mealTitleContainer}>
          <Text style={styles.mealTitle}>{item.name}</Text>
          <Text style={styles.mealStats}>
            {item.calories} cal • {item.proteins}g protein
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigateToAddFood(item.name)}
        >
          <Icon name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      {item.foods.length > 0 ? (
        <View style={styles.foodList}>
          {item.foods.map((food, index) => (
            <View key={index} style={styles.foodItem}>
              <Text style={styles.foodName} numberOfLines={1}>
                {food.name}
              </Text>
              <Text style={styles.foodStats}>
                {food.calories} cal • {food.proteins}g
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>No food logged yet</Text>
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
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading diet data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.titleText}>Diet Logs - {trainee.name}</Text>
        
        {/* Date Navigation */}
        <View style={styles.dateNavigation}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigateDate('previous')}
          >
            <Icon name="chevron-left" size={24} color="#6200ee" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
              <Text style={styles.fullDateText}>{formatFullDate(selectedDate)}</Text>
            </View>
            <Icon name="calendar" size={18} color="#6200ee" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigateDate('next')}
          >
            <Icon name="chevron-right" size={24} color="#6200ee" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Calories</Text>
          <Text style={styles.summaryValue}>{dietEntry?.total_calories || 0}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Protein</Text>
          <Text style={styles.summaryValue}>{dietEntry?.total_proteins || 0}g</Text>
        </View>
      </View>

      {/* Meal List */}
      <FlatList
        data={mergedMeals}
        keyExtractor={(meal) => meal.name}
        renderItem={renderMeal}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Enhanced Custom Date Picker */}
      <CustomDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 12,
  },
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    gap: 8,
    flex: 1,
    marginHorizontal: 12,
  },
  dateContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  fullDateText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    marginTop: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6200ee',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mealCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitleContainer: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  mealStats: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#6200ee',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodList: {
    gap: 8,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 1,
  },
  foodName: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  foodStats: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#adb5bd',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  // Enhanced Web Date Picker Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webDatePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 0,
    minWidth: 320,
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 8,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
  },
  dateInputContainer: {
    padding: 20,
    paddingRight:50,
    paddingBottom: 16,
  },
  datePreview: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  datePreviewLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  datePreviewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 6,
  },
  cancelButton: {
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
    borderBottomLeftRadius: 20,
  },
  confirmButton: {
    backgroundColor: '#6200ee',
    borderBottomRightRadius: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});