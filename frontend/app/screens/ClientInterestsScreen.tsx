import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';
import { updateClientInterests } from '../services/authService';
import { EXPERTISE_OPTIONS, type ExpertiseCode } from '../constants/expertise';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ClientInterests'>;

export default function ClientInterestsScreen({ navigation }: Props): React.JSX.Element {
  const { token, login, user } = useContext(AuthContext);
  const [selected, setSelected] = useState<ExpertiseCode[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (code: ExpertiseCode): void => {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const onContinue = async (): Promise<void> => {
    if (!token || selected.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Pick at least one',
        text2: 'What do you want a coach for?',
      });
      return;
    }
    setSaving(true);
    try {
      const updated = await updateClientInterests(token, selected);
      if (user) {
        await login(token, { ...user, ...updated, needs_interests: false });
      }
      if (updated.needs_invite) {
        navigation.replace('FindCoachHub');
      } else {
        navigation.replace('ClientHome');
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not save interests';
      Toast.show({ type: 'error', text1: 'Interests', text2: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>What are you looking for?</Text>
      <Text style={styles.sub}>
        Pick one or more. We&apos;ll show matching coaches near you first.
      </Text>
      <View style={styles.chips}>
        {EXPERTISE_OPTIONS.map((opt) => {
          const active = selected.includes(opt.code);
          return (
            <TouchableOpacity
              key={opt.code}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggle(opt.code)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={[styles.cta, selected.length === 0 && styles.ctaDisabled]}
        onPress={() => void onContinue()}
        disabled={saving || selected.length === 0}
      >
        {saving ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.ctaText}>Continue</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.large, paddingBottom: Spacing.xl * 2 },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: Spacing.small,
  },
  sub: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.large,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.small,
    marginBottom: Spacing.xl,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: Colors.background },
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.md,
    paddingVertical: Spacing.medium,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: Colors.background, fontSize: 16, fontWeight: '700' },
});
