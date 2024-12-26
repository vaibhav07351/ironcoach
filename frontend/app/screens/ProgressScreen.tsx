import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Trainee } from '../types/trainee';
import { useFocusEffect } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;

type Props = {
    route: { params: { trainee: Trainee } };
    navigation: any;
    trainee: Trainee
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
    // const { trainee } = route.params;

    const [progressData, setProgressData] = useState<ProgressData | null>(null);
    const [weight, setWeight] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Overview');
    const [isLoading, setIsLoading] = useState(false);
    const [tooltipData, setTooltipData] = useState<{x: number;y: number;data: WeightBMIProgress | null;} | null>(null);
    
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

            // alert('Weight saved successfully');
            setWeight('');
            fetchProgressData(); // Refresh progress data
        } catch (error) {
            console.error('Error saving weight:', error);
        }
    };

    // useEffect(() => {
    //     fetchProgressData();
    // }, []);

    useFocusEffect(
        useCallback(() => {
            fetchProgressData();
        }, [])
    );

    const renderOverview = () => {
        // Get the latest weight entry from the weight_bmi array
        const latestEntry =
            progressData?.weight_bmi && progressData.weight_bmi.length > 0
                ? progressData.weight_bmi[progressData.weight_bmi.length - 1] // Access the last item
                : null;
    
        return (
            <View>
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryText}>
                        Latest Weight: {latestEntry?.weight || 'N/A'} kg
                    </Text>
                    <Text style={styles.summaryText}>
                        BMI: {latestEntry?.bmi || 'N/A'}
                    </Text>
                    <Text style={styles.summaryText}>
                        Body Fat: {latestEntry?.bodyFat || 'N/A'} %
                    </Text>
                </View>
            </View>
        );
    };
    

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

    const chartConfig = {
        backgroundColor: '#e3f2fd',
        backgroundGradientFrom: '#e3f2fd',
        backgroundGradientTo: '#e3f2fd',
        decimalPlaces: 1,
        color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: '#6200ee',
        },
    };

    const formatXLabels = (labels: string[]) => {
        // Show a maximum of 5 dates, evenly spaced
        const step = Math.ceil(labels.length / 5);
        return labels.map((label, index) => (index % step === 0 ? label : ''));
    };

    const renderWeightProgress = () => (
    
        <View>
            <Text style={styles.sectionTitle}>Log Weight</Text>
            <View style={styles.weightInput}>
            <TextInput
                style={styles.input}
                placeholder="Enter weight (kg)"
                keyboardType="numeric"
                value={weight}
                onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9.]/g, ''); // Allow only numbers and decimals
                    if (!isNaN(Number(numericValue)) && Number(numericValue) > 0) {
                        setWeight(numericValue); // Update state only for values greater than 0
                    } else if (numericValue === '') {
                        setWeight(''); // Allow clearing the input
                    }
                }}
            />
                <TouchableOpacity onPress={handleSaveWeight} style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
            </View>


            <Text style={styles.sectionTitle}>Weight Progress</Text>
        {progressData?.weight_bmi && progressData.weight_bmi.length > 0 ? (
            <View>
                <LineChart
                    data={{
                        labels: formatXLabels(
                            progressData.weight_bmi.map((entry) =>
                                new Date(entry.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                })
                            )
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
                    chartConfig={chartConfig}
                    style={styles.chart}
                    bezier
                    withInnerLines={false}
                    verticalLabelRotation={0}
                    onDataPointClick={(data) => {
                        const { index, x, y } = data;
                        const weightData = progressData.weight_bmi[index];
                        setTooltipData({ x, y, data: weightData });
                        
                        // Hide the tooltip after a short delay
                        setTimeout(() => {
                            setTooltipData(null);
                        }, 3000); // Adjust delay as needed
                    }}
                />
                {/* Render Tooltip */}
                {tooltipData && tooltipData.data && (
                    <View
                        style={[
                            styles.tooltip,
                            {
                                position: 'absolute',
                                top: tooltipData.y - 30,
                                left: tooltipData.x - 85, // Adjust positioning as needed
                            },
                        ]}
                    >
                        <Text style={styles.tooltipText}>
                            Date: {tooltipData.data.date}
                        </Text>
                        <Text style={styles.tooltipText}>
                            Weight: {tooltipData.data.weight} kg
                        </Text>
                    </View>
                )}
            </View>
            ) : (
                <Text style={styles.emptyText}>No weight data available.</Text>
            )}
        </View>
    );

    const renderExerciseProgress = () => (
        <View>
            <Text style={styles.sectionTitle}>Exercise Progress</Text>
            {progressData?.exercises && progressData.exercises.length > 0 ? (
                progressData.exercises.map((exercise) => (
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
                ))
            ) : (
                <Text style={styles.emptyText}>No exercise progress data available.</Text>
            )}
        </View>
    );

    const renderContent = () => {
        switch (selectedCategory) {
            case 'Overview':
                return renderOverview();
            case 'Weight Progress':
                return renderWeightProgress();
            case 'Exercise Progress':
                return renderExerciseProgress();
            default:
                return null;
        }
    };

    if (isLoading) {
        return <ActivityIndicator size="large" style={styles.loader} />;
    }

    return (
        <ScrollView style={styles.container}>
            {/* Category Selection */}
            <View style={styles.categoryTabs}>
                {['Overview', 'Weight Progress', 'Exercise Progress'].map((category) => (
                    <TouchableOpacity
                        key={category}
                        style={[
                            styles.tab,
                            selectedCategory === category && styles.activeTab,
                        ]}
                        onPress={() => setSelectedCategory(category)}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                selectedCategory === category && styles.activeTabText,
                            ]}
                        >
                            {category}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Dynamic Content */}
            {renderContent()}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    chart: { borderRadius: 8, marginVertical: 16 },
    summaryCard: { padding: 12, backgroundColor: '#e3f2fd', borderRadius: 8, marginBottom: 16 },
    summaryText: { fontSize: 16, marginBottom: 4 },
    exerciseCard: { padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8, marginBottom: 16 },
    exerciseTitle: { fontSize: 18, fontWeight: 'bold' },
    exerciseStats: { fontSize: 16, color: '#555', marginBottom: 8 },
    recordItem: { marginBottom: 4 },
    recordText: { fontSize: 14, color: '#555' },
    categoryTabs: { flexDirection: 'row', marginBottom: 16 },
    tab: { flex: 1, padding: 12, alignItems: 'center', borderBottomWidth: 1, borderColor: '#ccc' },
    activeTab: { borderBottomWidth: 3, borderColor: '#6200ee' },
    tabText: { fontSize: 16, color: '#555' },
    activeTabText: { fontWeight: 'bold', color: '#6200ee' },
    emptyText: { fontSize: 16, color: '#999', textAlign: 'center', marginTop: 16 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    tooltip: {
        // position: 'absolute',
        backgroundColor: '#6200ee',
        color: '#fff',
        padding: 4,
        borderRadius: 8,
        fontSize: 12,
        textAlign: 'center',
        marginTop:10,
        width:170,
        // top: -30,
        // left: -15,
    },

    // tooltip: {
    //     position: 'absolute',
    //     backgroundColor: '#6200ee',
    //     color: '#fff',
    //     padding: 8,
    //     borderRadius: 8,
    //     fontSize: 12,
    //     textAlign: 'center',
    //     width: 170,
    //     zIndex: 10,
    // },
    tooltipText: {
        color: '#fff',
        fontSize: 12,
        textAlign: 'center',
    },
});
