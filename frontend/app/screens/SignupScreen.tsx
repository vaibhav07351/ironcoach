import React, { useState,useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
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

    prevDateRef.current = formatted;
    setDateOfBirth(formatted);

    if (formatted.length === 10 && validateDateOfBirth(formatted)) {
        setErrors(prev => ({ ...prev, dateOfBirth: '' }));
    }
};


    const validateField = (fieldName: string, value: string) => {
        let error = '';
        
        switch (fieldName) {
            case 'name':
                if (!value.trim()) error = 'Name is required';
                else if (value.trim().length < 2) error = 'Name must be at least 2 characters';
                else if (!/^[a-zA-Z\s]+$/.test(value)) error = 'Name can only contain letters and spaces';
                break;
            case 'email':
                if (!value.trim()) error = 'Email is required';
                else if (!validateEmail(value)) error = 'Please enter a valid email address';
                break;
            case 'password':
                if (!value) error = 'Password is required';
                else if (!validatePassword(value)) error = 'Password must be at least 3 characters';
                break;
            case 'confirmPassword':
                if (!value) error = 'Please confirm your password';
                else if (value !== password) error = 'Passwords do not match';
                break;
            case 'phoneNumber':
                if (value && !validatePhone(value)) error = 'Please enter a valid 10-digit Indian mobile number';
                break;
            case 'dateOfBirth':
                if (value && !validateDateOfBirth(value)) error = 'Please enter a valid date (DD/MM/YYYY)';
                break;
            case 'gender':
                if (value && !['Male', 'Female', 'Other', 'male', 'female', 'other'].includes(value)) error = 'Please select Male, Female, or Other';
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
            case 'speciality':
                if (value && value.length < 3) error = 'Speciality must be at least 3 characters';
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
        // Validate all required fields
        const newErrors: {[key: string]: string} = {};
        
        if (!name.trim()) newErrors.name = 'Name is required';
        if (!email.trim()) newErrors.email = 'Email is required';
        if (!password) newErrors.password = 'Password is required';
        if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
        
        // Additional validations
        if (email && !validateEmail(email)) newErrors.email = 'Please enter a valid email address';
        if (password && !validatePassword(password)) newErrors.password = 'Password must be at least 3 characters';
        if (password && confirmPassword && password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (phoneNumber && !validatePhone(phoneNumber)) newErrors.phoneNumber = 'Please enter a valid 10-digit mobile number';
        if (dateOfBirth && !validateDateOfBirth(dateOfBirth)) newErrors.dateOfBirth = 'Please enter a valid date (DD/MM/YYYY)';
        if (experience && !validateExperience(experience)) newErrors.experience = 'Experience must be between 0-50 years';
        if (hourlyRate && !validateHourlyRate(hourlyRate)) newErrors.hourlyRate = 'Hourly rate must be between ₹100-₹10,000';
        
        setErrors(newErrors);
        
        if (Object.keys(newErrors).length > 0) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fix the errors below' });
            return;
        }

        try {
            const imageUrl = await uploadImage();

            const backendUrl = Constants.expoConfig?.extra?.backendUrl;
            const response = await fetch(`${backendUrl}/registerTrainer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    phone_number: phoneNumber,
                    address,
                    date_of_birth: dateOfBirth,
                    gender,
                    speciality,
                    experience: parseInt(experience, 10),
                    hourly_rate: parseFloat(hourlyRate),
                    bio,
                    certifications: certifications.split(',').map((cert) => cert.trim()), // Convert comma-separated string to array
                    social_handle: socialHandle,
                    availability,
                    trainer_type: trainerType,
                    image_url: imageUrl,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
            }

            Toast.show({ type: 'success', text1: 'Signup Successful', text2: 'Account created successfully' });
            navigation.navigate('Login');
        } catch (error: unknown) {
            if (error instanceof Error) {
                 Toast.show({ type: 'error', text1: 'Signup Failed', text2: error.message });
            } else {
                 Toast.show({ type: 'error', text1: 'Signup Failed', text2: 'An unknown error occurred.' });
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
    ) => (
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
                        onChangeText(text);
                        validateField(fieldName, text);
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
            />
            {errors[fieldName] && (
                <Text style={styles.errorText}>{errors[fieldName]}</Text>
            )}
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Create Your Profile</Text>
                <Text style={styles.subtitle}>Join our trainer community</Text>
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
                        <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
                            <Ionicons name="camera" size={16} color="#fff" />
                        </TouchableOpacity>
                        {image && (
                            <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage}>
                                <Ionicons name="trash" size={16} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <Text style={styles.imageHint}>Upload profile photo (Max 2MB)</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                
                {renderInputField('Full Name', name, setName, 'name', { 
                    required: true,
                    placeholder: 'Enter your full name',
                    autoCapitalize: 'words'
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
                    placeholder: 'Your complete address',
                    autoCapitalize: 'words'
                })}

                <Text style={styles.sectionTitle}>Professional Details</Text>
                
                {renderInputField('Speciality', speciality, setSpeciality, 'speciality', {
                    placeholder: 'e.g., Strength Training, Yoga, Cardio',
                    autoCapitalize: 'words'
                })}
                
                {renderInputField('Trainer Type', trainerType, setTrainerType, 'trainerType', {
                    placeholder: 'e.g., Personal, Group, Online, Rehabilitation',
                    autoCapitalize: 'words'
                })}
                
                <View style={styles.row}>
                    <View style={styles.halfWidth}>
                        {renderInputField('Experience (Years)', experience, setExperience, 'experience', { 
                            keyboardType: 'numeric',
                            placeholder: '0-50',
                            maxLength: 2
                        })}
                    </View>
                    <View style={styles.halfWidth}>
                        {renderInputField('Hourly Rate (₹)', hourlyRate, setHourlyRate, 'hourlyRate', { 
                            keyboardType: 'numeric',
                            placeholder: '100-10000',
                            maxLength: 5
                        })}
                    </View>
                </View>

                {renderInputField('Bio', bio, setBio, 'bio', { 
                    multiline: true,
                    placeholder: 'Tell us about yourself and your training philosophy (max 500 characters)',
                    maxLength: 500
                })}
                
                {renderInputField('Certifications', certifications, setCertifications, 'certifications', {
                    placeholder: 'List your certifications separated by commas',
                    autoCapitalize: 'words'
                })}
                
                {renderInputField('Availability', availability, setAvailability, 'availability', {
                    placeholder: 'e.g., Mon-Fri 9 AM to 6 PM',
                    autoCapitalize: 'words'
                })}
                
                {renderInputField('Social Handle', socialHandle, setSocialHandle, 'socialHandle', { 
                    autoCapitalize: 'none',
                    placeholder: '@your_instagram or LinkedIn profile'
                })}

                <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
                    <Text style={styles.signupButtonText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
                    <Text style={styles.loginLinkText}>Already have an account? </Text>
                    <Text style={styles.loginLinkTextBold}>Sign In</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
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
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#e1bee7',
        opacity: 0.9,
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
        marginRight: 8,
    },
    buttonIcon: {
        marginLeft: 5,
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
});