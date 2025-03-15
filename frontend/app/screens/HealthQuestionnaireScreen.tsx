import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, TextInput, ScrollView, SafeAreaView } from 'react-native';
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

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                {/** Questions Section */}
                <View>
                    {Object.keys(responses).map((key, index) => (
                        <View key={index} style={styles.item}>
                            <Switch
                                value={responses[key as keyof Responses]} // Assert the type here
                                onValueChange={() => toggleSwitch(key as keyof Responses)} // Assert the type here
                            />
                            <Text style={styles.label}>
                                {questionMapping[key as keyof typeof questionMapping]}
                            </Text>
                        </View>
                    ))}
                </View>

                {/** Comments Section */}
                <View style={styles.commentsSection}>
                    <Text style={styles.commentLabel}>
                        Please elaborate on the positive answers above:
                    </Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Write your comments here..."
                        multiline
                        numberOfLines={4}
                        value={comments}
                        onChangeText={(text) => setComments(text)}
                    />
                </View>
            </ScrollView>
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
    },
    container: {
        padding: 16,
        backgroundColor: '#f7f9fc',
        paddingBottom: 100, // Adjust padding for space above the bottom tab
        paddingRight:60
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        // marginBottom: 1,
    },
    label: {
        fontSize: 16,
        marginLeft: 8,
        color: '#333',
    },
    commentsSection: {
        marginTop: 30,
    },
    commentLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        textAlignVertical: 'top',
        backgroundColor: '#fff',
        fontSize: 16,
    },
});
