import React, { useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen() {
    const { isAuthenticated, logout } = useContext(AuthContext); // Assuming trainerName is provided by context
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
            <Text style={styles.title}>Welcome, Trainer!</Text>
            <Text style={styles.greeting}>It's a great day to inspire your trainees and help them achieve their goals!</Text>

            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('Trainees')}>
                <Text style={styles.cardText}>View Trainees</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Developed by Vaibhav Bhardwaj</Text>
                <Text style={styles.footerText}>For inquiries, feel free to reach out at:</Text>
                <TouchableOpacity onPress={() => Linking.openURL('mailto:vaibhav07351@gmail.com')}>
                    <Text style={[styles.footerText, styles.footerLink]}>vaibhav07351@gmail.com</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: Spacing.medium,
        backgroundColor: '#f0f4f8', // Soft background color
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#6200ee', // Vibrant color for the title
    },
    greeting: {
        fontSize: 18,
        color: '#4caf50', // Friendly green color for the greeting
        marginBottom: 20,
        fontStyle: 'italic',
    },
    card: {
        padding: 18,
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5, // Shadow for Android
    },
    cardText: {
        fontSize: 18,
        color: '#6200ee',
        fontWeight: '600',
    },
    logoutButton: {
        marginTop: 30,
        padding: 14,
        backgroundColor: '#d9534f', // Red color for logout
        borderRadius: 10,
        alignItems: 'center',
    },
    logoutButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        alignItems: 'center',
        marginTop: 20, // Add some space between the form and the footer
        paddingVertical: 8,
        // backgroundColor: '#f9f9f9', // Light background color for footer
        borderTopWidth: 1,
        borderTopColor: '#ddd', // Subtle border at the top
        width: '100%', // Ensure footer spans the full width
    },
    footerText: {
        fontSize: 14,
        color: '#555', // A softer gray for the text
        fontWeight: '500', // Slightly lighter font weight for a modern feel
        textAlign: 'center',
        marginBottom: 1, // Adds spacing between footer lines
    },
    footerLink: {
        color: '#6200ee', // Keep the link color consistent with buttons
        fontWeight: '600',
        textDecorationLine: 'underline', // Adds underline for links
    },
});
