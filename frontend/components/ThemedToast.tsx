import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast, { type ToastConfig, type ToastConfigParams } from 'react-native-toast-message';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { haptic } from '../app/utils/haptics';
import { AppText } from './AppText';

type Kind = 'success' | 'error' | 'info';

const ICONS: Record<Kind, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

function ThemedToast({ kind, text1, text2 }: { kind: Kind; text1?: string; text2?: string }): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const iconColor = { success: colors.success, error: colors.danger, info: colors.tint }[kind];

  useEffect(() => {
    if (kind !== 'info') {
      haptic(kind);
    }
  }, [kind, text1]);

  return (
    <Pressable
      onPress={() => Toast.hide()}
      style={styles.toast}
      accessibilityRole="alert"
      accessibilityLabel={[text1, text2].filter(Boolean).join('. ')}
      accessibilityHint="Tap to dismiss"
    >
      <Ionicons name={ICONS[kind]} size={24} color={iconColor} style={styles.icon} />
      <View style={styles.text}>
        {text1 ? (
          <AppText variant="label" numberOfLines={2}>
            {text1}
          </AppText>
        ) : null}
        {text2 ? (
          <AppText variant="caption" tone="secondary" numberOfLines={3}>
            {text2}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const render = (kind: Kind) =>
  function ToastOfKind({ text1, text2 }: ToastConfigParams<unknown>): React.JSX.Element {
    return <ThemedToast kind={kind} text1={text1} text2={text2} />;
  };

/** Toast styles in the app's look, for `<Toast config={toastConfig} />`. */
export const toastConfig: ToastConfig = {
  success: render('success'),
  error: render('error'),
  info: render('info'),
};

const makeStyles = ({ colors, elevation }: Theme) =>
  StyleSheet.create({
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '92%',
      maxWidth: 480,
      backgroundColor: colors.surface,
      borderRadius: Radii.lg,
      paddingVertical: Spacing.small + 4,
      paddingHorizontal: Spacing.medium,
      ...elevation(3),
    },
    icon: {
      marginRight: Spacing.small + 4,
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
  });
