import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Trainee } from '../types/trainee';

type Props = {
    trainee: Trainee;
};

export default function AboutTraineeScreen({ trainee }: Props) {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <View style={styles.detailsContainer}>
                    <Text style={styles.title}>Trainee Details</Text>
                </View>
                {trainee.image_url && (
                    <Image
                        source={{ uri: trainee.image_url }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{trainee.name}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Phone Number:</Text>
                <Text style={styles.value}>{trainee.phone_number}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Active Status:</Text>
                <Text style={styles.value}>{trainee.active_status ? 'Active' : 'Inactive'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Goals:</Text>
                <Text style={styles.value}>{trainee.goals || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Notes:</Text>
                <Text style={styles.value}>{trainee.notes || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Active Supplements:</Text>
                <Text style={styles.value}>{trainee.active_supplements || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Medical History:</Text>
                <Text style={styles.value}>{trainee.medical_history || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Date of Birth:</Text>
                <Text style={styles.value}>{trainee.dob}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Gender:</Text>
                <Text style={styles.value}>{trainee.gender}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Height:</Text>
                <Text style={styles.value}>{trainee.height} cm</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Weight:</Text>
                <Text style={styles.value}>{trainee.weight} kg</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>BMI:</Text>
                <Text style={styles.value}>{trainee.bmi?.toFixed(2) || 'Not calculated'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Profession:</Text>
                <Text style={styles.value}>{trainee.profession || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Start Date:</Text>
                <Text style={styles.value}>{trainee.start_date || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Membership Type:</Text>
                <Text style={styles.value}>{trainee.membership_type || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Emergency Contact:</Text>
                <Text style={styles.value}>{trainee.emergency_contact || 'NA'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Social Handles:</Text>
                <Text style={styles.value}>{trainee.social_handle || 'NA'}</Text>
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
});
