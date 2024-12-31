import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Constants from 'expo-constants';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCustomExercise'>;

export default function AddCustomExerciseScreen({ route, navigation }: Props) {
    const { category, category_id, traineeId, exerciseId, currentName } = route.params; // Get category, traineeId, exerciseId, and currentName from route params
    const [exerciseName, setExerciseName] = useState(currentName || ''); // Pre-fill name if editing
    const [isLoading, setIsLoading] = useState(false); // Spinner state

    useEffect(() => {
        if (exerciseId && currentName) {
            console.log(`Editing exercise: ${exerciseId} with name: ${currentName}`);
        }
    }, [exerciseId, currentName]);

    const handleSaveExercise = async () => {
        if (!exerciseName.trim()) {
            Alert.alert('Error', 'Exercise name cannot be empty.');
            return;
        }
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Authentication token not found. Please log in again.');
                navigation.navigate('Login');
                return;
            }
            const backendUrl = Constants.expoConfig?.extra?.backendUrl;
            const url = exerciseId
                ? `${backendUrl}/exercises/${exerciseId}` // Update URL if editing
                : `${backendUrl}/exercises`; // Create URL if adding

            const method = exerciseId ? 'PUT' : 'POST'; // HTTP method: PUT for update, POST for create

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`,
                },
                body: JSON.stringify({ name: exerciseName, category, category_id, trainee_id: traineeId }),
            });

            if (!response.ok) {
                throw new Error(exerciseId ? 'Failed to update exercise' : 'Failed to add exercise');
            }

            Alert.alert(
                'Success',
                exerciseId ? 'Exercise updated successfully!' : 'Exercise added successfully!'
            );
            navigation.goBack(); // Go back to the exercises screen
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An error occurred while saving the exercise.');
        } finally {
            setIsLoading(false); // Hide spinner
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {exerciseId ? `Edit Exercise in ${category}` : `Add Custom Exercise to ${category}`}
            </Text>
            <TextInput
                style={styles.input}
                placeholder="Exercise Name"
                value={exerciseName}
                onChangeText={setExerciseName}
            />
            {isLoading ? (
                <ActivityIndicator size="large" color="#6200ee" />
            ) : (
                <TouchableOpacity style={styles.addButton} onPress={handleSaveExercise}>
                    <Text style={styles.addButtonText}>
                        {exerciseId ? 'Update Exercise' : 'Add Exercise'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, justifyContent: 'center' },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    input: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 16,
    },
    addButton: {
        backgroundColor: '#6200ee',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    addButtonText: { color: '#fff', fontSize: 16 },
});
