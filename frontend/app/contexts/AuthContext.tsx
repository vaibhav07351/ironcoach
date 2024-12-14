import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextType = {
    isAuthenticated: boolean;
    login: (token: string) => void;
    logout: () => void;
};

type AuthProviderProps = {
    children: ReactNode;
};

export const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    login: () => {},
    logout: () => {},
});

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const checkToken = async () => {
        const token = await AsyncStorage.getItem('token');
        // console.log('Check token:', token); // Debug token presence
        setIsAuthenticated(!!token);
    };

    useEffect(() => {
        checkToken(); // Check token on app load
    }, []);

    const login = async (token: string) => {
        // console.log("here token is: ",token)
        await AsyncStorage.setItem('token', token);
        // console.log("here token2 is: ",token)
        await checkToken(); // Revalidate authentication state
    };

    const logout = async () => {
        await AsyncStorage.removeItem('token');
        const token = await AsyncStorage.getItem('token');
        console.log('Token after logout:', token); // Debug: Should log null
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
