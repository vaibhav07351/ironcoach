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

type Props = NativeStackScreenProps<RootStackParamList, 'AddCustomCategory'>;

export default function AddCustomCategoryScreen({ route, navigation }: Props) {
    const { traineeId, categoryId, currentName } = route.params || {};
    const [categoryName, setCategoryName] = useState(currentName || '');
    const [isLoading, setIsLoading] = useState(false);
    const isUpdateMode = Boolean(categoryId);

    const handleSaveCategory = async () => {
        if (!categoryName.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Category name cannot be empty.',
            });
            return;
        }

        setIsLoading(true);
        const backendUrl = Constants.expoConfig?.extra?.backendUrl;

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

            const url = isUpdateMode
                ? `${backendUrl}/categories/${categoryId}`
                : `${backendUrl}/categories`;
            const method = isUpdateMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`,
                },
                body: JSON.stringify({
                    name: categoryName,
                    trainee_id: traineeId,
                }),
            });

            if (!response.ok) {
                throw new Error(isUpdateMode ? 'Failed to update category' : 'Failed to add category');
            }

            Toast.show({
                type: 'success',
                text1: isUpdateMode ? 'Category Updated' : 'Category Added',
                text2: `The category "${categoryName}" has been ${isUpdateMode ? 'updated' : 'added'} successfully.`,
            });

            navigation.goBack();
        } catch (error) {
            console.error(error);
            Toast.show({
                type: 'error',
                text1: 'Server Error',
                text2: 'Something went wrong while saving the category.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isUpdateMode && currentName) {
            setCategoryName(currentName);
        }
    }, [currentName, isUpdateMode]);

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.eyebrow}>IronCoach</Text>
            <Text style={styles.title}>
                {isUpdateMode ? 'Update category' : 'New category'}
            </Text>
            <Text style={styles.sub}>Name the muscle group or focus for this block.</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Push, Legs, Core"
                placeholderTextColor={Colors.textSecondary}
                value={categoryName}
                onChangeText={setCategoryName}
            />
            <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveCategory}
                activeOpacity={0.88}
            >
                <Text style={styles.saveButtonText}>
                    {isUpdateMode ? 'Save changes' : 'Add category'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
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
    saveButton: {
        backgroundColor: Colors.accent,
        paddingVertical: 14,
        borderRadius: Radii.md,
        alignItems: 'center',
    },
    saveButtonText: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '800',
    },
});
