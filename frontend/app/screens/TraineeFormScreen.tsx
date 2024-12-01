import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Trainee } from '../types/trainee';

// Define Props for the Screen
type Props = NativeStackScreenProps<RootStackParamList, 'TraineeForm'>;

export default function TraineeFormScreen({ route, navigation }: Props) {
    const { trainee } = route.params || {}; // Get trainee if editing
    const [name, setName] = useState(trainee?.name || '');
    const [weight, setWeight] = useState(trainee?.weight?.toString() || '');
    const [height, setHeight] = useState(trainee?.height?.toString() || '');

    const handleSubmit = () => {
        if (!name || !weight || !height) {
            Alert.alert('Validation Error', 'All fields are required.');
            return;
        }

        const traineeData: Trainee = {
            id: trainee?.id || '', // Use existing ID if editing
            name,
            weight: parseFloat(weight),
            height: parseFloat(height),
        };

        if (trainee) {
            // Update trainee
            fetch(`http://192.168.1.10:8080/trainees/${trainee.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer YOUR_JWT_TOKEN',
                },
                body: JSON.stringify(traineeData),
            })
                .then((res) => {
                    if (res.ok) {
                        Alert.alert('Success', 'Trainee updated successfully.');
                        navigation.goBack();
                    } else {
                        Alert.alert('Error', 'Failed to update trainee.');
                    }
                })
                .catch(() => Alert.alert('Error', 'Failed to update trainee.'));
        } else {
            // Add new trainee
            fetch('http://192.168.1.10:8080/trainees', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer YOUR_JWT_TOKEN',
                },
                body: JSON.stringify(traineeData),
            })
                .then((res) => {
                    if (res.ok) {
                        Alert.alert('Success', 'Trainee added successfully.');
                        navigation.goBack();
                    } else {
                        Alert.alert('Error', 'Failed to add trainee.');
                    }
                })
                .catch(() => Alert.alert('Error', 'Failed to add trainee.'));
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{trainee ? 'Edit Trainee' : 'Add Trainee'}</Text>
            <TextInput
                style={styles.input}
                placeholder="Name"
                value={name}
                onChangeText={setName}
            />
            <TextInput
                style={styles.input}
                placeholder="Weight (kg)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
            />
            <TextInput
                style={styles.input}
                placeholder="Height (cm)"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
            />
            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                <Text style={styles.buttonText}>{trainee ? 'Update' : 'Add'} Trainee</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    input: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 12,
    },
    button: {
        backgroundColor: '#6200ee',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    buttonText: { color: '#fff', fontSize: 16, textAlign: 'center' },
});
