import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';
import { Spacing } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

type TrainerDetails = {
    name: string;
    email: string;
    specialization?: string;
};

export default function DashboardScreen({ navigation }: Props) {
    const { isAuthenticated, logout } = useContext(AuthContext); // Assuming trainerId is in AuthContext
    const [trainerDetails, setTrainerDetails] = useState<TrainerDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            Alert.alert('Session Expired', 'Please log in to continue.');
            navigation.navigate('Login');
            return;
        }

        const fetchTrainerDetails = async () => {
            try {
                const response = await fetch(`http://192.168.1.10:8080/getTrainerDetails`, {
                    headers: {
                        Authorization: `${await AsyncStorage.getItem('token')}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch trainer details');
                }

                const data = await response.json();
                setTrainerDetails(data);
            } catch (error) {
                console.error('Error fetching trainer details:', error);
                Alert.alert('Error', 'Failed to fetch trainer details.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTrainerDetails();
    }, [isAuthenticated]);

    const handleLogout = () => {
        logout();
        Alert.alert('Logged Out', 'You have been logged out successfully.');
        navigation.navigate('Login');
    };

    if (isLoading) {
        return <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.greeting}>
                Welcome, {trainerDetails?.name || 'Trainer'}!
            </Text>

            <TouchableOpacity
                style={styles.profileButton}
                onPress={() => {
                    if (trainerDetails?.email) {
                        navigation.navigate('TrainerProfile', { trainerId: trainerDetails.email });
                    } else {
                        Alert.alert('Error', 'Trainer ID is not available.');
                    }
                }}>
                <Text style={styles.profileButtonText}>My Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('Trainees', { status: true })}>
                <Text style={styles.cardText}>Active Trainees</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('Trainees', { status: false })}>
                <Text style={styles.cardText}>Inactive Trainees</Text>
            </TouchableOpacity>


            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Developed by Vaibhav Bhardwaj</Text>
                <Text style={styles.footerText}>For inquiries, feel free to reach out at:</Text>
                <TouchableOpacity onPress={() => Linking.openURL('mailto:vaibhav07351@gmail.com')}>
                    <Text style={[styles.footerText, styles.footerLink]}>
                        vaibhav07351@gmail.com
                    </Text>
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
    profileButton: {
        marginTop: 20,
        backgroundColor: '#007bff',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    profileButtonText: { color: '#fff', fontSize: 16 },
});
