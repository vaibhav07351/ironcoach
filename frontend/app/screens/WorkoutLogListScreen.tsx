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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Trainee } from '../types/trainee';
import DateTimePicker from '@react-native-community/datetimepicker';
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

export default function WorkoutLogListScreen({ route, navigation,trainee }: Props) {
    // const { trainee } = route.params;
    const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [exerciseFilter, setExerciseFilter] = useState<string>('');
    const [sortOption, setSortOption] = useState<'date' | 'weight' | null>(null);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const styles = createStyles(isDarkMode,isDropdownVisible);
    const [showTodayOnly, setShowTodayOnly] = useState(false);


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
            fetchWorkoutLogs();
        }, [trainee])
    );

    // Today's logs
    const dateInIST = new Date();
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

    const logsToDisplay = showTodayOnly ? todayLogs : sortedLogs;

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
    

    if (isLoading) {
        return <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />;
    }
    return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* <ScrollView contentContainerStyle={{ flexGrow: 1 }}> */}

        <View style={styles.container}>
            <Text style={styles.title}>Workout Logs for {trainee.name}</Text>



             {/* Dropdown Toggle Button */}
            <TouchableOpacity
                style={styles.dropdownToggle}
                onPress={() => setDropdownVisible((prev) => !prev)}>
                <Text style={styles.dropdownToggleText}>
                    {isDropdownVisible ? 'Hide Advance Filters' : 'Advance Filters'}
                </Text>
            </TouchableOpacity>

            
            {/* Filters & Sorting Section */}
            {isDropdownVisible && (
                <ScrollView contentContainerStyle={styles.dropdown}>

                    {/* Light/Dark Mode */}
                    <View style={styles.switchContainer}>
                        <Text style={styles.switchLabel}>
                            {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                        </Text>
                        <Switch value={isDarkMode} onValueChange={toggleTheme} />
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
                    
                    {/* Reset Filters */}
                    <View style={styles.resetContainer}>
                        <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                            <Text style={styles.resetButtonText}>Reset Filters</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            )}

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
    {/* </ScrollView> */}
</KeyboardAvoidingView>
    );
}

const createStyles = (isDarkMode: boolean, isDropdownVisible: boolean) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: isDarkMode ? '#000' : '#fff',
            padding: 16,
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
            backgroundColor: isDropdownVisible ? '#4CAF50' : '#1976D2',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 8,
            marginBottom: 16,
            alignItems: 'center',
        },
        dropdownToggleText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 'bold',
        },
        dropdown: {
            backgroundColor: isDarkMode ? '#222' : '#B6B6B6',
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
            marginTop:7,
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
            padding: 8,
            justifyContent: 'center',
            alignItems: 'center',
        },
        deleteButtonText: {
            color: '#fff',
            fontSize: 14,
            fontWeight: 'bold',
        },
    });
