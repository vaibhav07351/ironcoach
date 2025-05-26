import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Trainee } from '../types/trainee';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';

type WorkoutLog = {
    id: string;
    date: string;
    workouts: { exercise: string; sets: number; reps: number[]; weight: number[] }[];
    notes?: string;
};

type Props = {
    route: { params: { trainee: any } };
    navigation: any;
    trainee?: Trainee; // Make this optional since it might come from route
};

// Helper function outside component to prevent recreation
const getISTDate = () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 330);
    return date;
};

export default function WorkoutLogListScreen({ route, navigation, trainee: propTrainee }: Props) {
    // Get trainee from props or route params - extract early to prevent issues
    const routeTrainee = route?.params?.trainee;
    const trainee = propTrainee || routeTrainee;
    
    // Extract primitive values immediately to prevent object reference issues
    const traineeId = trainee?.id;
    const traineeName = trainee?.name;
    
    // Early validation
    if (!traineeId) {
        console.warn('No trainee ID found in props or route params');
    }
    
    const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [exerciseFilter, setExerciseFilter] = useState<string>('');
    const [sortOption, setSortOption] = useState<'date' | 'weight' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [showTodayOnly, setShowTodayOnly] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    
    // Initialize selectedDate only once
    const [selectedDate, setSelectedDate] = useState(() => getISTDate());
    
    // Sidebar state for animation
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const slideAnim = useState(new Animated.Value(-300))[0];
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Refs to prevent multiple requests
    const fetchingRef = useRef(false);
    const lastFetchDateRef = useRef<string>('');

    const styles = createStyles(isDarkMode);

    // Memoize the formatted date to prevent recreation
    const currentFormattedDate = useMemo(() => {
        return selectedDate.toISOString().split('T')[0];
    }, [selectedDate]);

    // Remove the standalone fetchWorkoutLogs function since we inline it above

    // Use useFocusEffect with minimal dependencies - remove fetchWorkoutLogs from deps
    // Add at top level
const fetchControllerRef = useRef<AbortController | null>(null);

// Replace useFocusEffect with this:
useFocusEffect(
    useCallback(() => {
        let isActive = true;
        
        const performFetch = async () => {
            if (fetchingRef.current) return;
            
            // Cancel any ongoing request
            if (fetchControllerRef.current) {
                fetchControllerRef.current.abort();
            }
            
            const controller = new AbortController();
            fetchControllerRef.current = controller;
            
            fetchingRef.current = true;
            setIsLoading(true);
            
            try {
                const token = await AsyncStorage.getItem('token');
                if (!token) {
                    navigation.navigate('Login');
                    return;
                }
                const backendUrl = Constants.expoConfig?.extra?.backendUrl;
                const response = await fetch(
                    `${backendUrl}/workout_logs/${traineeId}?date=${currentFormattedDate}`,
                    {
                        headers: { Authorization: `${token}` },
                        signal: controller.signal
                    }
                );

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const data = await response.json();
                if (isActive) {
                    setWorkoutLogs(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                if (error instanceof Error) {
                    if (error.name !== 'AbortError' && isActive) {
                        console.error('Fetch error:', error.message);
                        setWorkoutLogs([]);
                    }
                } else {
                    console.error('An unexpected error occurred:', error);
                    if (isActive) {
                        setWorkoutLogs([]);
                    }
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                    fetchingRef.current = false;
                }
            }
        };

        // Debounce the fetch
        const debounceTimer = setTimeout(performFetch, 300);
        
        return () => {
            isActive = false;
            clearTimeout(debounceTimer);
            if (fetchControllerRef.current) {
                fetchControllerRef.current.abort();
            }
            fetchingRef.current = false;
        };
    }, [traineeId, currentFormattedDate, navigation])
);

    // Memoize today's date calculation
    const todayDate = useMemo(() => {
        const istDate = getISTDate();
        return istDate.toISOString().split('T')[0];
    }, []);

    const todayLogs = useMemo(() => {
        return workoutLogs.filter((log) => log.date === todayDate);
    }, [workoutLogs, todayDate]);

    const filteredLogs = useMemo(() => {
        return workoutLogs.filter((log) => {
            const logDate = new Date(log.date);
            const matchesDate =
                (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
            const matchesExercise =
                !exerciseFilter ||
                (log.workouts || []).some((workout) => workout.exercise.includes(exerciseFilter));

            return matchesDate && matchesExercise;
        });
    }, [workoutLogs, startDate, endDate, exerciseFilter]);

    const sortedLogs = useMemo(() => {
        return [...filteredLogs].sort((a, b) => {
            if (sortOption === 'date') {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            }
            if (sortOption === 'weight') {
                const totalWeightA = (a.workouts || []).reduce(
                    (sum, w) => sum + (w.weight || []).reduce((s, w) => s + w, 0),
                    0
                );
                const totalWeightB = (b.workouts || []).reduce(
                    (sum, w) => sum + (w.weight || []).reduce((s, w) => s + w, 0),
                    0
                );
                return totalWeightB - totalWeightA;
            }
            return 0;
        });
    }, [filteredLogs, sortOption]);

    const resetFilters = useCallback(() => {
        setStartDate(null);
        setEndDate(null);
        setExerciseFilter('');
        setSortOption(null);
    }, []);

    const logsToDisplay = useMemo(() => {
        return showTodayOnly ? todayLogs : sortedLogs;
    }, [showTodayOnly, todayLogs, sortedLogs]);

    const toggleSidebar = useCallback(() => {
        setSidebarVisible((prev) => {
            const newValue = !prev;
            Animated.timing(slideAnim, {
                toValue: newValue ? 0 : -300,
                duration: 300,
                useNativeDriver: true,
            }).start();
            return newValue;
        });
    }, [slideAnim]);

    const handleDelete = useCallback(async (logId: string) => {
        Toast.show({
            type: 'info',
            text1: 'Confirm Deletion',
            text2: 'Tap here to confirm deletion of this workout log',
            visibilityTime: 4000,
            onPress: async () => {
                try {
                    const token = await AsyncStorage.getItem('token');
                    if (!token) {
                        Toast.show({
                            type: 'error',
                            text1: 'Authentication Error',
                            text2: 'User is not authenticated. Please log in again.',
                        });
                        return;
                    }
                    const backendUrl = Constants.expoConfig?.extra?.backendUrl;
                    const response = await fetch(`${backendUrl}/workout_logs/${logId}`, {
                        method: 'DELETE',
                        headers: {
                            Authorization: `${token}`,
                        },
                    });

                    if (!response.ok) {
                        throw new Error('Failed to delete workout log.');
                    }

                    Toast.show({
                        type: 'success',
                        text1: 'Success',
                        text2: 'Workout log deleted successfully.',
                    });
                    setWorkoutLogs((prevLogs) => prevLogs.filter((log) => log.id !== logId));
                } catch (error) {
                    console.error('Error deleting workout log:', error);
                    Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: 'Failed to delete workout log. Please try again.',
                    });
                }
            }
        });
    }, []);
    
    // Function to format date from YYYY-MM-DD to DD-MM-YYYY
    const formatDate = useCallback((dateString: string) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }, []);
    
    const renderWorkoutLog = useCallback(({ item }: { item: WorkoutLog }) => {
        const workouts = item.workouts || [];
        return (
            <TouchableOpacity
                style={styles.logCard}
                onPress={() => navigation.navigate('WorkoutLogForm', { workoutLog: item, trainee })}
            >
                <View>
                    {item.workouts.map((workout, index) => (
                        <View key={index} style={styles.workoutDetails}>
                            <Text style={styles.exerciseName}>{workout.exercise}</Text>
                            <Text style={styles.sets}>Sets: {workout.sets}</Text>
                            <Text style={styles.sets}>Date: {formatDate(item.date)}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                >
                    <Icon name="trash-can-outline" size={24} color="#ff3b30" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    }, [styles, navigation, trainee, formatDate, handleDelete]);

    // Handle date navigation - add console log for debugging
    const navigateDate = useCallback((direction: 'previous' | 'next') => {
        console.log('Navigating date:', direction);
        setSelectedDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(
                direction === 'previous' ? newDate.getDate() - 1 : newDate.getDate() + 1
            );
            console.log('New date selected:', newDate.toISOString().split('T')[0]);
            return newDate;
        });
        // Reset the last fetch date to allow new fetch
        lastFetchDateRef.current = '';
    }, []);

    // Format date as YYYY-MM-DD
    const formatPickDate = useCallback((date: Date) => {
        return date.toISOString().split('T')[0];
    }, []);

    // Early return if no trainee
    if (!trainee || !traineeId) {
        return (
            <View style={styles.container}>
                <Text style={styles.emptyMessage}>No trainee data available</Text>
            </View>
        );
    }

    if (isLoading) {
        return <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />;
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.container}>
                <View style={styles.title}>
                    <Text style={styles.titleText}>Workout Logs for {traineeName}</Text>
                </View>
                
                {/* Header for navigation between dates */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigateDate('previous')}>
                        <Icon name="chevron-left" size={30} color="#6200ee" />
                    </TouchableOpacity>

                    <Text style={styles.headerDate}>{currentFormattedDate}</Text>

                    {/* Show DateTimePicker when clicked */}
                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                        <Icon name="calendar" size={30} color="#6200ee" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigateDate('next')} style={styles.nextArrowButton}>
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
                            setShowDatePicker(false);
                            if (selectedDate) {
                                setSelectedDate(selectedDate);
                            }
                        }}
                    />
                )}
                
                {/* Sidebar Toggle Button */}
                <TouchableOpacity
                    style={styles.sidebarToggle}
                    onPress={toggleSidebar}>
                    <Icon name={sidebarVisible ? 'chevron-left' : 'chevron-right'} size={30} color={isDarkMode ? '#fff' : '#000'} />
                </TouchableOpacity>

                {/* Sidebar with Filters */}
                <Animated.View
                    style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
                    {/* Advanced Filter Content */}
                    <ScrollView contentContainerStyle={styles.dropdown}>
                        <Text style={styles.filterLabel}>Filter by Exercise:</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Filter by Exercise"
                            value={exerciseFilter}
                            onChangeText={setExerciseFilter}
                        />

                        <Text style={styles.filterLabel}>Start Date:</Text>
                        <TouchableOpacity onPress={() => setShowStartDatePicker(true)}>
                            <Text style={styles.datePickerText}>
                                {startDate ? startDate.toDateString() : 'Select Start Date'}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.filterLabel}>End Date:</Text>
                        <TouchableOpacity onPress={() => setShowEndDatePicker(true)}>
                            <Text style={styles.datePickerText}>
                                {endDate ? endDate.toDateString() : 'Select End Date'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.sortButtons}>
                            <TouchableOpacity
                                style={[styles.sortButton, sortOption === 'date' && styles.selectedSortButton]}
                                onPress={() => setSortOption('date')}>
                                <Text style={styles.sortButtonText}>Date</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.sortButton, sortOption === 'weight' && styles.selectedSortButton]}
                                onPress={() => setSortOption('weight')}>
                                <Text style={styles.sortButtonText}>Total Weight</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Reset Filters */}
                        <View style={styles.resetContainer}>
                            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                                <Text style={styles.resetButtonText}>Reset Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Animated.View>

                {/* Workout Logs */}
                <FlatList
                    data={logsToDisplay}
                    renderItem={renderWorkoutLog}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={<Text style={styles.emptyMessage}>Workout Log Empty</Text>}
                />

                {/* Add Button */}
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('WorkoutCategories', { traineeId: traineeId })}>
                    <Text style={styles.addButtonText}>+ Add Workout Log</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const createStyles = (isDarkMode: boolean) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: isDarkMode ? '#000' : '#fff',
            padding: 16,
        },
        title: {
            justifyContent: 'center',
            alignItems: 'center',
        },
        titleText: {
            fontSize: 20,
            fontWeight: 'bold',
            color: isDarkMode ? '#fff' : '#000',
            marginBottom: 16,
            textAlign: 'center'
        },
        sidebar: {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 250,
            backgroundColor: isDarkMode ? '#222' : '#fff',
            padding: 16,
            zIndex: 10,
            paddingTop: 70,
        },
        sidebarToggle: {
            position: 'absolute',
            top: 20,
            left: 10,
            zIndex: 20,
        },
        workoutDetails: {
            marginBottom: 8,
        },
        exerciseName: {
            fontSize: 18,
            fontWeight: 'bold',
            color: isDarkMode ? '#fff' : '#000',
        },
        sets: {
            fontSize: 14,
            color: isDarkMode ? '#aaa' : '#555',
        },
        emptyMessage: {
            fontSize: 23,
            color: isDarkMode ? '#aaa' : '#555',
            textAlign: 'center',
            marginTop: 50,
        },
        input: {
            padding: 12,
            borderWidth: 1,
            borderColor: isDarkMode ? '#555' : '#ccc',
            borderRadius: 8,
            marginBottom: 12,
            color: isDarkMode ? '#fff' : '#000',
            backgroundColor: isDarkMode ? '#333' : '#fff',
        },
        filterLabel: {
            fontSize: 16,
            fontWeight: 'bold',
            color: isDarkMode ? '#fff' : '#000',
            marginVertical: 8,
        },
        datePickerText: {
            fontSize: 16,
            padding: 12,
            borderWidth: 1,
            borderColor: isDarkMode ? '#555' : '#ccc',
            borderRadius: 8,
            marginBottom: 12,
            color: isDarkMode ? '#fff' : '#000',
            backgroundColor: isDarkMode ? '#333' : '#fff',
        },
        addButton: {
            backgroundColor: '#6200ee',
            paddingVertical: 12,
            borderRadius: 8,
            marginTop: 20,
            alignItems: 'center',
        },
        addButtonText: {
            color: '#fff',
            fontSize: 18,
        },
        deleteButton: {
            position: 'absolute',
            top: 10,
            right: 10,
        },
        dropdown: {
            paddingBottom: 60,
        },
        sortButtons: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 20,
        },
        sortButton: {
            backgroundColor: '#6200ee',
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 8,
        },
        selectedSortButton: {
            backgroundColor: '#ff3b30',
        },
        sortButtonText: {
            color: '#fff',
        },
        resetContainer: {
            alignItems: 'center',
            marginTop: 20,
            marginBottom: 16,
        },
        resetButton: {
            backgroundColor: '#ff6347',
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 8,
        },
        resetButtonText: {
            color: '#fff',
            fontSize: 13,
            fontWeight: 'bold',
        },
        logCard: {
            backgroundColor: isDarkMode ? '#444' : '#fff',
            padding: 16,
            marginBottom: 16,
            borderRadius: 8,
            shadowColor: isDarkMode ? '#000' : '#ccc',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
            width: '100%',
            paddingHorizontal: 50,
        },
        headerDate: {
            fontSize: 20,
            fontWeight: 'bold',
            color: isDarkMode ? '#fff' : '#000',
            marginHorizontal: 20,
            textAlign: 'center',
        },
        nextArrowButton: {
            marginLeft: 20,
        },
    });