import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { TextField } from '@/components/TextField';
import { Spacing, webScrollFix } from '@/constants/theme';
import { useThemedStyles, type Theme } from '../contexts/ThemeContext';
import { errorMessage } from '../services/http';
import { deleteExercise, listExercises } from '../services/workoutService';
import type { RootStackParamList } from '../types/navigation';
import type { Exercise } from '../types/workout';
import { confirmAction } from '../utils/confirm';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutExercises'>;

/** Step 2 of gym logging: pick the exercise (searchable). */
export default function WorkoutExercisesScreen({ route, navigation }: Props): React.JSX.Element {
  const { traineeId, categoryId, categoryName, date } = route.params;
  const styles = useThemedStyles(makeStyles);
  const [items, setItems] = useState<Exercise[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ title: categoryName });
  }, [navigation, categoryName]);

  const load = useCallback(async () => {
    try {
      setItems(await listExercises(categoryId, traineeId));
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    }
  }, [categoryId, traineeId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((e) => !q || e.name.toLowerCase().includes(q));
  }, [items, query]);

  const onDelete = async (e: Exercise): Promise<void> => {
    const ok = await confirmAction({
      title: `Delete ${e.name}?`,
      message: 'It is removed from the list and from past logs.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteExercise(e.id, traineeId);
      setItems((prev) => prev?.filter((x) => x.id !== e.id) ?? null);
    } catch (err: unknown) {
      Toast.show({ type: 'error', text1: 'Not deleted', text2: errorMessage(err) });
    }
  };

  if (!items) return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;

  return (
    <View style={styles.root}>
      <FlatList
        style={webScrollFix}
        data={visible}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <TextField
            label="Search exercises"
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${categoryName}`}
            autoCorrect={false}
            returnKeyType="search"
          />
        }
        ListEmptyComponent={
          query ? (
            <EmptyState icon="search-outline" title="No matches" message={`No exercise named "${query}".`} />
          ) : (
            <EmptyState icon="barbell-outline" title="No exercises" message="Add the exercise you want to log." />
          )
        }
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            accessibilityLabel={`Log ${item.name}`}
            onPress={() => navigation.navigate('AddExerciseForm', { traineeId, exercise: item.name, exerciseId: item.id, date })}
          >
            <View style={styles.row}>
              <AppText variant="subheading" numberOfLines={2} style={styles.flex}>
                {item.name}
              </AppText>
              <IconButton
                icon="create-outline"
                accessibilityLabel={`Rename ${item.name}`}
                onPress={() =>
                  navigation.navigate('AddCustomExercise', {
                    traineeId,
                    categoryId,
                    categoryName,
                    exerciseId: item.id,
                    currentName: item.name,
                  })
                }
              />
              <IconButton
                icon="trash-outline"
                tone="danger"
                accessibilityLabel={`Delete ${item.name}`}
                onPress={() => void onDelete(item)}
              />
            </View>
          </Card>
        )}
      />
      <View style={styles.footer}>
        <Button
          title="Add exercise"
          variant="secondary"
          icon="add"
          onPress={() => navigation.navigate('AddCustomExercise', { traineeId, categoryId, categoryName })}
        />
      </View>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: Spacing.medium, flexGrow: 1 },
    card: { marginBottom: Spacing.small + 2, paddingVertical: Spacing.small + 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    flex: { flex: 1, minWidth: 0 },
    footer: {
      paddingHorizontal: Spacing.medium,
      paddingTop: Spacing.small + 4,
      paddingBottom: Spacing.medium,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
      backgroundColor: colors.bg,
    },
  });
