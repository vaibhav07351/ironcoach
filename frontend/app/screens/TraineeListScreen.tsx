import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Colors, Spacing } from '../../constants/theme';
import { RootStackParamList } from '../types/navigation';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'Trainees'>;
type Trainee = { id: string; name: string; weight: number; height: number };

export default function TraineeListScreen({ navigation }: Props) {
    const [trainees, setTrainees] = useState<Trainee[]>([]);

    useEffect(() => {
        fetch('http://192.168.1.10:8080/trainees/')
            .then((res) => res.json())
            .then((data) => setTrainees(data))
            .catch((err) => console.error(err));
    }, []);

    return (
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
