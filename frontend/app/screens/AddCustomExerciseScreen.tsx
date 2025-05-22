import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCustomExercise'>;

export default function AddCustomExerciseScreen({ route, navigation }: Props) {
    const { category, category_id, traineeId, exerciseId, currentName } = route.params;
    const [exerciseName, setExerciseName] = useState(currentName || '');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (exerciseId && currentName) {
            console.log(`Editing exercise: ${exerciseId} with name: ${currentName}`);
        }
    }, [exerciseId, currentName]);

    const handleSaveExercise = async () => {
        if (!exerciseName.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Exercise name cannot be empty.',
            });
            return;
        }

        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Toast.show({
                    type: 'error',
                    text1: 'Authentication Error',
                    text2: 'Please log in again.',
                });
                navigation.navigate('Login');
                return;
            }

            const backendUrl = Constants.expoConfig?.extra?.backendUrl;
            const url = exerciseId
                ? `${backendUrl}/exercises/${exerciseId}`
                : `${backendUrl}/exercises`;
            const method = exerciseId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`,
                },
                body: JSON.stringify({
                    name: exerciseName,
                    category,
                    category_id,
                    trainee_id: traineeId,
                }),
            });

            if (!response.ok) {
                throw new Error(exerciseId ? 'Failed to update exercise' : 'Failed to add exercise');
            }

            Toast.show({
                type: 'success',
                text1: exerciseId ? 'Exercise Updated' : 'Exercise Added',
                text2: `The exercise "${exerciseName}" was successfully ${exerciseId ? 'updated' : 'added'}.`,
            });

            navigation.goBack();
        } catch (error) {
            console.error(error);
            Toast.show({
                type: 'error',
                text1: 'Server Error',
                text2: 'Something went wrong while saving the exercise.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {exerciseId
                    ? `Edit Exercise in ${category}`
                    : `Add Custom Exercise to ${category}`}
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
