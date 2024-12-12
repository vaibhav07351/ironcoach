import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

export default function ProgressScreen() {
    const [weight, setWeight] = useState('');
    const [weights, setWeights] = useState<number[]>([]);
    const [dates, setDates] = useState<string[]>([]);

    const handleAddWeight = () => {
        if (weight.trim() === '') return;
        const today = new Date();
        const date = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
        setWeights((prev) => [...prev, parseFloat(weight)]);
        setDates((prev) => [...prev, date]);
        setWeight('');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Weight Progress</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter Weight (kg)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddWeight}>
                <Text style={styles.addButtonText}>Add Weight</Text>
            </TouchableOpacity>
            {weights.length > 0 && (
                <LineChart
                    data={{
                        labels: dates,
                        datasets: [{ data: weights }],
                    }}
                    width={Dimensions.get('window').width - 40}
                    height={220}
                    yAxisSuffix="kg"
                    chartConfig={{
                        backgroundColor: '#6200ee',
                        backgroundGradientFrom: '#6200ee',
                        backgroundGradientTo: '#8e44ad',
                        decimalPlaces: 2,
                        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        style: { borderRadius: 16 },
                        propsForDots: { r: '6', strokeWidth: '2', stroke: '#ffa726' },
                    }}
                    style={styles.chart}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 8,
        width: '80%',
        marginBottom: 16,
    },
    addButton: {
        backgroundColor: '#6200ee',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    addButtonText: { color: 'white', fontWeight: 'bold' },
    chart: { marginVertical: 16, borderRadius: 16 },
});
