import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutCategories'>;

export default function WorkoutCategoriesScreen({ route, navigation }: Props) {
    const { traineeId } = route.params; // Get traineeId
    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }

            const response = await fetch('http://192.168.1.10:8080/categories', {
                headers: { Authorization: `${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }

            const data = await response.json();
            setCategories(data.map((cat: any) => cat.name)); // Update categories list
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch categories every time the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchCategories();
        }, [])
    );

    const handleCategorySelect = (category: string) => {
        navigation.navigate('WorkoutExercises', { category, traineeId });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Select a Category</Text>
            {isLoading ? (
                <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />
            ) : categories.length === 0 ? (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>No categories available.</Text>
                </View>
            ) : (
                <FlatList
                    data={categories}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.categoryCard}
                            onPress={() => handleCategorySelect(item)}>
                            <Text style={styles.categoryText}>{item}</Text>
                        </TouchableOpacity>
                    )}
                />
            )}
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddCustomCategory', { traineeId })}>
                <Text style={styles.addButtonText}>+ Add Custom Category</Text>
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
    categoryCard: {
        padding: 16,
        backgroundColor: '#E9E9E9',
        borderRadius: 8,
        marginBottom: 12,
        alignItems: 'center',
    },
    categoryText: { fontSize: 18, fontWeight: 'bold' },
    addButton: {
        marginTop: 20,
        backgroundColor: '#6200ee',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    addButtonText: { color: '#fff', fontSize: 16 },
    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
    },
});
