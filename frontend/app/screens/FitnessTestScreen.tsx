import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Platform, Modal, Alert, ToastAndroid } from 'react-native';
import { Trainee, FitnessTest, LabTest } from '../types/trainee';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FitnessTestWithUI, LabTestWithUI, TestRecord, CategoryGroup, LabCategoryGroup, fitnessTestTemplates, labTestTemplates } from '../types/trainee';

type Props = {
    trainee: Trainee;
    navigation: any;
};

export default function FitnessTestScreen({ trainee, navigation }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentTestDate, setCurrentTestDate] = useState('');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Backend data
    const [traineeData, setTraineeData] = useState<Trainee>(trainee);
    const [testHistory, setTestHistory] = useState<TestRecord[]>([]);

    const [results, setResults] = useState<FitnessTestWithUI[]>([]);
    const [labResults, setLabResults] = useState<LabTestWithUI[]>([]);

    const backendUrl = Constants.expoConfig?.extra?.backendUrl; 

    // Toast function for cross-platform compatibility
    const showToast = (message: string) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
            Alert.alert('Success', message);
        }
    };

    useEffect(() => {
        fetchTraineeData();
    }, []);

    const fetchTraineeData = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${backendUrl}/trainees/${trainee.id}`, {
                headers: { Authorization: `${token}` },
            });
            console.log(response)
            if (response.ok) {
                const data = await response.json();
                const traineeOnly = {
                    ...data,
                    fitness_tests: data.fitness_tests || [],
                    lab_tests: data.lab_tests || []
                };
                setTraineeData(traineeOnly);
                processTraineeData(traineeOnly);
            }
        } catch (error) {
            console.error('Error fetching trainee data:', error);
            Alert.alert('Error', 'Failed to fetch trainee data');
        } finally {
            setLoading(false);
        }
    };

    const processTraineeData = (data: Trainee) => {
        // Process fitness tests from backend data
        const fitnessTests = (data.fitness_tests || []).map(test => ({
            ...test,
            date: new Date(test.date).toISOString().slice(0, 10)
        }));
        const labTests = (data.lab_tests || []).map(test => ({
            ...test,
            date: new Date(test.date).toISOString().slice(0, 10)
        }));


        console.log('Processing trainee data:', { fitnessTests, labTests }); // Debug log

        // Group tests by date for history
        const groupedByDate: { [date: string]: { fitnessTests: FitnessTest[], labTests: LabTest[] } } = {};
        
        fitnessTests.forEach(test => {
            if (!groupedByDate[test.date]) {
                groupedByDate[test.date] = { fitnessTests: [], labTests: [] };
            }
            groupedByDate[test.date].fitnessTests.push(test);
        });

        labTests.forEach(test => {
            if (!groupedByDate[test.date]) {
                groupedByDate[test.date] = { fitnessTests: [], labTests: [] };
            }
            groupedByDate[test.date].labTests.push(test);
        });

        // Convert to history format and sort by date (newest first)
        const history = Object.entries(groupedByDate).map(([date, tests]) => ({
            date,
            fitnessTests: tests.fitnessTests,
            labTests: tests.labTests
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        console.log('Test history:', history); // Debug log
        setTestHistory(history);

        // Load most recent data if available, otherwise initialize with today's date
        if (history.length > 0) {
            const mostRecentDate = history[0].date;
            setTestHistory(history); // ✅ update history first
            setCurrentTestDate(mostRecentDate);
            
            // ✅ use data directly from history to avoid relying on async state
            const record = history.find(record => record.date === mostRecentDate);
            if (record) {
                const fitnessMap = new Map(record.fitnessTests.map(test => [test.test, test]));
                const labMap = new Map(record.labTests.map(test => [test.test, test]));

                const updatedResults = fitnessTestTemplates.map(template => {
                    const item = fitnessMap.get(template.test);
                    return {
                        ...template,
                        result1: item?.result1 || '',
                        result2: item?.result2 || '',
                        date: mostRecentDate
                    };
                });
                setResults(updatedResults);

                const updatedLabResults = labTestTemplates.map(template => {
                    const item = labMap.get(template.test);
                    return {
                        ...template,
                        value: item?.value || '',
                        date: mostRecentDate
                    };
                });
                setLabResults(updatedLabResults);
            }
        } else {
            // No history, initialize with today's date and empty data
            const today = getCurrentDate();
            setCurrentTestDate(today);
            initializeResultsWithDate(today);
        }
    };

    const initializeResultsWithDate = (date: string) => {
        // Initialize fitness test results
        const fitnessResults = fitnessTestTemplates.map(template => ({
            ...template,
            date: date,
            result1: '',
            result2: ''
        }));
        setResults(fitnessResults);

        // Initialize lab test results
        const labResultsData = labTestTemplates.map(template => ({
            ...template,
            date: date,
            value: ''
        }));
        setLabResults(labResultsData);
    };

    const handleToggleEdit = () => {
        if (!isEditing) {
            // When starting to edit, ensure we have a valid date
            if (!currentTestDate) {
                const today = getCurrentDate();
                setCurrentTestDate(today);
                initializeResultsWithDate(today);
            }
        }
        setIsEditing(!isEditing);
    };

    const generateTestHistory = (data: Trainee): TestRecord[] => {
        const groupedByDate: { [date: string]: { fitnessTests: FitnessTest[], labTests: LabTest[] } } = {};

        (data.fitness_tests || []).forEach(test => {
            const date = test.date; // ✅ Use as-is
            if (!groupedByDate[date]) groupedByDate[date] = { fitnessTests: [], labTests: [] };
            groupedByDate[date].fitnessTests.push(test);
        });

        (data.lab_tests || []).forEach(test => {
            const date = test.date; // ✅ Use as-is
            if (!groupedByDate[date]) groupedByDate[date] = { fitnessTests: [], labTests: [] };
            groupedByDate[date].labTests.push(test);
        });

        return Object.entries(groupedByDate).map(([date, tests]) => ({
            date,
            fitnessTests: tests.fitnessTests,
            labTests: tests.labTests
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };


    const preloadTestDataFromRecord = (record: TestRecord, date: string) => {
        const fitnessMap = new Map(record.fitnessTests.map(test => [test.test, test]));
        const labMap = new Map(record.labTests.map(test => [test.test, test]));

        const updatedResults = fitnessTestTemplates.map(template => {
            const item = fitnessMap.get(template.test);
            return {
                ...template,
                result1: item?.result1 || '',
                result2: item?.result2 || '',
                date
            };
        });
        setResults(updatedResults);

        const updatedLabResults = labTestTemplates.map(template => {
            const item = labMap.get(template.test);
            return {
                ...template,
                value: item?.value || '',
                date
            };
        });
        setLabResults(updatedLabResults);
    };


    const handleSave = async () => {
        if (!currentTestDate) {
            Alert.alert('Error', 'Please select a test date');
            return;
        }

        setLoading(true);
        try {
            // Prepare fitness tests data (only include tests with results)
            const fitnessTestsToSave = results
                .filter(test => test.result1.trim() || test.result2.trim())
                .map(test => ({
                    date: currentTestDate,
                    category: test.category,
                    test: test.test,
                    result1: test.result1.trim(),
                    result2: test.result2.trim()
                }));

            // Prepare lab tests data (only include tests with values)
            const labTestsToSave = labResults
                .filter(test => test.value.trim())
                .map(test => ({
                    date: currentTestDate,
                    category: test.category,
                    test: test.test,
                    value: test.value.trim()
                }));

            // Get existing tests that are not from current date
            const existingFitnessTests = (traineeData.fitness_tests || []).filter(test => test.date !== currentTestDate);
            const existingLabTests = (traineeData.lab_tests || []).filter(test => test.date !== currentTestDate);

            // Combine existing tests with new ones
            const updatedFitnessTests = [...existingFitnessTests, ...fitnessTestsToSave];
            const updatedLabTests = [...existingLabTests, ...labTestsToSave];

            // Update trainee data
            const updatedData = {
                ...traineeData,
                fitness_tests: updatedFitnessTests,
                lab_tests: updatedLabTests
            };

            // Send to backend
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${backendUrl}/trainees/${trainee.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`,
                },
                body: JSON.stringify(updatedData),
            });

            if (response.ok) {
            const savedData = await response.json();

            // ✅ Extract only trainee data
            const traineeOnly = {
                ...traineeData,
                fitness_tests: updatedFitnessTests,
                lab_tests: updatedLabTests
            };

            setTraineeData(traineeOnly);
            // Instead of waiting for async state to update, do it immediately
            const history = generateTestHistory(traineeOnly); // ✅ generate locally
            console.log('Generated history after save:', history); 
            setTestHistory(history);
            setTraineeData(traineeOnly);

            setCurrentTestDate(currentTestDate); // 🔁 re-set same date

            const record = history.find(record => record.date === currentTestDate);
            if (record) {
                preloadTestDataFromRecord(record, currentTestDate);
            }
            
            setIsEditing(false);
            showToast('Assessment saved successfully!');
        } else {
                throw new Error('Failed to save data');
            }
        } catch (error) {
            console.error('Error saving data:', error);
            Alert.alert('Error', 'Failed to save assessment data');
        } finally {
            setLoading(false);
        }
    };

    // Helper function to validate numeric input
    const validateNumericInput = (text: string): string => {
        // Allow numbers, decimal points, and empty string
        const numericRegex = /^\d*\.?\d*$/;
        return numericRegex.test(text) ? text : '';
    };

    const updateResult = (id: number, field: 'result1' | 'result2', value: string) => {
        const validatedValue = validateNumericInput(value);
        if (value === '' || validatedValue === value) {
            setResults(prev => prev.map(item => 
                item.id === id ? { ...item, [field]: validatedValue } : item
            ));
        }
    };

    const updateLabResult = (id: number, field: 'value', value: string) => {
        const validatedValue = validateNumericInput(value);
        if (value === '' || validatedValue === value) {
            setLabResults(prev => prev.map(item => 
                item.id === id ? { ...item, [field]: validatedValue } : item
            ));
        }
    };

    const loadHistoryData = (date: string) => {
        console.log('Loading history data for date:', date); // Debug log
        console.log('Available test history:', testHistory); // Debug log
        
        const historyRecord = testHistory.find(record => record.date === date);
        console.log('Found history record:', historyRecord); // Debug log
        
        if (historyRecord) {
            // Create a map for quick lookup
            const fitnessMap = new Map(historyRecord.fitnessTests.map(test => [test.test, test]));
            const labMap = new Map(historyRecord.labTests.map(test => [test.test, test]));
            
            console.log('Fitness map:', fitnessMap); // Debug log
            console.log('Lab map:', labMap); // Debug log
            
            // Update current results with historical data
            setResults(prev => prev.map(item => {
                const historyItem = fitnessMap.get(item.test);
                return historyItem ? { 
                    ...item, 
                    result1: historyItem.result1 || '', 
                    result2: historyItem.result2 || '',
                    date: date
                } : { ...item, result1: '', result2: '', date: date };
            }));
            
            setLabResults(prev => prev.map(item => {
                const historyItem = labMap.get(item.test);
                return historyItem ? { 
                    ...item, 
                    value: historyItem.value || '',
                    date: date
                } : { ...item, value: '', date: date };
            }));
        } else {
            // If no history record found, initialize with empty values for the selected date
            setResults(prev => prev.map(item => ({ 
                ...item, 
                result1: '', 
                result2: '', 
                date: date 
            })));
            
            setLabResults(prev => prev.map(item => ({ 
                ...item, 
                value: '', 
                date: date 
            })));
        }
        
        setCurrentTestDate(date);
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

    const createNewAssessment = () => {
        const today = getCurrentDate();
        setCurrentTestDate(today);
        initializeResultsWithDate(today);
        setShowHistoryModal(false);
    };

    // Check if any data has been entered
    const hasDataEntered = () => {
        const hasFitnessData = results.some(test => test.result1.trim() || test.result2.trim());
        const hasLabData = labResults.some(test => test.value.trim());
        return hasFitnessData || hasLabData;
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
                <View style={styles.dateCard}>
                    <View style={styles.dateHeader}>
                        <MaterialIcons name="event" size={24} color="#3B82F6" />
                        <Text style={styles.dateTitle}>Assessment Date</Text>
                    </View>
                    <View style={styles.dateControls}>
                        {isEditing ? (
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

            {/* Single Action Button */}
            <View style={styles.actionButtonContainer}>
                <TouchableOpacity
                    onPress={isEditing ? handleSave : handleToggleEdit}
                    style={[styles.mainActionButton, isEditing ? styles.saveButton : styles.editButton]}
                    disabled={loading}
                >
                    <MaterialIcons 
                        name={isEditing ? "save" : "edit"} 
                        size={20} 
                        color="white" 
                    />
                    <Text style={styles.mainActionButtonText}>
                        {loading ? 'Saving...' : (isEditing ? 'Save Assessment' : 'Edit Assessment')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Physical Fitness Tests Section */}
            <View style={styles.majorSection}>
                <View style={styles.majorSectionHeader}>
                    <View style={styles.sectionTitleContainer}>
                        <MaterialIcons name="fitness-center" size={24} color="#3B82F6" />
                        <Text style={styles.majorSectionTitle}>Physical Fitness Tests</Text>
                    </View>
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
                                                                keyboardType="numeric"
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
                                                                keyboardType="numeric"
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
                                                    {isEditing ? (
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
                            onPress={createNewAssessment}
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
                                            {record.fitnessTests.length} fitness tests, {' '}
                                            {record.labTests.length} lab tests
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
// Action Button Container - NEW
  actionButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FAFBFC',
  },

  // Main Action Button - NEW
  mainActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },

  // Main Action Button Text - NEW
  mainActionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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