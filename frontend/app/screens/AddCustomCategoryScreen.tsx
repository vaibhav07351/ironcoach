import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ActivityIndicator } from 'react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCustomCategory'>;

export default function AddCustomCategoryScreen({ route, navigation }: Props) {
    const { traineeId, categoryId, currentName } = route.params || {};
    const [categoryName, setCategoryName] = useState(currentName || '');
    const [isLoading, setIsLoading] = useState(false);
    const isUpdateMode = Boolean(categoryId);

    const handleSaveCategory = async () => {
        if (!categoryName.trim()) {
            Alert.alert('Error', 'Category name cannot be empty.');
            return;
        }

        setIsLoading(true); // Start loading
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Authentication token not found. Please log in again.');
                navigation.navigate('Login');
                return;
            }

            const url = isUpdateMode
                ? `http://192.168.1.10:8080/categories/${categoryId}`
                : 'http://192.168.1.10:8080/categories';
            const method = isUpdateMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`,
                },
                body: JSON.stringify({ name: categoryName }),
            });

            if (!response.ok) {
                throw new Error(
                    isUpdateMode ? 'Failed to update category' : 'Failed to add category'
                );
            }

            Alert.alert('Success', isUpdateMode ? 'Category updated successfully!' : 'Category added successfully!');
            navigation.goBack(); // Go back to the categories screen
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An error occurred while saving the category.');
        } finally {
            setIsLoading(false); // Stop loading
        }
    };

    useEffect(() => {
        if (isUpdateMode && currentName) {
            setCategoryName(currentName); // Populate the input with the current category name
        }
    }, [currentName, isUpdateMode]);

    return isLoading ? (
        <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />
    ) : (
        <View style={styles.container}>
            <Text style={styles.title}>{isUpdateMode ? 'Update Category' : 'Add Custom Category'}</Text>
            <TextInput
                style={styles.input}
                placeholder="Category Name"
                value={categoryName}
                onChangeText={setCategoryName}
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveCategory}>
                <Text style={styles.saveButtonText}>{isUpdateMode ? 'Update Category' : 'Add Category'}</Text>
            </TouchableOpacity>
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
    saveButton: {
        backgroundColor: '#6200ee',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: { color: '#fff', fontSize: 16 },
});
