import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';

export default function ProgressScreen() {
    const data = {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
            {
                data: [50, 60, 70, 80],
                strokeWidth: 2,
            },
        ],
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Progress Over Time</Text>
            <LineChart
                data={data}
                width={Dimensions.get('window').width - 32} // Full width minus padding
                height={220}
                chartConfig={{
                    backgroundColor: Colors.background,
                    backgroundGradientFrom: Colors.primary,
                    backgroundGradientTo: Colors.secondary,
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                }}
                style={styles.chart}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: Spacing.medium, backgroundColor: Colors.background },
    title: { fontSize: 24, color: Colors.textPrimary, marginBottom: Spacing.medium },
    chart: { borderRadius: Spacing.small },
});
