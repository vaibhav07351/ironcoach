import React, { useState,useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

export default function SignupScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState('');
    const [speciality, setSpeciality] = useState('');
    const [experience, setExperience] = useState('');
    const [hourlyRate, setHourlyRate] = useState('');
    const [bio, setBio] = useState('');
    const [certifications, setCertifications] = useState('');
    const [socialHandle, setSocialHandle] = useState('');
    const [availability, setAvailability] = useState('');
    const [trainerType, setTrainerType] = useState('');
    const [image, setImage] = useState<{ uri: string } | null>(null);
    const [errors, setErrors] = useState<{[key: string]: string}>({});
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState('');

    const navigation = useNavigation<NavigationProp>();

    // Validation functions
    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone: string) => {
        const phoneRegex = /^[6-9]\d{9}$/;
        return phoneRegex.test(phone);
    };

    const validatePassword = (password: string) => {
        return password.length >= 3;
    };

    const validateDateOfBirth = (date: string) => {
        if (date.length !== 10) return false;
        const parts = date.split('/');
        if (parts.length !== 3) return false;
        
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        if (day < 1 || day > 31) return false;
        if (month < 1 || month > 12) return false;
        if (year < 1950 || year > 2010) return false;
        
        const dateObj = new Date(year, month - 1, day);
        return dateObj.getDate() === day && dateObj.getMonth() === month - 1 && dateObj.getFullYear() === year;
    };

    const validateExperience = (exp: string) => {
        const num = parseInt(exp);
        return !isNaN(num) && num >= 0 && num <= 50;
    };

    const validateHourlyRate = (rate: string) => {
        const num = parseFloat(rate);
        return !isNaN(num) && num >= 100 && num <= 10000;
    };

const prevDateRef = useRef('');

const handleDateChange = (text: string) => {
    const prevText = prevDateRef.current;
    
    // Remove emojis and non-numeric characters except forward slash
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}\u{2764}\u{1F004}\u{1F0CF}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23E9}-\u{23EF}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2693}\u{26A0}\u{26A1}\u{26AA}\u{26AB}\u{26BD}\u{26BE}\u{26C4}\u{26C5}\u{26C8}\u{26CE}\u{26CF}\u{26D1}\u{26D3}\u{26D4}\u{26E9}\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{2702}\u{2708}\u{2709}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2733}\u{2734}\u{2744}\u{2747}\u{2757}\u{2763}\u{2764}\u{27A1}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu;
    const filteredText = text.replace(emojiRegex, '');
    const cleaned = filteredText.replace(/\D/g, '');

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

    prevDateRef.current = formatted;
    setDateOfBirth(formatted);

    if (formatted.length === 10 && validateDateOfBirth(formatted)) {
        setErrors(prev => ({ ...prev, dateOfBirth: '' }));
    }
};


    // Enhanced validation functions
    const validateName = (name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) return false;
        if (trimmedName.length < 2 || trimmedName.length > 50) return false;
        // Only letters and spaces, no emojis or special characters
        return /^[a-zA-Z\s]+$/.test(trimmedName);
    };

    const validatePasswordStrength = (password: string) => {
        if (password.length < 3) return false;
        // No spaces allowed in password
        if (password.includes(' ')) return false;
        return true;
    };

    const validateAddress = (address: string) => {
        if (!address.trim()) return true; // Optional field
        if (address.length > 200) return false;
        // Only alphanumeric, spaces, commas, periods, hyphens - no emojis or special characters
        return /^[a-zA-Z0-9\s,.'-]+$/.test(address);
    };

    const validateSpeciality = (speciality: string) => {
        if (!speciality.trim()) return true; // Optional field
        if (speciality.length < 3 || speciality.length > 100) return false;
        // Only letters, spaces, commas - no emojis or special characters
        return /^[a-zA-Z\s,]+$/.test(speciality);
    };

    const validateField = (fieldName: string, value: string) => {
        let error = '';
        
        switch (fieldName) {
            case 'name':
                if (!value.trim()) error = 'Name is required';
                else if (value.trim().length < 2) error = 'Name must be at least 2 characters';
                else if (value.trim().length > 50) error = 'Name cannot exceed 50 characters';
                else if (!/^[a-zA-Z\s]+$/.test(value.trim())) error = 'Name can only contain letters and spaces (no emojis or special characters)';
                break;
            case 'email':
                if (!value.trim()) error = 'Email is required';
                else if (!validateEmail(value)) error = 'Please enter a valid email address';
                break;
            case 'password':
                if (!value) error = 'Password is required';
                else if (value.length < 3) error = 'Password must be at least 3 characters';
                else if (value.includes(' ')) error = 'Password cannot contain spaces';
                break;
            case 'confirmPassword':
                if (!value) error = 'Please confirm your password';
                else if (value !== password) error = 'Passwords do not match';
                break;
            case 'phoneNumber':
                if (value && !/^\d+$/.test(value)) error = 'Phone number can only contain digits';
                else if (value && !validatePhone(value)) error = 'Please enter a valid 10-digit Indian mobile number';
                break;
            case 'dateOfBirth':
                if (value && !validateDateOfBirth(value)) error = 'Please enter a valid date (DD/MM/YYYY)';
                break;
            case 'gender':
                if (value && !['Male', 'Female', 'Other', 'male', 'female', 'other'].includes(value)) error = 'Please select Male, Female, or Other';
                break;
            case 'address':
                if (value && value.length > 200) error = 'Address cannot exceed 200 characters';
                else if (value && !/^[a-zA-Z0-9\s,.'-]+$/.test(value)) error = 'Address contains invalid characters (no emojis or special symbols)';
                break;
            case 'speciality':
                if (value && value.length < 3) error = 'Speciality must be at least 3 characters';
                else if (value && value.length > 100) error = 'Speciality cannot exceed 100 characters';
                else if (value && !/^[a-zA-Z\s,]+$/.test(value)) error = 'Speciality can only contain letters, spaces, and commas';
                break;
            case 'experience':
                if (value && !validateExperience(value)) error = 'Experience must be between 0-50 years';
                break;
            case 'hourlyRate':
                if (value && !validateHourlyRate(value)) error = 'Hourly rate must be between ₹100-₹10,000';
                break;
            case 'bio':
                if (value && value.length > 500) error = 'Bio cannot exceed 500 characters';
                break;
            case 'trainerType':
                if (value && value.length > 100) error = 'Trainer type cannot exceed 100 characters';
                else if (value && !/^[a-zA-Z\s,]+$/.test(value)) error = 'Trainer type can only contain letters, spaces, and commas';
                break;
            case 'certifications':
                if (value && value.length > 300) error = 'Certifications cannot exceed 300 characters';
                break;
            case 'availability':
                if (value && value.length > 200) error = 'Availability cannot exceed 200 characters';
                break;
            case 'socialHandle':
                if (value && value.length > 100) error = 'Social handle cannot exceed 100 characters';
                break;
        }
        
        setErrors(prev => ({ ...prev, [fieldName]: error }));
    };

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

    
    // Fixing FormData for TypeScript
    const uploadImage = async () => {
        if (!image) {
            console.log("Please select an image to upload")
            return null;
        }

        setLoadingStep('Uploading trainer profile image...');
    
        const formData = new FormData();
        formData.append('image', {
            uri: image.uri,
            name: 'trainer-profile.jpg',
            type: 'image/jpeg',
        } as any);
    
        try {
            const token = await AsyncStorage.getItem('token');
            const backendUrl = Constants.expoConfig?.extra?.backendUrl;
            const response = await fetch(`${backendUrl}/images/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `${token}`,
                    // 'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });
    
            if (!response.ok) {
                throw new Error('Failed to upload image');
            }
    
            const data = await response.json();
            // console.log("data", data)
            return data.image_url;
        } catch (error) {
            console.error('Error uploading image:', error);
            Toast.show({ type: 'error', text1: 'Upload Error', text2: 'Failed to upload image' });
            return null;
        }
    };
   
    const handleSignup = async () => {
        // Validate all required fields with enhanced validation
        const newErrors: {[key: string]: string} = {};
        
        if (!name.trim()) newErrors.name = 'Name is required';
        if (!email.trim()) newErrors.email = 'Email is required';
        if (!password) newErrors.password = 'Password is required';
        if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
        
        // Enhanced validations
        if (name && !validateName(name)) {
            if (name.trim().length < 2) newErrors.name = 'Name must be at least 2 characters';
            else if (name.trim().length > 50) newErrors.name = 'Name cannot exceed 50 characters';
            else newErrors.name = 'Name can only contain letters and spaces (no emojis or special characters)';
        }
        if (email && !validateEmail(email)) newErrors.email = 'Please enter a valid email address';
        if (password && !validatePasswordStrength(password)) {
            if (password.length < 3) newErrors.password = 'Password must be at least 3 characters';
            else if (password.includes(' ')) newErrors.password = 'Password cannot contain spaces';
        }
        if (password && confirmPassword && password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (phoneNumber && (!/^\d+$/.test(phoneNumber) || !validatePhone(phoneNumber))) {
            if (!/^\d+$/.test(phoneNumber)) newErrors.phoneNumber = 'Phone number can only contain digits';
            else newErrors.phoneNumber = 'Please enter a valid 10-digit mobile number';
        }
        if (dateOfBirth && !validateDateOfBirth(dateOfBirth)) newErrors.dateOfBirth = 'Please enter a valid date (DD/MM/YYYY)';
        if (address && !validateAddress(address)) {
            if (address.length > 200) newErrors.address = 'Address cannot exceed 200 characters';
            else newErrors.address = 'Address contains invalid characters (no emojis or special symbols)';
        }
        if (speciality && !validateSpeciality(speciality)) {
            if (speciality.length < 3) newErrors.speciality = 'Speciality must be at least 3 characters';
            else if (speciality.length > 100) newErrors.speciality = 'Speciality cannot exceed 100 characters';
            else newErrors.speciality = 'Speciality can only contain letters, spaces, and commas';
        }
        if (experience && !validateExperience(experience)) newErrors.experience = 'Experience must be between 0-50 years';
        if (hourlyRate && !validateHourlyRate(hourlyRate)) newErrors.hourlyRate = 'Hourly rate must be between ₹100-₹10,000';
        if (trainerType && (trainerType.length > 100 || !/^[a-zA-Z\s,]+$/.test(trainerType))) {
            if (trainerType.length > 100) newErrors.trainerType = 'Trainer type cannot exceed 100 characters';
            else newErrors.trainerType = 'Trainer type can only contain letters, spaces, and commas';
        }
        if (bio && bio.length > 500) newErrors.bio = 'Bio cannot exceed 500 characters';
        if (certifications && certifications.length > 300) newErrors.certifications = 'Certifications cannot exceed 300 characters';
        if (availability && availability.length > 200) newErrors.availability = 'Availability cannot exceed 200 characters';
        if (socialHandle && socialHandle.length > 100) newErrors.socialHandle = 'Social handle cannot exceed 100 characters';
        
        setErrors(newErrors);
        
        if (Object.keys(newErrors).length > 0) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fix the errors below' });
            return;
        }

        setIsLoading(true);
        setLoadingStep('Creating your trainer account...');

        try {
            const imageUrl = await uploadImage();

            setLoadingStep('Finalizing trainer registration...');

            const backendUrl = Constants.expoConfig?.extra?.backendUrl;
            const response = await fetch(`${backendUrl}/registerTrainer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                    phone_number: phoneNumber,
                    address: address.trim(),
                    date_of_birth: dateOfBirth,
                    gender: gender.trim(),
                    speciality: speciality.trim(),
                    experience: experience ? parseInt(experience, 10) : null,
                    hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
                    bio: bio.trim(),
                    certifications: certifications ? certifications.split(',').map((cert) => cert.trim()).filter(cert => cert.length > 0) : [],
                    social_handle: socialHandle.trim(),
                    availability: availability.trim(),
                    trainer_type: trainerType.trim(),
                    image_url: imageUrl,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Trainer registration failed');
            }

            setLoadingStep('Trainer account created successfully!');
            
            // Small delay to show success message
            setTimeout(() => {
                setIsLoading(false);
                Toast.show({ type: 'success', text1: 'Trainer Registration Successful', text2: 'Welcome to our trainer community!' });
                navigation.navigate('Login');
            }, 1000);

        } catch (error: unknown) {
            setIsLoading(false);
            if (error instanceof Error) {
                 Toast.show({ type: 'error', text1: 'Trainer Registration Failed', text2: error.message });
            } else {
                 Toast.show({ type: 'error', text1: 'Trainer Registration Failed', text2: 'An unknown error occurred.' });
            }
        }
    };

    const renderInputField = (
        label: string, 
        value: string, 
        onChangeText: (text: string) => void, 
        fieldName: string,
        options?: {
            secureTextEntry?: boolean;
            keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
            multiline?: boolean;
            required?: boolean;
            autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
            placeholder?: string;
            maxLength?: number;
        }
    ) => {
        // Function to filter out emojis and invalid characters based on field type
        const filterInput = (text: string, field: string) => {
            // Remove emojis from all inputs
            const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}\u{2764}\u{1F004}\u{1F0CF}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23E9}-\u{23EF}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2693}\u{26A0}\u{26A1}\u{26AA}\u{26AB}\u{26BD}\u{26BE}\u{26C4}\u{26C5}\u{26C8}\u{26CE}\u{26CF}\u{26D1}\u{26D3}\u{26D4}\u{26E9}\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{2702}\u{2708}\u{2709}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2733}\u{2734}\u{2744}\u{2747}\u{2757}\u{2763}\u{2764}\u{27A1}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu;
            let filteredText = text.replace(emojiRegex, '');
            
            switch (field) {
                case 'name':
                    // Only letters and spaces
                    filteredText = filteredText.replace(/[^a-zA-Z\s]/g, '');
                    break;
                case 'phoneNumber':
                    // Only digits
                    filteredText = filteredText.replace(/[^0-9]/g, '');
                    break;
                case 'password':
                case 'confirmPassword':
                    // Remove spaces only
                    filteredText = filteredText.replace(/\s/g, '');
                    break;
                case 'address':
                    // Letters, numbers, spaces, and basic punctuation
                    filteredText = filteredText.replace(/[^a-zA-Z0-9\s,.'-]/g, '');
                    break;
                case 'speciality':
                case 'trainerType':
                    // Letters, spaces, and commas
                    filteredText = filteredText.replace(/[^a-zA-Z\s,]/g, '');
                    break;
                case 'experience':
                case 'hourlyRate':
                    // Only digits
                    filteredText = filteredText.replace(/[^0-9]/g, '');
                    break;
                case 'email':
                    // Allow email characters (no spaces)
                    filteredText = filteredText.replace(/[^a-zA-Z0-9@._-]/g, '');
                    break;
                case 'dateOfBirth':
                    // Only digits and forward slash
                    filteredText = filteredText.replace(/[^0-9/]/g, '');
                    break;
                case 'gender':
                    // Only letters and spaces
                    filteredText = filteredText.replace(/[^a-zA-Z\s]/g, '');
                    break;
                default:
                    // For other fields, just remove emojis
                    break;
            }
            
            return filteredText;
        };

        return (
            <View style={styles.inputContainer}>
                <Text style={styles.label}>
                    {label}
                    {options?.required && <Text style={styles.required}> *</Text>}
                </Text>
                <TextInput
                    style={[
                        styles.input, 
                        options?.multiline && styles.multilineInput,
                        errors[fieldName] && styles.inputError
                    ]}
                    value={value}
                    onChangeText={(text) => {
                        if (fieldName === 'dateOfBirth') {
                            handleDateChange(text);
                        } else {
                            const filteredText = filterInput(text, fieldName);
                            onChangeText(filteredText);
                            validateField(fieldName, filteredText);
                        }
                    }}
                    onBlur={() => validateField(fieldName, value)}
                    secureTextEntry={options?.secureTextEntry}
                    keyboardType={options?.keyboardType || 'default'}
                    multiline={options?.multiline}
                    autoCapitalize={options?.autoCapitalize || 'sentences'}
                    placeholderTextColor="#aaa"
                    placeholder={options?.placeholder}
                    maxLength={options?.maxLength}
                    editable={!isLoading}
                />
                {errors[fieldName] && (
                    <Text style={styles.errorText}>{errors[fieldName]}</Text>
                )}
            </View>
        );
    };

    const LoadingModal = () => (
        <Modal visible={isLoading} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingContent}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.loadingText}>{loadingStep}</Text>
                        <View style={styles.loadingBar}>
                            <View style={styles.loadingProgress} />
                        </View>
                        <Text style={styles.loadingSubtext}>Please wait while we set up your trainer account</Text>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.trainerBadge}>
                        <Ionicons name="fitness" size={24} color="#fff" />
                        <Text style={styles.trainerBadgeText}>TRAINER REGISTRATION</Text>
                    </View>
                    <Text style={styles.title}>Become a Fitness Trainer</Text>
                    <Text style={styles.subtitle}>Join our professional trainer network and start coaching clients</Text>
                </View>

                {/* Profile Image Section */}
                <View style={styles.imageSection}>
                    <View style={styles.imageContainer}>
                        {image ? (
                            <Image source={{ uri: image.uri }} style={styles.profileImage} />
                        ) : (
                            <View style={styles.placeholder}>
                                <Ionicons name="person-circle-outline" size={80} color="#ccc" />
                            </View>
                        )}
                        <View style={styles.imageOverlay}>
                            <TouchableOpacity style={styles.imageButton} onPress={handlePickImage} disabled={isLoading}>
                                <Ionicons name="camera" size={16} color="#fff" />
                            </TouchableOpacity>
                            {image && (
                                <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage} disabled={isLoading}>
                                    <Ionicons name="trash" size={16} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    <Text style={styles.imageHint}>Upload your professional trainer photo (Max 2MB)</Text>
                </View>

                {/* Form Section */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    
                    {renderInputField('Full Name', name, setName, 'name', { 
                        required: true,
                        placeholder: 'Enter your full name (max 50 chars)',
                        autoCapitalize: 'words',
                        maxLength: 50
                    })}
                    
                    {renderInputField('Email Address', email, setEmail, 'email', { 
                        required: true, 
                        keyboardType: 'email-address',
                        autoCapitalize: 'none',
                        placeholder: 'your.email@example.com'
                    })}
                    
                    {renderInputField('Password', password, setPassword, 'password', { 
                        required: true, 
                        secureTextEntry: true,
                        placeholder: 'Enter your password'
                    })}
                    
                    {renderInputField('Confirm Password', confirmPassword, setConfirmPassword, 'confirmPassword', { 
                        required: true, 
                        secureTextEntry: true,
                        placeholder: 'Re-enter your password'
                    })}

                    <View style={styles.row}>
                        <View style={styles.halfWidth}>
                            {renderInputField('Phone Number', phoneNumber, setPhoneNumber, 'phoneNumber', { 
                                keyboardType: 'phone-pad',
                                placeholder: '9876543210',
                                maxLength: 10
                            })}
                        </View>
                        <View style={styles.halfWidth}>
                            {renderInputField('Date of Birth', dateOfBirth, setDateOfBirth, 'dateOfBirth', {
                                keyboardType: 'numeric',
                                placeholder: 'DD/MM/YYYY',
                                maxLength: 10
                            })}
                        </View>
                    </View>

                    {renderInputField('Gender', gender, setGender, 'gender', {
                        placeholder: 'Male, Female, or Other',
                        autoCapitalize: 'words'
                    })}
                    
                    {renderInputField('Address', address, setAddress, 'address', {
                        placeholder: 'Your complete address (max 200 chars)',
                        autoCapitalize: 'words',
                        maxLength: 200
                    })}

                    <View style={styles.trainerSectionHeader}>
                        <Ionicons name="barbell" size={24} color="#6200ee" />
                        <Text style={styles.sectionTitle}>Trainer Expertise & Services</Text>
                    </View>
                    
                    {renderInputField('Training Speciality', speciality, setSpeciality, 'speciality', {
                        placeholder: 'e.g., Strength Training, Yoga, Cardio (max 100 chars)',
                        autoCapitalize: 'words',
                        maxLength: 100
                    })}
                    
                    {renderInputField('Trainer Type', trainerType, setTrainerType, 'trainerType', {
                        placeholder: 'e.g., Personal Trainer, Group Instructor (max 100 chars)',
                        autoCapitalize: 'words',
                        maxLength: 100
                    })}
                    
                    <View style={styles.row}>
                        <View style={styles.halfWidth}>
                            {renderInputField('Training Experience (Years)', experience, setExperience, 'experience', { 
                                keyboardType: 'numeric',
                                placeholder: '0-50',
                                maxLength: 2
                            })}
                        </View>
                        <View style={styles.halfWidth}>
                            {renderInputField('Training Rate (₹/hour)', hourlyRate, setHourlyRate, 'hourlyRate', { 
                                keyboardType: 'numeric',
                                placeholder: '100-10000',
                                maxLength: 5
                            })}
                        </View>
                    </View>

                    {renderInputField('Trainer Bio', bio, setBio, 'bio', { 
                        multiline: true,
                        placeholder: 'Describe your training philosophy, approach, and what makes you a great trainer (max 500 characters)',
                        maxLength: 500
                    })}
                    
                    {renderInputField('Fitness Certifications', certifications, setCertifications, 'certifications', {
                        placeholder: 'List your fitness certifications (NASM, ACSM, etc.) - max 300 chars',
                        autoCapitalize: 'words',
                        maxLength: 300
                    })}
                    
                    {renderInputField('Training Availability', availability, setAvailability, 'availability', {
                        placeholder: 'e.g., Mon-Fri 6 AM to 8 PM (max 200 chars)',
                        autoCapitalize: 'words',
                        maxLength: 200
                    })}
                    
                    {renderInputField('Social Handle', socialHandle, setSocialHandle, 'socialHandle', { 
                        autoCapitalize: 'none',
                        placeholder: '@your_fitness_instagram (max 100 chars)',
                        maxLength: 100
                    })}

                    <TouchableOpacity 
                        style={[styles.signupButton, isLoading && styles.signupButtonDisabled]} 
                        onPress={handleSignup}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="fitness" size={20} color="#fff" style={styles.buttonIcon} />
                                <Text style={styles.signupButtonText}>Join as Trainer</Text>
                                <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => navigation.navigate('Login')} 
                        style={styles.loginLink}
                        disabled={isLoading}
                    >
                        <Text style={styles.loginLinkText}>Already a registered trainer? </Text>
                        <Text style={styles.loginLinkTextBold}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <LoadingModal />
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        backgroundColor: '#6200ee',
        paddingTop: 50,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    trainerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        marginBottom: 15,
    },
    trainerBadgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 8,
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#e1bee7',
        opacity: 0.9,
        textAlign: 'center',
        lineHeight: 22,
    },
    imageSection: {
        alignItems: 'center',
        paddingVertical: 25,
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: -15,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    imageContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#6200ee',
    },
    placeholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        flexDirection: 'row',
    },
    imageButton: {
        backgroundColor: '#6200ee',
        borderRadius: 20,
        padding: 8,
        borderWidth: 2,
        borderColor: '#fff',
        marginRight: 5,
    },
    removeImageButton: {
        backgroundColor: '#e53935',
        borderRadius: 20,
        padding: 8,
        borderWidth: 2,
        borderColor: '#fff',
    },
    imageHint: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    formSection: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 25,
        marginBottom: 15,
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: '#6200ee',
    },
    trainerSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 25,
        marginBottom: -15,
    },
    inputContainer: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    required: {
        color: '#e53935',
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    multilineInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    halfWidth: {
        flex: 1,
    },
    signupButton: {
        backgroundColor: '#6200ee',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        shadowColor: '#6200ee',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    signupButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginHorizontal: 8,
    },
    buttonIcon: {
        marginHorizontal: 4,
    },
    loginLink: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
        paddingVertical: 10,
    },
    loginLinkText: {
        fontSize: 16,
        color: '#666',
    },
    loginLinkTextBold: {
        fontSize: 16,
        color: '#6200ee',
        fontWeight: 'bold',
    },
    inputError: {
        borderColor: '#e53935',
        borderWidth: 2,
    },
    errorText: {
        fontSize: 12,
        color: '#e53935',
        marginTop: 4,
        marginLeft: 4,
    },
    // Loading Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        minWidth: 280,
    },
    loadingContent: {
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginTop: 15,
        marginBottom: 10,
        textAlign: 'center',
    },
    loadingBar: {
        width: 200,
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 2,
        marginBottom: 15,
        overflow: 'hidden',
    },
    loadingProgress: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 2,
        width: '70%',
        
    },
    loadingSubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    signupButtonDisabled: {
        backgroundColor: '#ccc',
    },
});