import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList } from '../types/navigation';
import { ActivityIndicator,Switch } from 'react-native';
import { useTheme } from '../contexts/ThemeContext'; // Import ThemeContext

type WorkoutLog = {
    id: string;
    date: string;
    workouts: { exercise: string; sets: number; reps: number[]; weight: number[] }[];
    notes?: string;
};

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutLogs'>;

export default function WorkoutLogListScreen({ route, navigation }: Props) {
    const { trainee } = route.params;
    const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [exerciseFilter, setExerciseFilter] = useState<string>('');
    const [sortOption, setSortOption] = useState<'date' | 'weight' | null>(null);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { theme, toggleTheme } = useTheme(); // Access theme and toggle function  
    const isDarkMode = theme === 'dark'; // Determine the current mode
    const styles = createStyles(isDarkMode); // Dynamically create styles
    const [isDropdownVisible, setDropdownVisible] = useState(false); // State for dropdown visibility
  
    const resetFilters = () => {
        setStartDate(null);
        setEndDate(null);
        setExerciseFilter('');
        setSortOption(null);
    };

    const fetchWorkoutLogs = async () => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }

            const response = await fetch(`http://192.168.1.10:8080/workout_logs/${trainee.id}`, {
                headers: {
                    Authorization: `${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch workout logs: ${response.statusText}`);
            }

            const data = await response.json();
            setWorkoutLogs(data);
        } catch (error) {
            console.error('Error fetching workout logs:', error);
        } finally {
            setIsLoading(false);
        }
    };


    useFocusEffect(
        useCallback(() => {
            fetchWorkoutLogs();
        }, [trainee])
    );

    const filteredLogs = workoutLogs.filter((log) => {
        const logDate = new Date(log.date);

        const matchesDate =
            (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
        const matchesExercise =
            !exerciseFilter || log.workouts.some((workout) => workout.exercise.includes(exerciseFilter));

        return matchesDate && matchesExercise;
    });

    const sortedLogs = [...filteredLogs].sort((a, b) => {
        if (sortOption === 'date') {
            return new Date(b.date).getTime() - new Date(a.date).getTime(); // Newest first
        }
        if (sortOption === 'weight') {
            const totalWeightA = a.workouts.reduce(
                (sum, w) => sum + w.weight.reduce((s, w) => s + w, 0),
                0
            );
            const totalWeightB = b.workouts.reduce(
                (sum, w) => sum + w.weight.reduce((s, w) => s + w, 0),
                0
            );
            return totalWeightB - totalWeightA; // Heaviest first
        }
        return 0;
    });

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

                            const response = await fetch(`http://192.168.1.10:8080/workout_logs/${logId}`, {
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

    const renderWorkoutLog = ({ item }: { item: WorkoutLog }) => (
        <View style={styles.logCard}>
            <TouchableOpacity
                onPress={() => navigation.navigate('WorkoutLogForm', { workoutLog: item, trainee })}>
                <View>
                    <Text style={styles.date}>Date: {item.date}</Text>
                    <Text style={styles.details}>Exercises: {item.workouts.length}</Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
        </View>
    );

    if (isLoading) {
        return <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Workout Logs for {trainee.name}</Text>

            <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>
                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </Text>
                 <Switch value={isDarkMode} onValueChange={toggleTheme} />
            </View>

             {/* Dropdown Toggle Button */}
            <TouchableOpacity
                style={styles.dropdownToggle}
                onPress={() => setDropdownVisible((prev) => !prev)}>
                <Text style={styles.dropdownToggleText}>
                    {isDropdownVisible ? 'Hide Filters & Sorting' : 'Show Filters & Sorting'}
                </Text>
            </TouchableOpacity>

            
            {/* Filters & Sorting Section */}
            {isDropdownVisible && (
                <View style={styles.dropdown}>
                    {/* Reset Filters */}
                    <View style={styles.resetContainer}>
                        <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                            <Text style={styles.resetButtonText}>Reset Filters</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Filter by Exercise */}
                    <TextInput
                        style={styles.input}
                        placeholder="Filter by Exercise"
                        value={exerciseFilter}
                        onChangeText={setExerciseFilter}
                    />

                    {/* Filter by Date */}
                    <Text style={styles.filterLabel}>Start Date:</Text>
                    <TouchableOpacity onPress={() => setShowStartDatePicker(true)}>
                        <Text style={styles.datePickerText}>
                            {startDate ? startDate.toDateString() : 'Select Start Date'}
                        </Text>
                    </TouchableOpacity>
                    {showStartDatePicker && (
                        <DateTimePicker
                            value={startDate || new Date()}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowStartDatePicker(false);
                                if (selectedDate) setStartDate(selectedDate);
                            }}
                        />
                    )}

                    <Text style={styles.filterLabel}>End Date:</Text>
                    <TouchableOpacity onPress={() => setShowEndDatePicker(true)}>
                        <Text style={styles.datePickerText}>
                            {endDate ? endDate.toDateString() : 'Select End Date'}
                        </Text>
                    </TouchableOpacity>
                    {showEndDatePicker && (
                        <DateTimePicker
                            value={endDate || new Date()}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowEndDatePicker(false);
                                if (selectedDate) setEndDate(selectedDate);
                            }}
                        />
                    )}

                    {/* Sorting Options */}
                    <Text style={styles.filterLabel}>Sort By:</Text>
                    <View style={styles.sortButtons}>
                        <TouchableOpacity
                            style={[
                                styles.sortButton,
                                sortOption === 'date' && styles.selectedSortButton,
                            ]}
                            onPress={() => setSortOption('date')}>
                            <Text style={styles.sortButtonText}>Date</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.sortButton,
                                sortOption === 'weight' && styles.selectedSortButton,
                            ]}
                            onPress={() => setSortOption('weight')}>
                            <Text style={styles.sortButtonText}>Total Weight</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Workout Logs */}
            <FlatList
                data={sortedLogs}
                renderItem={renderWorkoutLog}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
            />

            {/* Add Button */}
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('WorkoutCategories', { traineeId: trainee.id })}>
                <Text style={styles.addButtonText}>+ Add Workout Log</Text>
            </TouchableOpacity>
        </View>
    );
}

const createStyles = (isDarkMode: boolean) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: isDarkMode ? '#000' : '#fff',
            padding: 16,
        },
        switchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        switchLabel: {
            fontSize: 16,
            color: isDarkMode ? '#fff' : '#000',
            marginRight: 8,
        },
        resetContainer: {
            alignItems: 'flex-end',
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
        dropdownToggle: {
            backgroundColor: '#6200ee',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 8,
            marginBottom: 16,
            alignItems: 'center',
        },
        dropdownToggleText: {
            color: '#fff',
            fontSize: 16,
            fontWeight: 'bold',
        },
        dropdown: {
            backgroundColor: isDarkMode ? '#222' : '#f9f9f9',
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
        },
        
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
        },
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            color: isDarkMode ? '#fff' : '#000',
            marginBottom: 16,
        },
        list: {
            paddingBottom: 16,
        },
        logCard: {
            padding: 16,
            backgroundColor: isDarkMode ? '#222' : '#f1f1f1',
            borderRadius: 8,
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        date: {
            fontSize: 18,
            fontWeight: 'bold',
            color: isDarkMode ? '#fff' : '#000',
        },
        details: {
            fontSize: 14,
            color: isDarkMode ? '#aaa' : '#555',
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
        sortButtons: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            marginBottom: 16,
        },
        sortButton: {
            padding: 10,
            backgroundColor: isDarkMode ? '#555' : '#ccc',
            borderRadius: 8,
        },
        selectedSortButton: {
            backgroundColor: isDarkMode ? '#bb86fc' : '#6200ee',
        },
        sortButtonText: {
            color: '#fff',
        },
        addButton: {
            position: 'absolute',
            bottom: 16,
            right: 16,
            backgroundColor: '#6200ee',
            padding: 12,
            borderRadius: 50,
        },
        addButtonText: {
            color: '#fff',
            fontSize: 16,
        },
        deleteButton: {
            backgroundColor: '#d9534f',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 4,
        },
        deleteButtonText: {
            color: '#fff',
            fontSize: 14,
            fontWeight: 'bold',
        },
    });
