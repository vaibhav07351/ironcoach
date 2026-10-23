import React, { useCallback, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Colors, Spacing } from '@/constants/theme';
import { useTraineeRecord } from '../contexts/TraineeRecordContext';
import { errorMessage } from '../services/http';
import { getTrainee, updateTrainee } from '../services/traineeService';
import { questionMapping, type HealthQuestionnaireResponses } from '../types/trainee';

type QuestionKey = keyof HealthQuestionnaireResponses;

const QUESTION_KEYS = Object.keys(questionMapping) as QuestionKey[];

const emptyResponses = (): HealthQuestionnaireResponses =>
  QUESTION_KEYS.reduce((acc, key) => ({ ...acc, [key]: false }), {} as HealthQuestionnaireResponses);

/**
 * Pre-exercise health screening (PAR-Q style). Saving sends only the questionnaire, so it can no
 * longer overwrite other client fields with stale values.
 */
export default function HealthQuestionnaireScreen(): React.JSX.Element {
  const record = useTraineeRecord();
  const [responses, setResponses] = useState<HealthQuestionnaireResponses | null>(null);
  const [comments, setComments] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const trainee = await getTrainee(record.id);
      setResponses({ ...emptyResponses(), ...(trainee.health_questionnaire?.responses ?? {}) });
      setComments(trainee.health_questionnaire?.comments ?? '');
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    }
  }, [record.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onSave = async (): Promise<void> => {
    if (!responses) {
      return;
    }
    setSaving(true);
    try {
      await updateTrainee(record.id, { health_questionnaire: { responses, comments: comments.trim() } });
      Toast.show({ type: 'success', text1: 'Health questionnaire saved' });
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not saved', text2: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  if (!responses) {
    return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;
  }

  const yesCount = QUESTION_KEYS.filter((k) => responses[k]).length;

  return (
    <Screen footer={<Button title="Save" onPress={() => void onSave()} loading={saving} />}>
      <AppText variant="heading">Health questionnaire</AppText>
      <AppText tone="secondary" style={styles.subtitle}>
        Answer honestly; your coach uses this to keep training safe. Only you and your coach can see it.
      </AppText>

      <Card style={styles.list}>
        {QUESTION_KEYS.map((key, index) => (
          <View key={key} style={[styles.row, index === QUESTION_KEYS.length - 1 ? styles.rowLast : null]}>
            <AppText style={styles.question}>{questionMapping[key]}</AppText>
            <Switch
              value={responses[key]}
              onValueChange={(value) => setResponses({ ...responses, [key]: value })}
              accessibilityLabel={questionMapping[key]}
              trackColor={{ true: Colors.primaryMuted, false: Colors.border }}
              thumbColor={responses[key] ? Colors.primary : Colors.surface}
            />
          </View>
        ))}
      </Card>

      {yesCount > 0 ? (
        <AppText variant="caption" tone="secondary" style={styles.note}>
          You answered yes to {yesCount} question{yesCount === 1 ? '' : 's'}. Add details below and check with a
          doctor before starting intense training.
        </AppText>
      ) : null}

      <TextField
        label="Details or other conditions"
        value={comments}
        onChangeText={setComments}
        multiline
        maxLength={2000}
        placeholder="Medications, injuries, anything your coach should know"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: Spacing.small,
    marginBottom: Spacing.medium,
  },
  list: {
    paddingVertical: 0,
    marginBottom: Spacing.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.small,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    minHeight: 56,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  question: {
    flex: 1,
    marginRight: Spacing.small,
  },
  note: {
    marginBottom: Spacing.medium,
  },
});
