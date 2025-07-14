import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutExercises'>;

export default function WorkoutExercisesScreen({ route, navigation }: Props) {
    const { category, category_id, traineeId, selectedDate } = route.params;
    const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<{ id: string; name: string } | null>(
        null
    );
    const [isModalVisible, setIsModalVisible] = useState(false);

    const fetchExercises = async () => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }
            const backendUrl = Constants.expoConfig?.extra?.backendUrl;
            const response = await fetch(`${backendUrl}/exercises/${category}`, {
                headers: {
                    Authorization: `${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch exercises');
            }

            const data = await response.json();

            if (!data || data.length === 0) {
                setExercises([]);
            } else {
                setExercises(data.map((exercise: any) => ({ id: exercise.id, name: exercise.name })));
            }
        } catch (error) {
            console.error('Error fetching exercises:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchExercises();
        }, [category])
    );

    useEffect(() => {
        fetchExercises();
    }, [category]);

    const handleEditExercise = () => {
        if (selectedExercise) {
            navigation.navigate('AddCustomExercise', {
                category,
                category_id,
                traineeId,
                exerciseId: selectedExercise.id,
                currentName: selectedExercise.name,
            });
        }
        setIsModalVisible(false);
    };

    const showDeleteConfirmation = () => {
        if (selectedExercise) {
            Toast.show({
                type: 'info',
                text1: 'Delete Confirmation',
                text2: `Deleting "${selectedExercise.name}" will also delete all workout logs. Tap to confirm.`,
                position: 'top',
                visibilityTime: 8000,
                onPress: handleDeleteExercise,
                props: {
                    onPress: handleDeleteExercise
                }
            });
            setIsModalVisible(false);
        }
    };

    const handleDeleteExercise = async () => {
        if (selectedExercise) {
            try {
                const token = await AsyncStorage.getItem('token');
                if (!token) {
                    console.error('No token found. Redirecting to login.');
                    navigation.navigate('Login');
                    return;
                }
                const backendUrl = Constants.expoConfig?.extra?.backendUrl;
                const response = await fetch(
                    `${backendUrl}/exercises/${selectedExercise.id}`,
                    {
                        method: 'DELETE',
                        headers: {
                            Authorization: `${token}`,
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to delete exercise');
                }

                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Exercise and its logs deleted successfully!',
                    position: 'top'
                });
                fetchExercises();
            } catch (error) {
                console.error('Error deleting exercise:', error);
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'An error occurred while deleting the exercise.',
                    position: 'top'
                });
            }
        }
    };
    

    const handleLongPress = (exercise: { id: string; name: string }) => {
        setSelectedExercise(exercise);
        setIsModalVisible(true);
    };

    const handleExerciseSelect = (exercise: { id: string; name: string }) => {
        navigation.navigate('AddExerciseForm', { exercise: exercise.name, exercise_id: exercise.id, traineeId, selectedDate });
    };
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{category} Exercises</Text>
            <View style={styles.content}>
                {isLoading ? (
                    <ActivityIndicator size="large" color="#6200ee" />
                ) : exercises.length === 0 ? (
                    <Text style={styles.noExerciseText}>No exercises added for this category.</Text>
                ) : (
                    <FlatList
                        data={exercises}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.exerciseCard}
                                onPress={() => handleExerciseSelect(item)}
                                onLongPress={() => handleLongPress(item)}>
                                <Text style={styles.exerciseText}>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddCustomExercise', { category, category_id, traineeId })}>
                <Text style={styles.addButtonText}>+ Add Custom Exercise</Text>
            </TouchableOpacity>

            {/* Modal for Edit and Delete */}
            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Exercise Options</Text>
                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
                            onPress={handleEditExercise}>
                            {/* <MaterialIcons name="edit" size={24} color="#FFF" /> */}
                            <Text style={styles.modalButtonText}>✏️ Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: '#FF5252' }]}
                            onPress={showDeleteConfirmation}>
                            {/* <MaterialIcons name="delete" size={24} color="#FFF" /> */}
                            <Text style={styles.modalButtonText}>🗑️ Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingBottom: 70,
    },
    exerciseCard: {
        padding: 16,
        backgroundColor: '#E9E9E9',
        borderRadius: 8,
        marginBottom: 12,
        alignItems: 'center',
    },
    exerciseText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    noExerciseText: {
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
        color: '#888',
        marginVertical: 20,
    },
    addButton: {
        backgroundColor: '#6200ee',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        width: '85%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    modalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
        width: '100%',
        justifyContent: 'center',
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginLeft: 8,
    },
});