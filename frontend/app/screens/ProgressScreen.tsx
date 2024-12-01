import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

export default function ProgressScreen() {
    const data = {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
            {
                data: [50, 60, 65, 70],
                strokeWidth: 2,
            },
        ],
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Progress Over Time</Text>
            <LineChart
                data={data}
                width={320} // Adjust based on your layout
                height={220}
                chartConfig={{
                    backgroundColor: '#f5f5f5',
                    backgroundGradientFrom: '#6200ee',
                    backgroundGradientTo: '#6200ee',
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
});
