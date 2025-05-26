import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Platform, Modal } from 'react-native';
import { Trainee } from '../types/trainee';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
    trainee: Trainee;
    navigation: any;
};

interface FitnessTest {
    id: number;
    category: string;
    test: string;
    result1: string;
    result2: string;
    icon: string;
    color: string;
}

interface LabTest {
    id: number;
    category: string;
    test: string;
    value: string;
    unit: string;
    normalRange: string;
    icon: string;
    color: string;
}

interface TestRecord {
    date: string;
    fitnessTests: FitnessTest[];
    labTests: LabTest[];
}

interface CategoryGroup {
    [key: string]: FitnessTest[];
}

interface LabCategoryGroup {
    [key: string]: LabTest[];
}

export default function FitnessTestScreen({ trainee, navigation }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLabEditing, setIsLabEditing] = useState(false);
    const [currentTestDate, setCurrentTestDate] = useState('');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedHistoryDate, setSelectedHistoryDate] = useState('');
    
    // Mock historical data - in real app, this would come from backend
    const [testHistory, setTestHistory] = useState<TestRecord[]>([
        {
            date: '2024-01-15',
            fitnessTests: [
                { id: 1, category: 'Aerobic Endurance', test: 'Rockport Test', result1: '12:30', result2: '12:15', icon: 'directions-run', color: '#3B82F6' },
                { id: 2, category: 'Muscular Strength', test: '1 Rep Max (Upper)', result1: '80kg', result2: '85kg', icon: 'fitness-center', color: '#EF4444' },
            ],
            labTests: [
                { id: 1, category: 'Complete Blood Count (CBC)', test: 'Hemoglobin', value: '14.2', unit: 'g/dL', normalRange: '12-16', icon: 'opacity', color: '#EA580C' },
                { id: 3, category: 'Lipid Profile', test: 'Total Cholesterol', value: '185', unit: 'mg/dL', normalRange: '<200', icon: 'favorite', color: '#7C3AED' },
            ]
        },
        {
            date: '2024-03-20',
            fitnessTests: [
                { id: 1, category: 'Aerobic Endurance', test: 'Rockport Test', result1: '11:45', result2: '11:30', icon: 'directions-run', color: '#3B82F6' },
                { id: 2, category: 'Muscular Strength', test: '1 Rep Max (Upper)', result1: '85kg', result2: '90kg', icon: 'fitness-center', color: '#EF4444' },
            ],
            labTests: [
                { id: 1, category: 'Complete Blood Count (CBC)', test: 'Hemoglobin', value: '14.8', unit: 'g/dL', normalRange: '12-16', icon: 'opacity', color: '#EA580C' },
                { id: 3, category: 'Lipid Profile', test: 'Total Cholesterol', value: '175', unit: 'mg/dL', normalRange: '<200', icon: 'favorite', color: '#7C3AED' },
            ]
        }
    ]);

    const [results, setResults] = useState<FitnessTest[]>([
        { 
            id: 1, 
            category: 'Aerobic Endurance', 
            test: 'Rockport Test', 
            result1: '', 
            result2: '',
            icon: 'directions-run',
            color: '#3B82F6'
        },
        { 
            id: 2, 
            category: 'Muscular Strength', 
            test: '1 Rep Max (Upper)', 
            result1: '', 
            result2: '',
            icon: 'fitness-center',
            color: '#EF4444'
        },
        { 
            id: 3, 
            category: 'Muscular Strength', 
            test: '1 Rep Max (Lower)', 
            result1: '', 
            result2: '',
            icon: 'fitness-center',
            color: '#EF4444'
        },
        { 
            id: 4, 
            category: 'Muscular Endurance', 
            test: 'Ab Crunches/min', 
            result1: '', 
            result2: '',
            icon: 'timer',
            color: '#F97316'
        },
        { 
            id: 5, 
            category: 'Muscular Endurance', 
            test: 'Free Squats/min', 
            result1: '', 
            result2: '',
            icon: 'timer',
            color: '#F97316'
        },
        { 
            id: 6, 
            category: 'Flexibility', 
            test: 'Sit & Reach', 
            result1: '', 
            result2: '',
            icon: 'accessibility',
            color: '#10B981'
        },
        { 
            id: 7, 
            category: 'Flexibility', 
            test: 'Shoulder Mobility', 
            result1: '', 
            result2: '',
            icon: 'accessibility',
            color: '#10B981'
        },
        { 
            id: 8, 
            category: 'Body Composition', 
            test: 'Push-ups', 
            result1: '', 
            result2: '',
            icon: 'trending-up',
            color: '#8B5CF6'
        }
    ]);

    const [labResults, setLabResults] = useState<LabTest[]>([
        // Complete Blood Count (CBC) - Essential
        { 
            id: 1, 
            category: 'Complete Blood Count (CBC)', 
            test: 'Hemoglobin', 
            value: '', 
            unit: 'g/dL',
            normalRange: '12-16',
            icon: 'opacity',
            color: '#EA580C'
        },
        { 
            id: 2, 
            category: 'Complete Blood Count (CBC)', 
            test: 'White Blood Cells', 
            value: '', 
            unit: '/μL',
            normalRange: '4000-11000',
            icon: 'opacity',
            color: '#EA580C'
        },
        
        // Lipid Profile - Heart Health
        { 
            id: 3, 
            category: 'Lipid Profile', 
            test: 'Total Cholesterol', 
            value: '', 
            unit: 'mg/dL',
            normalRange: '<200',
            icon: 'favorite',
            color: '#7C3AED'
        },
        { 
            id: 4, 
            category: 'Lipid Profile', 
            test: 'HDL Cholesterol', 
            value: '', 
            unit: 'mg/dL',
            normalRange: '>40',
            icon: 'favorite',
            color: '#7C3AED'
        },
        { 
            id: 5, 
            category: 'Lipid Profile', 
            test: 'LDL Cholesterol', 
            value: '', 
            unit: 'mg/dL',
            normalRange: '<100',
            icon: 'favorite',
            color: '#7C3AED'
        },
        
        // Kidney Function - Essential
        { 
            id: 6, 
            category: 'Kidney Function Test', 
            test: 'Creatinine', 
            value: '', 
            unit: 'mg/dL',
            normalRange: '0.6-1.2',
            icon: 'healing',
            color: '#DC2626'
        },
        
        // Liver Function - Essential
        { 
            id: 7, 
            category: 'Liver Function Test', 
            test: 'ALT (SGPT)', 
            value: '', 
            unit: 'U/L',
            normalRange: '7-56',
            icon: 'local-hospital',
            color: '#059669'
        },
        
        // Metabolic - Essential
        { 
            id: 8, 
            category: 'Metabolic Panel', 
            test: 'Fasting Glucose', 
            value: '', 
            unit: 'mg/dL',
            normalRange: '70-100',
            icon: 'psychology',
            color: '#0891B2'
        },
        { 
            id: 9, 
            category: 'Metabolic Panel', 
            test: 'HbA1c', 
            value: '', 
            unit: '%',
            normalRange: '<5.7',
            icon: 'psychology',
            color: '#0891B2'
        },
        
        // Vitamins - Most Important
        { 
            id: 10, 
            category: 'Vitamins', 
            test: 'Vitamin D', 
            value: '', 
            unit: 'ng/mL',
            normalRange: '30-100',
            icon: 'wb-sunny',
            color: '#CA8A04'
        },
        { 
            id: 11, 
            category: 'Vitamins', 
            test: 'Vitamin B12', 
            value: '', 
            unit: 'pg/mL',
            normalRange: '200-900',
            icon: 'wb-sunny',
            color: '#CA8A04'
        }
    ]);

    const handleToggleEdit = () => {
        if (!isEditing && !currentTestDate) {
            setCurrentTestDate(getCurrentDate());
        }
        setIsEditing(!isEditing);
    };

    const handleToggleLabEdit = () => {
        if (!isLabEditing && !currentTestDate) {
            setCurrentTestDate(getCurrentDate());
        }
        setIsLabEditing(!isLabEditing);
    };

    const handleSave = () => {
        if (currentTestDate) {
            // Save current results to history
            const newRecord: TestRecord = {
                date: currentTestDate,
                fitnessTests: [...results],
                labTests: [...labResults]
            };
            
            // Remove existing record for same date if exists
            const updatedHistory = testHistory.filter(record => record.date !== currentTestDate);
            setTestHistory([...updatedHistory, newRecord].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
        
        setIsEditing(false);
        setIsLabEditing(false);
        console.log('Saving results for date:', currentTestDate);
    };

    const updateResult = (id: number, field: 'result1' | 'result2', value: string) => {
        setResults(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const updateLabResult = (id: number, field: 'value', value: string) => {
        setLabResults(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const loadHistoryData = (date: string) => {
        const historyRecord = testHistory.find(record => record.date === date);
        if (historyRecord) {
            // Create a map for quick lookup
            const fitnessMap = new Map(historyRecord.fitnessTests.map(test => [test.test, test]));
            const labMap = new Map(historyRecord.labTests.map(test => [test.test, test]));
            
            // Update current results with historical data
            setResults(prev => prev.map(item => {
                const historyItem = fitnessMap.get(item.test);
                return historyItem ? { ...item, result1: historyItem.result1, result2: historyItem.result2 } : item;
            }));
            
            setLabResults(prev => prev.map(item => {
                const historyItem = labMap.get(item.test);
                return historyItem ? { ...item, value: historyItem.value } : item;
            }));
            
            setCurrentTestDate(date);
        }
    };

    const getCategoryGroups = (): CategoryGroup => {
        const groups: CategoryGroup = {};
        results.forEach(item => {
            if (!groups[item.category]) {
                groups[item.category] = [];
            }
            groups[item.category].push(item);
        });
        return groups;
    };

    const getLabCategoryGroups = (): LabCategoryGroup => {
        const groups: LabCategoryGroup = {};
        labResults.forEach(item => {
            if (!groups[item.category]) {
                groups[item.category] = [];
            }
            groups[item.category].push(item);
        });
        return groups;
    };

    const categoryGroups = getCategoryGroups();
    const labCategoryGroups = getLabCategoryGroups();

    const getCompletionPercentage = (items: FitnessTest[]): number => {
        const completed = items.reduce((acc: number, item: FitnessTest) => {
            return acc + (item.result1 ? 1 : 0) + (item.result2 ? 1 : 0);
        }, 0);
        const total = items.length * 2;
        return Math.round((completed / total) * 100);
    };

    const getLabCompletionPercentage = (items: LabTest[]): number => {
        const completed = items.reduce((acc: number, item: LabTest) => {
            return acc + (item.value ? 1 : 0);
        }, 0);
        const total = items.length;
        return Math.round((completed / total) * 100);
    };

    const formatDate = (dateString: string): string => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const getCurrentDate = (): string => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const clearCurrentData = () => {
        setResults(prev => prev.map(item => ({ ...item, result1: '', result2: '' })));
        setLabResults(prev => prev.map(item => ({ ...item, value: '' })));
        setCurrentTestDate('');
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>Fitness Assessment</Text>
                        <Text style={styles.subtitle}>{trainee.name} • Gender: {trainee.gender}</Text>
                    </View>
                </View>
            </View>

            {/* Test Date Section */}
            <View style={styles.dateSection}>
                <View style={styles.dateHeader}>
                    <MaterialIcons name="event" size={20} color="#6B7280" />
                    <Text style={styles.dateLabel}>Test Date</Text>
                </View>
                <View style={styles.dateControls}>
                    {(isEditing || isLabEditing) ? (
                        <TextInput
                            value={currentTestDate}
                            onChangeText={setCurrentTestDate}
                            placeholder="YYYY-MM-DD"
                            style={styles.dateInput}
                        />
                    ) : (
                        <Text style={styles.dateDisplay}>
                            {currentTestDate ? formatDate(currentTestDate) : 'No date selected'}
                        </Text>
                    )}
                    <TouchableOpacity
                        onPress={() => setShowHistoryModal(true)}
                        style={styles.historyButton}
                    >
                        <MaterialIcons name="history" size={18} color="#3B82F6" />
                        <Text style={styles.historyButtonText}>History</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Physical Fitness Tests */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Physical Fitness Tests</Text>
                <TouchableOpacity
                    onPress={isEditing ? handleSave : handleToggleEdit}
                    style={[styles.actionButton, isEditing ? styles.saveButton : styles.editButton]}
                >
                    <MaterialIcons 
                        name={isEditing ? "save" : "edit"} 
                        size={18} 
                        color="white" 
                    />
                    <Text style={styles.actionButtonText}>
                        {isEditing ? 'Save' : 'Edit'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {Object.entries(categoryGroups).map(([category, items]) => {
                    const firstItem = items[0];
                    
                    return (
                        <View key={category} style={styles.categoryCard}>
                            {/* Category Header */}
                            <View style={[styles.categoryHeader, { backgroundColor: firstItem.color }]}>
                                <View style={styles.categoryHeaderContent}>
                                    <View style={styles.iconContainer}>
                                        <MaterialIcons 
                                            name={firstItem.icon as any} 
                                            size={24} 
                                            color="white" 
                                        />
                                    </View>
                                    <Text style={styles.categoryTitle}>{category}</Text>
                                </View>
                            </View>

                            {/* Tests */}
                            {items.map((item, index) => (
                                <View key={item.id} style={[styles.testItem, index !== items.length - 1 && styles.testItemBorder]}>
                                    <View style={styles.testContent}>
                                        {/* Test Number */}
                                        <View style={styles.testNumber}>
                                            <Text style={styles.testNumberText}>{item.id}</Text>
                                        </View>
                                        
                                        {/* Test Details */}
                                        <View style={styles.testDetails}>
                                            <Text style={styles.testName}>{item.test}</Text>
                                            
                                            {/* Results */}
                                            <View style={styles.resultsContainer}>
                                                <View style={styles.resultItem}>
                                                    <Text style={styles.resultLabel}>Test 1</Text>
                                                    {isEditing ? (
                                                        <TextInput
                                                            value={item.result1}
                                                            onChangeText={(text) => updateResult(item.id, 'result1', text)}
                                                            placeholder="Enter result"
                                                            style={styles.resultInput}
                                                        />
                                                    ) : (
                                                        <View style={styles.resultDisplay}>
                                                            <Text style={[styles.resultText, !item.result1 && styles.resultTextEmpty]}>
                                                                {item.result1 || 'Not recorded'}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                
                                                <View style={styles.resultItem}>
                                                    <Text style={styles.resultLabel}>Test 2</Text>
                                                    {isEditing ? (
                                                        <TextInput
                                                            value={item.result2}
                                                            onChangeText={(text) => updateResult(item.id, 'result2', text)}
                                                            placeholder="Enter result"
                                                            style={styles.resultInput}
                                                        />
                                                    ) : (
                                                        <View style={styles.resultDisplay}>
                                                            <Text style={[styles.resultText, !item.result2 && styles.resultTextEmpty]}>
                                                                {item.result2 || 'Not recorded'}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    );
                })}
            </View>

            {/* Lab Tests Section */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Laboratory Tests</Text>
                <TouchableOpacity
                    onPress={isLabEditing ? handleSave : handleToggleLabEdit}
                    style={[styles.actionButton, isLabEditing ? styles.saveButton : styles.editButton]}
                >
                    <MaterialIcons 
                        name={isLabEditing ? "save" : "edit"} 
                        size={18} 
                        color="white" 
                    />
                    <Text style={styles.actionButtonText}>
                        {isLabEditing ? 'Save' : 'Edit'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {Object.entries(labCategoryGroups).map(([category, items]) => {
                    const firstItem = items[0];
                    
                    return (
                        <View key={category} style={styles.categoryCard}>
                            {/* Category Header */}
                            <View style={[styles.categoryHeader, { backgroundColor: firstItem.color }]}>
                                <View style={styles.categoryHeaderContent}>
                                    <View style={styles.iconContainer}>
                                        <MaterialIcons 
                                            name={firstItem.icon as any} 
                                            size={24} 
                                            color="white" 
                                        />
                                    </View>
                                    <Text style={styles.categoryTitle}>{category}</Text>
                                </View>
                            </View>

                            {/* Lab Tests */}
                            {items.map((item, index) => (
                                <View key={item.id} style={[styles.labTestItem, index !== items.length - 1 && styles.testItemBorder]}>
                                    <View style={styles.labTestContent}>
                                        <View style={styles.labTestHeader}>
                                            <Text style={styles.labTestName}>{item.test}</Text>
                                            <Text style={styles.normalRange}>Normal: {item.normalRange} {item.unit}</Text>
                                        </View>
                                        
                                        <View style={styles.labResultsContainer}>
                                            <View style={styles.labResultItem}>
                                                <Text style={styles.resultLabel}>Value</Text>
                                                {isLabEditing ? (
                                                    <TextInput
                                                        value={item.value}
                                                        onChangeText={(text) => updateLabResult(item.id, 'value', text)}
                                                        placeholder={`Enter value ${item.unit}`}
                                                        style={styles.resultInput}
                                                        keyboardType="numeric"
                                                    />
                                                ) : (
                                                    <View style={styles.resultDisplay}>
                                                        <Text style={[styles.resultText, !item.value && styles.resultTextEmpty]}>
                                                            {item.value ? `${item.value} ${item.unit}` : 'Not recorded'}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    );
                })}
            </View>

            {/* Progress Summary */}
            <View style={styles.content}>
                <View style={styles.progressCard}>
                    <Text style={styles.progressTitle}>Assessment Progress</Text>
                    
                    {/* Physical Tests Progress */}
                    <Text style={styles.progressSubtitle}>Physical Tests</Text>
                    <View style={styles.progressContent}>
                        {Object.entries(categoryGroups).map(([category, items]) => {
                            const percentage = getCompletionPercentage(items);
                            
                            return (
                                <View key={category} style={styles.progressItem}>
                                    <Text style={styles.progressCategory}>{category}</Text>
                                    <View style={styles.progressRight}>
                                        <View style={styles.progressBar}>
                                            <View 
                                                style={[styles.progressFill, { width: `${percentage}%` }]}
                                            />
                                        </View>
                                        <Text style={styles.progressPercentage}>{percentage}%</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Lab Tests Progress */}
                    <Text style={styles.progressSubtitle}>Laboratory Tests</Text>
                    <View style={styles.progressContent}>
                        {Object.entries(labCategoryGroups).map(([category, items]) => {
                            const percentage = getLabCompletionPercentage(items);
                            
                            return (
                                <View key={category} style={styles.progressItem}>
                                    <Text style={styles.progressCategory}>{category}</Text>
                                    <View style={styles.progressRight}>
                                        <View style={styles.progressBar}>
                                            <View 
                                                style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: '#10B981' }]}
                                            />
                                        </View>
                                        <Text style={styles.progressPercentage}>{percentage}%</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </View>

            {/* History Modal */}
            <Modal
                visible={showHistoryModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Test History</Text>
                        <TouchableOpacity
                            onPress={() => setShowHistoryModal(false)}
                            style={styles.closeButton}
                        >
                            <MaterialIcons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.modalContent}>
                        <TouchableOpacity
                            onPress={() => {
                                clearCurrentData();
                                setShowHistoryModal(false);
                            }}
                            style={styles.historyItem}
                        >
                            <View style={styles.historyItemContent}>
                                <MaterialIcons name="add" size={20} color="#10B981" />
                                <Text style={[styles.historyDate, { color: '#10B981' }]}>Create New Assessment</Text>
                            </View>
                        </TouchableOpacity>
                        
                        {testHistory.map((record) => (
                            <TouchableOpacity
                                key={record.date}
                                onPress={() => {
                                    loadHistoryData(record.date);
                                    setShowHistoryModal(false);
                                }}
                                style={[
                                    styles.historyItem,
                                    currentTestDate === record.date && styles.selectedHistoryItem
                                ]}
                            >
                                <View style={styles.historyItemContent}>
                                    <MaterialIcons name="event" size={20} color="#6B7280" />
                                    <View style={styles.historyItemText}>
                                        <Text style={styles.historyDate}>{formatDate(record.date)}</Text>
                                        <Text style={styles.historySubtext}>
                                            {record.fitnessTests.filter(t => t.result1 || t.result2).length} fitness tests, {' '}
                                            {record.labTests.filter(t => t.value).length} lab tests
                                        </Text>
                                    </View>
                                </View>
                                {currentTestDate === record.date && (
                                    <MaterialIcons name="check-circle" size={20} color="#10B981" />
                                )}
                            </TouchableOpacity>
                        ))}
                        
                        {testHistory.length === 0 && (
                            <View style={styles.emptyState}>
                                <MaterialIcons name="history" size={48} color="#D1D5DB" />
                                <Text style={styles.emptyStateText}>No previous assessments found</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    dateSection: {
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    dateLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    dateControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        backgroundColor: 'white',
        marginRight: 12,
    },
    dateDisplay: {
        flex: 1,
        fontSize: 14,
        color: '#374151',
        paddingVertical: 8,
    },
    historyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3B82F6',
        backgroundColor: '#EFF6FF',
    },
    historyButtonText: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '500',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F3F4F6',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    editButton: {
        backgroundColor: '#3B82F6',
    },
    saveButton: {
        backgroundColor: '#10B981',
    },
    actionButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    content: {
        padding: 12,
        gap: 12,
    },
    categoryCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        overflow: 'hidden',
    },
    categoryHeader: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    categoryHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 4,
        borderRadius: 4,
    },
    categoryTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    testItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    testItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    testContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    testNumber: {
        width: 24,
        height: 24,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    testNumberText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
    },
    testDetails: {
        flex: 1,
    },
    testName: {
        fontSize: 13,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 8,
    },
    resultsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    resultItem: {
        flex: 1,
    },
    resultLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: '#6B7280',
        marginBottom: 2,
    },
    resultInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        fontSize: 13,
        backgroundColor: 'white',
    },
    resultDisplay: {
        backgroundColor: '#F9FAFB',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        minHeight: 28,
        justifyContent: 'center',
    },
    resultText: {
        fontSize: 13,
        color: '#374151',
    },
    resultTextEmpty: {
        color: '#9CA3AF',
    },
    labTestItem: {
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    labTestContent: {
        flex: 1,
    },
    labTestHeader: {
        marginBottom: 8,
    },
    labTestName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 2,
    },
    normalRange: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    labResultsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    labResultItem: {
        flex: 1,
    },
    progressCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        padding: 16,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
    },
    progressSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginTop: 8,
        marginBottom: 8,
    },
    progressContent: {
        gap: 8,
        marginBottom: 12,
    },
    progressItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    progressCategory: {
        fontSize: 14,
        color: '#6B7280',
        flex: 1,
    },
    progressRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressBar: {
        width: 64,
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 4,
    },
    progressPercentage: {
        fontSize: 12,
        color: '#6B7280',
        width: 32,
        textAlign: 'right',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'white',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: 'white',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    closeButton: {
        padding: 4,
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 16,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    selectedHistoryItem: {
        backgroundColor: '#F0FDF4',
        borderRadius: 8,
        marginVertical: 2,
    },
    historyItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    historyItemText: {
        flex: 1,
    },
    historyDate: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    historySubtext: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginTop: 12,
    },
});