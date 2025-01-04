import React, { useEffect, useState , useRef } from 'react';
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

export default function TraineeListScreen({ route, navigation }: Props) {
    const { status } = route.params; // "active" or "inactive"
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [filteredTrainees, setFilteredTrainees] = useState<Trainee[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const isFocused = useIsFocused(); // Check if the screen is in focus
    const [hoveredAlphabet, setHoveredAlphabet] = useState<string | null>(null); // For dynamic highlighting
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const [selectedChar, setSelectedChar] = useState<string | null>(null); // To highlight selected character
   
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
        setFilteredTrainees(
            trainees.filter((trainee) =>
                trainee.name.toLowerCase().startsWith(character.toLowerCase())
            )
        );
    };

    const deleteTrainee = async (id: string) => {
        setIsLoading(true);
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
        } catch (error) {
            console.error('Error deleting trainee:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchTrainees(); // Fetch the list of trainees whenever the screen comes into focus
        }
    }, [isFocused, status]); // Trigger fetch when the screen is focused or status changes

    const handleTraineeSelect = (trainee: Trainee) => {
        navigation.navigate('TraineeDetail', { trainee });
    };

    // PanResponder for detecting drag gestures
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (evt, gestureState) => {
                // Calculate the hovered character based on gesture position
                const index = Math.floor(gestureState.moveY / 30); // Assuming each character is 30px tall
                if (index >= 0 && index < 26) {
                    const char = String.fromCharCode(65 + index);
                    setSelectedChar(char); // Update the highlighted character
                }
            },
            onPanResponderRelease: () => {
                if (selectedChar) {
                    handleAlphabeticalFilter(selectedChar); // Apply filter
                }
            },
        })
    ).current;

    if (isLoading) {
        return <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />;
    }

    return (
        <View style={styles.container}>
            {/* Alphabet Sidebar */}
            <View style={styles.alphabetList} {...panResponder.panHandlers}>
                {alphabet.map((char, index) => (
                    <View
                        key={index}
                        style={[
                            styles.alphabetCharContainer,
                            selectedChar === char && styles.highlightedChar,
                        ]}
                    >
                        <Text style={selectedChar === char ? styles.highlightedText : styles.alphabetChar}>
                            {char}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={styles.mainContent}>
                <Text style={styles.title}>
                    {status === true ? 'Active Trainees' : 'Inactive Trainees'}
                </Text>
                <TextInput
                    style={styles.searchBar}
                    placeholder="Search trainees..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
                {(!filteredTrainees || filteredTrainees.length === 0) ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {status === true
                                ? 'No active trainees available'
                                : 'No inactive trainees available'}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredTrainees}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.cardContainer}>
                                <TouchableOpacity
                                    style={styles.card}
                                    onPress={() => handleTraineeSelect(item)}
                                >
                                    <Image
                                        source={{
                                            uri:
                                                item?.image_url?.trim() ||
                                                'https://res.cloudinary.com/vaibhav07351/image/upload/v1735825573/tisqhtqxaydhprbwtsld.png',
                                        }}
                                        style={styles.profileImage}
                                    />
                                    <Text style={styles.cardText}>{item.name}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() =>
                                        Alert.alert(
                                            'Delete Trainee',
                                            `Are you sure you want to delete ${item.name}?`,
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Delete',
                                                    style: 'destructive',
                                                    onPress: () =>
                                                        deleteTrainee(item.id),
                                                },
                                            ]
                                        )
                                    }
                                    style={styles.iconContainer}
                                >
                                    <Ionicons name="trash-outline" size={24} color="red" />
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                )}
                <Button
                    title="+ Add Trainee"
                    onPress={() => navigation.navigate('TraineeForm', {})}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: Colors.background,
    },
    alphabetList: {
        width: 40,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.small,
        backgroundColor: '#f5f5f5',
    },
    alphabetCharContainer: {
        height: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alphabetChar: {
        fontSize: 14,
        color: '#333',
    },
    highlightedChar: {
        backgroundColor: '#6200ee',
        borderRadius: 15,
    },
    highlightedText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    mainContent: {
        flex: 1,
        padding: Spacing.medium,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    searchBar: {
        height: 40,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 8,
        marginBottom: 16,
    },
    cardContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: '#E9E9E9',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    cardText: {
        fontSize: 18,
        color: '#333',
        marginLeft: 12,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 18,
        color: '#888',
    },
    iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5, // Adds padding around the icon for better touch targets
    backgroundColor: '#F9F9F9', // Optional: Light background color to make it stand out
    borderRadius: 8, // Rounded corners
    shadowColor: '#000', // Shadow for better visibility
    shadowOffset: { width: 0, height: 2 }, // Slight shadow offset
    shadowOpacity: 0.1, // Shadow transparency
    shadowRadius: 4, // Shadow blur
    elevation: 2, // Shadow for Android
},

});
