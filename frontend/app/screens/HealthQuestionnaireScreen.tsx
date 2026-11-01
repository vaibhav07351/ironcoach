import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { SwitchRow } from '@/components/SwitchRow';
import { TextField } from '@/components/TextField';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../contexts/ThemeContext';
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
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
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
    <Screen footer={<Button title="Save answers" icon="checkmark" onPress={() => void onSave()} loading={saving} />}>
      <AppText variant="heading" accessibilityRole="header">
        Health questionnaire
      </AppText>
      <AppText tone="secondary" style={styles.subtitle}>
        Answer honestly; your coach uses this to keep training safe. Only you and your coach can see it.
      </AppText>

      <Card style={styles.list}>
        {QUESTION_KEYS.map((key, index) => (
          <SwitchRow
            key={key}
            label={questionMapping[key]}
            value={responses[key]}
            onValueChange={(value) => setResponses({ ...responses, [key]: value })}
            style={index > 0 ? styles.divider : null}
          />
        ))}
      </Card>

      {yesCount > 0 ? (
        <View style={styles.note} accessibilityRole="alert">
          <Ionicons name="medkit" size={18} color={colors.warning} style={styles.noteIcon} />
          <AppText variant="caption" style={styles.noteText}>
            You answered yes to {yesCount} question{yesCount === 1 ? '' : 's'}. Add details below and check with a
            doctor before starting intense training.
          </AppText>
        </View>
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

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    subtitle: {
      marginTop: Spacing.small,
      marginBottom: Spacing.medium,
    },
    list: {
      paddingVertical: Spacing.xs,
      marginBottom: Spacing.medium,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
    },
    note: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.warningSoft,
      borderRadius: Radii.md,
      padding: Spacing.small + 4,
      marginBottom: Spacing.medium,
    },
    noteIcon: {
      marginRight: Spacing.small,
      marginTop: 1,
    },
    noteText: {
      flex: 1,
      color: colors.text,
    },
  });
