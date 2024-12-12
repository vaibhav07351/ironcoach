import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'TraineeForm'>;

export default function TraineeFormScreen({ route, navigation }: Props) {
    const { trainee, traineeId } = route.params || {}; // Handle both trainee and traineeId
    const [name, setName] = useState(trainee?.name || '');
    const [phoneNumber, setPhoneNumber] = useState(trainee?.phone_number || '');
    const [dob, setDob] = useState(trainee?.dob || '');
    const [gender, setGender] = useState(trainee?.gender || '');
    const [profession, setProfession] = useState(trainee?.profession || '');
    const [weight, setWeight] = useState(trainee?.weight?.toString() || '');
    const [height, setHeight] = useState(trainee?.height?.toString() || '');
    const [bmi, setBmi] = useState(trainee?.bmi?.toString() || '');
    const [startDate, setStartDate] = useState(trainee?.start_date || '');
    const [membershipType, setMembershipType] = useState(trainee?.membership_type || '');
    const [emergencyContact, setEmergencyContact] = useState(trainee?.emergency_contact || '');
    const [medicalHistory, setMedicalHistory] = useState(trainee?.medical_history || '');
    const [socialHandle, setSocialHandle] =  useState(trainee?.social_handle || '');
    const [goals, setGoals] = useState(trainee?.goals || '');
    const [notes, setNotes] = useState(trainee?.notes || '');
    const [activeStatus, setActiveStatus] = useState(trainee?.active_status ?? true);
    const [progressMetrics, setProgressMetrics] = useState<string>(JSON.stringify(trainee?.progress_metrics || {}));
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (traineeId && !trainee) {
            fetchTrainee();
        }
    }, [traineeId]);

    const fetchTrainee = async () => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }

            const response = await fetch(`http://192.168.1.10:8080/trainees/${traineeId}`, {
                headers: { Authorization: `${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch trainee details');
            }

            const data = await response.json();
            setName(data.name);
            setPhoneNumber(data.phone_number || '');
            setDob(data.dob);
            setGender(data.gender);
            setProfession(data.profession);
            setWeight(data.weight.toString());
            setHeight(data.height.toString());
            setBmi(data.bmi?.toString() || '');
            setStartDate(data.start_date);
            setMembershipType(data.membership_type);
            setEmergencyContact(data.emergency_contact);
            setMedicalHistory(data.medical_history);
            setSocialHandle(data.social_handle);
            setGoals(data.goals);
            setNotes(data.notes);
            setActiveStatus(data.active_status);
            setProgressMetrics(JSON.stringify(data.progress_metrics || {}));
        } catch (error) {
            console.error('Error fetching trainee:', error);
            Alert.alert('Error', 'Failed to load trainee details.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!name || !dob || !gender || !weight || !height) {
            Alert.alert('Validation Error', 'Please fill all mandatory fields marked with *.');
            return;
        }

        const traineeData = {
            id: traineeId || trainee?.id || '',
            name,
            phone_number: phoneNumber,
            dob,
            gender,
            profession,
            weight: parseFloat(weight),
            height: parseFloat(height),
            bmi: bmi ? parseFloat(bmi) : undefined,
            start_date: startDate,
            membership_type: membershipType,
            emergency_contact: emergencyContact,
            medical_history: medicalHistory,
            social_handle: socialHandle,
            goals,
            notes,
            active_status: activeStatus,
            progress_metrics: progressMetrics ? JSON.parse(progressMetrics) : undefined,
        };

        const token = await AsyncStorage.getItem('token');
        if (!token) {
            console.error('No token found. Redirecting to login.');
            navigation.navigate('Login');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(
                `http://192.168.1.10:8080/trainees/${traineeId || ''}`,
                {
                    method: traineeId || trainee ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `${token}`,
                    },
                    body: JSON.stringify(traineeData),
                }
            );

            if (!response.ok) {
                throw new Error(traineeId ? 'Failed to update trainee' : 'Failed to add trainee');
            }

            Alert.alert('Success', traineeId ? 'Trainee updated successfully.' : 'Trainee added successfully.');
            navigation.goBack();
        } catch (error) {
            console.error('Error submitting trainee:', error);
            Alert.alert('Error', traineeId ? 'Failed to update trainee.' : 'Failed to add trainee.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
                {isLoading ? (
                    <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 200 }} />
                ) : (
                    <>
                        <Text style={styles.title}>{traineeId || trainee ? 'Edit Trainee' : 'Add Trainee'}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Name *"
                            value={name}
                            onChangeText={setName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Date of Birth (DD-MM-YYYY) *"
                            value={dob}
                            onChangeText={setDob}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Gender *"
                            value={gender}
                            onChangeText={setGender}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Profession"
                            value={profession}
                            onChangeText={setProfession}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number *"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            keyboardType="phone-pad"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Weight (kg) *"
                            value={weight}
                            onChangeText={setWeight}
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Height (cm) *"
                            value={height}
                            onChangeText={setHeight}
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Enrollment Date (DD-MM-YYYY)"
                            value={startDate}
                            onChangeText={setStartDate}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Membership Type"
                            value={membershipType}
                            onChangeText={setMembershipType}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Emergency Contact"
                            value={emergencyContact}
                            onChangeText={setEmergencyContact}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Medical History"
                            value={medicalHistory}
                            onChangeText={setMedicalHistory}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Social Handle"
                            value={socialHandle}
                            onChangeText={setSocialHandle}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Goals"
                            value={goals}
                            onChangeText={setGoals}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Notes"
                            value={notes}
                            onChangeText={setNotes}
                        />

                        {/* Active Status Switch */}
                        <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>Trainee Active Status</Text>
                            <Switch
                                value={activeStatus}
                                onValueChange={setActiveStatus}
                            />
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                            <Text style={styles.buttonText}>{traineeId || trainee ? 'Update' : 'Add'} Trainee</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    input: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 12,
    },
    button: {
        backgroundColor: '#6200ee',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
        marginBottom: 10,  // Added margin to make sure the button is not too close to the bottom
    },
    buttonText: { color: '#fff', fontSize: 16, textAlign: 'center' },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginRight: 10,
    },
});
