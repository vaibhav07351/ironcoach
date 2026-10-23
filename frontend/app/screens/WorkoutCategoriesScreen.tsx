import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Colors, Spacing } from '@/constants/theme';
import { errorMessage } from '../services/http';
import { deleteCategory, listCategories } from '../services/workoutService';
import type { RootStackParamList } from '../types/navigation';
import type { Category } from '../types/workout';
import { confirmAction } from '../utils/confirm';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutCategories'>;

/** Step 1 of gym logging: pick a muscle group / category. */
export default function WorkoutCategoriesScreen({ route, navigation }: Props): React.JSX.Element {
  const { traineeId, date } = route.params;
  const [items, setItems] = useState<Category[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={<EmptyState title="No categories" message="Add one to start logging." />}
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            accessibilityLabel={`Open ${item.name}`}
            onPress={() =>
              navigation.navigate('WorkoutExercises', { traineeId, categoryId: item.id, categoryName: item.name, date })
            }
          >
            <View style={styles.row}>
              <AppText variant="subheading" style={styles.flex}>
                {item.name}
              </AppText>
              <Button
                title="Rename"
                variant="ghost"
                onPress={() =>
                  navigation.navigate('AddCustomCategory', { traineeId, categoryId: item.id, currentName: item.name })
                }
              />
              <Button title="Delete" variant="ghost" onPress={() => void onDelete(item)} />
            </View>
          </Card>
        )}
      />
      <View style={styles.footer}>
        <Button title="Add category" icon="add" onPress={() => navigation.navigate('AddCustomCategory', { traineeId })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.medium, flexGrow: 1 },
  card: { marginBottom: Spacing.small, paddingVertical: Spacing.small },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  footer: { padding: Spacing.medium, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
});
