import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { Spacing, webScrollFix } from '@/constants/theme';
import { useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { useExerciseDay } from '../app/hooks/useExerciseDay';
import type { ExerciseType } from '../app/types/workout';
import { relativeDayLabel } from '../app/utils/date';
import { formatDuration, formatSetsCompact } from '../app/utils/exerciseFormat';
import { haptic } from '../app/utils/haptics';
import { loadRestSeconds, nextRestChoice, saveRestSeconds } from '../app/utils/restTimer';
import { EMPTY_DRAFT, draftFromEntry, draftToEntry, prefillSource, type SetDraft } from '../app/utils/setDraft';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { Chip } from './Chip';
import { DayNavigator } from './DayNavigator';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import { RestTimer } from './RestTimer';
import { SetInputs } from './SetInputs';
import { SetRowItem } from './SetRowItem';
import { TextField } from './TextField';

type Props = {
  traineeId: string;
  exerciseId: string;
  date: string;
  onDateChange: (date: string) => void;
};

const MAX_SETS = 50;

/** Track tab: log sets for one exercise on one day, with last session's numbers to beat. */
export function ExerciseTrackTab({ traineeId, exerciseId, date, onDateChange }: Props): React.JSX.Element {
  const styles = useThemedStyles(makeStyles);
  const { day, entries, prFlags, loadError, load, commit } = useExerciseDay(traineeId, exerciseId, date);
  // What the user typed; null means "show the pre-fill for the next set".
  const [typed, setTyped] = useState<SetDraft | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restSeconds, setRestSeconds] = useState(90);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    void loadRestSeconds(exerciseId).then(setRestSeconds);
  }, [exerciseId]);

  const type: ExerciseType = day?.exercise.type ?? 'weight_reps';
  const previous = day?.previous ?? null;
  // The next set starts from last session's matching set (or the last one today).
  const draft = typed ?? draftFromEntry(prefillSource(entries, previous?.entries));

  const resetForm = (): void => {
    setTyped(null);
    setEditing(null);
    setShowNote(false);
    setError(null);
  };

  const onSave = (): void => {
    const entry = draftToEntry(type, draft);
    if (typeof entry === 'string') {
      setError(entry);
      haptic('error');
      return;
    }
    if (editing !== null) {
      commit(entries.map((e, i) => (i === editing ? entry : e)));
      resetForm();
      return;
    }
    if (entries.length >= MAX_SETS) {
      setError(`At most ${MAX_SETS} sets per exercise`);
      return;
    }
    haptic('tap');
    commit([...entries, entry]);
    resetForm();
    if (restSeconds > 0) setRestEndsAt(Date.now() + restSeconds * 1000);
  };

  const onDelete = (): void => {
    if (editing === null) return;
    commit(entries.filter((_, i) => i !== editing));
    resetForm();
  };

  const startEdit = (index: number): void => {
    if (editing === index) {
      resetForm();
      return;
    }
    setEditing(index);
    setTyped(draftFromEntry(entries[index], true));
    setShowNote(!!entries[index].note);
    setError(null);
  };

  const cycleRest = (): void => {
    const next = nextRestChoice(restSeconds);
    setRestSeconds(next);
    saveRestSeconds(exerciseId, next).catch((e: unknown) => {
      Toast.show({ type: 'error', text1: 'Rest time not saved', text2: e instanceof Error ? e.message : String(e) });
    });
  };

  if (!day) {
    return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;
  }

  return (
    <ScrollView style={webScrollFix} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <DayNavigator
        date={date}
        onChange={(d) => {
          resetForm();
          onDateChange(d);
        }}
      />

      {previous ? (
        <Card style={styles.last}>
          <AppText variant="caption" tone="secondary">
            {`Last time, ${relativeDayLabel(previous.date)}`}
          </AppText>
          <AppText variant="label" style={styles.lastSets}>
            {formatSetsCompact(type, previous.entries)}
          </AppText>
        </Card>
      ) : null}

      <RestTimer endsAt={restEndsAt} onChange={setRestEndsAt} />

      <SetInputs
        type={type}
        draft={draft}
        onChange={(d) => {
          setTyped(d);
          setError(null);
        }}
      />

      {showNote ? (
        <TextField label="Note for this set" value={draft.note} onChangeText={(t) => setTyped({ ...draft, note: t })} maxLength={200} />
      ) : null}
      {error ? (
        <AppText tone="error" accessibilityRole="alert" style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        <Button title={editing !== null ? 'Update' : 'Save set'} icon="checkmark" onPress={onSave} style={styles.flex} />
        {editing !== null ? (
          <Button title="Delete" variant="danger" icon="trash-outline" onPress={onDelete} style={styles.flex} />
        ) : (
          <Button
            title="Clear"
            variant="secondary"
            onPress={() => {
              setTyped(EMPTY_DRAFT);
              setError(null);
            }}
            style={styles.flex}
          />
        )}
      </View>
      <View style={styles.tools}>
        {!showNote ? <Chip label="Add note" icon="chatbox-ellipses-outline" onPress={() => setShowNote(true)} /> : null}
        <Chip label={restSeconds > 0 ? `Rest ${formatDuration(restSeconds)}` : 'Rest timer off'} icon="timer-outline" onPress={cycleRest} />
        {editing !== null ? <Chip label="Cancel edit" icon="close" onPress={resetForm} /> : null}
      </View>

      {entries.length > 0 ? (
        <Card style={styles.sets}>
          {entries.map((e, i) => (
            <SetRowItem
              key={i}
              index={i}
              type={type}
              entry={e}
              pr={prFlags[i]}
              selected={editing === i}
              onPress={() => startEdit(i)}
            />
          ))}
        </Card>
      ) : (
        <AppText tone="secondary" center style={styles.empty}>
          {`No sets on ${relativeDayLabel(date).toLowerCase()} yet. Saved sets appear here.`}
        </AppText>
      )}
    </ScrollView>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    content: { padding: Spacing.medium, paddingBottom: Spacing.xxl },
    last: { marginBottom: Spacing.medium, backgroundColor: colors.surfaceMuted },
    lastSets: { marginTop: 2, fontVariant: ['tabular-nums'] },
    error: { marginBottom: Spacing.small },
    actions: { flexDirection: 'row', gap: Spacing.small },
    flex: { flex: 1 },
    tools: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.small + 4 },
    sets: { marginTop: Spacing.small, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.xs },
    empty: { marginTop: Spacing.large },
  });
