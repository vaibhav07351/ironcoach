import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Fonts } from '../constants/theme';

type CardProps = {
    title: string;
    subtitle?: string;
    onPress: () => void;
};

export default function Card({ title, subtitle, onPress }: CardProps) {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        padding: Spacing.medium,
        marginVertical: Spacing.small,
        borderRadius: Spacing.small,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    title: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: Colors.textSecondary,
    },
});
