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
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [showHint, setShowHint] = useState(true);

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
            setIsModalVisible(false); // Close the options modal first
            setIsDeleteModalVisible(true); // Show delete confirmation modal
        }
    };

    const handleDeleteExercise = async () => {
        if (selectedExercise) {
            setIsDeleteModalVisible(false); // Close confirmation modal
            setIsLoading(true);
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
                });
                
                // Update the exercises list by removing the deleted exercise
                setExercises(exercises.filter(ex => ex.id !== selectedExercise.id));
                
            } catch (error) {
                console.error('Error deleting exercise:', error);
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'An error occurred while deleting the exercise.',
                });
            } finally {
                setIsLoading(false);
            }
        }
    };
    

    const handleLongPress = (exercise: { id: string; name: string }) => {
        setSelectedExercise(exercise);
        setIsModalVisible(true);
        setShowHint(false); // Hide hint after first use
    };

    const dismissHint = () => {
        setShowHint(false);
    };

    const handleExerciseSelect = (exercise: { id: string; name: string }) => {
        navigation.navigate('AddExerciseForm', { exercise: exercise.name, exercise_id: exercise.id, traineeId, selectedDate });
    };

    const renderExerciseItem = ({ item }: { item: { id: string; name: string } }) => (
        <TouchableOpacity
            style={styles.exerciseCard}
            onPress={() => handleExerciseSelect(item)}
            onLongPress={() => handleLongPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.exerciseContent}>
                <Text style={styles.exerciseText}>{item.name}</Text>
                <View style={styles.optionsIndicator}>
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                </View>
            </View>
        </TouchableOpacity>
    );
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{category} Exercises</Text>
            
            {/* Hint Banner */}
            {showHint && exercises.length > 0 && (
                <View style={styles.hintBanner}>
                    <Text style={styles.hintText}>
                        💡 Long press any exercise to edit or delete it
                    </Text>
                    <TouchableOpacity onPress={dismissHint} style={styles.dismissButton}>
                        <Text style={styles.dismissButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.content}>
                {isLoading ? (
                    <ActivityIndicator size="large" color="#6200ee" />
                ) : exercises.length === 0 ? (
                    <Text style={styles.noExerciseText}>No exercises added for this category.</Text>
                ) : (
                    <FlatList
                        data={exercises}
                        keyExtractor={(item) => item.id}
                        renderItem={renderExerciseItem}
                        showsVerticalScrollIndicator={false}
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
                        <Text style={styles.modalSubtitle}>"{selectedExercise?.name}"</Text>
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

            {/* Delete Confirmation Modal */}
            <Modal
                visible={isDeleteModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsDeleteModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.deleteModalContent}>
                        <Text style={styles.deleteModalTitle}>Delete Confirmation</Text>
                        <Text style={styles.deleteModalText}>
                            Deleting "{selectedExercise?.name}" will also delete all workout logs. 
                            Are you sure you want to continue?
                        </Text>
                        <View style={styles.deleteModalButtons}>
                            <TouchableOpacity
                                style={[styles.deleteModalButton, { backgroundColor: '#888' }]}
                                onPress={() => setIsDeleteModalVisible(false)}>
                                <Text style={styles.deleteModalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.deleteModalButton, { backgroundColor: '#FF5252' }]}
                                onPress={handleDeleteExercise}>
                                <Text style={styles.deleteModalButtonText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
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
    hintBanner: {
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    hintText: {
        fontSize: 14,
        color: '#1976D2',
        flex: 1,
        fontWeight: '500',
    },
    dismissButton: {
        padding: 4,
        marginLeft: 8,
    },
    dismissButtonText: {
        fontSize: 16,
        color: '#1976D2',
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingBottom: 70,
    },
    exerciseCard: {
        padding: 16,
        backgroundColor: '#FAFAFA',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    exerciseContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    exerciseText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        textAlign: 'center',
    },
    optionsIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        opacity: 0.5,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#666',
        marginHorizontal: 1,
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
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        width: '85%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: '#333',
    },
    modalSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
        color: '#666',
        fontStyle: 'italic',
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
    deleteModalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        width: '90%',
        maxWidth: 400,
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
        color: '#333',
    },
    deleteModalText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        color: '#666',
        lineHeight: 22,
    },
    deleteModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    deleteModalButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    deleteModalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
});