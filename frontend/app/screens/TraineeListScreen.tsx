import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Colors, Spacing } from '../../constants/theme';
import { RootStackParamList } from '../types/navigation';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect

type Props = NativeStackScreenProps<RootStackParamList, 'Trainees'>;
type Trainee = { id: string; name: string; weight: number; height: number };

export default function TraineeListScreen({ navigation }: Props) {
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTrainees = useCallback(async () => {
        setIsLoading(true);
        try {
            // Retrieve the token from AsyncStorage
            const token = await AsyncStorage.getItem('token');
            console.log("token: ", token)
            if (!token) {
                console.error('No token found');
                return;
            }

            const response = await fetch('http://192.168.1.10:8080/trainees/', {
                headers: {
                    Authorization: `${token}`, // Include the token in the Authorization header
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // console.log('Fetched trainees:', data); // Log the fetched data
            setTrainees(data);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Use useFocusEffect to trigger data refresh when the screen is focused
    useFocusEffect(
        useCallback(() => {
            fetchTrainees();
        }, [fetchTrainees])
    );

    return isLoading ? (
        <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />
    ) : (
        <View style={styles.container}>
            <FlatList
                data={trainees}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <Card
                        title={item.name}
                        subtitle={`Weight: ${item.weight}kg, Height: ${item.height}cm`}
                        onPress={() => navigation.navigate('WorkoutLogs', { trainee: item })}
                    />
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
});
