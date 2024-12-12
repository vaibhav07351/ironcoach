import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert,
} from 'react-native';

export default function DietEntryScreen() {
    const [meal, setMeal] = useState('');
    const [calories, setCalories] = useState('');
    const [dietEntries, setDietEntries] = useState<
        { id: number; meal: string; calories: number }[]
    >([]);

    const handleAddEntry = () => {
        if (!meal || !calories) {
            Alert.alert('Error', 'Please enter both meal and calories.');
            return;
        }
        const newEntry = {
            id: dietEntries.length + 1,
            meal,
            calories: parseFloat(calories),
        };
        setDietEntries((prevEntries) => [...prevEntries, newEntry]);
        setMeal('');
        setCalories('');
    };

    const handleDeleteEntry = (id: number) => {
        setDietEntries((prevEntries) => prevEntries.filter((entry) => entry.id !== id));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Diet Entry</Text>
            <TextInput
                style={styles.input}
                placeholder="Meal Name"
                value={meal}
                onChangeText={setMeal}
            />
            <TextInput
                style={styles.input}
                placeholder="Calories"
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddEntry}>
                <Text style={styles.addButtonText}>Add Meal</Text>
            </TouchableOpacity>
            <FlatList
                data={dietEntries}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.entryRow}>
                        <Text style={styles.entryText}>
                            {item.meal}: {item.calories} kcal
                        </Text>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteEntry(item.id)}>
                            <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        backgroundColor: '#fff',
    },
    addButton: {
        backgroundColor: '#6200ee',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16,
    },
    addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    entryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderColor: '#ccc',
    },
    entryText: { fontSize: 16 },
    deleteButton: { backgroundColor: '#d9534f', padding: 8, borderRadius: 4 },
    deleteButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
