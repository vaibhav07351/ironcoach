import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trainee } from '../types/trainee';

type Props = {
    trainee: Trainee;
};

export default function AboutTraineeScreen({ trainee }: Props) {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Name: {trainee.name}</Text>
            <Text style={styles.text}>Height: {trainee.height} cm</Text>
            <Text style={styles.text}>Weight: {trainee.weight} kg</Text>
            <Text style={styles.text}>
                Goals: {trainee.goals || 'No specific goals provided.'}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 18, marginBottom: 8 },
});
