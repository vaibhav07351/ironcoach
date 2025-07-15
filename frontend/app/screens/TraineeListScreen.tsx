import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Button,
    Alert,
    Image,
    TextInput,
    ScrollView,
    PanResponder,
    Platform,
    Modal,
    Dimensions,
    Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Trainee } from '../types/trainee';
import { Colors, Spacing } from '../../constants/theme';
import { useIsFocused } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Constants from 'expo-constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Trainees'>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Enhanced Delete Confirmation Modal
function DeleteConfirmationModal({ 
    visible, 
    onConfirm, 
    onCancel, 
    traineeName,
    isLoading 
}: {
    visible: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    traineeName: string;
    isLoading: boolean;
}) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.8,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onCancel}
        >
            <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
                <Animated.View style={[
                    styles.modalContainer,
                    { transform: [{ scale: scaleAnim }] }
                ]}>
                    <View style={styles.modalHeader}>
                        <Ionicons name="warning" size={48} color="#FF6B6B" />
                        <Text style={styles.modalTitle}>Delete Trainee</Text>
                    </View>
                    
                    <Text style={styles.modalMessage}>
                        Are you sure you want to permanently delete{'\n'}
                        <Text style={styles.modalTraineeName}>{traineeName}</Text>?
                    </Text>
                    
                    <View style={styles.modalButtonContainer}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={onCancel}
                            disabled={isLoading}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.modalButton, styles.deleteButton]}
                            onPress={onConfirm}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="trash-outline" size={16} color="#fff" />
                                    <Text style={styles.deleteButtonText}>Delete</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

export default function TraineeListScreen({ route, navigation }: Props) {
    const { status } = route.params;
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [filteredTrainees, setFilteredTrainees] = useState<Trainee[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const isFocused = useIsFocused();
    const [selectedChar, setSelectedChar] = useState<string | null>(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [traineeToDelete, setTraineeToDelete] = useState<Trainee | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [hoveredChar, setHoveredChar] = useState<string | null>(null);
    const [alphabetHeight, setAlphabetHeight] = useState(0);
    const alphabetScrollY = useRef(new Animated.Value(0)).current;
    const [scrollY] = useState(new Animated.Value(0));
    
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    const fetchTrainees = async () => {
        setIsLoading(true);
        const backendUrl = Constants.expoConfig?.extra?.backendUrl;
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }

            const response = await fetch(`${backendUrl}/trainees?active_status=${status}`, {
                headers: { Authorization: `${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch trainees');
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                setTrainees([]);
                setFilteredTrainees([]);
                return;
            }

            const sortedTrainees = data.sort((a: Trainee, b: Trainee) =>
                a.name.localeCompare(b.name)
            );
            setTrainees(sortedTrainees);
            setFilteredTrainees(sortedTrainees);
        } catch (error) {
            console.error('Error fetching trainees:', error);
            setTrainees([]);
            setFilteredTrainees([]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setSelectedChar(null);
        if (query.trim() === '') {
            setFilteredTrainees(trainees);
        } else {
            setFilteredTrainees(
                trainees.filter((trainee) =>
                    trainee.name.toLowerCase().includes(query.toLowerCase())
                )
            );
        }
    };

    const handleAlphabeticalFilter = (character: string) => {
        setSelectedChar(character);
        setSearchQuery('');
        setFilteredTrainees(
            trainees.filter((trainee) =>
                trainee.name.toLowerCase().startsWith(character.toLowerCase())
            )
        );
    };

    const resetFilter = () => {
        setSelectedChar(null);
        setSearchQuery('');
        setFilteredTrainees(trainees);
    };

    const deleteTrainee = async (id: string) => {
        setIsDeleting(true);
        const backendUrl = Constants.expoConfig?.extra?.backendUrl;
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }

            const response = await fetch(`${backendUrl}/trainees/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to delete trainee');
            }

            setTrainees((prevTrainees) =>
                prevTrainees.filter((trainee) => trainee.id !== id)
            );
            setFilteredTrainees((prevTrainees) =>
                prevTrainees.filter((trainee) => trainee.id !== id)
            );
            
            setDeleteModalVisible(false);
            setTraineeToDelete(null);
        } catch (error) {
            console.error('Error deleting trainee:', error);
            Alert.alert('Error', 'Failed to delete trainee. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeletePress = (trainee: Trainee) => {
        setTraineeToDelete(trainee);
        setDeleteModalVisible(true);
    };

    const handleDeleteConfirm = () => {
        if (traineeToDelete) {
            deleteTrainee(traineeToDelete.id);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModalVisible(false);
        setTraineeToDelete(null);
    };

    useEffect(() => {
        if (isFocused) {
            fetchTrainees();
        }
    }, [isFocused, status]);

    const handleTraineeSelect = (trainee: Trainee) => {
        navigation.navigate('TraineeDetail', { trainee });
    };

    // Enhanced PanResponder for better touch handling with visual feedback
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationY } = evt.nativeEvent;
                const itemHeight = Math.max(20, (alphabetHeight - 40) / 26); // Dynamic height calculation
                const index = Math.floor((locationY - 20) / itemHeight);
                if (index >= 0 && index < 26) {
                    const char = alphabet[index];
                    setHoveredChar(char);
                    setSelectedChar(char);
                    handleAlphabeticalFilter(char);
                }
            },
            onPanResponderMove: (evt) => {
                const { locationY } = evt.nativeEvent;
                const itemHeight = Math.max(20, (alphabetHeight - 40) / 26); // Dynamic height calculation
                const index = Math.floor((locationY - 20) / itemHeight);
                if (index >= 0 && index < 26) {
                    const char = alphabet[index];
                    if (char !== hoveredChar) {
                        setHoveredChar(char);
                        setSelectedChar(char);
                        handleAlphabeticalFilter(char);
                    }
                }
            },
            onPanResponderRelease: () => {
                setHoveredChar(null);
            },
        })
    ).current;

    const renderTraineeItem = ({ item, index }: { item: Trainee; index: number }) => {
        const animatedStyle = {
            opacity: scrollY.interpolate({
                inputRange: [0, 50],
                outputRange: [1, 0.8],
                extrapolate: 'clamp',
            }),
            transform: [
                {
                    translateY: scrollY.interpolate({
                        inputRange: [0, 50],
                        outputRange: [0, -10],
                        extrapolate: 'clamp',
                    }),
                },
            ],
        };

        return (
            <Animated.View style={[styles.cardContainer, animatedStyle]}>
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => handleTraineeSelect(item)}
                    activeOpacity={0.8}
                >
                    <View style={styles.profileImageContainer}>
                        <Image
                            source={{
                                uri: item?.image_url?.trim() ||
                                    'https://res.cloudinary.com/vaibhav07351/image/upload/v1735825573/tisqhtqxaydhprbwtsld.png',
                            }}
                            style={styles.profileImage}
                        />
                        <View style={styles.statusIndicator} />
                    </View>
                    <View style={styles.traineeInfo}>
                        <Text style={styles.cardText}>{item.name}</Text>
                        <Text style={styles.traineeId}>ID: {item.id.slice(-8)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleDeletePress(item)}
                    style={styles.deleteIconButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                </TouchableOpacity>
            </Animated.View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Loading trainees...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Enhanced Alphabet Sidebar */}
            <View 
                style={styles.alphabetSidebar}
                onLayout={(event) => {
                    const { height } = event.nativeEvent.layout;
                    setAlphabetHeight(height);
                }}
            >
                <ScrollView
                    contentContainerStyle={styles.alphabetScrollContainer}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                >
                    <View style={styles.alphabetContainer} {...panResponder.panHandlers}>
                        {alphabet.map((char, index) => {
                            const isSelected = selectedChar === char;
                            const isHovered = hoveredChar === char;
                            const isActive = isSelected || isHovered;
                            
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.alphabetItem,
                                        isActive && styles.selectedAlphabetItem,
                                        isHovered && styles.hoveredAlphabetItem,
                                    ]}
                                    onPress={() => handleAlphabeticalFilter(char)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.alphabetText,
                                        isActive && styles.selectedAlphabetText,
                                    ]}>
                                        {char}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
                
                {selectedChar && (
                    <TouchableOpacity
                        style={styles.resetButton}
                        onPress={resetFilter}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close" size={14} color="#666" />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.mainContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {status === true ? 'Active Trainees' : 'Inactive Trainees'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {filteredTrainees.length} {filteredTrainees.length === 1 ? 'trainee' : 'trainees'}
                    </Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search trainees..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => handleSearch('')}
                            style={styles.clearButton}
                        >
                            <Ionicons name="close-circle" size={20} color="#666" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter Indicator */}
                {selectedChar && (
                    <View style={styles.filterIndicator}>
                        <Text style={styles.filterText}>Showing names starting with "{selectedChar}"</Text>
                        <TouchableOpacity onPress={resetFilter} style={styles.filterClearButton}>
                            <Text style={styles.filterClearText}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Trainee List */}
                {(!filteredTrainees || filteredTrainees.length === 0) ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons 
                            name="people-outline" 
                            size={64} 
                            color="#ccc" 
                            style={styles.emptyIcon}
                        />
                        <Text style={styles.emptyTitle}>No trainees found</Text>
                        <Text style={styles.emptyText}>
                            {searchQuery || selectedChar
                                ? 'Try adjusting your search or filter'
                                : status === true
                                ? 'No active trainees available'
                                : 'No inactive trainees available'}
                        </Text>
                    </View>
                ) : (
                    <Animated.FlatList
                        data={filteredTrainees}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTraineeItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContainer}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: true }
                        )}
                        scrollEventThrottle={16}
                    />
                )}

                {/* Add Trainee Button */}
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('TraineeForm', {})}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                    <Text style={styles.addButtonText}>Add Trainee</Text>
                </TouchableOpacity>
            </View>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                visible={deleteModalVisible}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
                traineeName={traineeToDelete?.name || ''}
                isLoading={isDeleting}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    alphabetSidebar: {
        width: 45,
        backgroundColor: '#ffffff',
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0',
        paddingVertical: 10,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    alphabetScrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 10,
    },
    alphabetContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    alphabetItem: {
        width: 28,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        marginVertical: 0.5,
        backgroundColor: 'transparent',
    },
    selectedAlphabetItem: {
        backgroundColor: '#6366f1',
        transform: [{ scale: 1.3 }],
        elevation: 3,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    hoveredAlphabetItem: {
        backgroundColor: '#e0e7ff',
        transform: [{ scale: 1.15 }],
    },
    alphabetText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748b',
    },
    selectedAlphabetText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 11,
    },
    resetButton: {
        marginTop: 8,
        padding: 6,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    mainContent: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        fontWeight: '500',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1e293b',
    },
    clearButton: {
        padding: 4,
    },
    filterIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 16,
    },
    filterText: {
        fontSize: 14,
        color: '#3730a3',
        fontWeight: '500',
    },
    filterClearButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    filterClearText: {
        fontSize: 14,
        color: '#6366f1',
        fontWeight: '600',
    },
    listContainer: {
        paddingBottom: 100,
    },
    cardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    card: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    profileImageContainer: {
        position: 'relative',
        marginRight: 16,
    },
    profileImage: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#f1f5f9',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10b981',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    traineeInfo: {
        flex: 1,
    },
    cardText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    traineeId: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    deleteIconButton: {
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    addButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366f1',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 28,
        elevation: 4,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    addButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        marginHorizontal: 20,
        minWidth: 300,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        marginTop: 12,
    },
    modalMessage: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    modalTraineeName: {
        fontWeight: '600',
        color: '#1e293b',
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        marginTop: 8,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
        flexDirection: 'row',
    },
    cancelButton: {
        backgroundColor: '#f8fafc',
        borderWidth: 2,
        borderColor: '#e2e8f0',
    },
    cancelButtonText: {
        color: '#475569',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: '#dc2626',
        gap: 8,
        elevation: 2,
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    deleteButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});