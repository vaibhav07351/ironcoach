import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { Spacing } from '@/constants/theme';
import { ACTIVITY_CODES, ACTIVITY_OPTIONS, expertiseLabel } from '../app/constants/expertise';
import { useStartActivityLog } from '../app/hooks/useStartActivityLog';
import { errorMessage } from '../app/services/http';
import { getTrainee, updateTrainee } from '../app/services/traineeService';
import { getActivityMix } from '../app/services/workoutService';
import { resolveActivities, type ResolvedActivities } from '../app/utils/activities';
import { todayLocal } from '../app/utils/date';
import { ActivityPicker } from './ActivityPicker';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { Chip } from './Chip';
import { IconBadge } from './IconBadge';
import { ListRow } from './ListRow';

type Props = {
  traineeId: string;
  /** Used in copy, e.g. "Priya's activities". Omit for the client's own view. */
  clientName?: string;
  date?: string;
};

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  gym: 'barbell',
  cardio: 'heart',
  swimming: 'water',
  running: 'walk',
  yoga: 'body',
  badminton: 'tennisball',
  cricket: 'baseball',
  boxing: 'hand-left',
  mma: 'hand-left',
  other: 'fitness',
};

const logTitle = (code: string): string => (code === 'gym' ? 'Log gym workout' : `Log ${expertiseLabel(code).toLowerCase()}`);

/**
 * The client's own activities as big log buttons (what they actually train), with everything
 * else one tap away under "Other activity". Offers to add an activity logged often but missing.
 */
export function ActivityLogButtons({ traineeId, clientName, date }: Props): React.JSX.Element {
  const start = useStartActivityLog(traineeId);
  const [saved, setSaved] = useState<string[] | null>(null);
  const [resolved, setResolved] = useState<ResolvedActivities>({ primary: ['gym'], suggestion: null, fromList: false });
  const [showOther, setShowOther] = useState(false);
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const whose = clientName ? `${clientName}'s` : 'your';

  const load = useCallback(async () => {
    try {
      const [trainee, mix] = await Promise.all([getTrainee(traineeId), getActivityMix(traineeId, 30)]);
      const list = trainee.activities ?? [];
      setSaved(list);
      setResolved(resolveActivities(list, mix, ACTIVITY_CODES));
    } catch (e: unknown) {
      // Logging still works with the gym default; only the personal list is missing.
      console.warn('activities not loaded', errorMessage(e));
    }
  }, [traineeId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const saveActivities = async (next: string[]): Promise<void> => {
    setSaving(true);
    try {
      await updateTrainee(traineeId, { activities: next });
      Toast.show({ type: 'success', text1: 'Activities updated' });
      setEditing(false);
      await load();
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not saved', text2: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const day = date ?? todayLocal();
  const others = ACTIVITY_OPTIONS.filter((o) => !resolved.primary.includes(o.code));

  if (editing) {
    return (
      <Card>
        <AppText variant="label" style={styles.editTitle}>{clientName ? `What does ${clientName} train?` : 'What do you train?'}</AppText>
        <ActivityPicker value={picked} onChange={setPicked} />
        <View style={styles.editActions}>
          <Button title="Save" size="small" onPress={() => void saveActivities(picked)} loading={saving} style={styles.flex} />
          <Button title="Cancel" size="small" variant="secondary" onPress={() => setEditing(false)} style={styles.flex} />
        </View>
      </Card>
    );
  }

  return (
    <View>
      {resolved.primary.map((code) => (
        <ListRow
          key={code}
          title={logTitle(code)}
          leading={<IconBadge name={ICONS[code] ?? 'fitness'} tone={code === 'gym' ? 'brand' : 'accent'} size={40} />}
          onPress={() => void start(code, day)}
          style={styles.row}
        />
      ))}

      {resolved.suggestion && !dismissed ? (
        <Card style={styles.suggest}>
          <AppText variant="caption">
            {`${expertiseLabel(resolved.suggestion)} was logged on several days in the last 30. Add it to ${whose} activities?`}
          </AppText>
          <View style={styles.editActions}>
            <Button
              title={`Add ${expertiseLabel(resolved.suggestion)}`}
              size="small"
              icon="add"
              loading={saving}
              onPress={() => void saveActivities([...(saved ?? []), resolved.suggestion as string])}
              style={styles.flex}
            />
            <Button title="Not now" size="small" variant="ghost" onPress={() => setDismissed(true)} style={styles.flex} />
          </View>
        </Card>
      ) : null}

      <View style={styles.chips}>
        <Chip label="Other activity" icon={showOther ? 'chevron-up' : 'add'} onPress={() => setShowOther((v) => !v)} />
        <Chip
          label={resolved.fromList ? 'Edit activities' : 'Choose activities'}
          icon="options-outline"
          onPress={() => {
            setPicked(saved && saved.length > 0 ? saved : resolved.primary);
            setEditing(true);
          }}
        />
      </View>
      {showOther ? (
        <View style={styles.chips}>
          {others.map((o) => (
            <Chip key={o.code} label={o.label} icon="add" onPress={() => void start(o.code, day)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: Spacing.small },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.xs },
  suggest: { marginBottom: Spacing.small },
  editTitle: { marginBottom: Spacing.small },
  editActions: { flexDirection: 'row', gap: Spacing.small, marginTop: Spacing.small },
  flex: { flex: 1 },
});
