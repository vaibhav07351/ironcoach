import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Trainee } from '../types/trainee';
import { Colors, Spacing } from '../../constants/theme';
import { useIsFocused } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Props = NativeStackScreenProps<RootStackParamList, 'Trainees'>;

export default function TraineeListScreen({ route, navigation }: Props) {
    const { status } = route.params; // "active" or "inactive"
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const isFocused = useIsFocused(); // Check if the screen is in focus

    const fetchTrainees = async () => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }

            const response = await fetch(`http://192.168.1.10:8080/trainees?active_status=${status}`, {
                headers: { Authorization: `${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch trainees');
            }

            const data = await response.json();
            setTrainees(data); // Assuming the API returns an array of Trainee objects
        } catch (error) {
            console.error('Error fetching trainees:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteTrainee = async (id: string) => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No token found. Redirecting to login.');
                navigation.navigate('Login');
                return;
            }

            const response = await fetch(`http://192.168.1.10:8080/trainees/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to delete trainee');
            }

            // Remove the deleted trainee from the list
            setTrainees((prevTrainees) => prevTrainees.filter((trainee) => trainee.id !== id));
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

    if (isLoading) {
        return <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {status === true ? 'Active Trainees' : 'Inactive Trainees'}
            </Text>
            <FlatList
                data={trainees}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.cardContainer}>
                        <TouchableOpacity
                            
                            style={styles.card}
                            onPress={() => handleTraineeSelect(item)}
                        >

                                <Image
                                    source={{
                                        uri: item?.image_url || 'https://pixabay.com/get/ga888f12adb8d8613af71848c7fc56a61b5a358fced614a0309cf598e86b735a5cda4c3d25ea5f5a2c1f4645388bcef2d_1280.png',
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
                                        { text: 'Delete', style: 'destructive', onPress: () => deleteTrainee(item.id) },
                                    ]
                                )
                            }
                            style={styles.iconContainer}>
                            <Ionicons name="trash-outline" size={24} color="red" />
                        </TouchableOpacity>
                    </View>
                )}
            />
            <Button title="+ Add Trainee" onPress={() => navigation.navigate('TraineeForm', {})} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: Spacing.medium,
    },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
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
        flexDirection: 'row', // Align image and text horizontally
        justifyContent: 'flex-start', // Align content to the start
        alignItems: 'center', // Vertically center the items
        paddingVertical: 10,
        flex: 1,
    },
    cardText: { 
        fontSize: 18, 
        color: '#333',
        textAlign: 'center', // Ensure the name is centered
        flexGrow: 1, // Makes the text take available space to center it
        maxWidth: '70%', // Limit the width of the name to prevent overflow
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8, // Adds spacing between text and icon
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 40,
        marginRight: 16, // Space between image and name
    },
});



