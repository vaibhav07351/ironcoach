import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useTraineeRecord } from '../contexts/TraineeRecordContext';
import { errorMessage } from '../services/http';
import { getTrainee, updateTrainee } from '../services/traineeService';
import { fitnessTestTemplates, type FitnessTest } from '../types/trainee';
import { isFuture, longDateLabel, parseLocalDate, todayLocal } from '../utils/date';

type Results = Record<string, { result1: string; result2: string }>;

const CATEGORIES = Array.from(new Set(fitnessTestTemplates.map((t) => t.category)));

function resultsFor(tests: FitnessTest[], date: string): Results {
  const out: Results = {};
  for (const t of fitnessTestTemplates) {
    const found = tests.find((x) => x.date === date && x.test === t.test);
    out[t.test] = { result1: found?.result1 ?? '', result2: found?.result2 ?? '' };
  }
  return out;
}

/**
 * Fitness assessments, grouped by date. Trainers record two attempts per test; clients see them.
 * Saving sends only `fitness_tests` for the whole history, replacing just the edited date.
 * (Lab tests are not shown in v1; stored lab data is left untouched.)
 */
export default function FitnessTestScreen(): React.JSX.Element {
  const record = useTraineeRecord();
  const { user } = useAuth();
  const isTrainer = user?.role === 'trainer';
  const [tests, setTests] = useState<FitnessTest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [date, setDate] = useState<string>(todayLocal());
  const [editing, setEditing] = useState(false);
  const [draftDate, setDraftDate] = useState(todayLocal());
  const [draft, setDraft] = useState<Results>({});
  const [saving, setSaving] = useState(false);

  const dates = useMemo(
    () => Array.from(new Set((tests ?? []).map((t) => t.date))).sort((a, b) => b.localeCompare(a)),
    [tests]
  );

  const load = useCallback(async () => {
    try {
      const trainee = await getTrainee(record.id);
      const loaded = trainee.fitness_tests ?? [];
      setTests(loaded);
      setLoadError(null);
      const latest = Array.from(new Set(loaded.map((t) => t.date))).sort((a, b) => b.localeCompare(a))[0];
      if (latest) {
        setDate((current) => (loaded.some((t) => t.date === current) ? current : latest));
      }
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    }
  }, [record.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const startEdit = (forDate: string): void => {
    setDraftDate(forDate);
    setDraft(resultsFor(tests ?? [], forDate));
    setEditing(true);
  };

  const draftDateError =
    !parseLocalDate(draftDate) ? 'Use the format YYYY-MM-DD' : isFuture(draftDate) ? 'Date cannot be in the future' : undefined;

  const onSave = async (): Promise<void> => {
    if (!tests || draftDateError) {
      return;
    }
    const entries: FitnessTest[] = fitnessTestTemplates
      .filter((t) => draft[t.test]?.result1.trim() || draft[t.test]?.result2.trim())
      .map((t) => ({
        date: draftDate,
        category: t.category,
        test: t.test,
        result1: draft[t.test].result1.trim(),
        result2: draft[t.test].result2.trim(),
      }));
    const next = [...tests.filter((t) => t.date !== draftDate), ...entries];
    setSaving(true);
    try {
      await updateTrainee(record.id, { fitness_tests: next });
      setTests(next);
      setDate(draftDate);
      setEditing(false);
      Toast.show({ type: 'success', text1: 'Assessment saved' });
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not saved', text2: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  if (!tests) {
    return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;
  }

  const shown = editing ? draft : resultsFor(tests, date);
  const hasData = dates.length > 0;

  return (
    <Screen
      footer={
        isTrainer ? (
          editing ? (
            <View style={styles.footerRow}>
              <Button title="Cancel" variant="secondary" onPress={() => setEditing(false)} style={styles.flex} />
              <Button
                title="Save"
                onPress={() => void onSave()}
                loading={saving}
                disabled={!!draftDateError}
                style={styles.flex}
              />
            </View>
          ) : (
            <View style={styles.footerRow}>
              <Button title="New assessment" variant="secondary" onPress={() => startEdit(todayLocal())} style={styles.flex} />
              {hasData ? <Button title="Edit" onPress={() => startEdit(date)} style={styles.flex} /> : null}
            </View>
          )
        ) : undefined
      }
    >
      {editing ? (
        <TextField
          label="Assessment date"
          value={draftDate}
          onChangeText={setDraftDate}
          placeholder="YYYY-MM-DD"
          error={draftDateError}
          autoCorrect={false}
        />
      ) : hasData ? (
        <View>
          <AppText variant="label" tone="secondary">
            Assessments
          </AppText>
          <View style={styles.dates}>
            {dates.map((d) => (
              <Chip key={d} label={longDateLabel(d)} selected={d === date} onPress={() => setDate(d)} />
            ))}
          </View>
        </View>
      ) : (
        <AppText tone="secondary" style={styles.empty}>
          {isTrainer
            ? 'No assessments yet. Tap New assessment to record the first one.'
            : 'Your coach has not recorded an assessment yet.'}
        </AppText>
      )}

      {(editing || hasData) &&
        CATEGORIES.map((category) => {
          const items = fitnessTestTemplates.filter((t) => t.category === category);
          return (
            <Card key={category} style={styles.category}>
              <View style={styles.categoryHeader}>
                <MaterialIcons
                  name={items[0].icon as keyof typeof MaterialIcons.glyphMap}
                  size={18}
                  color={items[0].color}
                />
                <AppText variant="subheading" style={styles.categoryTitle}>
                  {category}
                </AppText>
              </View>
              {items.map((t) => (
                <View key={t.test} style={styles.testRow}>
                  <AppText style={styles.testName}>{t.test}</AppText>
                  {(['result1', 'result2'] as const).map((field) =>
                    editing ? (
                      <TextInput
                        key={field}
                        value={draft[t.test]?.[field] ?? ''}
                        onChangeText={(v) => setDraft({ ...draft, [t.test]: { ...draft[t.test], [field]: v } })}
                        placeholder={field === 'result1' ? 'Try 1' : 'Try 2'}
                        placeholderTextColor={Colors.textMuted}
                        accessibilityLabel={`${t.test} ${field === 'result1' ? 'try 1' : 'try 2'}`}
                        style={styles.input}
                        maxLength={20}
                      />
                    ) : (
                      <AppText key={field} style={styles.value}>
                        {shown[t.test]?.[field] || '-'}
                      </AppText>
                    )
                  )}
                </View>
              ))}
            </Card>
          );
        })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footerRow: {
    flexDirection: 'row',
    gap: Spacing.small,
  },
  dates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.small,
    marginBottom: Spacing.small,
  },
  empty: {
    marginBottom: Spacing.medium,
  },
  category: {
    marginBottom: Spacing.medium,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  categoryTitle: {
    marginLeft: Spacing.small,
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.small,
  },
  testName: {
    flex: 1,
    minWidth: 0,
  },
  input: {
    width: 76,
    minHeight: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.small,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    textAlign: 'center',
  },
  value: {
    width: 76,
    textAlign: 'center',
  },
});
