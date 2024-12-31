import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

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

    const navigation = useNavigation<NavigationProp>();

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'You need to grant permission to access the image library.');
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
                Alert.alert('File Size Error', 'Image size must be under 2 MB.');
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
            // Alert.alert('Validation Error', 'Please select an image to upload.');
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
            Alert.alert('Error', 'Failed to upload image.');
            return null;
        }
    };
   
    const handleSignup = async () => {

        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Validation Error', 'Please fill all mandatory fields marked with *.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match. Please check and try again.');
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

            Alert.alert('Signup Successful', data.message || 'Your account has been created.');
            navigation.navigate('Login');
        } catch (error: unknown) {
            if (error instanceof Error) {
                Alert.alert('Signup Failed', error.message);
            } else {
                Alert.alert('Signup Failed', 'An unknown error occurred.');
            }
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Signup</Text>

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
                                        {/* <Text style={styles.removeButtonText}></Text> */}
                                    </TouchableOpacity>
                                )}
                            </View>
            </View>

            <TextInput
                style={styles.input}
                placeholder="Name *"
                value={name}
                onChangeText={setName}
            />
            <TextInput
                style={styles.input}
                placeholder="Email *"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Password *"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            
            <TextInput
                style={styles.input}
                placeholder="Confirm Password *"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
            />

            <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="numeric"
            />
            <TextInput
                style={styles.input}
                placeholder="Address"
                value={address}
                onChangeText={setAddress}
            />
            <TextInput
                style={styles.input}
                placeholder="Date of Birth (DD-MM-YYYY)"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
            />
            <TextInput
                style={styles.input}
                placeholder="Gender (Male/Female/Other)"
                value={gender}
                onChangeText={setGender}
            />
            <TextInput
                style={styles.input}
                placeholder="Speciality (e.g., Strength Training)"
                value={speciality}
                onChangeText={setSpeciality}
            />
            <TextInput
                style={styles.input}
                placeholder="Experience (in years)"
                value={experience}
                onChangeText={setExperience}
                keyboardType="numeric"
            />
            <TextInput
                style={styles.input}
                placeholder="Hourly Rate (e.g., ₹1000/-)"
                value={hourlyRate}
                onChangeText={setHourlyRate}
                keyboardType="numeric"
            />
            <TextInput
                style={styles.input}
                placeholder="Bio (Short description)"
                value={bio}
                onChangeText={setBio}
                multiline
            />
            <TextInput
                style={styles.input}
                placeholder="Certifications (comma-separated)"
                value={certifications}
                onChangeText={setCertifications}
            />
            <TextInput
                style={styles.input}
                placeholder="Social Handle (e.g., Instagram or LinkedIn)"
                value={socialHandle}
                onChangeText={setSocialHandle}
            />
            <TextInput
                style={styles.input}
                placeholder="Availability (e.g., Mon-Fri 9 AM to 6 PM)"
                value={availability}
                onChangeText={setAvailability}
            />
            <TextInput
                style={styles.input}
                placeholder="Trainer Type (e.g., personal, group, online, rehabilitation)"
                value={trainerType}
                onChangeText={setTrainerType}
            />

            <TouchableOpacity style={styles.button} onPress={handleSignup}>
                <Text style={styles.buttonText}>Signup</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Already have an account? Login</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 16,
        justifyContent: 'center',
        backgroundColor: '#f9f9f9',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    input: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    button: {
        backgroundColor: '#6200ee',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    buttonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 16,
    },
    linkText: {
        color: '#6200ee',
        textAlign: 'center',
    },
    
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginTop: 10,
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
});
