import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { IconBadge } from '@/components/IconBadge';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { TextField } from '@/components/TextField';
import { Spacing, webScrollFix } from '@/constants/theme';
import { useThemedStyles, type Theme } from '../contexts/ThemeContext';
import { errorMessage } from '../services/http';
import { deleteCategory, listCategories, searchExercises } from '../services/workoutService';
import type { RootStackParamList } from '../types/navigation';
import type { Category, Exercise } from '../types/workout';
import { confirmAction } from '../utils/confirm';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutCategories'>;

const SEARCH_DELAY_MS = 250;

/** Category icons; anything else gets the barbell. */
const categoryIcon = (name: string): 'heart' | 'barbell' => (name.trim().toLowerCase() === 'cardio' ? 'heart' : 'barbell');

/** Step 1 of logging: pick a category (or search every exercise by name). */
export default function WorkoutCategoriesScreen({ route, navigation }: Props): React.JSX.Element {
  const { traineeId, date } = route.params;
  const styles = useThemedStyles(makeStyles);
  const [items, setItems] = useState<Category[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<{ q: string; list: Exercise[] } | null>(null);
  const q = query.trim();
  const searching = q.length > 0;
  // Results count only for the text currently typed; otherwise the search is still running.
  const results = found && found.q === q ? found.list : null;

  // Search across all categories, a moment after typing stops.
  useEffect(() => {
    if (!q) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchExercises(traineeId, q)
        .then((list) => {
          if (!cancelled) setFound({ q, list });
        })
        .catch((e: unknown) => {
          if (!cancelled) Toast.show({ type: 'error', text1: 'Search failed', text2: errorMessage(e) });
        });
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, traineeId]);

  const load = useCallback(async () => {
    try {
      setItems(await listCategories(traineeId));
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    }
  }, [traineeId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onDelete = async (c: Category): Promise<void> => {
    const ok = await confirmAction({
      title: `Delete ${c.name}?`,
      message: 'Its exercises are removed from the list. Past logs stay.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteCategory(c.id, traineeId);
      setItems((prev) => prev?.filter((x) => x.id !== c.id) ?? null);
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not deleted', text2: errorMessage(e) });
    }
  };

  if (!items) return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;

  return (
    <View style={styles.root}>
      <FlatList
        style={webScrollFix}
        data={searching ? [] : items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <TextField
              label="Search all exercises"
              value={query}
              onChangeText={setQuery}
              placeholder="e.g. row, bench, treadmill"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searching ? (
              results === null ? (
                <LoadingState />
              ) : results.length === 0 ? (
                <EmptyState icon="search-outline" title="No matches" message={`No exercise named "${query.trim()}".`} />
              ) : (
                results.map((e) => (
                  <Card
                    key={e.id}
                    style={styles.card}
                    accessibilityLabel={`Log ${e.name}`}
                    onPress={() =>
                      navigation.navigate('Exercise', { traineeId, exerciseId: e.id, exerciseName: e.name, exerciseType: e.type, date })
                    }
                  >
                    <AppText variant="subheading" numberOfLines={1}>
                      {e.name}
                    </AppText>
                    <AppText variant="caption" tone="secondary">
                      {e.category}
                    </AppText>
                  </Card>
                ))
              )
            ) : items.length > 0 ? (
              <AppText tone="secondary" style={styles.lead}>
                Pick what was trained.
              </AppText>
            ) : null}
          </>
        }
        ListEmptyComponent={
          searching ? null : <EmptyState icon="barbell-outline" title="No categories" message="Add one to start logging." />
        }
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            accessibilityLabel={`Open ${item.name}`}
            onPress={() =>
              navigation.navigate('WorkoutExercises', { traineeId, categoryId: item.id, categoryName: item.name, date })
            }
          >
            <View style={styles.row}>
              <IconBadge name={categoryIcon(item.name)} tone={categoryIcon(item.name) === 'heart' ? 'danger' : 'brand'} size={40} />
              <AppText variant="subheading" numberOfLines={1} style={styles.flex}>
                {item.name}
              </AppText>
              <IconButton
                icon="create-outline"
                accessibilityLabel={`Rename ${item.name}`}
                onPress={() =>
                  navigation.navigate('AddCustomCategory', { traineeId, categoryId: item.id, currentName: item.name })
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
          title="Add category"
          variant="secondary"
          icon="add"
          onPress={() => navigation.navigate('AddCustomCategory', { traineeId })}
        />
      </View>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: Spacing.medium, flexGrow: 1 },
    lead: { marginBottom: Spacing.small + 4 },
    card: { marginBottom: Spacing.small + 2, paddingVertical: Spacing.small + 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.small },
    flex: { flex: 1, minWidth: 0, marginLeft: Spacing.xs },
    footer: {
      paddingHorizontal: Spacing.medium,
      paddingTop: Spacing.small + 4,
      paddingBottom: Spacing.medium,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
      backgroundColor: colors.bg,
    },
  });
