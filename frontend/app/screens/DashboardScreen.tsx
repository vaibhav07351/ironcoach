import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Define the type for your navigation stack
type RootStackParamList = {
    Dashboard: undefined; // No params expected
    Trainees: undefined;  // No params expected
    WorkoutLogs: undefined; // No params expected
};

// Define props for DashboardScreen
type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
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
                onPress={() => navigation.navigate('WorkoutLogs')}>
                <Text style={styles.cardText}>Workout Logs</Text>
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
});
