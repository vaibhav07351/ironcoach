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
    Platform,
    Animated,
    Modal,
    Dimensions,
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
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type WorkoutLog = {
    id: string;
    date: string;
    workouts: { exercise: string; sets: number; reps: number[]; weight: number[] }[];
    notes?: string;
};

type Props = {
    route: { params: { trainee: any } };
    navigation: any;
    trainee?: Trainee;
};

// Cross-platform date picker component
const CrossPlatformDatePicker = ({ 
    visible, 
    onClose, 
    onDateChange, 
    selectedDate,
    isDarkMode 
}: {
    visible: boolean;
    onClose: () => void;
    onDateChange: (date: Date) => void;
    selectedDate: Date;
    isDarkMode: boolean;
}) => {
    const [tempDate, setTempDate] = useState(selectedDate);
    const styles = createStyles(isDarkMode);
    if (Platform.OS === 'web') {
        return (
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
                <View style={styles.webDatePickerOverlay}>
                    <View style={[styles.webDatePickerContainer, { backgroundColor: isDarkMode ? '#1A2E28' : Colors.surface }]}>
                        <Text style={[styles.webDatePickerTitle, { color: isDarkMode ? Colors.textOnPrimary : Colors.textPrimary }]}>
                            Select Date
                        </Text>
                        <input
                            type="date"
                            value={tempDate.toISOString().split('T')[0]}
                            onChange={(e) => setTempDate(new Date(e.target.value))}
                            style={{
                                padding: 12,
                                borderRadius: 8,
                                border: `1px solid ${isDarkMode ? Colors.primaryMuted : Colors.border}`,
                                backgroundColor: isDarkMode ? Colors.primary : Colors.surface,
                                color: isDarkMode ? Colors.textOnPrimary : Colors.textPrimary,
                                fontSize: 16,
                                width: '100%',
                                marginBottom: 20,
                            }}
                        />
                        <View style={styles.webDatePickerButtons}>
                            <TouchableOpacity
                                style={[styles.webDatePickerButton, styles.cancelButton]}
                                onPress={onClose}
                            >
                                <Text style={[styles.webDatePickerButtonText, styles.cancelButtonText]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.webDatePickerButton, styles.confirmButton]}
                                onPress={() => {
                                    onDateChange(tempDate);
                                    onClose();
                                }}
                            >
                                <Text style={styles.webDatePickerButtonText}>Confirm</Text>
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
                onClose();
                if (date) {
                    onDateChange(date);
                }
            }}
        />
    ) : null;
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
    const fetchControllerRef = useRef<AbortController | null>(null);

    const styles = createStyles(isDarkMode);

    // Memoize the formatted date to prevent recreation
    const currentFormattedDate = useMemo(() => {
        return selectedDate.toISOString().split('T')[0];
    }, [selectedDate]);

    // Use useFocusEffect with minimal dependencies
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
                activeOpacity={0.8}
            >
                <View style={styles.logCardGradient}>
                    {/* <View style={styles.logCardHeader}>
                        <View style={styles.dateContainer}>
                            <Icon name="calendar" size={20} color={Colors.primary} />
                            <Text style={styles.logDate}>{formatDate(item.date)}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDelete(item.id)}
                            activeOpacity={0.7}
                        >
                            <Icon name="trash-can-outline" size={24} color="#ff3b30" />
                        </TouchableOpacity>
                    </View> */}
                    
                    <View style={styles.workoutContainer}>
                        {item.workouts.map((workout, index) => (
                            <View key={index} style={styles.workoutDetails}>
                                <View style={styles.exerciseHeader}>
                                    <Icon name="dumbbell" size={16} color={Colors.primary} />
                                    <Text style={styles.exerciseName}>{workout.exercise}</Text>
                                </View>
                                <View style={styles.setsContainer}>
                                    <View style={styles.setsInfo}>
                                        <Text style={styles.setsLabel}>Sets:</Text>
                                        <Text style={styles.setsValue}>{workout.sets}</Text>
                                    </View>
                                    <View style={styles.totalWeightContainer}>
                                        <Text style={styles.totalWeightLabel}>Total Weight:</Text>
                                        <Text style={styles.totalWeightValue}>
                                            {(workout.weight || []).reduce((sum, w) => sum + w, 0)} kg
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => handleDelete(item.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Icon name="trash-can-outline" size={24} color={Colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                            
                        ))}
                    </View>
                </View>
            </TouchableOpacity>
        );
    }, [styles, navigation, trainee, formatDate, handleDelete, isDarkMode]);

    // Handle date navigation
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
        lastFetchDateRef.current = '';
    }, []);
    
    // Format date display
    const formatDisplayDate = useCallback((date: Date) => {
        const toISTDateString = (d: Date) => {
            const istOffsetMs = 5.5 * 60 * 60 * 1000;
            const istTime = new Date(d.getTime() + istOffsetMs);
            return istTime.toISOString().split('T')[0]; // 'YYYY-MM-DD'
        };

        const todayStr = toISTDateString(new Date());
        const yesterdayStr = toISTDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
        const tomorrowStr = toISTDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));
        const targetDateStr = toISTDateString(date);

        if (targetDateStr === todayStr) return 'Today';
        if (targetDateStr === yesterdayStr) return 'Yesterday';
        if (targetDateStr === tomorrowStr) return 'Tomorrow';

        // Use IST for formatting too (optional)
        const istLocaleDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
        return istLocaleDate.toLocaleDateString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    }, []);


    // Early return if no trainee
    if (!trainee || !traineeId) {
        return (
            <View style={styles.container}>
                <Text style={styles.emptyMessage}>No client data available</Text>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading workout logs...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <View style={styles.titleGradient}>
                        <Text style={styles.titleText}>Workout Logs</Text>
                        <Text style={styles.traineeNameText}>{traineeName}</Text>
                    </View>
                </View>
                
                {/* Date Navigation Header */}
                <View style={styles.dateNavigationContainer}>
                    <TouchableOpacity 
                        style={styles.dateNavButton}
                        onPress={() => navigateDate('previous')}
                        activeOpacity={0.7}
                    >
                        <Icon name="chevron-left" size={28} color={Colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.dateDisplayContainer}
                        onPress={() => setShowDatePicker(true)}
                        activeOpacity={0.8}
                    >
                     <View style={styles.inlineRow}>
                     
                        <Icon name="calendar" size={24} color={Colors.primary} style={styles.calendarIcon} />
                        <Text style={styles.dateDisplayText}>
                            {formatDisplayDate(selectedDate)}
                        </Text>
                        </View>
                        <Text style={styles.dateDisplaySubText}>
                            {selectedDate.toISOString().split('T')[0]}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.dateNavButton}
                        onPress={() => navigateDate('next')}
                        activeOpacity={0.7}
                    >
                        <Icon name="chevron-right" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Cross-platform Date Picker */}
                <CrossPlatformDatePicker
                    visible={showDatePicker}
                    onClose={() => setShowDatePicker(false)}
                    onDateChange={setSelectedDate}
                    selectedDate={selectedDate}
                    isDarkMode={isDarkMode}
                />
                
                {/* Sidebar Toggle Button */}
                <TouchableOpacity
                    style={styles.sidebarToggle}
                    onPress={toggleSidebar}
                    activeOpacity={0.7}
                >
                    <View style={styles.sidebarToggleGradient}>
                        <Icon name="filter-variant" size={24} color={Colors.textOnPrimary} />
                    </View>
                </TouchableOpacity>

                {/* Enhanced Sidebar */}
                <Animated.View
                    style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
                    <View style={styles.sidebarGradient}>
                        <View style={styles.sidebarHeader}>
                            <Text style={styles.sidebarTitle}>Filters & Sort</Text>
                            <TouchableOpacity onPress={toggleSidebar}>
                                <Icon name="close" size={24} color={isDarkMode ? '#fff' : '#000'} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView contentContainerStyle={styles.sidebarContent}>
                            <View style={styles.filterSection}>
                                <Text style={styles.filterLabel}>
                                    <Icon name="magnify" size={16} color={Colors.primary} /> Exercise Filter
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Search exercises..."
                                    placeholderTextColor={isDarkMode ? '#888' : '#666'}
                                    value={exerciseFilter}
                                    onChangeText={setExerciseFilter}
                                />
                            </View>

                            <View style={styles.filterSection}>
                                <Text style={styles.filterLabel}>
                                    <Icon name="calendar-range" size={16} color={Colors.primary} /> Date Range
                                </Text>
                                <TouchableOpacity 
                                    style={styles.datePickerButton}
                                    onPress={() => setShowStartDatePicker(true)}
                                >
                                    <Icon name="calendar-start" size={20} color={Colors.primary} />
                                    <Text style={styles.datePickerText}>
                                        {startDate ? startDate.toLocaleDateString() : 'Start Date'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.datePickerButton}
                                    onPress={() => setShowEndDatePicker(true)}
                                >
                                    <Icon name="calendar-end" size={20} color={Colors.primary} />
                                    <Text style={styles.datePickerText}>
                                        {endDate ? endDate.toLocaleDateString() : 'End Date'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.filterSection}>
                                <Text style={styles.filterLabel}>
                                    <Icon name="sort" size={16} color={Colors.primary} /> Sort By
                                </Text>
                                <View style={styles.sortButtons}>
                                    <TouchableOpacity
                                        style={[
                                            styles.sortButton, 
                                            sortOption === 'date' && styles.selectedSortButton
                                        ]}
                                        onPress={() => setSortOption('date')}
                                        activeOpacity={0.8}
                                    >
                                        <Icon name="calendar-clock" size={16} color={sortOption === 'date' ? Colors.textOnPrimary : Colors.primary} />
                                        <Text style={[styles.sortButtonText, sortOption !== 'date' && styles.sortButtonTextInactive]}>Date</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.sortButton, 
                                            sortOption === 'weight' && styles.selectedSortButton
                                        ]}
                                        onPress={() => setSortOption('weight')}
                                        activeOpacity={0.8}
                                    >
                                        <Icon name="weight-kilogram" size={16} color={sortOption === 'weight' ? Colors.textOnPrimary : Colors.primary} />
                                        <Text style={[styles.sortButtonText, sortOption !== 'weight' && styles.sortButtonTextInactive]}>Weight</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={styles.resetButton} 
                                onPress={resetFilters}
                                activeOpacity={0.8}
                            >
                                <Icon name="refresh" size={18} color={Colors.textOnPrimary} />
                                <Text style={styles.resetButtonText}>Reset Filters</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </Animated.View>

                {/* Workout Logs List */}
                <FlatList
                    data={logsToDisplay}
                    renderItem={renderWorkoutLog}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyStateContainer}>
                            <Icon name="clipboard-text-outline" size={64} color={Colors.border} />
                            <Text style={styles.emptyMessage}>No workout logs found</Text>
                            <Text style={styles.emptySubMessage}>
                                Start by adding your first workout log!
                            </Text>
                        </View>
                    }
                />

                {/* Floating Add Button */}
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('WorkoutCategories', { traineeId: traineeId, selectedDate })}
                    activeOpacity={0.8}
                >
                    <View style={styles.addButtonGradient}>
                        <Icon name="plus" size={24} color={Colors.textOnPrimary} />
                        <Text style={styles.addButtonText}>Add Workout Log</Text>
                    </View>
                </TouchableOpacity>
            </View>
             <Toast topOffset={70} />
        </View>
    );
}

const createStyles = (isDarkMode: boolean) =>
    StyleSheet.create({
        container: {
            flex: 1,
            paddingTop: Platform.OS === 'ios' ? 30 : 10,
            backgroundColor: isDarkMode ? Colors.textPrimary : Colors.background,
        },
        headerContainer: {
            marginBottom: Spacing.medium,
            paddingHorizontal: Spacing.small,
        },
        titleGradient: {
            borderRadius: Radii.md,
            padding: Spacing.medium,
            alignItems: 'center',
            backgroundColor: Colors.primary,
            marginHorizontal: Spacing.medium,
        },
        titleText: {
            fontSize: 22,
            fontFamily: Fonts.display,
            fontWeight: 'bold',
            color: Colors.textOnPrimary,
            textAlign: 'center',
        },
        traineeNameText: {
            fontSize: 16,
            color: Colors.textOnPrimary,
            opacity: 0.9,
            marginTop: Spacing.small / 2,
        },
        dateNavigationContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginHorizontal: Spacing.large,
            marginBottom: Spacing.small,
            paddingHorizontal: Spacing.small,
        },
        dateNavButton: {
            padding: Spacing.small,
            borderRadius: Radii.lg,
            backgroundColor: isDarkMode ? Colors.primaryMuted : Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
        },
        dateDisplayContainer: {
            flex: 1,
            alignItems: 'center',
            backgroundColor: isDarkMode ? Colors.primaryMuted : Colors.surface,
            marginHorizontal: Spacing.medium,
            paddingVertical: Spacing.small,
            paddingHorizontal: Spacing.medium,
            borderRadius: Radii.md,
            borderWidth: 1,
            borderColor: Colors.border,
        },
        inlineRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8, // Optional: Adds spacing between icon and text (or use margin)
        },
        calendarIcon: {
            marginBottom: 0,
        },
        dateDisplayText: {
            fontSize: 18,
            fontWeight: '600',
            color: isDarkMode ? Colors.textOnPrimary : Colors.textPrimary,
            marginBottom: 1,
        },
        dateDisplaySubText: {
            fontSize: 14,
            color: isDarkMode ? Colors.border : Colors.textSecondary,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: isDarkMode ? Colors.textPrimary : Colors.background,
        },
        loadingText: {
            marginTop: Spacing.small,
            fontSize: 16,
            color: isDarkMode ? Colors.textOnPrimary : Colors.textSecondary,
        },
        sidebar: {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 300,
            zIndex: 1000,
            paddingTop: Platform.OS === 'ios' ? 50 : 30,

        },
        sidebarGradient: {
            flex: 1,
            padding: Spacing.large,
            borderRadius: Radii.md,
            backgroundColor: isDarkMode ? Colors.primary : Colors.surface,
        },
        sidebarHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: Spacing.large,
            paddingBottom: Spacing.medium,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
        },
        sidebarTitle: {
            fontSize: 20,
            fontWeight: '600',
            color: isDarkMode ? Colors.textOnPrimary : Colors.textPrimary,
        },
        sidebarContent: {
            paddingBottom: 20,
        },
        filterSection: {
            marginBottom: 25,
        },
        sidebarToggle: {
            position: 'absolute',
            top: Platform.OS === 'ios' ? 50 : 20,
            left: Spacing.large,
            zIndex: 1001,
            borderRadius: Radii.lg,
            overflow: 'hidden',
        },
        sidebarToggleGradient: {
            width: 50,
            height: 50,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: Colors.primary,
        },
        filterLabel: {
            fontSize: 16,
            fontWeight: '600',
            color: isDarkMode ? Colors.textOnPrimary : Colors.textPrimary,
            marginBottom: Spacing.small,
            flexDirection: 'row',
            alignItems: 'center',
        },
        input: {
            padding: Spacing.medium,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: Radii.sm,
            color: isDarkMode ? Colors.textOnPrimary : Colors.textPrimary,
            backgroundColor: isDarkMode ? Colors.primaryMuted : Colors.backgroundAlt,
            fontSize: 16,
        },
        datePickerButton: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: Spacing.medium,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: Radii.sm,
            marginBottom: Spacing.small,
            backgroundColor: isDarkMode ? Colors.primaryMuted : Colors.backgroundAlt,
        },
        datePickerText: {
            fontSize: 16,
            color: isDarkMode ? Colors.textOnPrimary : Colors.textPrimary,
            marginLeft: Spacing.small,
        },
        sortButtons: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 10,
        },
        sortButton: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Colors.backgroundAlt,
            paddingVertical: Spacing.small + 4,
            paddingHorizontal: Spacing.medium,
            borderRadius: Radii.sm,
            gap: 5,
            borderWidth: 1,
            borderColor: Colors.border,
        },
        selectedSortButton: {
            backgroundColor: Colors.primary,
            borderColor: Colors.primary,
        },
        sortButtonText: {
            color: Colors.textOnPrimary,
            fontSize: 14,
            fontWeight: '600',
        },
        sortButtonTextInactive: {
            color: Colors.textPrimary,
        },
        resetButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Colors.accent,
            paddingVertical: Spacing.medium,
            paddingHorizontal: Spacing.large,
            borderRadius: Radii.sm,
            marginTop: Spacing.small,
            gap: Spacing.small,
        },
        resetButtonText: {
            color: Colors.textPrimary,
            fontSize: 16,
            fontWeight: '600',
        },
        listContainer: {
            paddingHorizontal: Spacing.large,
            paddingBottom: 0,
        },
        logCard: {
            marginBottom: Spacing.small,
            borderRadius: Radii.md,
            overflow: 'hidden',
            backgroundColor: isDarkMode ? Colors.primaryMuted : Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
        },
        logCardGradient: {
            padding: Spacing.small / 2,
        },
        logCardHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
        },
        dateContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        logDate: {
            fontSize: 16,
            fontWeight: '600',
            color: isDarkMode ? Colors.textOnPrimary : Colors.textPrimary,
        },
        deleteButton: {
            padding: Spacing.small,
            borderRadius: Radii.lg,
            backgroundColor: isDarkMode ? Colors.primary : Colors.backgroundAlt,
            marginLeft: Spacing.small,
        },
        workoutContainer: {
            gap: 1,
        },
        workoutDetails: {
            backgroundColor: isDarkMode ? Colors.primary : Colors.backgroundAlt,
            padding: Spacing.small,
            borderRadius: Radii.sm,
            borderLeftWidth: 4,
            borderLeftColor: Colors.primary,
        },
        exerciseHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 5,
            gap: 8,
        },
        exerciseName: {
            fontSize: 18,
            fontWeight: '600',
            color: isDarkMode ? Colors.textOnPrimary : Colors.textPrimary,
        },
        setsContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        setsInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
        },
        setsLabel: {
            fontSize: 14,
            color: Colors.textSecondary,
        },
        setsValue: {
            fontSize: 16,
            fontWeight: '600',
            color: Colors.primary,
        },
        totalWeightContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
        },
        totalWeightLabel: {
            fontSize: 14,
            color: Colors.textSecondary,
        },
        totalWeightValue: {
            fontSize: 16,
            fontWeight: '600',
            color: Colors.primaryMuted,
        },
        emptyStateContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 60,
        },
        emptyMessage: {
            fontSize: 20,
            fontWeight: '600',
            color: Colors.textSecondary,
            textAlign: 'center',
            marginTop: Spacing.large,
        },
        emptySubMessage: {
            fontSize: 16,
            color: Colors.textSecondary,
            textAlign: 'center',
            marginTop: Spacing.small,
        },
        addButton: {
            position: 'absolute',
            bottom: 30,
            right: Spacing.large,
            borderRadius: Radii.lg,
            overflow: 'hidden',
        },
        addButtonGradient: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: Spacing.medium,
            paddingHorizontal: Spacing.large,
            gap: Spacing.small,
            backgroundColor: Colors.primary,
        },
        addButtonText: {
            color: Colors.textOnPrimary,
            fontSize: 16,
            fontWeight: '600',
        },
        // Web-specific date picker styles
        webDatePickerOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        webDatePickerContainer: {
            width: screenWidth * 0.8,
            maxWidth: 400,
            padding: Spacing.large,
            paddingRight: 30,
            borderRadius: Radii.md,
            borderWidth: 1,
            borderColor: Colors.border,
        },
        webDatePickerTitle: {
            fontSize: 18,
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: Spacing.large,
        },
        webDatePickerButtons: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 10,
        },
        webDatePickerButton: {
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 8,
            alignItems: 'center',
            
        },
        cancelButton: {
            backgroundColor: Colors.backgroundAlt,
        },
        cancelButtonText: {
            color: Colors.textSecondary,
        },
        confirmButton: {
            backgroundColor: Colors.primary,
        },
        webDatePickerButtonText: {
            color: Colors.textOnPrimary,
            fontSize: 16,
            fontWeight: '600',
        },
    });