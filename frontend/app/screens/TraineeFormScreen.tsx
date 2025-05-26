import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';

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
    const [socialHandle, setSocialHandle] = useState(trainee?.social_handle || '');
    const [goals, setGoals] = useState(trainee?.goals || '');
    const [notes, setNotes] = useState(trainee?.notes || '');
    const [activeStatus, setActiveStatus] = useState(trainee?.active_status ?? true);
    const [progressMetrics, setProgressMetrics] = useState<string>(JSON.stringify(trainee?.progress_metrics || {}));
    const [isLoading, setIsLoading] = useState(false);
    const [image, setImage] = useState<{ uri: string } | null>(
        trainee?.image_url ? { uri: trainee.image_url } : null
    );
    const [activeSupplements, setActiveSupplements] = useState(trainee?.active_supplements || '');

    useEffect(() => {
        if (traineeId && !trainee) {
            fetchTrainee();
        }
    }, [traineeId]);

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
             Toast.show({ type: 'error', text1: 'Permission required', text2: 'Enable image library access' });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedImage = result.assets[0];

             // Validate file size (fileSize is in bytes)
            if (selectedImage.fileSize && selectedImage.fileSize > 2* 1024 * 1024) {
                Toast.show({ type: 'error', text1: 'Image too large', text2: 'Image must be under 2 MB' });
                return;
            }
            setImage({ uri: selectedImage.uri });
        }
    };

    const handleRemoveImage = () => {
        setImage(null);
    };

    const uploadImage = async () => {
        if (!image) {
            console.log('Please select an image to upload');
            return null;
        }

        const formData = new FormData();
        formData.append('image', {
            uri: image.uri,
            name: 'trainee-profile.jpg',
            type: 'image/jpeg',
        } as any);

        const backendUrl = Constants.expoConfig?.extra?.backendUrl;
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${backendUrl}/images/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload image');
            }

            const data = await response.json();
            return data.image_url;
        } catch (error) {
            console.error('Error uploading image:', error);
            Toast.show({ type: 'error', text1: 'Upload Error', text2: 'Failed to upload image' });
            return null;
        }
    };

    const fetchTrainee = async () => {
        setIsLoading(true);
        const backendUrl = Constants.expoConfig?.extra?.backendUrl;
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }

            const response = await fetch(`${backendUrl}/trainees/${traineeId}`, {
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
            setActiveSupplements(data.active_supplements);

            // Set image from fetched data
            if (data.image_url) {
                setImage({ uri: data.image_url });
            }
        } catch (error) {
            console.error('Error fetching trainee:', error);
            Toast.show({ type: 'error', text1: 'Loading Error', text2: 'Failed to load trainee details.' });
        } finally {
            setIsLoading(false);
        }
    };

    const validateDate = (date: string, fieldName: string): boolean => {
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;

        // Check if the date matches the DD-MM-YYYY format
        if (!dateRegex.test(date)) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: `${fieldName} must be in DD-MM-YYYY format.`,
            });
            return false;
        }

        // Split the date into components (day, month, year)
        const [day, month, year] = date.split('-').map(Number);

        // Check if the date is valid (e.g., February 30 is not valid)
        const dateObj = new Date(year, month - 1, day);
        if (
            dateObj.getDate() !== day ||
            dateObj.getMonth() !== month - 1 ||
            dateObj.getFullYear() !== year
        ) {
            Toast.show({
                type: 'error',
                text1: `${fieldName} Validation Error`,
                text2: 'Invalid date. Please check the day, month, and year.',
            });
            return false;
        }

        // Check for reasonable year range (1900 to current year)
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear) {
            Toast.show({
                type: 'error',
                text1: `${fieldName} Validation Error`,
                text2: `Year must be between 1900 and ${currentYear}.`,
            });
            return false;
        }

        return true;  // If all validations pass, return true
    };
    
    const validateFields = () => {
        if (!name.trim() || !phoneNumber.trim() || !dob.trim() || !gender.trim() || !height.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'All fields marked with * are mandatory.',
            });
            return false;
        }

        const phoneRegex = /^[6-9][0-9]{9}$/;
        if (!phoneRegex.test(phoneNumber)) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Please enter a valid 10-digit phone number.',
            });
            return false;
        }

        if (!validateDate(dob, 'Date of Birth')) {
            return false;
        }

        if (!validateDate(startDate, 'Start Date')) {
            return false;
        }

        if (isNaN(parseFloat(height)) || parseFloat(height) <= 0) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Height must be a positive number.',
            });
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {

        if (!validateFields()) {
            return; // Exit if validation fails
        }
    
        setIsLoading(true);
        const backendUrl = Constants.expoConfig?.extra?.backendUrl;
        try {
            // Upload image only if a new one is selected
            const imageUrl = image && image.uri !== trainee?.image_url ? await uploadImage() : trainee?.image_url;
    
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
                image_url: imageUrl,
                active_supplements: activeSupplements,
            };
    
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }
    
            const response = await fetch(
                `${backendUrl}/trainees/${traineeId || ''}`,
                {
                    method: traineeId || trainee ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `${token}`,
                    },
                    body: JSON.stringify(traineeData),
                }
            );
    
            const responseBody = await response.json();
    
            if (!response.ok) {
                throw new Error(responseBody.message || 'Failed to add trainee');
            }
    
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: traineeId ? 'Trainee updated successfully.' : 'Trainee added successfully.',
            });

            navigation.goBack();
        } catch (error) {
            console.error('Error submitting trainee:', error);
            Toast.show({
                type: 'error',
                text1: 'Submission Error',
                text2: traineeId ? 'Failed to update trainee.' : 'Failed to add trainee.',
            });

        } finally {
            setIsLoading(false);
        }
    };

    interface InputFieldProps {
        label: string;
        value: string;
        onChangeText: (text: string) => void;
        [key: string]: any; // For additional TextInput props
    }

    const InputField = ({ label, value, onChangeText, ...props }: InputFieldProps) => (
        <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                {...props}
            />
        </View>
    );

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
                {isLoading ? (
                    <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 200 }} />
                ) : (
                    <>
                        <Text style={styles.title}>{traineeId || trainee ? 'Edit Trainee' : 'Add Trainee'}</Text>

                        <View style={styles.container}>
                            <View style={styles.imageContainer}>
                                {image ? (
                                    <Image source={{ uri: image.uri }} style={styles.profileImage} />
                                ) : (
                                    <View style={styles.placeholder}>
                                        <Ionicons name="person-circle-outline" size={120} color="#aaa" />
                                    </View>
                                )}
                            </View>

                            <View style={styles.buttonsContainer}>
                                <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
                                    <Ionicons name="camera" size={20} color="#fff" />
                                    <Text style={styles.uploadButtonText}>
                                        {image ? 'Change Photo(2MB)' : 'Upload Photo(2MB)'}
                                    </Text>
                                </TouchableOpacity>

                                {image && (
                                    <TouchableOpacity style={styles.removeButton} onPress={handleRemoveImage}>
                                        <Ionicons name="trash" size={20} color="#fff" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <InputField label="Name *" value={name} onChangeText={setName} />
                        <InputField label="Phone Number *" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
                        <InputField label="Goals" value={goals} onChangeText={setGoals} />
                        <InputField label="Notes" value={notes} onChangeText={setNotes} />
                        <InputField label="Active Supplements" value={activeSupplements} onChangeText={setActiveSupplements} />
                        <InputField label="Medical History" value={medicalHistory} onChangeText={setMedicalHistory} />
                        <InputField label="Gender *" value={gender} onChangeText={setGender} />
                        <InputField label="Date of Birth (DD-MM-YYYY) *" value={dob} onChangeText={setDob} />
                        <InputField label="Height (cm) *" value={height} onChangeText={setHeight} keyboardType="numeric" />
                        <InputField label="Profession" value={profession} onChangeText={setProfession} />
                        <InputField label="Start Date (DD-MM-YYYY) *" value={startDate} onChangeText={setStartDate} />
                        <InputField label="Membership Type" value={membershipType} onChangeText={setMembershipType} />
                        <InputField label="Emergency Contact" value={emergencyContact} onChangeText={setEmergencyContact} keyboardType="phone-pad" />
                        <InputField label="Social Handle" value={socialHandle} onChangeText={setSocialHandle} />
                        
                        <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>Active Status</Text>
                            <Switch value={activeStatus} onValueChange={setActiveStatus} />
                        </View>

                        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                            <Text style={styles.submitButtonText}>{traineeId || trainee ? 'Update Trainee' : 'Add Trainee'}</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    inputContainer: {
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    input: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
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
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginTop: 10,
    },

    container: {
        alignItems: 'center',
        padding: 20,
    },
    imageContainer: {
        marginBottom: 20,
        alignItems: 'center',
    },
    profileImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 3,
        borderColor: '#6200ee',
    },
    placeholder: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6200ee',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 16,
        marginLeft: 8,
    },
    removeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e53935',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    removeButtonText: {
        color: '#fff',
        fontSize: 16,
        marginLeft: 8,
    },
    submitButton: {
        backgroundColor: '#6200ee',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});