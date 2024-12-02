import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

// Define Workout Log type
type WorkoutLog = {
    id: string;
    date: string;
    workouts: { exercise: string; sets: number; reps: number[]; weight: number[] }[];
    notes?: string;
};

// Define Props for the Screen
type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutLogs'>;

export default function WorkoutLogListScreen({ route, navigation }: Props) {
    const { trainee } = route.params;
    const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);

    useEffect(() => {
        // Fetch workout logs for the trainee
        fetch(`http://192.168.1.10:8080/workout_logs/${trainee.id}`, {
            headers: {
                Authorization: 'YOUR_JWT_TOKEN',
            },
        })
            .then((res) => res.json())
            .then((data) => setWorkoutLogs(data))
            .catch((error) => console.error(error));
    }, [trainee]);

    const renderWorkoutLog = ({ item }: { item: WorkoutLog }) => (
        <TouchableOpacity
            style={styles.logCard}
            onPress={() => navigation.navigate('WorkoutLogForm', { workoutLog: item, trainee })}>
            <Text style={styles.date}>Date: {item.date}</Text>
            <Text style={styles.details}>Exercises: {item.workouts.length}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Workout Logs for {trainee.name}</Text>
            <FlatList
                data={workoutLogs}
                renderItem={renderWorkoutLog}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
            />
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
    },
    date: { fontSize: 18, fontWeight: 'bold' },
    details: { fontSize: 14, color: '#555' },
    addButton: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: '#6200ee',
        padding: 12,
        borderRadius: 50,
    },
    addButtonText: { color: '#fff', fontSize: 16 },
});
