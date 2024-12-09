import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Trainee } from '../types/trainee';
import { Colors, Spacing } from '../../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Trainees'>;

export default function TraineeListScreen({ route, navigation }: Props) {
    const { status } = route.params; // "active" or "inactive"
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTrainees = async () => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }

            const response = await fetch(`http://192.168.1.10:8080/trainees?active_status=${status}`, {
                headers: { Authorization: `${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch trainees');
            }

            const data = await response.json();
            setTrainees(data); // Assuming the API returns an array of Trainee objects
        } catch (error) {
            console.error('Error fetching trainees:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTrainees();
    }, [status]);

    const handleTraineeSelect = (trainee: Trainee) => {
        navigation.navigate('TraineeDetail', { trainee });
    };

    if (isLoading) {
        return <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {status === true ? 'Active Trainees' : 'Inactive Trainees'}
            </Text>
            <FlatList
                data={trainees}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleTraineeSelect(item)}>
                        <Text style={styles.cardText}>{item.name}</Text>
                    </TouchableOpacity>
                )}
            />
             <Button title="+ Add Trainee" onPress={() => navigation.navigate('TraineeForm', {})} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: Spacing.medium,
    },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    card: {
        padding: 17,
        backgroundColor: '#E9E9E9',
        borderRadius: 8,
        marginBottom: 12,
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
    },
    cardText: { fontSize: 18, color: '#333' },
});
