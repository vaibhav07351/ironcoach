import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Trainee } from '../types/trainee';

type Props = {
    trainee: Trainee;
};

export default function AboutTraineeScreen({ trainee }: Props) {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Trainee Details</Text>

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
                <Text style={styles.value}>{trainee.goals || 'No specific goals provided'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Notes:</Text>
                <Text style={styles.value}>{trainee.notes || 'No additional notes'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Medical History:</Text>
                <Text style={styles.value}>{trainee.medical_history || 'None'}</Text>
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
                <Text style={styles.value}>{trainee.profession || 'Not specified'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Start Date:</Text>
                <Text style={styles.value}>{trainee.start_date || 'Not provided'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Membership Type:</Text>
                <Text style={styles.value}>{trainee.membership_type || 'Not specified'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Emergency Contact:</Text>
                <Text style={styles.value}>{trainee.emergency_contact || 'Not provided'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Social Handles:</Text>
                <Text style={styles.value}>{trainee.social_handle || 'Not provided'}</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#f7f9fc',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
        color: '#333',
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
