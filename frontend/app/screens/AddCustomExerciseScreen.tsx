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
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';

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
                body: JSON.stringify(
                    exerciseId
                        ? { name: exerciseName, trainee_id: traineeId }
                        : {
                              name: exerciseName,
                              category,
                              category_id,
                              trainee_id: traineeId,
                          }
                ),
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
            <Text style={styles.eyebrow}>{category}</Text>
            <Text style={styles.title}>
                {exerciseId ? 'Edit exercise' : 'New exercise'}
            </Text>
            <Text style={styles.sub}>
                {exerciseId
                    ? 'Update the name for this movement.'
                    : 'Add a custom movement to this category.'}
            </Text>
            <TextInput
                style={styles.input}
                placeholder="Exercise name"
                placeholderTextColor={Colors.textSecondary}
                value={exerciseName}
                onChangeText={setExerciseName}
            />
            {isLoading ? (
                <ActivityIndicator size="large" color={Colors.primary} />
            ) : (
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleSaveExercise}
                    activeOpacity={0.88}
                >
                    <Text style={styles.addButtonText}>
                        {exerciseId ? 'Save changes' : 'Add exercise'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: Spacing.large,
        justifyContent: 'center',
        backgroundColor: Colors.background,
    },
    eyebrow: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: Colors.accent,
        marginBottom: Spacing.small,
        textAlign: 'center',
    },
    title: {
        fontFamily: Fonts.display,
        fontSize: 28,
        fontWeight: '700',
        marginBottom: Spacing.small,
        textAlign: 'center',
        color: Colors.primary,
    },
    sub: {
        textAlign: 'center',
        color: Colors.textSecondary,
        marginBottom: Spacing.large,
        lineHeight: 22,
    },
    input: {
        padding: Spacing.medium,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radii.md,
        marginBottom: Spacing.medium,
        fontSize: 16,
        backgroundColor: Colors.surface,
        color: Colors.textPrimary,
    },
    addButton: {
        backgroundColor: Colors.accent,
        paddingVertical: 14,
        borderRadius: Radii.md,
        alignItems: 'center',
    },
    addButtonText: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '800',
    },
});
