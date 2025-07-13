import React, { useState, useEffect } from 'react';
import {
    View, Text, Switch, StyleSheet, TextInput, ScrollView,
    SafeAreaView, TouchableOpacity
} from 'react-native';
import { Trainee, HealthQuestionnaireResponses, questionMapping } from '../types/trainee';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';

type Props = {
    trainee: Trainee;
    navigation: any;
};

export default function HealthQuestionnaireScreen({ trainee, navigation }: Props) {
    const [responses, setResponses] = useState<HealthQuestionnaireResponses>({
        heartProblems: false,
        bloodPressure: false,
        chronicIllness: false,
        physicalDifficulty: false,
        physicianAdvice: false,
        recentSurgery: false,
        pregnancy: false,
        breathingDifficulty: false,
        muscleInjury: false,
        diabetes: false,
        smoking: false,
        obesity: false,
        cholesterol: false,
        familyHeartProblems: false,
        hernia: false,
        frequentFalls: false,
    });

    const [comments, setComments] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (trainee.health_questionnaire) {
            setResponses(trainee.health_questionnaire.responses || responses);
            setComments(trainee.health_questionnaire.comments || "");
        }
    }, [trainee]);

    const toggleSwitch = (key: keyof HealthQuestionnaireResponses) => {
        setResponses({ ...responses, [key]: !responses[key] });
    };

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        Toast.show({
            type: type,
            text1: message,
            position: 'bottom',
            visibilityTime: 3000,
        });
    };

    const handleSave = async () => {
        console.log("Save button clicked!"); // Debug log
        
        const hasHealthIssues = Object.values(responses).some(value => value === true);

        if (hasHealthIssues && !comments.trim()) {
            showToast("Please provide details about the health conditions you've marked as 'Yes'.", 'error');
            return;
        }

        setIsSaving(true);
        const backendUrl = Constants.expoConfig?.extra?.backendUrl;

        try {
            const token = await AsyncStorage.getItem("token");
            // const backendUrl = await AsyncStorage.getItem("backendUrl");

            console.log("Token:", token ? "Present" : "Missing");
            console.log("Backend URL:", backendUrl);
            console.log("Trainee ID:", trainee.id);

            if (!token || !backendUrl) {
                throw new Error("Missing authentication token or backend URL");
            }

            // Prepare the health questionnaire data to match Go struct
            const healthQuestionnaireData = {
                responses: responses,
                comments: comments.trim(),
            };

            console.log("Sending health questionnaire data:", healthQuestionnaireData);

            const response = await fetch(`${backendUrl}/trainees/${trainee.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${token}`,
                },
                body: JSON.stringify({
                    ...trainee,
                    health_questionnaire: healthQuestionnaireData
                }),
            });

            console.log("Response status:", response.status);
            console.log("Response headers:", response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response:", errorText);
                throw new Error(`Failed to update health questionnaire: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            console.log("Success response:", responseData);

            showToast("Health questionnaire saved successfully!", 'success');
            
            // Optional: Navigate back after a short delay
            setTimeout(() => {
                navigation.goBack();
            }, 1000);

        } catch (error) {
            console.error("Save failed:", error);
            showToast("Failed to save health questionnaire", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Health Questionnaire</Text>
                    <Text style={styles.subtitle}>Answer honestly</Text>
                </View>

                <TouchableOpacity 
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    <Text style={styles.saveButtonText}>
                        {isSaving ? "Saving..." : "✓ Save"}
                    </Text>
                </TouchableOpacity>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.questionsContainer}>
                        {Object.keys(responses).map((key, index) => (
                            <View key={index} style={styles.item}>
                                <View style={styles.questionContent}>
                                    <Text style={styles.label}>
                                        {questionMapping[key as keyof typeof questionMapping]}
                                    </Text>
                                    <Switch
                                        value={responses[key as keyof HealthQuestionnaireResponses]}
                                        onValueChange={() => toggleSwitch(key as keyof HealthQuestionnaireResponses)}
                                        trackColor={{ false: '#e0e0e0', true: '#4CAF50' }}
                                        thumbColor={responses[key as keyof HealthQuestionnaireResponses] ? '#ffffff' : '#f4f3f4'}
                                        style={styles.switch}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={styles.commentsSection}>
                        <Text style={styles.commentLabel}>
                            Elaborate on "Yes" answers:
                        </Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Details about health conditions..."
                            multiline
                            numberOfLines={3}
                            value={comments}
                            onChangeText={(text) => setComments(text)}
                        />
                    </View>
                </ScrollView>
                
                <Toast />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    container: {
        flex: 1,
        paddingHorizontal: 12,
        paddingTop: 8,
    },
    header: {
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b',
    },
    saveButton: {
        backgroundColor: '#10b981',
        borderRadius: 6,
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 12,
        alignSelf: 'flex-end',
        minWidth: 80,
    },
    saveButtonDisabled: {
        backgroundColor: '#9ca3af',
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '600',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    questionsContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.03,
        shadowRadius: 1,
        elevation: 1,
    },
    item: {
        paddingVertical: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f1f5f9',
    },
    questionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 13,
        color: '#334155',
        flex: 1,
        marginRight: 8,
        lineHeight: 16,
    },
    switch: {
        transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    },
    commentsSection: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.03,
        shadowRadius: 1,
        elevation: 1,
    },
    commentLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#1e293b',
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 6,
        padding: 10,
        textAlignVertical: 'top',
        backgroundColor: '#ffffff',
        fontSize: 13,
        minHeight: 70,
        color: '#374151',
    },
});