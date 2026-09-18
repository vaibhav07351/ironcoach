import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
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


// Define Props for the Screen
type Props = NativeStackScreenProps<RootStackParamList, 'AddExerciseForm'>;

export default function AddExerciseFormScreen({ route, navigation }: Props) {
    const { exercise, exercise_id, traineeId, selectedDate} = route.params;
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [sets, setSets] = useState<number[]>([]);
    const [weights, setWeights] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

    const handleDeleteSet = (index: number) => {
        const updatedSets = sets.filter((_, i) => i !== index);
        const updatedWeights = weights.filter((_, i) => i !== index);
        setSets(updatedSets);
        setWeights(updatedWeights);
    };

    const handleSetEdit = (index: number) => {
        setWeight(weights[index].toString());
        setReps(sets[index].toString());
        setEditingIndex(index);
    };

    const handleSubmit = async () => {
        
        if (sets.length === 0 || weights.length === 0) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Please add at least one set.',
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
                    text2: 'Token not found. Please login again.',
                });

                navigation.navigate('Login');
                return;
            }
            const dateInIST = new Date();
            dateInIST.setMinutes(dateInIST.getMinutes() + 330); // Add 330 minutes (5 hours 30 minutes)

            const workoutLog = {
                trainee_id: traineeId,
                date: selectedDate?.toISOString().split('T')[0],
                // date: dateInIST.toISOString().split('T')[0], // Current date in YYYY-MM-DD format
                workouts: [
                    {
                        exercise,
                        exercise_id,
                        sets: sets.length,
                        reps: sets,
                        weight: weights,
                    },
                ],
                notes: '',
            };
    
            // console.log('Prepared Workout Log:', workoutLog);
            const backendUrl = Constants.expoConfig?.extra?.backendUrl;
            const response = await fetch(`${backendUrl}/workout_logs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`,
                },
                body: JSON.stringify(workoutLog),
            });
    
            if (!response.ok) {
                throw new Error('Failed to add workout log');
            }
    
            Toast.show({
                type: 'success',
                text1: 'Workout Log Added',
                text2: 'Successfully logged the workout.',
            });

            navigation.reset({
                // index: 1, // Position in the stack
                routes: [
                    { name: 'TraineeDetail', params: { trainee: { id: traineeId } } }, // Replace with your stack's initial route if needed
                    // { name: 'WorkoutLogs', params: { trainee: { id: traineeId } } },
                ],
            });
        } catch (error) {
            console.error('Error:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to add workout log. Please try again.',
            });

        } finally {
            setIsLoading(false);
        }
    };
    
    
    return isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 280 }} />
    ) : (
        <View style={styles.container}>
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
    
            {/* Saved Sets */}
            <FlatList
                data={sets.map((set, index) => ({
                    key: (index + 1).toString(),
                    reps: set,
                    weight: weights[index],
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
                        <TouchableOpacity onPress={() => handleSetEdit(index)}>
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
            <Text style={styles.addButtonText}>Add Workout</Text>
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
