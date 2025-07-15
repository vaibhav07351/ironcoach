import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Switch, Animated, Modal } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';

type Props = NativeStackScreenProps<RootStackParamList, 'TraineeForm'>;

interface InputFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    icon?: keyof typeof Ionicons.glyphMap;
    multiline?: boolean;
    placeholder?: string;
    keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
}

// Move InputField outside of the main component to prevent re-creation
const InputField: React.FC<InputFieldProps> = React.memo(({ label, value, onChangeText, icon, multiline = false, ...props }) => {
    const fadeAnim = useState(new Animated.Value(1))[0];
    const slideAnim = useState(new Animated.Value(0))[0];

    return (
        <Animated.View 
            style={[
                styles.inputContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                }
            ]}
        >
            <View style={styles.labelContainer}>
                {icon && <Ionicons name={icon} size={18} color="#6366f1" style={styles.labelIcon} />}
                <Text style={styles.inputLabel}>{label}</Text>
            </View>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={[styles.input, multiline && styles.multilineInput]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholderTextColor="#9ca3af"
                    multiline={multiline}
                    textAlignVertical={multiline ? 'top' : 'center'}
                    autoCapitalize="none"
                    autoCorrect={false}
                    {...props}
                />
            </View>
        </Animated.View>
    );
});

export default function TraineeFormScreen({ route, navigation }: Props) {
    const { trainee, traineeId } = route.params || {};
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
    const [progressMetrics, setProgressMetrics] = useState(JSON.stringify(trainee?.progress_metrics || {}));
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [image, setImage] = useState<{ uri: string } | null>(
        trainee?.image_url ? { uri: trainee.image_url } : null
    );
    const [activeSupplements, setActiveSupplements] = useState(trainee?.active_supplements || '');

    // Animation values
    const fadeAnim = useState(new Animated.Value(0))[0];
    const slideAnim = useState(new Animated.Value(50))[0];
    const rotateAnim = useState(new Animated.Value(0))[0];

    // Memoize handlers to prevent unnecessary re-renders
    const handleNameChange = useCallback((text: string) => setName(text), []);
    const handlePhoneChange = useCallback((text: string) => setPhoneNumber(text), []);
    const handleDobChange = useCallback((text: string) => setDob(text), []);
    const handleGenderChange = useCallback((text: string) => setGender(text), []);
    const handleProfessionChange = useCallback((text: string) => setProfession(text), []);
    const handleWeightChange = useCallback((text: string) => setWeight(text), []);
    const handleHeightChange = useCallback((text: string) => setHeight(text), []);
    const handleBmiChange = useCallback((text: string) => setBmi(text), []);
    const handleStartDateChange = useCallback((text: string) => setStartDate(text), []);
    const handleMembershipTypeChange = useCallback((text: string) => setMembershipType(text), []);
    const handleEmergencyContactChange = useCallback((text: string) => setEmergencyContact(text), []);
    const handleMedicalHistoryChange = useCallback((text: string) => setMedicalHistory(text), []);
    const handleSocialHandleChange = useCallback((text: string) => setSocialHandle(text), []);
    const handleGoalsChange = useCallback((text: string) => setGoals(text), []);
    const handleNotesChange = useCallback((text: string) => setNotes(text), []);
    const handleActiveSupplementsChange = useCallback((text: string) => setActiveSupplements(text), []);

    useEffect(() => {
        // Animate screen entrance
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();

        if (traineeId && !trainee) {
            fetchTrainee();
        }
    }, [traineeId]);

    useEffect(() => {
        // Animate loading spinner
        if (isSubmitting) {
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                })
            ).start();
        }
    }, [isSubmitting]);

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Toast.show({ 
                type: 'error', 
                text1: 'Permission required', 
                text2: 'Enable image library access',
                position: 'top',
                topOffset: 60
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedImage = result.assets[0];

            if (selectedImage.fileSize && selectedImage.fileSize > 2 * 1024 * 1024) {
                Toast.show({ 
                    type: 'error', 
                    text1: 'Image too large', 
                    text2: 'Image must be under 2 MB',
                    position: 'top',
                    topOffset: 60
                });
                return;
            }
            setImage({ uri: selectedImage.uri });
        }
    };

    const handleRemoveImage = () => {
        setImage(null);
    };

    const uploadImage = async (): Promise<string | null> => {
        if (!image) {
            console.log('Please select an image to upload');
            return null;
        }

        const formData = new FormData();
        
        // Create a proper file object for web/mobile compatibility
        if (Platform.OS === 'web') {
            // For web, we need to fetch the image as a blob
            try {
                const response = await fetch(image.uri);
                const blob = await response.blob();
                formData.append('image', blob, 'trainee-profile.jpg');
            } catch (error) {
                console.error('Error converting image to blob:', error);
                return null;
            }
        } else {
            // For mobile, use the uri format
            formData.append('image', {
                uri: image.uri,
                name: 'trainee-profile.jpg',
                type: 'image/jpeg',
            } as any);
        }

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
            Toast.show({ 
                type: 'error', 
                text1: 'Upload Error', 
                text2: 'Failed to upload image',
                position: 'top',
                topOffset: 60
            });
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

            if (data.image_url) {
                setImage({ uri: data.image_url });
            }
        } catch (error) {
            console.error('Error fetching trainee:', error);
            Toast.show({ 
                type: 'error', 
                text1: 'Loading Error', 
                text2: 'Failed to load trainee details.',
                position: 'top',
                topOffset: 60
            });
        } finally {
            setIsLoading(false);
        }
    };

    const validateDate = (date: string, fieldName: string): boolean => {
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;

        if (!dateRegex.test(date)) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: `${fieldName} must be in DD-MM-YYYY format.`,
                position: 'top',
                topOffset: 60
            });
            return false;
        }

        const [day, month, year] = date.split('-').map(Number);
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
                position: 'top',
                topOffset: 60
            });
            return false;
        }

        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear) {
            Toast.show({
                type: 'error',
                text1: `${fieldName} Validation Error`,
                text2: `Year must be between 1900 and ${currentYear}.`,
                position: 'top',
                topOffset: 60
            });
            return false;
        }

        return true;
    };

    const validateFields = (): boolean => {
        if (!name.trim() || !phoneNumber.trim() || !dob.trim() || !gender.trim() || !height.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'All fields marked with * are mandatory.',
                position: 'top',
                topOffset: 60
            });
            return false;
        }

        const phoneRegex = /^[6-9][0-9]{9}$/;
        if (!phoneRegex.test(phoneNumber)) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Please enter a valid 10-digit phone number.',
                position: 'top',
                topOffset: 60
            });
            return false;
        }

        if (!validateDate(dob, 'Date of Birth')) {
            return false;
        }

        if (startDate && !validateDate(startDate, 'Start Date')) {
            return false;
        }

        if (isNaN(parseFloat(height)) || parseFloat(height) <= 0) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Height must be a positive number.',
                position: 'top',
                topOffset: 60
            });
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateFields()) {
            return;
        }

        setIsSubmitting(true);
        const backendUrl = Constants.expoConfig?.extra?.backendUrl;
        try {
            const imageUrl = image && image.uri !== trainee?.image_url ? await uploadImage() : trainee?.image_url;

            const traineeData = {
                id: traineeId || trainee?.id || '',
                name,
                phone_number: phoneNumber,
                dob,
                gender,
                profession,
                weight: parseFloat(weight) || 0,
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
                throw new Error(responseBody.message || 'Failed to save trainee');
            }

            Toast.show({
                type: 'success',
                text1: 'Success!',
                text2: traineeId ? 'Trainee updated successfully.' : 'Trainee added successfully.',
                position: 'top',
                topOffset: 60
            });

            navigation.goBack();
        } catch (error) {
            console.error('Error submitting trainee:', error);
            Toast.show({
                type: 'error',
                text1: 'Submission Error',
                text2: traineeId ? 'Failed to update trainee.' : 'Failed to add trainee.',
                position: 'top',
                topOffset: 60
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const LoadingModal = () => (
        <Modal
            visible={isSubmitting}
            transparent={true}
            animationType="fade"
            pointerEvents="box-none"
        >
            <View style={styles.loadingOverlay}>
                <View style={styles.loadingContainer}>
                    <Animated.View
                        style={[
                            styles.loadingSpinner,
                            {
                                transform: [
                                    {
                                        rotate: rotateAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0deg', '360deg'],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={['#6366f1', '#8b5cf6', '#ec4899']}
                            style={styles.gradientSpinner}
                        >
                            <Ionicons name="fitness" size={40} color="#fff" />
                        </LinearGradient>
                    </Animated.View>
                    <Text style={styles.loadingText}>
                        {traineeId ? 'Updating Trainee...' : 'Adding Trainee...'}
                    </Text>
                    <Text style={styles.loadingSubText}>
                        Please wait while we save the information
                    </Text>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <LinearGradient
                    colors={['#f8fafc', '#e2e8f0']}
                    style={styles.background}
                >
                    <ScrollView 
                        contentContainerStyle={styles.scrollContainer}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {isLoading ? (
                            <View style={styles.loadingScreen}>
                                <ActivityIndicator size="large" color="#6366f1" />
                                <Text style={styles.loadingScreenText}>Loading trainee details...</Text>
                            </View>
                        ) : (
                            <Animated.View
                                style={[
                                    styles.formContainer,
                                    {
                                        opacity: fadeAnim,
                                        transform: [{ translateY: slideAnim }],
                                    }
                                ]}
                            >
                                <View style={styles.header}>
                                    <Text style={styles.title}>
                                        {traineeId || trainee ? 'Edit Trainee' : 'Add New Trainee'}
                                    </Text>
                                    <Text style={styles.subtitle}>
                                        {traineeId || trainee ? 'Update trainee information' : 'Fill in the details below'}
                                    </Text>
                                </View>

                                <View style={styles.imageSection}>
                                    <View style={styles.imageContainer}>
                                        {image ? (
                                            <Image source={{ uri: image.uri }} style={styles.profileImage} />
                                        ) : (
                                            <LinearGradient
                                                colors={['#6366f1', '#8b5cf6']}
                                                style={styles.imagePlaceholder}
                                            >
                                                <Ionicons name="person" size={60} color="#fff" />
                                            </LinearGradient>
                                        )}
                                    </View>

                                    <View style={styles.imageButtons}>
                                        <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
                                            <Ionicons name="camera" size={20} color="#fff" />
                                            <Text style={styles.uploadButtonText}>
                                                {image ? 'Change Photo' : 'Upload Photo'}
                                            </Text>
                                        </TouchableOpacity>

                                        {image && (
                                            <TouchableOpacity style={styles.removeButton} onPress={handleRemoveImage}>
                                                <Ionicons name="trash" size={20} color="#fff" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Personal Information</Text>
                                    <InputField 
                                        label="Full Name *" 
                                        value={name} 
                                        onChangeText={handleNameChange}
                                        icon="person"
                                        placeholder="Enter full name"
                                    />
                                    <InputField 
                                        label="Phone Number *" 
                                        value={phoneNumber} 
                                        onChangeText={handlePhoneChange}
                                        icon="call"
                                        keyboardType="phone-pad"
                                        placeholder="Enter phone number"
                                    />
                                    <InputField 
                                        label="Date of Birth (DD-MM-YYYY) *" 
                                        value={dob} 
                                        onChangeText={handleDobChange}
                                        icon="calendar"
                                        placeholder="DD-MM-YYYY"
                                    />
                                    <InputField 
                                        label="Gender *" 
                                        value={gender} 
                                        onChangeText={handleGenderChange}
                                        icon="male-female"
                                        placeholder="Enter gender"
                                    />
                                    <InputField 
                                        label="Profession" 
                                        value={profession} 
                                        onChangeText={handleProfessionChange}
                                        icon="briefcase"
                                        placeholder="Enter profession"
                                    />
                                </View>

                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Physical Information</Text>
                                    <InputField 
                                        label="Height (cm) *" 
                                        value={height} 
                                        onChangeText={handleHeightChange}
                                        icon="resize"
                                        keyboardType="numeric"
                                        placeholder="Enter height in cm"
                                    />
                                    <InputField 
                                        label="Weight (kg)" 
                                        value={weight} 
                                        onChangeText={handleWeightChange}
                                        icon="fitness"
                                        keyboardType="numeric"
                                        placeholder="Enter weight in kg"
                                    />
                                    <InputField 
                                        label="BMI" 
                                        value={bmi} 
                                        onChangeText={handleBmiChange}
                                        icon="analytics"
                                        keyboardType="numeric"
                                        placeholder="BMI (optional)"
                                    />
                                </View>

                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Membership Details</Text>
                                    <InputField 
                                        label="Start Date (DD-MM-YYYY)" 
                                        value={startDate} 
                                        onChangeText={handleStartDateChange}
                                        icon="calendar"
                                        placeholder="DD-MM-YYYY"
                                    />
                                    <InputField 
                                        label="Membership Type" 
                                        value={membershipType} 
                                        onChangeText={handleMembershipTypeChange}
                                        icon="card"
                                        placeholder="Enter membership type"
                                    />
                                    
                                    <View style={styles.switchContainer}>
                                        <View style={styles.switchLabelContainer}>
                                            <Ionicons name="power" size={18} color="#6366f1" />
                                            <Text style={styles.switchLabel}>Active Status</Text>
                                        </View>
                                        <Switch 
                                            value={activeStatus} 
                                            onValueChange={setActiveStatus}
                                            trackColor={{ false: '#e5e7eb', true: '#a7f3d0' }}
                                            thumbColor={activeStatus ? '#10b981' : '#6b7280'}
                                        />
                                    </View>
                                </View>

                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Additional Information</Text>
                                    <InputField 
                                        label="Emergency Contact" 
                                        value={emergencyContact} 
                                        onChangeText={handleEmergencyContactChange}
                                        icon="call"
                                        keyboardType="phone-pad"
                                        placeholder="Emergency contact number"
                                    />
                                    <InputField 
                                        label="Social Handle" 
                                        value={socialHandle} 
                                        onChangeText={handleSocialHandleChange}
                                        icon="logo-instagram"
                                        placeholder="@username"
                                    />
                                    <InputField 
                                        label="Goals" 
                                        value={goals} 
                                        onChangeText={handleGoalsChange}
                                        icon="trophy"
                                        placeholder="Fitness goals"
                                        multiline={true}
                                    />
                                    <InputField 
                                        label="Active Supplements" 
                                        value={activeSupplements} 
                                        onChangeText={handleActiveSupplementsChange}
                                        icon="nutrition"
                                        placeholder="Current supplements"
                                        multiline={true}
                                    />
                                    <InputField 
                                        label="Medical History" 
                                        value={medicalHistory} 
                                        onChangeText={handleMedicalHistoryChange}
                                        icon="medical"
                                        placeholder="Any medical conditions"
                                        multiline={true}
                                    />
                                    <InputField 
                                        label="Notes" 
                                        value={notes} 
                                        onChangeText={handleNotesChange}
                                        icon="document-text"
                                        placeholder="Additional notes"
                                        multiline={true}
                                    />
                                </View>

                                <TouchableOpacity 
                                    style={styles.submitButton} 
                                    onPress={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    <LinearGradient
                                        colors={['#6366f1', '#8b5cf6']}
                                        style={styles.submitButtonGradient}
                                    >
                                        <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                        <Text style={styles.submitButtonText}>
                                            {traineeId || trainee ? 'Update Trainee' : 'Add Trainee'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </ScrollView>
                </LinearGradient>
                <LoadingModal />
            </KeyboardAvoidingView>
            
            {/* Toast component should be rendered at the root level */}
            <Toast />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    formContainer: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: 30,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    imageContainer: {
        marginBottom: 20,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    imagePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    imageButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366f1',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    removeButton: {
        backgroundColor: '#ef4444',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    formSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
        paddingLeft: 4,
    },
    inputContainer: {
        marginBottom: 16,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    labelIcon: {
        marginRight: 8,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    inputWrapper: {
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    input: {
        padding: 16,
        fontSize: 16,
        color: '#1f2937',
        borderRadius: 12,
    },
    multilineInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    switchLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginLeft: 8,
    },
    submitButton: {
        marginTop: 20,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    submitButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: 32,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    loadingScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    loadingScreenText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 16,
    },
    loadingOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
    },
    loadingSpinner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    gradientSpinner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    loadingSubText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
});