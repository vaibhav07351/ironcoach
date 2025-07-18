import React, { useState, useCallback } from 'react';
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
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutCategories'>;

export default function WorkoutCategoriesScreen({ route, navigation }: Props) {
    const { traineeId, selectedDate } = route.params;
    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
    const [isModalVisible, setModalVisible] = useState(false);

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }

            const backendUrl = Constants.expoConfig?.extra?.backendUrl;
            const response = await fetch(`${backendUrl}/categories`, {
                headers: { Authorization: `${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }

            const data = await response.json();

            if (!data || data.length === 0) {
                setCategories([]);
            } else {
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            // Toast.show({
            //     type: 'error',
            //     text1: 'Error',
            //     text2: 'Failed to load categories',
            // });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        setModalVisible(false);
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }

            const backendUrl = Constants.expoConfig?.extra?.backendUrl;
            const response = await fetch(`${backendUrl}/categories/${categoryId}`, {
                method: 'DELETE',
                headers: { Authorization: `${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to delete category');
            }

            setCategories(categories.filter((cat) => cat.id !== categoryId));
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Category deleted successfully!',
            });
        } catch (error) {
            console.error('Error deleting category:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete category.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditCategory = () => {
        if (selectedCategory) {
            setModalVisible(false);
            navigation.navigate('AddCustomCategory', {
                categoryId: selectedCategory.id,
                currentName: selectedCategory.name,
                traineeId,
            });
        }
    };

    const handleCategoryLongPress = (category: { id: string; name: string }) => {
        setSelectedCategory(category);
        setModalVisible(true);
    };

    useFocusEffect(
        useCallback(() => {
            fetchCategories();
        }, [])
    );

    const handleCategorySelect = (category: { id: string; name: string }) => {
        navigation.navigate('WorkoutExercises', {
            category: category.name,
            category_id: category.id,
            traineeId,
            selectedDate,
        });
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
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.categoryCard}
                            onPress={() => handleCategorySelect(item)}
                            onLongPress={() => handleCategoryLongPress(item)}
                        >
                            <Text style={styles.categoryText}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                />
            )}

            <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddCustomCategory', { traineeId })}
            >
                <Text style={styles.addButtonText}>+ Add Custom Category</Text>
            </TouchableOpacity>

            {/* Modal for Edit/Delete */}
            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Category Options</Text>
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
                                onPress={() => {
                                    handleEditCategory();
                                }}
                            >
                                <Text style={styles.modalButtonText}>✏️ Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#FF5252' }]}
                                onPress={() => {
                                    if (selectedCategory) {
                                        handleDeleteCategory(selectedCategory.id);
                                    }
                                }}
                            >
                                <Text style={styles.modalButtonText}>🗑️ Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContainer: {
        width: '85%',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
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
        marginBottom: 16,
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        marginHorizontal: 8,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
