import React, { useContext, useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AuthContext } from '@/app/contexts/AuthContext';
import { RootStackParamList } from '@/app/types/navigation';
import { Colors, Radii, Spacing } from '@/constants/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TrainerHeaderAvatar(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useContext(AuthContext);
  const [imageUrl, setImageUrl] = useState<string | undefined>(user?.picture);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const backendUrl = Constants.expoConfig?.extra?.backendUrl as
          | string
          | undefined;
        const token = await AsyncStorage.getItem('token');
        if (!backendUrl || !token) {
          return;
        }
        const response = await fetch(`${backendUrl}/getTrainerDetails`, {
          headers: { Authorization: token },
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { image_url?: string };
        if (!cancelled) {
          setImageUrl(data.image_url || user?.picture);
        }
      } catch {
        // keep fallback
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.picture]);

  const email = user?.email || '';
  const displayName = user?.name?.trim() || email || 'Coach';
  const initial = displayName.charAt(0).toUpperCase();

  const closeMenu = (): void => setMenuOpen(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setMenuOpen(true)}
        style={styles.wrap}
        accessibilityLabel="Account menu"
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.fallback]}>
            <Text style={styles.initial}>{initial}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.backdrop} onPress={closeMenu}>
          <View style={styles.menuAnchor}>
            <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuName} numberOfLines={1}>
                  {displayName}
                </Text>
                {email ? (
                  <Text style={styles.menuEmail} numberOfLines={1}>
                    {email}
                  </Text>
                ) : null}
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  closeMenu();
                  navigation.navigate('TrainerProfile', {
                    trainerId: email || undefined,
                  });
                }}
              >
                <Text style={styles.menuItemText}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  closeMenu();
                  void logout().then(() => navigation.replace('Login'));
                }}
              >
                <Text style={[styles.menuItemText, styles.logoutText]}>
                  Logout
                </Text>
              </TouchableOpacity>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { marginRight: 12 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryMuted,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 32, 27, 0.28)',
  },
  menuAnchor: {
    position: 'absolute',
    top: 56,
    right: 12,
    minWidth: 220,
  },
  menu: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    paddingVertical: Spacing.small,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#14201B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  menuHeader: {
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  menuEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  menuItem: {
    paddingHorizontal: Spacing.medium,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  logoutText: {
    color: Colors.error,
  },
});
