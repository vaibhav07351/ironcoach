import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigation = useNavigation<NavigationProp>();

    const { login } = useContext(AuthContext); // Use login function from AuthContext

    const handleLogin = async () => {
        try {
            const response = await fetch('http://192.168.1.10:8080/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                throw new Error('Invalid credentials');
            }

            const { token } = await response.json();
            console.log('login token:', token);

            // Call login function from AuthContext
            await login(token);

            Alert.alert('Login Successful', 'Welcome back!');
            navigation.navigate('Dashboard'); // Navigate after successful login
        } catch (error: unknown) {
            if (error instanceof Error) {
                Alert.alert('Login Failed', error.message);
            } else {
                Alert.alert('Login Failed', 'An unknown error occurred.');
            }
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.linkText}>Don't have an account? Sign up</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
    input: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#6200ee',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    buttonText: { color: '#fff', textAlign: 'center', fontSize: 16 },
    linkText: { color: '#6200ee', textAlign: 'center' },
});
