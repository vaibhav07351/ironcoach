import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutLogForm'>;

export default function WorkoutLogFormScreen({ route, navigation }: Props) {
    const { workoutLog, trainee } = route.params;
    const dateInIST = new Date();
    dateInIST.setMinutes(dateInIST.getMinutes() + 330);
    const [date, setDate] = useState(workoutLog?.date || dateInIST.toISOString().split('T')[0]);
    const [exercise, setExercise] = useState('');
    const [weights, setWeights] = useState<number[]>([]); // Array of weights for each set
    const [sets, setSets] = useState<number[]>([]); // Array of reps for each set
    const [weight, setWeight] = useState<string>(''); // Current input for weight
    const [reps, setReps] = useState<string>(''); // Current input for reps
    const [editingIndex, setEditingIndex] = useState<number | null>(null); // Index of the set being edited
    const [isLoading, setIsLoading] = useState(false);
    useEffect(() => {
        if (workoutLog) {
            const firstWorkout = workoutLog.workouts[0] || {};
            setExercise(firstWorkout.exercise || '');
            setSets(firstWorkout.reps || []);
            setWeights(firstWorkout.weight || []);
        }
    }, [workoutLog]);


    const handleDeleteSet = (index: number) => {
        setWeights((prevWeights) => prevWeights.filter((_, i) => i !== index));
        setSets((prevSets) => prevSets.filter((_, i) => i !== index));
    };

    const handleEditSet = (index: number) => {
        setWeight(weights[index].toString());
        setReps(sets[index].toString());
        setEditingIndex(index); // Ensure editingIndex is already declared
    };
    const handleSave = () => {
        if (!weight || !reps) {
             Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Please enter weight and reps.',
            });
            return;
        }

        if (editingIndex !== null) {
            // Update the existing set
            const updatedSets = [...sets];
            const updatedWeights = [...weights];
            updatedSets[editingIndex] = parseInt(reps);
            updatedWeights[editingIndex] = parseFloat(weight);
            setSets(updatedSets);
            setWeights(updatedWeights);
            setEditingIndex(null);
        } else {
            // Add a new set
            setWeights((prevWeights) => [...prevWeights, parseFloat(weight)]);
            setSets((prevReps) => [...prevReps, parseInt(reps)]);
        }

        setWeight('');
        setReps('');
    };

    const handleClear = () => {
        setWeight('');
        setReps('');
        setEditingIndex(null);
    };

    const handleSubmit = async () => {
        if (!exercise || sets.length === 0 || weights.length === 0) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Please fill out all fields.',
            });
            return;
        }

        setIsLoading(true);

        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Toast.show({
                    type: 'error',
                    text1: 'Authentication Error',
                    text2: 'Token not found. Please log in again.',
                });
                navigation.navigate('Login');
                return;
            }
            
            const updatedLog = {
                trainee_id: trainee.id,
                date,
                workouts: [
                    {
                        exercise,
                        sets: sets.length,
                        reps: sets,
                        weight: weights,
                    },
                ],
            };
            const backendUrl = Constants.expoConfig?.extra?.backendUrl;
            const url = `${backendUrl}/workout_logs/${workoutLog.id}`

            const method = 'PUT';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`,
                },
                body: JSON.stringify(updatedLog),
            });

            if (!response.ok) {
                throw new Error('Failed to save workout log.');
            }

             Toast.show({
                type: 'success',
                text1: 'Workout Saved',
                text2: 'Workout log saved successfully!',
            });
            navigation.reset({
                // index: 1,
                routes: [{ name: 'TraineeDetail' , params: { trainee } }],
            });
        } catch (error) {
            console.error('Error saving workout log:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to save workout log.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 280 }} />
    ) : (
        <View style={styles.container}>
            {/* <Text style={styles.title}>{workoutLog ? 'Edit Workout Log' : 'Add Workout Log'}</Text> */}

              {/* Exercise Name */}
              <Text style={styles.title}>{exercise}</Text>


           {/* Weight Section */}
           <View style={styles.inputSection}>
                <Text style={styles.label}>Weight (kg)</Text>
                <View style={styles.labelUnderline} />
                <View style={styles.inputRow}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => setWeight((w) => Math.max(parseFloat(w || '0') - 2.5, 0).toFixed(1))}>
                        <Text style={styles.buttonText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={weight.toString()}
                        onChangeText={setWeight}
                        keyboardType="numeric"
                        placeholder="0.0"
                    />
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => setWeight((w) => (parseFloat(w || '0') + 2.5).toFixed(1))}>
                        <Text style={styles.buttonText}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Reps Section */}
            <View style={styles.inputSection}>
                <Text style={styles.label}>Reps</Text>
                <View style={styles.labelUnderline} />
                <View style={styles.inputRow}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => setReps((r) => Math.max(parseInt(r || '0') - 1, 0).toString())}>
                        <Text style={styles.buttonText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={reps.toString()}
                        onChangeText={(text) => setReps(text.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        placeholder="0"
                    />
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => setReps((r) => (parseInt(r || '0') + 1).toString())}>
                        <Text style={styles.buttonText}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>
    
            {/* Buttons */}
            <View style={styles.controlButtons}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>
                        {editingIndex !== null ? 'Update' : 'Save'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={sets.map((set, index) => ({
                    key: (index + 1).toString(),
                    weight: weights[index],
                    reps: set,
                }))}
                renderItem={({ item, index }) => (
                    <View style={styles.recordRow}>
                        <Text style={[styles.recordText, styles.recordSno]}>
                            {index + 1}.
                        </Text>
                        <Text style={[styles.recordText, styles.recordWeight]}>
                            {item.weight} kg
                        </Text>
                        <Text style={[styles.recordText, styles.recordReps]}>
                            {item.reps} reps
                        </Text>
                        <TouchableOpacity onPress={() => handleDeleteSet(index)}>
                            <Icon
                                name="trash-can-outline"
                                size={22}
                                color={Colors.error}
                                style={styles.icon}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleEditSet(index)}>
                            <Icon
                                name="pencil-outline"
                                size={22}
                                color={Colors.primary}
                                style={styles.icon}
                            />
                        </TouchableOpacity>
                    </View>
                )}
                ListHeaderComponent={<Text style={styles.recordTitle}>Saved Sets</Text>}
                ListHeaderComponentStyle={styles.recordHeader}
            />

            <TouchableOpacity style={styles.addButton} onPress={handleSubmit}>
                <Text style={styles.addButtonText}>Update Workout</Text>
            </TouchableOpacity>
        </View>
    );
}



const styles = StyleSheet.create({
    container: { flex: 1, padding: Spacing.medium, backgroundColor: Colors.background },
    title: {
        fontFamily: Fonts.display,
        fontSize: 26,
        fontWeight: '700',
        marginBottom: Spacing.large,
        textAlign: 'center',
        color: Colors.primary,
    },
    inputSection: {
        marginBottom: Spacing.large,
        backgroundColor: Colors.surface,
        borderRadius: Radii.md,
        padding: Spacing.medium,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    labelUnderline: {
        height: 3,
        width: 36,
        backgroundColor: Colors.accent,
        marginVertical: Spacing.small,
        borderRadius: 2,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    input: {
        padding: Spacing.small,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radii.sm,
        width: 100,
        textAlign: 'center',
        backgroundColor: Colors.background,
        marginHorizontal: Spacing.small,
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: 25,
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: Colors.textOnPrimary,
        fontSize: 22,
        fontWeight: '700',
    },
    controlButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: Spacing.small,
        gap: Spacing.small,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        padding: 14,
        borderRadius: Radii.md,
        flex: 1,
        alignItems: 'center',
    },
    saveButtonText: { color: Colors.textOnPrimary, fontWeight: '800' },
    clearButton: {
        backgroundColor: Colors.surface,
        padding: 14,
        borderRadius: Radii.md,
        flex: 1,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    clearButtonText: { color: Colors.textPrimary, fontWeight: '700' },
    recordHeader: { marginBottom: Spacing.small, marginTop: Spacing.medium },
    recordTitle: {
        fontFamily: Fonts.display,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: Spacing.small,
        color: Colors.primary,
    },
    recordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.medium,
        backgroundColor: Colors.surface,
        borderRadius: Radii.sm,
        marginBottom: Spacing.small,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    recordText: { fontSize: 16, color: Colors.textPrimary, fontWeight: '600' },
    recordSno: { flex: 1, textAlign: 'left' },
    recordWeight: { flex: 2, textAlign: 'center' },
    recordReps: { flex: 1, textAlign: 'right' },
    addButton: {
        marginTop: Spacing.medium,
        backgroundColor: Colors.accent,
        paddingVertical: 14,
        borderRadius: Radii.md,
        alignItems: 'center',
    },
    addButtonText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
    icon: { marginLeft: Spacing.small },
});
