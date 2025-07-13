import React, { useState, useContext } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    Linking, 
    ActivityIndicator, 
    Dimensions, 
    Platform,
    KeyboardAvoidingView,
    ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import { useWindowDimensions } from 'react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const { width } = useWindowDimensions();

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const navigation = useNavigation<NavigationProp>();
    const { login } = useContext(AuthContext);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            const backendUrl = Constants.expoConfig?.extra?.backendUrl;
            const response = await fetch(`${backendUrl}/login`, {
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

            await login(token);

            Toast.show({
                type: 'success',
                text1: 'Login Successful',
                text2: 'Welcome back!',
            });
            navigation.navigate('Dashboard');
        } catch (error: unknown) {
            if (error instanceof Error) {
                Toast.show({
                    type: 'error',
                    text1: 'Login Failed',
                    text2: error.message,
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Login Failed',
                    text2: 'An unknown error occurred.',
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Background decorative elements */}
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />
                
                <View style={styles.formContainer}>
                    {/* Welcome Section */}
                    <View style={styles.welcomeSection}>
                        <Text style={styles.welcomeTitle}>Welcome Back</Text>
                        <Text style={styles.welcomeSubtitle}>Sign in to continue</Text>
                    </View>

                    {/* Login Form */}
                    <View style={styles.formCard}>
                        <Text style={styles.title}>Login</Text>
                        
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoCorrect={false}
                        />
                        
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#999"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Login</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => navigation.navigate('Signup')}
                            style={styles.linkContainer}
                        >
                            <Text style={styles.linkText}>
                                Don't have an account? <Text style={styles.linkTextBold}>Sign up</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Crafted with ❤️ by Vaibhav Bhardwaj</Text>
                    <Text style={styles.footerText}>Questions? Let's connect!</Text>
                    <TouchableOpacity 
                        onPress={() => Linking.openURL('mailto:vaibhav07351@gmail.com')}
                        style={styles.emailContainer}
                    >
                        <Text style={styles.footerLink}>vaibhav07351@gmail.com</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#667eea',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
    },
    decorativeCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        top: -100,
        right: -100,
    },
    decorativeCircle2: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        bottom: 100,
        left: -75,
    },
    formContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    welcomeTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '300',
    },
    formCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: 30,
        width: Math.max(width * 0.9, 400),  // ensure a minimum width
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
        color: '#333',
    },
    input: {
        padding: 16,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        marginBottom: 20,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#f8f9fa',
    },
    button: {
        backgroundColor: '#ff6b6b',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: '#ff6b6b',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
        shadowOpacity: 0.1,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    linkContainer: {
        marginTop: 10,
        alignItems: 'center',
    },
    linkText: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
    },
    linkTextBold: {
        color: '#667eea',
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        marginTop: 30,
        paddingVertical: 20,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 15,
        marginHorizontal: 10,
    },
    footerText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        marginBottom: 5,
        fontWeight: '300',
    },
    emailContainer: {
        marginTop: 5,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    footerLink: {
        color: '#fff',
        fontWeight: '500',
        fontSize: 14,
    },
});