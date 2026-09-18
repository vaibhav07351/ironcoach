import React, { useState, useEffect } from 'react';
import {
    View, Text, Switch, StyleSheet, TextInput, ScrollView,
    SafeAreaView, TouchableOpacity
} from 'react-native';
import { Trainee, HealthQuestionnaireResponses, questionMapping } from '../types/trainee';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';

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

        // if (hasHealthIssues && !comments.trim()) {
        //     showToast("Please provide details about the health conditions you've marked as 'Yes'.", 'error');
        //     return;
        // }

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
                    <Text style={styles.eyebrow}>IronCoach</Text>
                    <Text style={styles.title}>Health questionnaire</Text>
                    <Text style={styles.subtitle}>Answer honestly — your coach uses this for safety.</Text>
                </View>

                <TouchableOpacity 
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
                    onPress={handleSave}
                    disabled={isSaving}
                    activeOpacity={0.88}
                >
                    <Text style={styles.saveButtonText}>
                        {isSaving ? 'Saving…' : 'Save answers'}
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
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
        paddingHorizontal: Spacing.medium,
        paddingTop: Spacing.small,
    },
    header: {
        marginBottom: Spacing.medium,
        paddingBottom: Spacing.medium,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    eyebrow: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: Colors.accent,
        marginBottom: 4,
    },
    title: {
        fontFamily: Fonts.display,
        fontSize: 26,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    saveButton: {
        backgroundColor: Colors.accent,
        borderRadius: Radii.md,
        paddingVertical: 12,
        paddingHorizontal: Spacing.medium,
        alignItems: 'center',
        marginBottom: Spacing.medium,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: Colors.textPrimary,
        fontSize: 15,
        fontWeight: '800',
    },
    scrollContent: {
        paddingBottom: Spacing.xl,
    },
    questionsContainer: {
        backgroundColor: Colors.surface,
        borderRadius: Radii.md,
        padding: Spacing.medium,
        marginBottom: Spacing.medium,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    item: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    questionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 14,
        color: Colors.textPrimary,
        flex: 1,
        marginRight: Spacing.small,
        lineHeight: 20,
    },
    switch: {
        transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
    },
    commentsSection: {
        backgroundColor: Colors.surface,
        borderRadius: Radii.md,
        padding: Spacing.medium,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    commentLabel: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: Spacing.small,
        color: Colors.primary,
    },
    textArea: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radii.sm,
        padding: 12,
        textAlignVertical: 'top',
        backgroundColor: Colors.background,
        fontSize: 14,
        minHeight: 80,
        color: Colors.textPrimary,
    },
});