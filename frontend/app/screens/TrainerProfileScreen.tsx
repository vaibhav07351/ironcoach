import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Image,
    ScrollView,
    TouchableOpacity,
    Linking
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
// Define Props and Trainer Type
type Props = NativeStackScreenProps<RootStackParamList, 'TrainerProfile'>;

type Trainer = {
    name: string;
    email: string;
    bio?: string;
    image_url?: string;
    experience?: number;
    hourly_rate?: number;
    social_handle?: string;
    phone_number?: string;
    address?: string;
    speciality?: string;
    date_of_birth?: string;
    gender?: string;
    certifications?: string[];
    availability?: string;
    rating?: number;
    trainer_type?: string;
};

export default function TrainerProfileScreen({ route }: Props) {
    const { trainerId } = route.params;
    const [trainer, setTrainer] = useState<Trainer | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTrainerDetails = async () => {
            try {
                const backendUrl = Constants.expoConfig?.extra?.backendUrl;
                const response = await fetch(`${backendUrl}/getTrainerDetails`, {
                    headers: {
                        Authorization: `${await AsyncStorage.getItem('token')}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch trainer details');
                }

                const data: Trainer = await response.json();
                setTrainer(data);
            } catch (error) {
                console.error('Error fetching trainer details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTrainerDetails();
    }, [trainerId]);

    if (isLoading) {
        return <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />;
    }

    if (!trainer) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Trainer details not found.</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
                {/* Profile Picture with Shadow */}
                <Image
                    source={{ uri: trainer.image_url || 'https://via.placeholder.com/150' }}
                    style={styles.profileImage}
                />
    
                {/* Trainer Name */}
                <Text style={styles.name}>{trainer.name}</Text>
    
                {/* Trainer Speciality */}
                {trainer.speciality && <Text style={styles.specialization}>{trainer.speciality}</Text>}
    
                {/* Trainer Details Card */}
                <View style={styles.detailsCard}>
                    {/* Email */}
                    <View style={styles.detailRow}>
                        <Ionicons name="mail" size={20} color="#6200ee" />
                        <Text style={styles.detailText}>Email: {trainer.email}</Text>
                    </View>
    
                    {/* Bio */}
                    {trainer.bio && (
                        <View style={styles.detailRow}>
                            <Ionicons name="text" size={20} color="#6200ee" />
                            <Text style={styles.detailText}>Bio: {trainer.bio}</Text>
                        </View>
                    )}
    
                    {/* Experience */}
                    {trainer.experience !== undefined && (
                        <View style={styles.detailRow}>
                            <Ionicons name="briefcase" size={20} color="#6200ee" />
                            <Text style={styles.detailText}>Experience: {trainer.experience} years</Text>
                        </View>
                    )}
    
                    {/* Hourly Rate */}
                    {trainer.hourly_rate !== undefined && (
                        <View style={styles.detailRow}>
                            <Ionicons name="wallet" size={20} color="#6200ee" />
                            <Text style={styles.detailText}>Hourly Rate: ₹{trainer.hourly_rate}</Text>
                        </View>
                    )}
    
                    {/* Phone Number */}
                    {trainer.phone_number && (
                        <View style={styles.detailRow}>
                            <Ionicons name="call-outline" size={20} color="#6200ee" />
                            <Text style={styles.detailText}>Phone: {trainer.phone_number}</Text>
                        </View>
                    )}
    
                    {/* Address */}
                    {trainer.address && (
                        <View style={styles.detailRow}>
                            <Ionicons name="location-outline" size={20} color="#6200ee" />
                            <Text style={styles.detailText}>Address: {trainer.address}</Text>
                        </View>
                    )}
    
                    {/* Date of Birth */}
                    {trainer.date_of_birth && (
                        <View style={styles.detailRow}>
                            <Ionicons name="calendar" size={20} color="#6200ee" />
                            <Text style={styles.detailText}>DOB: {trainer.date_of_birth}</Text>
                        </View>
                    )}
    
                    {/* Gender */}
                    {trainer.gender && (
                        <View style={styles.detailRow}>
                            <Ionicons name="male" size={20} color="#6200ee" />
                            <Text style={styles.detailText}>Gender: {trainer.gender}</Text>
                        </View>
                    )}
    
                    {/* Certifications */}
                    {trainer.certifications && trainer.certifications.length > 0 && (
                        <View style={styles.detailRow}>
                            <Ionicons name="medal" size={20} color="#6200ee" />
                            <Text style={styles.detailText}>Certifications: {trainer.certifications.join(', ')}</Text>
                        </View>
                    )}
    
                    {/* Availability */}
                    {trainer.availability && (
                        <View style={styles.detailRow}>
                            <Ionicons name="time" size={20} color="#6200ee" />
                            <Text style={styles.detailText}>Availability: {trainer.availability}</Text>
                        </View>
                    )}
    
                    {/* Rating */}
                    {trainer.rating !== undefined && (
                        <View style={styles.detailRow}>
                            <Ionicons name="star" size={20} color="#6200ee" />
                            <Text style={styles.detailText}>Rating: {trainer.rating} / 5</Text>
                        </View>
                    )}
    
                    {/* Trainer Type */}
                    {trainer.trainer_type && (
                        <View style={styles.detailRow}>
                            <Ionicons name="person" size={20} color="#6200ee" />
                            <Text style={styles.detailText}>Trainer Type: {trainer.trainer_type}</Text>
                        </View>
                    )}
                </View>
    
                {/* Social Media Button */}
                {trainer.social_handle && (
                    <TouchableOpacity 
                        style={styles.socialButton}
                        onPress={() => {
                            const instagramUrl = `https://www.instagram.com/${trainer.social_handle}`;
                            Linking.openURL(instagramUrl).catch((err) => console.error('Failed to open URL:', err));
                        }}
                    >
                        <Ionicons name="logo-instagram" size={24} color="white" />
                        <Text style={styles.socialButtonText}>View on Instagram</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
    
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        backgroundColor: '#f9f9f9',
        paddingBottom: 20,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 75,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#6200ee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    name: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    specialization: {
        fontSize: 18,
        color: '#6200ee',
        fontStyle: 'italic',
        marginBottom: 16,
        textAlign: 'center',
    },
    contactButton: {
        flexDirection: 'row',
        backgroundColor: '#6200ee',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 50,
        marginVertical: 12,
        alignItems: 'center',
    },
    contactButtonText: {
        fontSize: 16,
        color: 'white',
        marginLeft: 8,
    },
    detailsCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailText: {
        fontSize: 16,
        color: '#555',
        marginLeft: 10,
    },
    socialButton: {
        flexDirection: 'row',
        backgroundColor: '#E4405F',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 50,
        marginTop: 16,
        alignItems: 'center',
    },
    socialButtonText: {
        fontSize: 16,
        color: 'white',
        marginLeft: 8,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    errorText: {
        fontSize: 18,
        color: 'red',
        textAlign: 'center',
    },
});
