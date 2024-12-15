import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false); // State for loading
    const navigation = useNavigation<NavigationProp>();

    const { login } = useContext(AuthContext); // Use login function from AuthContext

    const handleLogin = async () => {
        setIsLoading(true); // Start loading
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

            // Alert.alert('Login Successful', 'Welcome back!');
            navigation.navigate('Dashboard'); // Navigate after successful login
        } catch (error: unknown) {
            if (error instanceof Error) {
                Alert.alert('Login Failed', error.message);
            } else {
                Alert.alert('Login Failed', 'An unknown error occurred.');
            }
        } finally {
            setIsLoading(false); // Stop loading
        }
    };

    // if (isLoading) {
    //     return <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 280 }} />;
    // }

    return (
        <View style={styles.container}>
            <View style={styles.formContainer}>
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
                
                {/* Show loading spinner when isLoading is true */}
                {isLoading ? (
                    <ActivityIndicator size="large" color="#6200ee" />
                ) : (
                    <TouchableOpacity style={styles.button} onPress={handleLogin}>
                        <Text style={styles.buttonText}>Login</Text>
                    </TouchableOpacity>
                )}
                

                <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                    <Text style={styles.linkText}>Don't have an account? Sign up</Text>
                </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Developed by Vaibhav Bhardwaj</Text>
                <Text style={styles.footerText}>For inquiries, feel free to reach out at:</Text>
                <TouchableOpacity onPress={() => Linking.openURL('mailto:vaibhav07351@gmail.com')}>
                    <Text style={[styles.footerText, styles.footerLink]}>vaibhav07351@gmail.com</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        justifyContent: 'space-between', // This will push the footer to the bottom
    },
    formContainer: {
        flex: 1,
        justifyContent: 'center', // Centers the form content
    },
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
    footer: {
        alignItems: 'center',
        marginTop: 20, // Add some space between the form and the footer
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#ddd', // Subtle border at the top
        width: '100%', // Ensure footer spans the full width
    },
    footerText: {
        fontSize: 14,
        color: '#555', // A softer gray for the text
        fontWeight: '500', // Slightly lighter font weight for a modern feel
        textAlign: 'center',
        marginBottom: 1, // Adds spacing between footer lines
    },
    footerLink: {
        color: '#6200ee', // Keep the link color consistent with buttons
        fontWeight: '600',
        textDecorationLine: 'underline', // Adds underline for links
    },
});
