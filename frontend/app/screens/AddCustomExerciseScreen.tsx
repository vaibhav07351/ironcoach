import React, { useState } from 'react';
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

type Props = NativeStackScreenProps<RootStackParamList, 'AddCustomExercise'>;

export default function AddCustomExerciseScreen({ route, navigation }: Props) {
    const { category, traineeId } = route.params; // Get category and traineeId from route params
    const [exerciseName, setExerciseName] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Spinner state

    const handleAddExercise = async () => {
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

            const response = await fetch('http://192.168.1.10:8080/exercises', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`,
                },
                body: JSON.stringify({ name: exerciseName, category, trainee_id: traineeId }),
            });

            if (!response.ok) {
                throw new Error('Failed to add exercise');
            }

            Alert.alert('Success', 'Exercise added successfully!');
            navigation.goBack(); // Go back to the exercises screen
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An error occurred while adding the exercise.');
        } finally {
            setIsLoading(false); // Hide spinner
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Add Custom Exercise to {category}</Text>
            <TextInput
                style={styles.input}
                placeholder="Exercise Name"
                value={exerciseName}
                onChangeText={setExerciseName}
            />
            {isLoading ? (
                <ActivityIndicator size="large" color="#6200ee" />
            ) : (
                <TouchableOpacity style={styles.addButton} onPress={handleAddExercise}>
                    <Text style={styles.addButtonText}>Add Exercise</Text>
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
