import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextType = {
    isAuthenticated: boolean;
    login: (token: string) => Promise<void>; // Make it return a Promise
    logout: () => void;
};

type AuthProviderProps = {
    children: ReactNode;
};

export const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    login: async () => {},
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

    const login = async (token: string): Promise<void> => {
        // console.log("here token is: ",token)
        await AsyncStorage.setItem('token', token);
        // console.log("here token2 is: ",token)
        
        // Use Promise to ensure state update completes
        return new Promise((resolve) => {
            setIsAuthenticated(true);
            // Use setTimeout to ensure state update has been processed
            setTimeout(() => {
                resolve();
            }, 0);
        });
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