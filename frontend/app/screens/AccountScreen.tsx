import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconBadge } from '@/components/IconBadge';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl, type SegmentOption } from '@/components/SegmentedControl';
import { Spacing, type ThemePreference } from '@/constants/theme';
import { config } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, useThemePreference } from '../contexts/ThemeContext';
import { setLengthUnit, useLengthUnit } from '../hooks/useLengthUnit';
import { leaveCoach } from '../services/accountService';
import { updateSettings } from '../services/authService';
import { errorMessage } from '../services/http';
import type { RootStackParamList } from '../types/navigation';
import type { LengthUnit } from '../utils/bodyMetrics';
import { confirmAction } from '../utils/confirm';
import { deviceTimeZone } from '../utils/date';

const APPEARANCE_OPTIONS: SegmentOption<ThemePreference>[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const LENGTH_OPTIONS: SegmentOption<LengthUnit>[] = [
  { value: 'in', label: 'Inches' },
  { value: 'cm', label: 'Centimetres' },
];

/** Account and settings for both roles. */
export default function AccountScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut, setUser, refreshUser } = useAuth();
  const { colors } = useTheme();
  const themePreference = useThemePreference();
  const lengthUnit = useLengthUnit();
  const [busy, setBusy] = useState<'leave' | 'zone' | null>(null);

  if (!user) {
    return <Screen>{null}</Screen>;
  }
  const deviceZone = deviceTimeZone();
  const isTrainer = user.role === 'trainer';
  const zoneDiffers = !!deviceZone && deviceZone !== user.timezone;

  const onLeaveCoach = async (): Promise<void> => {
    const ok = await confirmAction({
      title: 'Leave your coach?',
      message: 'Your coach will no longer see new logs. You can join a coach again with a new invite code.',
      confirmLabel: 'Leave coach',
      destructive: true,
    });
    if (!ok) {
      return;
    }
    setBusy('leave');
    try {
      await leaveCoach();
      await refreshUser();
      Toast.show({ type: 'success', text1: 'You left your coach' });
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Could not leave', text2: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  };

  const onUseDeviceZone = async (): Promise<void> => {
    if (!deviceZone) {
      return;
    }
    setBusy('zone');
    try {
      await setUser(await updateSettings(deviceZone));
      Toast.show({ type: 'success', text1: 'Time zone updated' });
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Could not update time zone', text2: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  };

  const external = <Ionicons name="open-outline" size={18} color={colors.textMuted} />;

  return (
    <Screen>
      <Card style={styles.profile}>
        <Avatar name={user.name} uri={user.picture} size={60} />
        <View style={styles.profileText}>
          <AppText variant="heading" numberOfLines={1}>
            {user.name}
          </AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {user.email}
          </AppText>
          <Badge label={isTrainer ? 'Trainer' : 'Client'} tone={isTrainer ? 'accent' : 'brand'} style={styles.role} />
        </View>
      </Card>

      {isTrainer ? (
        <>
          <SectionHeader title="Coaching" />
          <ListRow
            leading={<IconBadge name="id-card" size={40} />}
            title="Coach profile"
            subtitle="What clients see when they find you"
            onPress={() => navigation.navigate('TrainerProfile')}
          />
        </>
      ) : user.trainee_id ? (
        <>
          <SectionHeader title="Coaching" />
          <ListRow
            leading={<IconBadge name="exit-outline" tone="warning" size={40} />}
            title="Leave my coach"
            subtitle="Stop sharing new logs with your coach"
            onPress={busy === 'leave' ? undefined : () => void onLeaveCoach()}
            right={busy === 'leave' ? <ActivityIndicator color={colors.tint} /> : undefined}
          />
        </>
      ) : null}

      <SectionHeader title="Settings" />
      <Card style={styles.zone}>
        <View style={styles.zoneRow}>
          <IconBadge name="contrast-outline" tone="neutral" size={40} />
          <View style={styles.profileText}>
            <AppText variant="subheading">Appearance</AppText>
            <AppText variant="caption" tone="secondary">
              System follows your phone&apos;s setting.
            </AppText>
          </View>
        </View>
        <SegmentedControl
          options={APPEARANCE_OPTIONS}
          value={themePreference.preference}
          onChange={themePreference.setPreference}
          accessibilityLabel="Appearance"
          style={styles.appearance}
        />
      </Card>
      <Card style={styles.zone}>
        <View style={styles.zoneRow}>
          <IconBadge name="resize-outline" tone="neutral" size={40} />
          <View style={styles.profileText}>
            <AppText variant="subheading">Body measurements</AppText>
            <AppText variant="caption" tone="secondary">
              Unit for waist, chest, arms and the rest on this phone.
            </AppText>
          </View>
        </View>
        <SegmentedControl
          options={LENGTH_OPTIONS}
          value={lengthUnit}
          onChange={(u) => {
            setLengthUnit(u).catch((e: unknown) => {
              Toast.show({ type: 'error', text1: 'Unit not saved on this device', text2: errorMessage(e) });
            });
          }}
          accessibilityLabel="Body measurement unit"
          style={styles.appearance}
        />
      </Card>
      <Card style={styles.zone}>
        <View style={styles.zoneRow}>
          <IconBadge name="globe-outline" tone="neutral" size={40} />
          <View style={styles.profileText}>
            <AppText variant="subheading">Time zone</AppText>
            <AppText variant="caption" tone="secondary">
              {user.timezone}. Used for today, weeks and streaks.
            </AppText>
          </View>
        </View>
        {zoneDiffers ? (
          <Button
            title={`Use this phone's zone (${deviceZone})`}
            variant="secondary"
            size="small"
            onPress={() => void onUseDeviceZone()}
            loading={busy === 'zone'}
            style={styles.zoneButton}
          />
        ) : null}
      </Card>

      <SectionHeader title="About" />
      <ListRow
        leading={<IconBadge name="shield-checkmark-outline" tone="neutral" size={40} />}
        title="Privacy policy"
        onPress={() => void Linking.openURL(config.privacyPolicyUrl)}
        right={external}
      />
      <ListRow
        leading={<IconBadge name="document-text-outline" tone="neutral" size={40} />}
        title="Terms"
        onPress={() => void Linking.openURL(config.termsUrl)}
        right={external}
      />

      <Button title="Sign out" variant="secondary" icon="log-out-outline" onPress={() => void signOut()} style={styles.signOut} />
      <Pressable
        onPress={() => navigation.navigate('DeleteAccount')}
        accessibilityRole="button"
        style={styles.delete}
        hitSlop={8}
      >
        <AppText variant="label" tone="error" center>
          Delete account
        </AppText>
      </Pressable>
      <AppText variant="caption" tone="muted" center style={styles.version}>
        TrainerNearMe {config.appVersion}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.medium,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  role: {
    marginTop: Spacing.small - 2,
  },
  zone: {
    marginBottom: Spacing.small + 2,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.small + 4,
  },
  zoneButton: {
    marginTop: Spacing.small + 4,
  },
  appearance: {
    marginTop: Spacing.small + 4,
  },
  signOut: {
    marginTop: Spacing.xl,
  },
  delete: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: Spacing.small,
  },
  version: {
    marginTop: Spacing.medium,
  },
});
