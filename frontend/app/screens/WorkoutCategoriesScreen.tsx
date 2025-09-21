import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Animated,
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
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [showHint, setShowHint] = useState(true);

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

    const showDeleteConfirmation = () => {
        if (selectedCategory) {
            setModalVisible(false); // Close the options modal first
            setIsDeleteModalVisible(true); // Show delete confirmation modal
        }
    };

    const handleDeleteCategory = async () => {
        if (selectedCategory) {
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
                const response = await fetch(`${backendUrl}/categories/${selectedCategory.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `${token}` },
                });

                if (!response.ok) {
                    throw new Error('Failed to delete category');
                }

                setCategories(categories.filter((cat) => cat.id !== selectedCategory.id));
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
        setShowHint(false); // Hide hint after first use
    };

    const dismissHint = () => {
        setShowHint(false);
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

    const renderCategoryItem = ({ item }: { item: { id: string; name: string } }) => (
        <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => handleCategorySelect(item)}
            onLongPress={() => handleCategoryLongPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.categoryContent}>
                <Text style={styles.categoryText}>{item.name}</Text>
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
            <Text style={styles.title}>Select a Category</Text>
            
            {/* Hint Banner */}
            {showHint && categories.length > 0 && (
                <View style={styles.hintBanner}>
                    <Text style={styles.hintText}>
                        💡 Long press any category to edit or delete it
                    </Text>
                    <TouchableOpacity onPress={dismissHint} style={styles.dismissButton}>
                        <Text style={styles.dismissButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

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
                    renderItem={renderCategoryItem}
                    showsVerticalScrollIndicator={false}
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
                        <Text style={styles.modalSubtitle}>"{selectedCategory?.name}"</Text>
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
                                onPress={showDeleteConfirmation}
                            >
                                <Text style={styles.modalButtonText}>🗑️ Delete</Text>
                            </TouchableOpacity>
                        </View>
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
                            Deleting "{selectedCategory?.name}" will also delete all exercises and workout logs in this category. 
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
                                onPress={handleDeleteCategory}>
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
    container: { flex: 1, padding: 16 },
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
    categoryCard: {
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
    categoryContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    categoryText: { 
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
    longPressHint: {
        fontSize: 12,
        color: '#888',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 4,
    },
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