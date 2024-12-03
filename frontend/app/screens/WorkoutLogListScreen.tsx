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

    const fetchWorkoutLogs = async () => {
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

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Workout Logs for {trainee.name}</Text>

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
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
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
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
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
                onPress={() => navigation.navigate('WorkoutLogForm', { trainee })}>
                <Text style={styles.addButtonText}>+ Add Workout Log</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    list: { paddingBottom: 16 },
    logCard: {
        padding: 16,
        backgroundColor: '#f1f1f1',
        borderRadius: 8,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    date: { fontSize: 18, fontWeight: 'bold' },
    details: { fontSize: 14, color: '#555' },
    input: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 12,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginVertical: 8,
    },
    datePickerText: {
        fontSize: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 12,
    },
    sortButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    sortButton: {
        padding: 10,
        backgroundColor: '#ccc',
        borderRadius: 8,
    },
    selectedSortButton: {
        backgroundColor: '#6200ee',
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
    addButtonText: { color: '#fff', fontSize: 16 },
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
