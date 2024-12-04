import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator } from 'react-native';

// Define Props for the Screen
type Props = NativeStackScreenProps<RootStackParamList, 'AddExerciseForm'>;

export default function AddExerciseFormScreen({ route, navigation }: Props) {
    const { exercise } = route.params; // Get the selected exercise from the route params
    const [weight, setWeight] = useState(0);
    const [reps, setReps] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Authentication token not found. Please log in again.');
                navigation.navigate('Login');
                return;
            }
    
            const workoutLog = { exercise, weight, reps }; // Construct the workout log
            const response = await fetch(`http://192.168.1.10:8080/workout_logs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`,
                },
                body: JSON.stringify({ ...workoutLog, trainee_id: route.params.traineeId }),
            });
    
            if (!response.ok) {
                throw new Error('Failed to add workout log');
            }
    
            Alert.alert('Success', 'Workout log added successfully!');
            navigation.goBack(); // Navigate back to the workout logs list
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An error occurred while adding the workout log.');
        }finally {
            setIsLoading(false);
        }
    };
    

    return isLoading ? (
        <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />
    ) : (
        <View style={styles.container}>
            <Text style={styles.title}>{exercise}</Text>
            <View style={styles.controlRow}>
                <Text>Weight: {weight} kg</Text>
                <TouchableOpacity onPress={() => setWeight((w) => w + 2.5)}>
                    <Text style={styles.buttonText}>+ 2.5</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setWeight((w) => Math.max(w - 2.5, 0))}>
                    <Text style={styles.buttonText}>- 2.5</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.controlRow}>
                <Text>Reps: {reps}</Text>
                <TouchableOpacity onPress={() => setReps((r) => r + 1)}>
                    <Text style={styles.buttonText}>+ 1</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setReps((r) => Math.max(r - 1, 0))}>
                    <Text style={styles.buttonText}>- 1</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity
                style={[styles.addButton, !(weight && reps) && styles.disabledButton]}
                 onPress={handleSubmit}
                 disabled={!(weight && reps)}>
                 <Text style={styles.addButtonText}>Add Workout</Text>
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonText: { fontSize: 16, fontWeight: 'bold' },
    addButton: {
        marginTop: 20,
        backgroundColor: '#6200ee',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    addButtonText: { color: '#fff', fontSize: 16 },
});
