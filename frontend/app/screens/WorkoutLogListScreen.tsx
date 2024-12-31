import React, { useState, useCallback } from 'react';
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

type WorkoutLog = {
    id: string;
    date: string;
    workouts: { exercise: string; sets: number; reps: number[]; weight: number[] }[];
    notes?: string;
};

type Props = {
    route: { params: { trainee: any } };
    navigation: any;
    trainee: Trainee;
};

export default function WorkoutLogListScreen({ route, navigation, trainee }: Props) {
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
    const dateInIST = new Date();
    dateInIST.setMinutes(dateInIST.getMinutes() + 330);
    const [selectedDate, setSelectedDate] = useState(dateInIST);
    // Sidebar state for animation
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const slideAnim = useState(new Animated.Value(-300))[0]; // Start off-screen
    const [showDatePicker, setShowDatePicker] = useState(false); // State to control DateTimePicker visibility

    const styles = createStyles(isDarkMode);

    const fetchWorkoutLogs = async (date: string) => {
        setIsLoading(true);
        const backendUrl = Constants.expoConfig?.extra?.backendUrl;
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }

            const response = await fetch(`${backendUrl}/workout_logs/${trainee.id}?date=${date}`, {
                headers: {
                    Authorization: `${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch workout logs: ${response.statusText}`);
            }

            const data = await response.json();
            setWorkoutLogs(Array.isArray(data) ? data : []); // Ensure `workoutLogs` is always an array
        } catch (error) {
            console.error('Error fetching workout logs:', error);
            setWorkoutLogs([]); // Fallback to empty array
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchWorkoutLogs(formatPickDate(selectedDate));
        }, [trainee,selectedDate])
    );

    // Today's logs
    // const dateInIST = new Date();
    dateInIST.setMinutes(dateInIST.getMinutes() + 330); // Add 330 minutes (5 hours 30 minutes)

    const todayDate = dateInIST.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const todayLogs = workoutLogs.filter((log) => log.date === todayDate);

    const filteredLogs = workoutLogs.filter((log) => {
        const logDate = new Date(log.date);
        const matchesDate =
            (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
        const matchesExercise =
            !exerciseFilter ||
            (log.workouts || []).some((workout) => workout.exercise.includes(exerciseFilter));

        return matchesDate && matchesExercise;
    });

    const sortedLogs = [...filteredLogs].sort((a, b) => {
        if (sortOption === 'date') {
            return new Date(b.date).getTime() - new Date(a.date).getTime(); // Newest first
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
            return totalWeightB - totalWeightA; // Heaviest first
        }
        return 0;
    });

    const resetFilters = () => {
        setStartDate(null);
        setEndDate(null);
        setExerciseFilter('');
        setSortOption(null);
    };

    const logsToDisplay = showTodayOnly ? todayLogs : sortedLogs;

    const toggleSidebar = () => {
        setSidebarVisible((prev) => !prev);
        Animated.timing(slideAnim, {
            toValue: sidebarVisible ? -300 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const handleDelete = async (logId: string) => {
        Alert.alert(
            'Confirm Deletion',
            'Are you sure you want to delete this workout log?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('token');
                            if (!token) {
                                Alert.alert('Error', 'User is not authenticated. Please log in again.');
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

                            Alert.alert('Success', 'Workout log deleted successfully.');
                            setWorkoutLogs((prevLogs) => prevLogs.filter((log) => log.id !== logId));
                        } catch (error) {
                            console.error('Error deleting workout log:', error);
                            Alert.alert('Error', 'Failed to delete workout log. Please try again.');
                        }
                    },
                },
            ]
        );
    };
    
    // Function to format date from YYYY-MM-DD to DD-MM-YYYY
    const formatDate = (dateString: string) => {
        const date = new Date(dateString); // Convert to Date object
        const day = String(date.getDate()).padStart(2, '0'); // Get day with leading zero if needed
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Get month with leading zero (months are 0-indexed)
        const year = date.getFullYear(); // Get full year
        return `${day}-${month}-${year}`; // Return in DD-MM-YYYY format
    };
    
    const renderWorkoutLog = ({ item }: { item: WorkoutLog }) => {
        const workouts = item.workouts || []; // Ensure workouts is always an array
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
    };

      // Handle date navigation
  const navigateDate = (direction: 'previous' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(
      direction === 'previous' ? newDate.getDate() - 1 : newDate.getDate() + 1
    );
    setSelectedDate(newDate);
  };

    // Format date as YYYY-MM-DD
    const formatPickDate = (date: Date) => {
        return date.toISOString().split('T')[0];
      };
    

    if (isLoading) {
        return <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />;
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.container}>
                <View style={styles.title}>
                    {/* <Text style={styles.titleText}>Workout Logs for {trainee.name}</Text> */}
                </View>
                {/* Header for navigation between dates */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigateDate('previous')}>
                        <Icon name="chevron-left" size={30} color="#6200ee" />
                    </TouchableOpacity>

                    <Text style={styles.headerDate}>{formatPickDate(selectedDate)}</Text>

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
                                if (selectedDate) {
                                setSelectedDate(selectedDate);
                                setShowDatePicker(false);
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
                    onPress={() => navigation.navigate('WorkoutCategories', { traineeId: trainee.id })}>
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
            justifyContent: 'center', // Align items vertically in the center
            alignItems: 'center', // Align items horizontally in the center
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
            paddingTop:70,
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
            marginTop:20,
            marginBottom: 16,
        },
        resetButton: {
            backgroundColor: '#ff6347', // A bright color for visibility
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
            elevation: 5, // For Android
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'center', // Centering the items
            alignItems: 'center',
            marginBottom: 16,
            width: '100%', // Ensure it takes the full width
            paddingHorizontal: 50, // Add some padding to the left and right
          },
          headerDate: {
            fontSize: 20,
            fontWeight: 'bold',
            color: isDarkMode ? '#fff' : '#000',
            marginHorizontal: 20, // Add space around the date text
            textAlign: 'center', // Ensure the date text is centered
          },
          nextArrowButton: {
            marginLeft: 20, // Adds spacing between the calendar icon and the right arrow
          },
    });
