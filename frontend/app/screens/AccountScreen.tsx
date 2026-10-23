import React, { useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { config } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { leaveCoach } from '../services/accountService';
import { updateSettings } from '../services/authService';
import { errorMessage } from '../services/http';
import type { RootStackParamList } from '../types/navigation';
import { confirmAction } from '../utils/confirm';
import { deviceTimeZone } from '../utils/date';

/** Account and settings for both roles. */
export default function AccountScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut, setUser, refreshUser } = useAuth();
  const [busy, setBusy] = useState<'leave' | 'zone' | null>(null);

  if (!user) {
    return <Screen>{null}</Screen>;
  }
  const deviceZone = deviceTimeZone();
  const isTrainer = user.role === 'trainer';

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
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Could not update time zone', text2: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Card style={styles.profile}>
        {user.picture ? <Image source={{ uri: user.picture }} style={styles.avatar} /> : null}
        <View style={styles.profileText}>
          <AppText variant="subheading" numberOfLines={1}>
            {user.name}
          </AppText>
          <AppText tone="secondary" numberOfLines={1}>
            {user.email}
          </AppText>
          <AppText variant="caption" tone="muted">
            {isTrainer ? 'Trainer account' : 'Client account'}
          </AppText>
        </View>
      </Card>

      {isTrainer ? (
        <Button
          title="Edit coach profile"
          variant="secondary"
          icon="create-outline"
          onPress={() => navigation.navigate('TrainerProfile')}
          style={styles.gap}
        />
      ) : user.trainee_id ? (
        <Button
          title="Leave my coach"
          variant="secondary"
          icon="exit-outline"
          onPress={() => void onLeaveCoach()}
          loading={busy === 'leave'}
          style={styles.gap}
        />
      ) : null}

      <Card style={styles.gap}>
        <AppText variant="label" tone="secondary">
          Time zone
        </AppText>
        <AppText style={styles.small}>{user.timezone}</AppText>
        <AppText variant="caption" tone="muted">
          Used for &quot;today&quot;, weeks and streaks.
        </AppText>
        {deviceZone && deviceZone !== user.timezone ? (
          <Button
            title={`Use this phone's zone (${deviceZone})`}
            variant="ghost"
            onPress={() => void onUseDeviceZone()}
            loading={busy === 'zone'}
          />
        ) : null}
      </Card>

      <View style={styles.links}>
        <Button title="Privacy policy" variant="ghost" onPress={() => void Linking.openURL(config.privacyPolicyUrl)} />
        <Button title="Terms" variant="ghost" onPress={() => void Linking.openURL(config.termsUrl)} />
      </View>

      <Button title="Sign out" variant="secondary" icon="log-out-outline" onPress={() => void signOut()} style={styles.gap} />
      <Button
        title="Delete account"
        variant="ghost"
        onPress={() => navigation.navigate('DeleteAccount')}
        style={styles.deleteLink}
      />
      <AppText variant="caption" tone="muted" center style={styles.version}>
        Version {config.appVersion}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: Spacing.medium,
    backgroundColor: Colors.backgroundAlt,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  gap: {
    marginTop: Spacing.medium,
  },
  small: {
    marginTop: Spacing.xs,
  },
  links: {
    marginTop: Spacing.medium,
  },
  deleteLink: {
    marginTop: Spacing.small,
  },
  version: {
    marginTop: Spacing.large,
  },
});
