import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';
import { Spacing } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

type TrainerDetails = {
    name: string;
    email: string;
    specialization?: string;
    image_url?: string;
    bio?: string;
};

export default function DashboardScreen({ navigation }: Props) {
    const { isAuthenticated, logout } = useContext(AuthContext);
    const [trainerDetails, setTrainerDetails] = useState<TrainerDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            Toast.show({
                type: 'error',
                text1: 'Session Expired',
                text2: 'Please log in to continue.',
            });
            navigation.navigate('Login');
            return;
        }

        const fetchTrainerDetails = async () => {
            const backendUrl = Constants.expoConfig?.extra?.backendUrl;
            try {
                const response = await fetch(`${backendUrl}/getTrainerDetails`, {
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
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to fetch trainer details.',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchTrainerDetails();
    }, [isAuthenticated]);

    const handleLogout = () => {
        logout();
        Toast.show({
            type: 'success',
            text1: 'Logged Out',
            text2: 'You have been logged out successfully.',
        });
        navigation.navigate('Login');
    };

    if (isLoading) {
        return <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />;
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.profileCard}
                onPress={() => {
                    if (trainerDetails?.email) {
                        navigation.navigate('TrainerProfile', { trainerId: trainerDetails.email });
                    } else {
                         Toast.show({
                            type: 'error',
                            text1: 'Error',
                            text2: 'Trainer ID is not available.',
                        });
                    }
                }}
            >
                <Image
                    source={{
                        uri: trainerDetails?.image_url || 'https://pixabay.com/get/ga888f12adb8d8613af71848c7fc56a61b5a358fced614a0309cf598e86b735a5cda4c3d25ea5f5a2c1f4645388bcef2d_1280.png',
                    }}
                    style={styles.profileImage}
                />
                <View style={styles.profileInfo}>
                    <Text style={styles.trainerName}>{trainerDetails?.name || 'Trainer Name'}</Text>
                    <Text style={styles.trainerEmail}>{trainerDetails?.email}</Text>
                    <Text style={styles.trainerSpecialization}>
                        {trainerDetails?.bio || 'Bio not available'}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Navigation Buttons */}
            <View style={styles.buttonsContainer}>
                <TouchableOpacity
                    style={[styles.card, styles.activeCard]}
                    onPress={() => navigation.navigate('Trainees', { status: true })}
                >
                    <Text style={styles.cardText}>Active Trainees</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.card, styles.inactiveCard]}
                    onPress={() => navigation.navigate('Trainees', { status: false })}
                >
                    <Text style={styles.cardText}>Inactive Trainees</Text>
                </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Developed by Vaibhav Bhardwaj</Text>
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
        backgroundColor: '#f0f4f8',
        justifyContent: 'space-between',
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        marginBottom: 20,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginRight: 16,
    },
    profileInfo: {
        flex: 1,
    },
    trainerName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    trainerEmail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    trainerSpecialization: {
        fontSize: 14,
        color: '#4caf50',
        fontStyle: 'italic',
    },
    buttonsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    card: {
        padding: 10,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        alignItems: 'center',
        justifyContent: 'center',
        height: 55,
    },
    activeCard: {
        backgroundColor: '#59a9ff', // Green color for active trainees
    },
    inactiveCard: {
        backgroundColor: '#9fa5aa', // Yellow color for inactive trainees
    },
    cardText: {
        fontSize: 18,
        color: '#fff',
        fontWeight: '600',
        textAlign: 'center',
    },
    logoutButton: {
        padding: 14,
        backgroundColor: '#d9534f',
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        width: '100%',
    },
    footerText: {
        fontSize: 14,
        color: '#555',
    },
    footerLink: {
        color: '#6200ee',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
