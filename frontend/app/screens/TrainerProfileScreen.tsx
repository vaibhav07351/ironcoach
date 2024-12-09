import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainerProfile'>;

type Trainer = {
    name: string;
    email: string;
    specialization?: string;
};

export default function TrainerProfileScreen({ route }: Props) {
    const { trainerId } = route.params; // Get the trainerId from params
    const [trainer, setTrainer] = useState<Trainer | null>(null); // Add Trainer type
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
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

                const data: Trainer = await response.json(); // Explicitly type the API response
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
            <View style={styles.container}>
                <Text style={styles.errorText}>Trainer details not found.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Trainer Profile</Text>
            <Text style={styles.detail}>Name: {trainer.name}</Text>
            <Text style={styles.detail}>Email: {trainer.email}</Text>
            <Text style={styles.detail}>Specialization: {trainer.specialization || 'N/A'}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    detail: { fontSize: 18, marginBottom: 8 },
    errorText: { fontSize: 18, color: 'red', textAlign: 'center' },
});
