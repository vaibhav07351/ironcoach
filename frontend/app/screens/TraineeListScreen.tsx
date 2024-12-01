import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Trainee } from '../types/trainee';

// Define Props for the Screen
type Props = NativeStackScreenProps<RootStackParamList, 'Trainees'>;

export default function TraineeListScreen({ navigation }: Props) {
    const [trainees, setTrainees] = useState<Trainee[]>([]); // State with typed array

    useEffect(() => {
        fetch('http://localhost:8080/trainees', {
            headers: {
                Authorization: 'Bearer YOUR_JWT_TOKEN',
            },
        })
            .then((res) => res.json())
            .then((data) => setTrainees(data))
            .catch((error) => console.error(error));
    }, []);

    const renderTrainee = ({ item }: { item: Trainee }) => (
        <TouchableOpacity
            style={styles.traineeCard}
            onPress={() => navigation.navigate('TraineeForm', { trainee: item })}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.details}>Weight: {item.weight}kg</Text>
            <Text style={styles.details}>Height: {item.height}cm</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Trainees</Text>
            <FlatList
                data={trainees}
                renderItem={renderTrainee}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
            />
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('TraineeForm', {})}>
                <Text style={styles.addButtonText}>+ Add Trainee</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    list: { paddingBottom: 16 },
    traineeCard: {
        padding: 16,
        backgroundColor: '#f1f1f1',
        borderRadius: 8,
        marginBottom: 12,
    },
    name: { fontSize: 18, fontWeight: 'bold' },
    details: { fontSize: 14, color: '#555' },
    addButton: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: '#6200ee',
        padding: 12,
        borderRadius: 50,
    },
    addButtonText: { color: '#fff', fontSize: 16 },
});
