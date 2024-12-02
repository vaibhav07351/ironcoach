import React, { useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen() {
    const { isAuthenticated, logout } = useContext(AuthContext);
    const navigation = useNavigation<NavigationProp>();

    useEffect(() => {
        if (!isAuthenticated) {
            Alert.alert('Session Expired', 'Please log in to continue.');
            navigation.navigate('Login');
        }
    }, [isAuthenticated]);

    const handleLogout = () => {
        logout();
        Alert.alert('Logged Out', 'You have been logged out successfully.');
        navigation.navigate('Login');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Dashboard</Text>
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('Trainees')}>
                <Text style={styles.cardText}>View Trainees</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.card}
                onPress={() =>
                    navigation.navigate('WorkoutLogs', { trainee: { id: '1', name: 'John Doe' } })
                }>
                <Text style={styles.cardText}>Workout Logs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    card: {
        padding: 16,
        backgroundColor: '#f1f1f1',
        borderRadius: 8,
        marginBottom: 12,
    },
    cardText: {
        fontSize: 18,
    },
    logoutButton: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#d9534f',
        borderRadius: 8,
    },
    logoutButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 16,
    },
});
