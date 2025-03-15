import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Trainee } from '../types/trainee';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

type Props = {
    trainee: Trainee;
    navigation: any;
};

export default function AboutDetailsScreen({ trainee, navigation }: Props) {
    const [currentTrainee, setCurrentTrainee] = useState<Trainee>(trainee);

    useFocusEffect(
        React.useCallback(() => {
            // Fetch updated trainee data here
            if (trainee.id) {
                // Assuming you fetch trainee details from an API or local storage
                fetchUpdatedTrainee(trainee.id);
            }
        }, [trainee.id])
    );

    const fetchUpdatedTrainee = async (id: string) => {
        const backendUrl = Constants.expoConfig?.extra?.backendUrl;
        try {
            const token = await AsyncStorage.getItem('token');
            // Replace with your API call logic or data retrieval logic
            const response = await fetch(`${backendUrl}/trainees/${trainee.id}`, {
                headers: { Authorization: `${token}` },
            });
            const updatedTrainee = await response.json();
            setCurrentTrainee(updatedTrainee);
        } catch (error) {
            console.error('Error fetching trainee data:', error);
        }
    };

    const handleEditPress = () => {
        navigation.navigate('TraineeForm', {
            trainee: currentTrainee,
            traineeId: currentTrainee.id,
        });
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <View style={styles.detailsContainer}>
                    <Text style={styles.title}>Trainee Details</Text>
                    <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
                        <Icon name="pencil-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <Image
                    source={{
                        uri: currentTrainee.image_url
                            ? currentTrainee.image_url
                            : 'https://res.cloudinary.com/vaibhav07351/image/upload/v1735825573/tisqhtqxaydhprbwtsld.png',
                    }}
                    style={styles.image}
                    resizeMode="cover"
                />

            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{currentTrainee.name}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Phone Number:</Text>
                <Text style={styles.value}>{currentTrainee.phone_number}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Goals:</Text>
                <Text style={styles.value}>{currentTrainee.goals || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Notes:</Text>
                <Text style={styles.value}>{currentTrainee.notes || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Active Supplements:</Text>
                <Text style={styles.value}>{currentTrainee.active_supplements || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Medical History:</Text>
                <Text style={styles.value}>{currentTrainee.medical_history || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Gender:</Text>
                <Text style={styles.value}>{currentTrainee.gender}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Date of Birth:</Text>
                <Text style={styles.value}>{currentTrainee.dob}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Height:</Text>
                <Text style={styles.value}>
                    {currentTrainee.height} cm ({Math.floor(currentTrainee.height / 2.54 / 12)}' 
                    {Math.round((currentTrainee.height / 2.54) % 12)}'')
                </Text>
            </View>


            <View style={styles.section}>
                <Text style={styles.label}>Profession:</Text>
                <Text style={styles.value}>{currentTrainee.profession || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Start Date:</Text>
                <Text style={styles.value}>{currentTrainee.start_date || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Membership Type:</Text>
                <Text style={styles.value}>{currentTrainee.membership_type || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Emergency Contact:</Text>
                <Text style={styles.value}>{currentTrainee.emergency_contact || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Social Handles:</Text>
                <Text style={styles.value}>{currentTrainee.social_handle || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Active Status:</Text>
                <Text style={styles.value}>{currentTrainee.active_status ? 'Active' : 'Inactive'}</Text>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#f7f9fc',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailsContainer: {
        flex: 1,
        paddingRight: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#ccc',
    },
    section: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#555',
    },
    value: {
        fontSize: 16,
        color: '#333',
        textAlign: 'right',
        flexShrink: 1,
    },
    editButton: {
        backgroundColor: '#6200ee',
        padding: 8,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 2,
        width: 50,
    },
});