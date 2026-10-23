import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Spacing } from '@/constants/theme';
import { ACTIVITY_OPTIONS, expertiseLabel } from '../app/constants/expertise';
import type { RootStackParamList } from '../app/types/navigation';
import { todayLocal } from '../app/utils/date';
import { Chip } from './Chip';

type Props = {
  traineeId: string;
  /** Activity codes to offer; all sports when empty. */
  codes?: string[];
};

/**
 * One tap per sport to start logging today's session: gym opens the exercise picker, other
 * sports a short session form. Used by clients for themselves and by trainers for a client.
 */
export function QuickLogChips({ traineeId, codes }: Props): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const list = codes && codes.length > 0 ? codes : ACTIVITY_OPTIONS.map((o) => o.code as string);

  const start = (code: string): void => {
    if (code === 'gym') {
      navigation.navigate('WorkoutCategories', { traineeId, date: todayLocal() });
      return;
    }
    navigation.navigate('LogSession', { traineeId, date: todayLocal(), activityType: code });
  };

  return (
    <View style={styles.row}>
      {list.map((code) => (
        <Chip key={code} label={expertiseLabel(code)} onPress={() => start(code)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.small,
  },
});
