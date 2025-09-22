import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    maxLength?: number;
    error?: string;
}

// Input validation utilities
const ValidationUtils = {
    // Check for emojis and special characters
    containsEmoji: (text: string): boolean => {
        const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
        return emojiRegex.test(text);
    },

    // Check for invalid characters in name
    containsInvalidNameChars: (text: string): boolean => {
        const invalidChars = /[^a-zA-Z\s'-]/;
        return invalidChars.test(text);
    },

    // Check for invalid characters in profession
    containsInvalidProfessionChars: (text: string): boolean => {
        const invalidChars = /[^a-zA-Z\s&.-]/;
        return invalidChars.test(text);
    },

    // Validate phone number format
    isValidPhoneNumber: (phone: string): boolean => {
        const phoneRegex = /^[6-9][0-9]{9}$/;
        return phoneRegex.test(phone);
    },

    // Validate numeric input
    isValidNumeric: (value: string, min?: number, max?: number): boolean => {
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        if (min !== undefined && num < min) return false;
        if (max !== undefined && num > max) return false;
        return true;
    },

    // Validate social handle
    isValidSocialHandle: (handle: string): boolean => {
        if (!handle) return true; // Optional field
        const socialRegex = /^@?[a-zA-Z0-9_.]{1,30}$/;
        return socialRegex.test(handle);
    },

    // Validate date format DD/MM/YYYY
    isValidDate: (date: string): { isValid: boolean; message?: string } => {
        if (!date) return { isValid: true }; // Optional field
        
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
        if (!dateRegex.test(date)) {
            return { isValid: false, message: 'Date must be in DD/MM/YYYY format' };
        }

        const [day, month, year] = date.split('/').map(Number);
        const dateObj = new Date(year, month - 1, day);
        
        if (dateObj.getDate() !== day || dateObj.getMonth() !== month - 1 || dateObj.getFullYear() !== year) {
            return { isValid: false, message: 'Invalid date' };
        }

        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear + 1) {
            return { isValid: false, message: `Year must be between 1900 and ${currentYear + 1}` };
        }

        return { isValid: true };
    }
};

// Enhanced InputField component with validation
const InputField: React.FC<InputFieldProps> = React.memo(({ 
    label, 
    value, 
    onChangeText, 
    icon, 
    multiline = false, 
    maxLength,
    error,
    ...props 
}) => {
    const fadeAnim = useState(new Animated.Value(1))[0];
    const slideAnim = useState(new Animated.Value(0))[0];
    const remainingChars = maxLength ? maxLength - value.length : null;

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
                {maxLength && (
                    <Text style={[
                        styles.characterCount,
                        { color: remainingChars && remainingChars < 10 ? '#ef4444' : '#6b7280' }
                    ]}>
                        {remainingChars}/{maxLength}
                    </Text>
                )}
            </View>
            <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
                <TextInput
                    style={[
                        styles.input, 
                        multiline && styles.multilineInput,
                        error && styles.inputError
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholderTextColor="#9ca3af"
                    multiline={multiline}
                    textAlignVertical={multiline ? 'top' : 'center'}
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={maxLength}
                    {...props}
                />
            </View>
            {error && (
                <View style={styles.errorContainer}>
                    <Ionicons name="warning" size={16} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}
        </Animated.View>
    );
});

export default function TraineeFormScreen({ route, navigation }: Props) {
    const { trainee, traineeId } = route.params || {};
    
    // Form state
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

    // Error state for each field
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Animation values
    const fadeAnim = useState(new Animated.Value(0))[0];
    const slideAnim = useState(new Animated.Value(50))[0];
    const rotateAnim = useState(new Animated.Value(0))[0];

    // Validation functions
    const validateField = useCallback((fieldName: string, value: string): string => {
        let error = '';

        switch (fieldName) {
            case 'name':
                if (!value.trim()) {
                    error = 'Name is required';
                } else if (value.length < 2) {
                    error = 'Name must be at least 2 characters';
                } else if (value.length > 50) {
                    error = 'Name cannot exceed 50 characters';
                } else if (ValidationUtils.containsEmoji(value)) {
                    error = 'Name cannot contain emojis';
                } else if (ValidationUtils.containsInvalidNameChars(value)) {
                    error = 'Name can only contain letters, spaces, hyphens, and apostrophes';
                }
                break;

            case 'phoneNumber':
                if (!value.trim()) {
                    error = 'Phone number is required';
                } else if (ValidationUtils.containsEmoji(value)) {
                    error = 'Phone number cannot contain emojis';
                } else if (!ValidationUtils.isValidPhoneNumber(value)) {
                    error = 'Please enter a valid 10-digit phone number starting with 6-9';
                }
                break;

            case 'dob':
                if (!value.trim()) {
                    error = 'Date of birth is required';
                } else {
                    const dateValidation = ValidationUtils.isValidDate(value);
                    if (!dateValidation.isValid) {
                        error = dateValidation.message || 'Invalid date';
                    }
                }
                break;

            case 'gender':
                if (!value.trim()) {
                    error = 'Gender is required';
                } else if (value.length > 20) {
                    error = 'Gender cannot exceed 20 characters';
                } else if (ValidationUtils.containsEmoji(value)) {
                    error = 'Gender cannot contain emojis';
                } else if (ValidationUtils.containsInvalidNameChars(value)) {
                    error = 'Gender can only contain letters and spaces';
                }
                break;

            case 'profession':
                if (value && value.length > 50) {
                    error = 'Profession cannot exceed 50 characters';
                } else if (ValidationUtils.containsEmoji(value)) {
                    error = 'Profession cannot contain emojis';
                } else if (ValidationUtils.containsInvalidProfessionChars(value)) {
                    error = 'Profession contains invalid characters';
                }
                break;

            case 'height':
                if (!value.trim()) {
                    error = 'Height is required';
                } else if (!ValidationUtils.isValidNumeric(value, 50, 300)) {
                    error = 'Height must be between 50 and 300 cm';
                }
                break;

            case 'weight':
                if (value && !ValidationUtils.isValidNumeric(value, 20, 500)) {
                    error = 'Weight must be between 20 and 500 kg';
                }
                break;

            case 'bmi':
                if (value && !ValidationUtils.isValidNumeric(value, 10, 60)) {
                    error = 'BMI must be between 10 and 60';
                }
                break;

            case 'startDate':
                if (value) {
                    const dateValidation = ValidationUtils.isValidDate(value);
                    if (!dateValidation.isValid) {
                        error = dateValidation.message || 'Invalid date';
                    }
                }
                break;

            case 'membershipType':
                if (value && value.length > 30) {
                    error = 'Membership type cannot exceed 30 characters';
                } else if (ValidationUtils.containsEmoji(value)) {
                    error = 'Membership type cannot contain emojis';
                }
                break;

            case 'emergencyContact':
                if (value && !ValidationUtils.isValidPhoneNumber(value)) {
                    error = 'Please enter a valid 10-digit phone number starting with 6-9';
                } else if (ValidationUtils.containsEmoji(value)) {
                    error = 'Emergency contact cannot contain emojis';
                }
                break;

            case 'socialHandle':
                if (value && !ValidationUtils.isValidSocialHandle(value)) {
                    error = 'Invalid social handle format (max 30 characters, alphanumeric, dots, underscores)';
                } else if (ValidationUtils.containsEmoji(value)) {
                    error = 'Social handle cannot contain emojis';
                }
                break;

            case 'goals':
                if (value && value.length > 500) {
                    error = 'Goals cannot exceed 500 characters';
                } else if (ValidationUtils.containsEmoji(value)) {
                    error = 'Goals cannot contain emojis';
                }
                break;

            case 'activeSupplements':
                if (value && value.length > 300) {
                    error = 'Active supplements cannot exceed 300 characters';
                } else if (ValidationUtils.containsEmoji(value)) {
                    error = 'Active supplements cannot contain emojis';
                }
                break;

            case 'medicalHistory':
                if (value && value.length > 500) {
                    error = 'Medical history cannot exceed 500 characters';
                } else if (ValidationUtils.containsEmoji(value)) {
                    error = 'Medical history cannot contain emojis';
                }
                break;

            case 'notes':
                if (value && value.length > 500) {
                    error = 'Notes cannot exceed 500 characters';
                } else if (ValidationUtils.containsEmoji(value)) {
                    error = 'Notes cannot contain emojis';
                }
                break;

            default:
                break;
        }

        return error;
    }, []);

    // Enhanced input handlers with validation
    const createValidatedHandler = useCallback((fieldName: string, setter: (value: string) => void) => {
        return (text: string) => {
            setter(text);
            const error = validateField(fieldName, text);
            setErrors(prev => ({ ...prev, [fieldName]: error }));
        };
    }, [validateField]);

    const handleNameChange = useCallback(createValidatedHandler('name', setName), [createValidatedHandler]);
    const handlePhoneChange = useCallback(createValidatedHandler('phoneNumber', setPhoneNumber), [createValidatedHandler]);
    // Auto-format handlers for DD/MM/YYYY with auto-slashes
    const prevDobRef = useRef('');
    const prevStartDateRef = useRef('');

    const handleDobChange = useCallback((text: string) => {
        const prevText = prevDobRef.current;
        const cleaned = text.replace(/\D/g, '');
        let formatted = '';

        if (cleaned.length <= 2) {
            formatted = cleaned;
            if (cleaned.length === 2 && prevText.length <= text.length) {
                formatted += '/';
            }
        } else if (cleaned.length <= 4) {
            formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
            if (cleaned.length === 4 && prevText.length <= text.length) {
                formatted += '/';
            }
        } else {
            formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
        }

        prevDobRef.current = formatted;
        setDob(formatted);
        const error = validateField('dob', formatted);
        setErrors(prev => ({ ...prev, dob: error }));
    }, [validateField]);
    const handleGenderChange = useCallback(createValidatedHandler('gender', setGender), [createValidatedHandler]);
    const handleProfessionChange = useCallback(createValidatedHandler('profession', setProfession), [createValidatedHandler]);
    const handleWeightChange = useCallback(createValidatedHandler('weight', setWeight), [createValidatedHandler]);
    const handleHeightChange = useCallback(createValidatedHandler('height', setHeight), [createValidatedHandler]);
    const handleBmiChange = useCallback(createValidatedHandler('bmi', setBmi), [createValidatedHandler]);
    const handleStartDateChange = useCallback((text: string) => {
        const prevText = prevStartDateRef.current;
        const cleaned = text.replace(/\D/g, '');
        let formatted = '';

        if (cleaned.length <= 2) {
            formatted = cleaned;
            if (cleaned.length === 2 && prevText.length <= text.length) {
                formatted += '/';
            }
        } else if (cleaned.length <= 4) {
            formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
            if (cleaned.length === 4 && prevText.length <= text.length) {
                formatted += '/';
            }
        } else {
            formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
        }

        prevStartDateRef.current = formatted;
        setStartDate(formatted);
        const error = validateField('startDate', formatted);
        setErrors(prev => ({ ...prev, startDate: error }));
    }, [validateField]);
    const handleMembershipTypeChange = useCallback(createValidatedHandler('membershipType', setMembershipType), [createValidatedHandler]);
    const handleEmergencyContactChange = useCallback(createValidatedHandler('emergencyContact', setEmergencyContact), [createValidatedHandler]);
    const handleMedicalHistoryChange = useCallback(createValidatedHandler('medicalHistory', setMedicalHistory), [createValidatedHandler]);
    const handleSocialHandleChange = useCallback(createValidatedHandler('socialHandle', setSocialHandle), [createValidatedHandler]);
    const handleGoalsChange = useCallback(createValidatedHandler('goals', setGoals), [createValidatedHandler]);
    const handleNotesChange = useCallback(createValidatedHandler('notes', setNotes), [createValidatedHandler]);
    const handleActiveSupplementsChange = useCallback(createValidatedHandler('activeSupplements', setActiveSupplements), [createValidatedHandler]);

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
            quality: 0.8, // Reduce quality to manage file size
            allowsEditing: true,
            aspect: [1, 1],
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

    const validateAllFields = (): boolean => {
        const fieldsToValidate = {
            name,
            phoneNumber,
            dob,
            gender,
            profession,
            weight,
            height,
            bmi,
            startDate,
            membershipType,
            emergencyContact,
            medicalHistory,
            socialHandle,
            goals,
            notes,
            activeSupplements
        };

        const newErrors: Record<string, string> = {};
        let hasErrors = false;

        Object.entries(fieldsToValidate).forEach(([fieldName, value]) => {
            const error = validateField(fieldName, value);
            if (error) {
                newErrors[fieldName] = error;
                hasErrors = true;
            }
        });

        setErrors(newErrors);

        if (hasErrors) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Please fix the highlighted fields',
                position: 'top',
                topOffset: 60
            });
        }

        return !hasErrors;
    };

    const handleSubmit = async () => {
        if (!validateAllFields()) {
            return;
        }

        setIsSubmitting(true);
        const backendUrl = Constants.expoConfig?.extra?.backendUrl;
        try {
            const imageUrl = image && image.uri !== trainee?.image_url ? await uploadImage() : trainee?.image_url;

            const traineeData = {
                id: traineeId || trainee?.id || '',
                name: name.trim(),
                phone_number: phoneNumber.trim(),
                dob: dob.trim(),
                gender: gender.trim(),
                profession: profession.trim(),
                weight: parseFloat(weight) || 0,
                height: parseFloat(height),
                bmi: bmi ? parseFloat(bmi) : undefined,
                start_date: startDate.trim(),
                membership_type: membershipType.trim(),
                emergency_contact: emergencyContact.trim(),
                medical_history: medicalHistory.trim(),
                social_handle: socialHandle.trim(),
                goals: goals.trim(),
                notes: notes.trim(),
                active_status: activeStatus,
                image_url: imageUrl,
                active_supplements: activeSupplements.trim(),
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
                                        maxLength={50}
                                        error={errors.name}
                                    />
                                    <InputField 
                                        label="Phone Number *" 
                                        value={phoneNumber} 
                                        onChangeText={handlePhoneChange}
                                        icon="call"
                                        keyboardType="phone-pad"
                                        placeholder="Enter phone number"
                                        maxLength={10}
                                        error={errors.phoneNumber}
                                    />
                                    <InputField 
                                        label="Date of Birth (DD/MM/YYYY) *" 
                                        value={dob} 
                                        onChangeText={handleDobChange}
                                        icon="calendar"
                                        placeholder="DD/MM/YYYY"
                                        keyboardType="numeric"
                                        maxLength={10}
                                        error={errors.dob}
                                    />
                                    <InputField 
                                        label="Gender *" 
                                        value={gender} 
                                        onChangeText={handleGenderChange}
                                        icon="male-female"
                                        placeholder="Enter gender"
                                        maxLength={20}
                                        error={errors.gender}
                                    />
                                    <InputField 
                                        label="Profession" 
                                        value={profession} 
                                        onChangeText={handleProfessionChange}
                                        icon="briefcase"
                                        placeholder="Enter profession"
                                        maxLength={50}
                                        error={errors.profession}
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
                                        maxLength={3}
                                        error={errors.height}
                                    />
                                    <InputField 
                                        label="Weight (kg)" 
                                        value={weight} 
                                        onChangeText={handleWeightChange}
                                        icon="fitness"
                                        keyboardType="numeric"
                                        placeholder="Enter weight in kg"
                                        maxLength={5}
                                        error={errors.weight}
                                    />
                                    <InputField 
                                        label="BMI" 
                                        value={bmi} 
                                        onChangeText={handleBmiChange}
                                        icon="analytics"
                                        keyboardType="numeric"
                                        placeholder="BMI (optional)"
                                        maxLength={4}
                                        error={errors.bmi}
                                    />
                                </View>

                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Membership Details</Text>
                                    <InputField 
                                        label="Start Date (DD/MM/YYYY)" 
                                        value={startDate} 
                                        onChangeText={handleStartDateChange}
                                        icon="calendar"
                                        placeholder="DD/MM/YYYY"
                                        keyboardType="numeric"
                                        maxLength={10}
                                        error={errors.startDate}
                                    />
                                    <InputField 
                                        label="Membership Type" 
                                        value={membershipType} 
                                        onChangeText={handleMembershipTypeChange}
                                        icon="card"
                                        placeholder="Enter membership type"
                                        maxLength={30}
                                        error={errors.membershipType}
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
                                        maxLength={10}
                                        error={errors.emergencyContact}
                                    />
                                    <InputField 
                                        label="Social Handle" 
                                        value={socialHandle} 
                                        onChangeText={handleSocialHandleChange}
                                        icon="logo-instagram"
                                        placeholder="@username"
                                        maxLength={31}
                                        error={errors.socialHandle}
                                    />
                                    <InputField 
                                        label="Goals" 
                                        value={goals} 
                                        onChangeText={handleGoalsChange}
                                        icon="trophy"
                                        placeholder="Fitness goals"
                                        multiline={true}
                                        maxLength={500}
                                        error={errors.goals}
                                    />
                                    <InputField 
                                        label="Active Supplements" 
                                        value={activeSupplements} 
                                        onChangeText={handleActiveSupplementsChange}
                                        icon="nutrition"
                                        placeholder="Current supplements"
                                        multiline={true}
                                        maxLength={300}
                                        error={errors.activeSupplements}
                                    />
                                    <InputField 
                                        label="Medical History" 
                                        value={medicalHistory} 
                                        onChangeText={handleMedicalHistoryChange}
                                        icon="medical"
                                        placeholder="Any medical conditions"
                                        multiline={true}
                                        maxLength={500}
                                        error={errors.medicalHistory}
                                    />
                                    <InputField 
                                        label="Notes" 
                                        value={notes} 
                                        onChangeText={handleNotesChange}
                                        icon="document-text"
                                        placeholder="Additional notes"
                                        multiline={true}
                                        maxLength={500}
                                        error={errors.notes}
                                    />
                                </View>

                                <TouchableOpacity 
                                    style={[
                                        styles.submitButton,
                                        (Object.keys(errors).some(key => errors[key]) || isSubmitting) && styles.submitButtonDisabled
                                    ]} 
                                    onPress={handleSubmit}
                                    disabled={Object.keys(errors).some(key => errors[key]) || isSubmitting}
                                >
                                    <LinearGradient
                                        colors={
                                            Object.keys(errors).some(key => errors[key]) || isSubmitting
                                                ? ['#9ca3af', '#6b7280']
                                                : ['#6366f1', '#8b5cf6']
                                        }
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

// Enhanced StyleSheet with error states
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    background: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 100,
    },
    formContainer: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        textAlign: 'center',
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
    },
    imageContainer: {
        marginBottom: 20,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#e5e7eb',
    },
    imagePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#e5e7eb',
    },
    imageButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    uploadButton: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
    },
    removeButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    formSection: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 20,
        paddingLeft: 4,
    },
    inputContainer: {
        marginBottom: 20,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    labelIcon: {
        marginRight: 8,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        flex: 1,
    },
    characterCount: {
        fontSize: 12,
        fontWeight: '500',
    },
    inputWrapper: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    inputWrapperError: {
        borderColor: '#ef4444',
        backgroundColor: '#fef2f2',
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1f2937',
        borderRadius: 12,
    },
    inputError: {
        color: '#dc2626',
    },
    multilineInput: {
        minHeight: 80,
        textAlignVertical: 'top',
        paddingTop: 14,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        paddingHorizontal: 4,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        marginLeft: 6,
        flex: 1,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
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
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 20,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    submitButtonDisabled: {
        shadowOpacity: 0.1,
        elevation: 2,
    },
    submitButtonGradient: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loadingScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingScreenText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
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
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 15,
    },
    loadingSpinner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 20,
        overflow: 'hidden',
    },
    gradientSpinner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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