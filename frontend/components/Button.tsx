import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing } from '../constants/theme';

type ButtonProps = {
    title: string;
    onPress: () => void;
    style?: object;
    textStyle?: object;
};

export default function Button({ title, onPress, style, textStyle }: ButtonProps) {
    return (
        <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
            <Text style={[styles.text, textStyle]}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: Colors.primary,
        padding: Spacing.medium,
        borderRadius: Spacing.small,
        alignItems: 'center',
    },
    text: {
        color: Colors.surface,
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
});
