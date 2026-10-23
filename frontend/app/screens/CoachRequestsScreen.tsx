import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Colors, Spacing } from '@/constants/theme';
import { errorMessage } from '../services/http';
import { acceptCoachRequest, listCoachRequests, rejectCoachRequest } from '../services/trainerService';
import type { CoachRequest } from '../types/coach';

/** Pending coaching requests for the trainer: accept (creates a linked client) or decline. */
export default function CoachRequestsScreen(): React.JSX.Element {
  const [items, setItems] = useState<CoachRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acting, setActing] = useState<{ id: string; action: 'accept' | 'reject' } | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listCoachRequests());
      setLoadError(null);
    } catch (error: unknown) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const resolve = async (item: CoachRequest, action: 'accept' | 'reject'): Promise<void> => {
    setActing({ id: item.id, action });
    try {
      if (action === 'accept') {
        await acceptCoachRequest(item.id);
        Toast.show({ type: 'success', text1: 'Client added', text2: `${item.client_name ?? 'Client'} is now linked to you.` });
      } else {
        await rejectCoachRequest(item.id);
        Toast.show({ type: 'success', text1: 'Request declined' });
      }
      setItems((prev) => prev.filter((r) => r.id !== item.id));
    } catch (error: unknown) {
      Toast.show({ type: 'error', text1: 'Could not update the request', text2: errorMessage(error) });
      void load();
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return <LoadingState />;
  }
  if (loadError && items.length === 0) {
    return (
      <ErrorState
        message={loadError}
        onRetry={() => {
          setLoading(true);
          void load();
        }}
      />
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={Colors.primary}
        />
      }
      ListEmptyComponent={
        <EmptyState icon="mail-open-outline" title="No pending requests" message="New coaching requests show up here." />
      }
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <AppText variant="subheading">{item.client_name || 'New client'}</AppText>
          {item.client_email ? <AppText tone="secondary">{item.client_email}</AppText> : null}
          <AppText variant="caption" tone="muted" style={styles.date}>
            Requested {new Date(item.created_at).toLocaleDateString('en-IN')}
          </AppText>
          <View style={styles.actions}>
            <Button
              title="Decline"
              variant="secondary"
              onPress={() => void resolve(item, 'reject')}
              loading={acting?.id === item.id && acting.action === 'reject'}
              disabled={!!acting}
              style={styles.action}
            />
            <Button
              title="Accept"
              onPress={() => void resolve(item, 'accept')}
              loading={acting?.id === item.id && acting.action === 'accept'}
              disabled={!!acting}
              style={styles.action}
            />
          </View>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.medium,
    flexGrow: 1,
  },
  card: {
    marginBottom: Spacing.medium,
  },
  date: {
    marginTop: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    marginTop: Spacing.medium,
    gap: Spacing.small,
  },
  action: {
    flex: 1,
  },
});
