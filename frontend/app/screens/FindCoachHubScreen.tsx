import React, { useCallback, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FindCoachHub'>;

export default function FindCoachHubScreen({ navigation }: Props) {
  const { logout, refreshUser, user } = useContext(AuthContext);

  useFocusEffect(
    useCallback(() => {
      const check = async (): Promise<void> => {
        try {
          await refreshUser();
        } catch {
          // stay on hub
        }
      };
      void check();
    }, [refreshUser])
  );

  useFocusEffect(
    useCallback(() => {
      if (user && !user.needs_invite && user.trainee_id) {
        navigation.replace('ClientHome');
      }
    }, [user, navigation])
  );

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryMuted]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.brand}>IronCoach</Text>
        <Text style={styles.title}>Find your coach</Text>
        <Text style={styles.subtitle}>
          Link with an invite, or discover coaches near you.
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <TouchableOpacity
          style={styles.primary}
          onPress={() => navigation.navigate('InviteRedeem')}
          activeOpacity={0.88}
        >
          <View style={styles.iconBubble}>
            <Ionicons name="key-outline" size={22} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryText}>Enter invite code</Text>
            <Text style={styles.primarySub}>Your coach already sent you one</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.accentSoft} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => navigation.navigate('TrainerDiscover')}
          activeOpacity={0.88}
        >
          <View style={[styles.iconBubble, styles.iconBubbleAlt]}>
            <Ionicons name="compass-outline" size={22} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.secondaryText}>Find coaches near me</Text>
            <Text style={styles.secondarySub}>Swipe to send a request</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signOut}
          onPress={() => {
            void logout().then(() => navigation.replace('Login'));
          }}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  hero: {
    paddingHorizontal: Spacing.large,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl + 8,
    borderBottomLeftRadius: Radii.lg,
    borderBottomRightRadius: Radii.lg,
  },
  brand: {
    color: Colors.accentSoft,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 34,
    color: Colors.textOnPrimary,
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(247, 244, 236, 0.78)',
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    padding: Spacing.large,
    marginTop: -8,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.primary,
    borderRadius: Radii.md,
    padding: Spacing.medium,
    marginBottom: Spacing.medium,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleAlt: {
    backgroundColor: Colors.activeCard,
  },
  primaryText: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  primarySub: {
    color: Colors.accentSoft,
    marginTop: 2,
    fontSize: 13,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.medium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  secondarySub: {
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
  signOut: { marginTop: Spacing.xl, alignItems: 'center', padding: 12 },
  signOutText: { color: Colors.textSecondary, fontWeight: '500' },
});
