import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Trainee } from '../types/trainee';

const screenWidth = Dimensions.get('window').width;

type Props = {
    route: { params: { trainee: Trainee } };
    navigation: any;
    trainee: Trainee;
};

type WeightBMIProgress = {
    date: string;
    weight: number;
    bmi: number;
    bodyFat?: number;
};

type ExerciseRecord = {
    date: string;
    weight: number;
    reps: number;
};

type ExerciseProgress = {
    exercise: string;
    maxWeight: number;
    avgWeight: number;
    records: ExerciseRecord[];
};

type ProgressData = {
    weight_bmi: WeightBMIProgress[];
    exercises: ExerciseProgress[];
};

export default function ProgressScreen({ route, navigation, trainee }: Props) {
    const [progressData, setProgressData] = useState<ProgressData | null>(null);
    const [weight, setWeight] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchProgressData = async () => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) throw new Error('User not authenticated');

            const response = await fetch(`http://192.168.1.10:8080/progress/${trainee.id}`, {
                headers: { Authorization: `${token}` },
            });

            if (!response.ok) throw new Error('Failed to fetch progress data');

            const data: ProgressData = await response.json();
            console.log('Fetched data:', data); // Log the data here
            setProgressData(data);
        } catch (error) {
            console.error('Error fetching progress data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveWeight = async () => {
        if (!weight) {
            alert('Please enter weight');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) throw new Error('User not authenticated');

            const payload = {
                trainee_id: trainee.id,
                date: new Date().toISOString().split('T')[0],
                weight: parseFloat(weight),
            };

            const response = await fetch('http://192.168.1.10:8080/progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Failed to save weight');

            alert('Weight saved successfully');
            setWeight('');
            fetchProgressData(); // Refresh progress data
        } catch (error) {
            console.error('Error saving weight:', error);
        }
    };

    useEffect(() => {
        fetchProgressData();
    }, []);

    const renderWeightInput = () => (
        <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Log Weight</Text>
            <View style={styles.weightInput}>
                <TextInput
                    style={styles.input}
                    placeholder="Enter weight (kg)"
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={setWeight}
                />
                <TouchableOpacity onPress={handleSaveWeight} style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderWeightProgress = () => {
        console.log("here data : ", progressData?.weight_bmi)
        if (!progressData?.weight_bmi || progressData.weight_bmi.length === 0) {
            return <Text style={styles.emptyText}>No weight data available.</Text>;
        }

        return (
            <LineChart
                data={{
                    labels: progressData.weight_bmi.map((entry) =>
                        entry.date.split('-').slice(1).join('/')
                    ),
                    datasets: [
                        {
                            data: progressData.weight_bmi.map((entry) => entry.weight),
                        },
                    ],
                }}
                width={screenWidth - 32}
                height={220}
                yAxisSuffix=" kg"
                chartConfig={{
                    backgroundColor: '#e3f2fd',
                    backgroundGradientFrom: '#e3f2fd',
                    backgroundGradientTo: '#e3f2fd',
                    color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                style={styles.chart}
            />
        );
    };

    const renderExerciseProgress = () => {
        if (!progressData?.exercises || progressData.exercises.length === 0) {
            return <Text style={styles.emptyText}>No exercise progress data available.</Text>;
        }

        return progressData.exercises.map((exercise) => (
            <View style={styles.exerciseCard} key={exercise.exercise}>
                <Text style={styles.exerciseTitle}>{exercise.exercise}</Text>
                <Text style={styles.exerciseStats}>
                    Max Weight: {exercise.maxWeight} kg | Avg Weight: {exercise.avgWeight} kg
                </Text>
                {exercise.records.map((record, index) => (
                    <View style={styles.recordItem} key={index}>
                        <Text style={styles.recordText}>
                            {record.date}: {record.weight} kg x {record.reps} reps
                        </Text>
                    </View>
                ))}
            </View>
        ));
    };

    if (isLoading) {
        return <ActivityIndicator size="large" style={styles.loader} />;
    }

    const sections = [
        { key: 'weightInput', render: renderWeightInput },
        { key: 'weightProgress', render: renderWeightProgress },
        { key: 'exerciseProgress', render: renderExerciseProgress },
    ];

    return (
        <FlatList
            data={sections}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => <View style={styles.section}>{item.render()}</View>}
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    inputSection: { marginBottom: 16 },
    weightInput: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 8,
        marginRight: 8,
    },
    saveButton: {
        backgroundColor: '#6200ee',
        borderRadius: 8,
        padding: 8,
    },
    saveButtonText: { color: '#fff', fontWeight: 'bold' },
    chart: { borderRadius: 8, marginVertical: 16 },
    exerciseCard: { marginBottom: 16, padding: 12, backgroundColor: '#e3f2fd', borderRadius: 8 },
    exerciseTitle: { fontSize: 18, fontWeight: 'bold' },
    exerciseStats: { fontSize: 16, color: '#555', marginBottom: 8 },
    recordItem: { marginBottom: 4 },
    recordText: { fontSize: 14, color: '#555' },
    emptyText: { fontSize: 16, color: '#999', textAlign: 'center', marginTop: 16 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
