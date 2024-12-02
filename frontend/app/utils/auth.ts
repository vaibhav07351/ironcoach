import AsyncStorage from '@react-native-async-storage/async-storage';

export const getAuthToken = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem('token');
    } catch (error) {
        console.error('Failed to retrieve token:', error);
        return null;
    }
};

export const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getAuthToken();

    const headers = {
        ...options.headers,
        Authorization: `${token}`,
    };

    return fetch(url, { ...options, headers });
};
