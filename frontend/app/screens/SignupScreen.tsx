import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Colors, Spacing } from '@/constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

/** Legacy password signup is retired — Google SSO is the registration path. */
export default function SignupScreen() {
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    navigation.replace('Login');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registration moved</Text>
      <Text style={styles.body}>
        IronCoach now uses Google Sign-In. Choose trainer or client on the next
        screen — no password needed.
      </Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.replace('Login')}
      >
        <Text style={styles.btnText}>Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.large,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.small,
  },
  body: {
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.large,
  },
  btn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },
});
