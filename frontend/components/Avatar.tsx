import React, { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { avatarColors } from '@/constants/theme';
import { useTheme } from '../app/contexts/ThemeContext';
import { colorIndexFor, initialsOf } from '../app/utils/avatar';
import { AppText } from './AppText';

type Props = {
  name: string | undefined;
  /** Photo; falls back to initials if missing or it fails to load. */
  uri?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** A person: photo when there is one, otherwise initials on a color that stays the same for that name. */
export function Avatar({ name, uri, size = 44, style }: Props): React.JSX.Element {
  const { scheme } = useTheme();
  const [failed, setFailed] = useState(false);
  const palette = avatarColors[scheme];
  const [bg, fg] = palette[colorIndexFor(name, palette.length)];
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri && !failed) {
    return (
      <View style={[box, styles.clip, { backgroundColor: bg }, style]} accessible={false}>
        <Image source={{ uri }} onError={() => setFailed(true)} style={box} accessibilityIgnoresInvertColors />
      </View>
    );
  }
  return (
    <View style={[styles.center, box, { backgroundColor: bg }, style]} accessible={false}>
      <AppText
        allowFontScaling={false}
        style={{ color: fg, fontSize: Math.round(size * 0.38), lineHeight: Math.round(size * 0.46), fontWeight: '700' }}
      >
        {initialsOf(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clip: {
    overflow: 'hidden',
  },
});
