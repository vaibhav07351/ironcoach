import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Trainee } from '../types/trainee';
import { MaterialIcons } from '@expo/vector-icons'; // Assuming you want to use an edit icon

type Props = {
    trainee: Trainee;
    navigation: any;
};

export default function FitnessTestScreen({ trainee, navigation }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [results, setResults] = useState(
        [
            { srNo: 1, name: 'Aerobics Endurance', test: 'Rockport Test', result1: '', result2: '' },
            { srNo: 2, name: 'Muscular Strength', test: '1 Rep. Max (Upper Body)', result1: '', result2: '' },
            { srNo: 3, name: 'Muscular Strength', test: '1 Rep. Max (Lower Body)', result1: '', result2: '' },
            { srNo: 4, name: 'Muscular Endurance', test: 'Ab Crunches / min', result1: '', result2: '' },
            { srNo: 5, name: 'Muscular Endurance', test: 'Free Squats / min', result1: '', result2: '' },
            { srNo: 6, name: 'Flexibility', test: 'Sit & Reach', result1: '', result2: '' },
            { srNo: 7, name: 'Flexibility', test: 'Free Squats / min', result1: '', result2: '' },
            { srNo: 8, name: 'Flexibility', test: 'Push-ups', result1: '', result2: '' },
            { srNo: 9, name: 'Fit Trainer', test: '', result1: '', result2: '' },
        ]
    );

    const handleEditClick = () => {
        setIsEditing(!isEditing);
    };

    const handleSaveResults = () => {
        setIsEditing(false); // Disable editing after saving
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
        
            {/* Edit Button */}
            {!isEditing && (
                <TouchableOpacity style={styles.editButton} onPress={handleEditClick}>
                    <MaterialIcons name="edit" size={24} color="white" />
                </TouchableOpacity>
            )}

            {/* Save Button - Only visible when editing */}
            {isEditing && (
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveResults}>
                    <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
            )}

            {/* Table Header */}
            <View style={styles.tableHeader}>
                <Text style={[styles.cell, styles.srNoHeader, styles.header]}>Sr. No.</Text>
                <Text style={[styles.cell, styles.header]}>Component</Text>
                <Text style={[styles.cell, styles.header]}>Test</Text>
                <Text style={[styles.cell, styles.header]}>Result 1</Text>
                <Text style={[styles.cell, styles.header]}>Result 2</Text>
            </View>

            {/* Results Data */}
            {results.map((item, index) => (
                <View key={index} style={styles.row}>
                    <Text style={[styles.cell, styles.srNoCell]}>{item.srNo}</Text>
                    <Text style={styles.cell}>{item.name}</Text>
                    <Text style={styles.cell}>{item.test}</Text>
                    {isEditing ? (
                        <>
                            <TextInput
                                style={[styles.cell, styles.input]}
                                value={item.result1}
                                onChangeText={(text) => {
                                    const updatedResults = [...results];
                                    updatedResults[index].result1 = text;
                                    setResults(updatedResults);
                                }}
                                placeholder="Enter result"
                            />
                            <TextInput
                                style={[styles.cell, styles.input]}
                                value={item.result2}
                                onChangeText={(text) => {
                                    const updatedResults = [...results];
                                    updatedResults[index].result2 = text;
                                    setResults(updatedResults);
                                }}
                                placeholder="Enter result"
                            />
                        </>
                    ) : (
                        <>
                            <Text style={styles.cell}>{item.result1 || 'NA'}</Text>
                            <Text style={styles.cell}>{item.result2 || 'NA'}</Text>
                        </>
                    )}
                </View>
            ))}

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#6200ee',
        padding: 8,
    },
    row: {
        flexDirection: 'row',
        padding: 7,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    cell: {
        flex: 1,
        paddingHorizontal: 3,
        textAlign: 'center',
    },
    srNoHeader: {
        flex: 0.3, // Makes the Sr. No. column thinner
    },
    srNoCell: {
        flex: 0.3, // Makes the Sr. No. column thinner
    },
    header: {
        fontWeight: 'bold',
        color: '#fff',
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: '#6200ee',
        paddingVertical: 4, // Adjust vertical padding for better spacing
        minWidth: 0,  // Ensures the input can shrink properly if necessary
        flexGrow: 1,  // Make sure the input grows to occupy available space
    },
    editButton: {
        marginBottom: 5, // Adds spacing between the table and the edit button
        backgroundColor: '#6200ee',
        padding: 10,
        borderRadius: 50,
        alignSelf: 'flex-start', // Align to the left
    },
    saveButton: {
        marginBottom: 10, // Adjusted to add spacing
        backgroundColor: '#4CAF50', // Green color
        paddingVertical: 10, // Reduced padding for a thinner button
        paddingHorizontal: 20, // Reduced horizontal padding for a slimmer button
        borderRadius: 8, // Slightly rounded corners for a cleaner look
        elevation: 3, // Subtle shadow for depth on Android
        shadowColor: '#000', // Shadow on iOS
        shadowOffset: { width: 0, height: 2 }, // Less shadow offset for a more refined look
        shadowOpacity: 0.1, // Subtle shadow transparency
        shadowRadius: 6, // Less spread on iOS
        alignItems: 'center', // Centers the content horizontally
        justifyContent: 'center', // Centers the content vertically
        width: 100, // Set the width to make the button thinner
    },
    
    saveText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14, // Slightly smaller font size to match the thinner button
        letterSpacing: 1.2, // Adds some spacing between letters for a more refined look
        textAlign: 'center', // Ensure the text is centered
        textTransform: 'uppercase', // Uppercase letters for a more professional feel
    },
    
    // For the hover effect or touch state (optional, for interactive UI)
    saveButtonActive: {
        backgroundColor: '#388E3C', // Darker green when pressed or clicked
    },
    
    
});
