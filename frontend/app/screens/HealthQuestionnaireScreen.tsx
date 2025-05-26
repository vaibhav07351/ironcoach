import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, TextInput, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { Trainee } from '../types/trainee';

type Responses = {
    heartProblems: boolean;
    bloodPressure: boolean;
    chronicIllness: boolean;
    physicalDifficulty: boolean;
    physicianAdvice: boolean;
    recentSurgery: boolean;
    pregnancy: boolean;
    breathingDifficulty: boolean;
    muscleInjury: boolean;
    diabetes: boolean;
    smoking: boolean;
    obesity: boolean;
    cholesterol: boolean;
    familyHeartProblems: boolean;
    hernia: boolean;
    frequentFalls: boolean;
};

type Props = {
    trainee: Trainee;
    navigation: any;
};

export default function HealthQuestionnaireScreen({ trainee, navigation }: Props) {
    const [responses, setResponses] = useState<Responses>({
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

    const toggleSwitch = (key: keyof Responses) => {
        setResponses({ ...responses, [key]: !responses[key] });
    };

    const handleSave = () => {
        // Check if any health issues are marked as true
        const hasHealthIssues = Object.values(responses).some(value => value === true);
        
        // If health issues exist but no comments provided, show warning
        if (hasHealthIssues && !comments.trim()) {
            Alert.alert(
                "Comments Required",
                "Please provide details about the health conditions you've marked as 'Yes'.",
                [{ text: "OK" }]
            );
            return;
        }

        // Save logic here - you can implement your save functionality
        const healthData = {
            responses,
            comments: comments.trim(),
            traineeId: trainee.id,
            submittedAt: new Date().toISOString()
        };

        console.log('Saving health questionnaire:', healthData);
        
        Alert.alert(
            "Success",
            "Health questionnaire saved successfully!",
            [
                {
                    text: "OK",
                    onPress: () => navigation.goBack()
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/** Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Health Questionnaire</Text>
                    <Text style={styles.subtitle}>Answer honestly</Text>
                </View>

                {/** Save Button - Top */}
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>✓ Save</Text>
                </TouchableOpacity>

                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/** Questions Section */}
                    <View style={styles.questionsContainer}>
                        {Object.keys(responses).map((key, index) => (
                            <View key={index} style={styles.item}>
                                <View style={styles.questionContent}>
                                    <Text style={styles.label}>
                                        {questionMapping[key as keyof typeof questionMapping]}
                                    </Text>
                                    <Switch
                                        value={responses[key as keyof Responses]}
                                        onValueChange={() => toggleSwitch(key as keyof Responses)}
                                        trackColor={{ false: '#e0e0e0', true: '#4CAF50' }}
                                        thumbColor={responses[key as keyof Responses] ? '#ffffff' : '#f4f3f4'}
                                        style={styles.switch}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>

                    {/** Comments Section */}
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
            </View>
        </SafeAreaView>
    );
}

const questionMapping = {
    heartProblems: "History of heart problems, chest pain, or stroke",
    bloodPressure: "Increased blood pressure",
    chronicIllness: "Any chronic illness or condition",
    physicalDifficulty: "Difficulty in physical exercise",
    physicianAdvice: "Advice from physician not to exercise",
    recentSurgery: "Recent surgery (last 12 months)",
    pregnancy: "Pregnancy (now or within last 3 months)",
    breathingDifficulty: "History of breathing difficulty or lung problems",
    muscleInjury: "Muscle, joint, or back disorder, or any previous injury",
    diabetes: "Diabetes or thyroid condition",
    smoking: "Cigarette smoking habit",
    obesity: "Obesity (more than 20% over ideal body weight)",
    cholesterol: "Increased blood cholesterol",
    familyHeartProblems: "History of heart problems in immediate family",
    hernia: "Hernia or any condition that may be aggravated by lifting weights",
    frequentFalls: "Do you have frequent falls / lose consciousness / balance",
};

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