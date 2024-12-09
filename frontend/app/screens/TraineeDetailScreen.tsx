import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TraineeDetail'>;

export default function TraineeDetailScreen({ route }: Props) {
    const { trainee } = route.params;
    const [index, setIndex] = useState(1);
    const [routes] = useState([
        { key: 'about', title: 'About' },
        { key: 'logs', title: 'Workout Logs' },
        { key: 'progress', title: 'Progress' },
    ]);

    const AboutTrainee = () => (
        <View style={styles.tabContainer}>
            <Text style={styles.text}>Name: {trainee.name}</Text>
            <Text style={styles.text}>Height: {trainee.height} cm</Text>
            <Text style={styles.text}>Weight: {trainee.weight} kg</Text>
        </View>
    );

    const WorkoutLogs = () => (
        <View style={styles.tabContainer}>
            <Text style={styles.text}>Workout Logs Screen</Text>
        </View>
    );

    const Progress = () => (
        <View style={styles.tabContainer}>
            <Text style={styles.text}>Workout Progress Screen</Text>
        </View>
    );

    const renderScene = SceneMap({
        about: AboutTrainee,
        logs: WorkoutLogs,
        progress: Progress,
    });

    return (
        <TabView
            navigationState={{ index, routes }}
            renderScene={renderScene}
            onIndexChange={setIndex}
            initialLayout={{ width: 300 }}
            style={styles.tabView}
        />
    );
}

const styles = StyleSheet.create({
    tabView: { flex: 1 },
    tabContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 18 },
});
