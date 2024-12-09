import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutExercises'>;

export default function WorkoutExercisesScreen({ route, navigation }: Props) {
    const { category, traineeId } = route.params; // Extract both category and traineeId
    const [exercises, setExercises] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchExercises = async () => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }

            const response = await fetch(`http://192.168.1.10:8080/exercises/${category}`, {
                headers: {
                    Authorization: `${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch exercises');
            }

            const data = await response.json();

            // Handle case where data is null or empty
            if (!data || data.length === 0) {
                setExercises([]); // Set to an empty array
            } else {
                setExercises(data.map((exercise: any) => exercise.name)); // Extract exercise names
            }
        } catch (error) {
            console.error('Error fetching exercises:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchExercises(); // Refetch exercises when the screen regains focus
        }, [category])
    );

    useEffect(() => {
        fetchExercises();
    }, [category]);

    const handleExerciseSelect = (exercise: string) => {
        navigation.navigate('AddExerciseForm', { exercise, traineeId });
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
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.exerciseCard}
                                onPress={() => handleExerciseSelect(item)}>
                                <Text style={styles.exerciseText}>{item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddCustomExercise', { category, traineeId })}>
                <Text style={styles.addButtonText}>+ Add Custom Exercise</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // backgroundColor:'#0000FF',
        flex: 1,
        padding: 16,
        justifyContent: 'space-between', // Ensures space distribution between elements
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    content: {
        // backgroundColor:'#FFFF00',
        flex: 1,
        // textAlign: 'center',
        justifyContent: 'center', // Center content vertically
        // alignItems: 'center', // Center content horizontally
        paddingBottom:70,
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
});
