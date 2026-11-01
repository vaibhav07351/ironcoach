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
import { IconBadge } from '@/components/IconBadge';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { Spacing, webScrollFix } from '@/constants/theme';
import { useThemedStyles, type Theme } from '../contexts/ThemeContext';
import { errorMessage } from '../services/http';
import { deleteCategory, listCategories } from '../services/workoutService';
import type { RootStackParamList } from '../types/navigation';
import type { Category } from '../types/workout';
import { confirmAction } from '../utils/confirm';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutCategories'>;

/** Step 1 of gym logging: pick a muscle group / category. */
export default function WorkoutCategoriesScreen({ route, navigation }: Props): React.JSX.Element {
  const { traineeId, date } = route.params;
  const styles = useThemedStyles(makeStyles);
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
        style={webScrollFix}
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          items.length > 0 ? (
            <AppText tone="secondary" style={styles.lead}>
              Pick what was trained.
            </AppText>
          ) : null
        }
        ListEmptyComponent={<EmptyState icon="barbell-outline" title="No categories" message="Add one to start logging." />}
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            accessibilityLabel={`Open ${item.name}`}
            onPress={() =>
              navigation.navigate('WorkoutExercises', { traineeId, categoryId: item.id, categoryName: item.name, date })
            }
          >
            <View style={styles.row}>
              <IconBadge name="barbell" size={40} />
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
