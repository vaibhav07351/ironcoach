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
    
    // Remove all sample data - will come from backend
    const [testHistory, setTestHistory] = useState<TestRecord[]>([]);

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

            {/* Test Date Section - More prominent */}
            <View style={styles.dateSection}>
                <View style={styles.dateCard}>
                    <View style={styles.dateHeader}>
                        <MaterialIcons name="event" size={24} color="#3B82F6" />
                        <Text style={styles.dateTitle}>Assessment Date</Text>
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
                                {currentTestDate ? formatDate(currentTestDate) : 'Select Date'}
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
            </View>

            {/* Physical Fitness Tests Section */}
            <View style={styles.majorSection}>
                <View style={styles.majorSectionHeader}>
                    <View style={styles.sectionTitleContainer}>
                        <MaterialIcons name="fitness-center" size={24} color="#3B82F6" />
                        <Text style={styles.majorSectionTitle}>Physical Fitness Tests</Text>
                    </View>
                    <TouchableOpacity
                        onPress={isEditing ? handleSave : handleToggleEdit}
                        style={[styles.actionButton, isEditing ? styles.saveButton : styles.editButton]}
                    >
                        <MaterialIcons 
                            name={isEditing ? "save" : "edit"} 
                            size={16} 
                            color="white" 
                        />
                        <Text style={styles.actionButtonText}>
                            {isEditing ? 'Save' : 'Edit'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.sectionContent}>
                    {Object.entries(categoryGroups).map(([category, items]) => {
                        const firstItem = items[0];
                        
                        return (
                            <View key={category} style={styles.categoryCard}>
                                {/* Category Header */}
                                <View style={[styles.categoryHeader, { backgroundColor: firstItem.color }]}>
                                    <View style={styles.categoryHeaderContent}>
                                        <MaterialIcons 
                                            name={firstItem.icon as any} 
                                            size={18} 
                                            color="white" 
                                        />
                                        <Text style={styles.categoryTitle}>{category}</Text>
                                    </View>
                                </View>

                                {/* Tests */}
                                {items.map((item, index) => (
                                    <View key={item.id} style={[styles.testItem, index !== items.length - 1 && styles.testItemBorder]}>
                                        <View style={styles.testContent}>
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
                                                                    {item.result1 || '-'}
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
                                                                    {item.result2 || '-'}
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
            </View>

            {/* Laboratory Tests Section */}
            <View style={styles.majorSection}>
                <View style={styles.majorSectionHeader}>
                    <View style={styles.sectionTitleContainer}>
                        <MaterialIcons name="science" size={24} color="#10B981" />
                        <Text style={styles.majorSectionTitle}>Laboratory Tests</Text>
                    </View>
                    <TouchableOpacity
                        onPress={isLabEditing ? handleSave : handleToggleLabEdit}
                        style={[styles.actionButton, isLabEditing ? styles.saveButton : styles.editButton]}
                    >
                        <MaterialIcons 
                            name={isLabEditing ? "save" : "edit"} 
                            size={16} 
                            color="white" 
                        />
                        <Text style={styles.actionButtonText}>
                            {isLabEditing ? 'Save' : 'Edit'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.sectionContent}>
                    {Object.entries(labCategoryGroups).map(([category, items]) => {
                        const firstItem = items[0];
                        
                        return (
                            <View key={category} style={styles.categoryCard}>
                                {/* Category Header */}
                                <View style={[styles.categoryHeader, { backgroundColor: firstItem.color }]}>
                                    <View style={styles.categoryHeaderContent}>
                                        <MaterialIcons 
                                            name={firstItem.icon as any} 
                                            size={18} 
                                            color="white" 
                                        />
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
                                                            placeholder={`Enter value`}
                                                            style={styles.resultInput}
                                                            keyboardType="numeric"
                                                        />
                                                    ) : (
                                                        <View style={styles.resultDisplay}>
                                                            <Text style={[styles.resultText, !item.value && styles.resultTextEmpty]}>
                                                                {item.value ? `${item.value} ${item.unit}` : '-'}
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
            </View>

            {/* History Modal */}
            <Modal
                visible={showHistoryModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Assessment History</Text>
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
                                <Text style={styles.emptyStateSubtext}>Create your first assessment above</Text>
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
    backgroundColor: '#FAFBFC',
  },

  // Header Styles - Compact
  header: {
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 45 : 15,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Date Section Styles - Compact
  dateSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dateCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 6,
  },
  dateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInput: {
    flex: 1,
    fontSize: 13,
    padding: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    marginRight: 8,
  },
  dateDisplay: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    paddingVertical: 8,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EBF4FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  historyButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 12,
  },

  // Major Section Styles - Different backgrounds
  majorSection: {
    marginBottom: 12,
  },
  majorSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderTopWidth: 2,
    borderTopColor: '#3B82F6',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  majorSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    // Physical Fitness Tests - Light Blue Background
    backgroundColor: '#F0F8FF',
  },
  
  // Lab Section Content - Light Green Background
  labSectionContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    backgroundColor: '#F0FDF4',
  },

  // Action Button Styles - Compact
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 12,
  },

  // Category Card Styles - Compact
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
    marginLeft: 6,
  },

  // Test Item Styles - Very Compact
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
  },
  testDetails: {
    flex: 1,
  },
  testName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },

  // Results Container Styles - Compact
  resultsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultItem: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  resultInput: {
    fontSize: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    backgroundColor: '#F9FAFB',
    textAlign: 'center',
    minHeight: 28,
  },
  resultDisplay: {
    padding: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 28,
    justifyContent: 'center',
  },
  resultText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  resultTextEmpty: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },

  // Lab Test Styles - Very Compact
  labTestItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  labTestContent: {
    flex: 1,
  },
  labTestHeader: {
    marginBottom: 6,
  },
  labTestName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  normalRange: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  labResultsContainer: {
    flexDirection: 'row',
  },
  labResultItem: {
    flex: 1,
    maxWidth: 120,
  },

  // Modal Styles - Compact
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: Platform.OS === 'ios' ? 45 : 15,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // History Item Styles - Compact
  historyItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedHistoryItem: {
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  historyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyItemText: {
    marginLeft: 8,
    flex: 1,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 1,
  },
  historySubtext: {
    fontSize: 10,
    color: '#6B7280',
  },

  // Empty State Styles - Compact
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Completion Progress Styles - Compact
  progressContainer: {
    marginTop: 4,
    marginBottom: 2,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#E5E7EB',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  progressText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'right',
  },

  // Additional Utility Styles - Compact
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  spacer: {
    height: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },
  marginBottom4: {
    marginBottom: 4,
  },
  marginBottom6: {
    marginBottom: 6,
  },
  marginBottom8: {
    marginBottom: 8,
  },
  paddingHorizontal12: {
    paddingHorizontal: 12,
  },
  paddingVertical4: {
    paddingVertical: 4,
  },
  paddingVertical6: {
    paddingVertical: 6,
  },

  // Status Indicator Styles - Compact
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  statusNormal: {
    backgroundColor: '#10B981',
  },
  statusHigh: {
    backgroundColor: '#EF4444',
  },
  statusLow: {
    backgroundColor: '#F59E0B',
  },
  

  // Responsive adjustments for larger screens
  ...(Platform.OS === 'web' && {
    container: {
      maxWidth: 700,
      alignSelf: 'center',
      width: '100%',
    },
  }),
});