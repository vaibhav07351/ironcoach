import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutLogForm'>;

export default function WorkoutLogFormScreen({ route, navigation }: Props) {
    const { workoutLog, trainee } = route.params || {};

    // Pre-fill fields if `workoutLog` exists
    const [date, setDate] = useState(workoutLog?.date || '');
    const [exercise, setExercise] = useState('');
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [weight, setWeight] = useState('');

    useEffect(() => {
        if (workoutLog) {
            // Pre-fill the form fields based on the first workout
            const firstWorkout = workoutLog.workouts[0] || {};
            setExercise(firstWorkout.exercise || '');
            setSets(firstWorkout.sets?.toString() || '');
            setReps(firstWorkout.reps?.join(', ') || '');
            setWeight(firstWorkout.weight?.join(', ') || '');
        }
    }, [workoutLog]);

    const handleSubmit = async () => {
        if (!date || !exercise || !sets || !reps || !weight) {
            Alert.alert('Validation Error', 'All fields are required.');
            return;
        }

        const newWorkoutLog = {
            ...workoutLog,
            date,
            workouts: [
                {
                    exercise,
                    sets: parseInt(sets),
                    reps: reps.split(',').map((r) => parseInt(r.trim())),
                    weight: weight.split(',').map((w) => parseFloat(w.trim())),
                },
            ],
        };

        const url = workoutLog
            ? `http://192.168.1.10:8080/workout_logs/${workoutLog.id}`
            : `http://192.168.1.10:8080/workout_logs`;

        const method = workoutLog ? 'PUT' : 'POST';

        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'User is not authenticated. Please log in again.');
                return;
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`,
                },
                body: JSON.stringify({ ...newWorkoutLog, trainee_id: trainee.id }),
            });

            if (response.ok) {
                Alert.alert(
                    'Success',
                    workoutLog ? 'Workout log updated successfully.' : 'Workout log added successfully.'
                );
                navigation.goBack();
            } else {
                Alert.alert('Error', 'Failed to save workout log. Please try again.');
            }
        } catch (error) {
            console.error('Error saving workout log:', error);
            Alert.alert('Error', 'Failed to save workout log. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{workoutLog ? 'Edit Workout Log' : 'Add Workout Log'}</Text>
            <TextInput
                style={styles.input}
                placeholder="Date (YYYY-MM-DD)"
                value={date}
                onChangeText={setDate}
            />
            <TextInput
                style={styles.input}
                placeholder="Exercise Name"
                value={exercise}
                onChangeText={setExercise}
            />
            <TextInput
                style={styles.input}
                placeholder="Sets"
                value={sets}
                onChangeText={setSets}
                keyboardType="numeric"
            />
            <TextInput
                style={styles.input}
                placeholder="Reps (comma-separated)"
                value={reps}
                onChangeText={setReps}
            />
            <TextInput
                style={styles.input}
                placeholder="Weight (comma-separated)"
                value={weight}
                onChangeText={setWeight}
            />
            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                <Text style={styles.buttonText}>{workoutLog ? 'Update' : 'Add'} Workout Log</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    input: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 12,
    },
    button: {
        backgroundColor: '#6200ee',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    buttonText: { color: '#fff', fontSize: 16, textAlign: 'center' },
});
