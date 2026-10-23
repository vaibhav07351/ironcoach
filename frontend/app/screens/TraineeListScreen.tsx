import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StarRating } from '@/components/StarRating';
import { TextField } from '@/components/TextField';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { fetchAdherenceRoster } from '../services/adherenceService';
import { errorMessage } from '../services/http';
import { listTrainees, type TraineeStatusFilter } from '../services/traineeService';
import { listDues } from '../services/todayService';
import type { AdherenceSummary } from '../types/auth';
import type { RootStackParamList } from '../types/navigation';
import type { Trainee } from '../types/trainee';
import { lastLoggedLabel } from '../utils/lastLogged';
import { formatRupees } from '../utils/money';

const FILTERS: { value: TraineeStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function initialFilter(status: boolean | undefined): TraineeStatusFilter {
  if (status === undefined) return 'all';
  return status ? 'active' : 'inactive';
}

/**
 * The trainer's clients: search by name, filter by status, open a client. Used as the Clients tab
 * and as a stack screen opened from the dashboard with a status filter.
 */
export default function TraineeListScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Trainees'>>();
  const [filter, setFilter] = useState<TraineeStatusFilter>(initialFilter(route.params?.status));
  const [query, setQuery] = useState('');
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Last logged, slipping and dues come from separate requests; the list still works without them.
  const [weeks, setWeeks] = useState<Map<string, AdherenceSummary>>(new Map());
  const [dues, setDues] = useState<Map<string, number>>(new Map());
  const [extrasFailed, setExtrasFailed] = useState(false);

  useLayoutEffect(() => {
    if (route.params?.status !== undefined) {
      navigation.setOptions({ title: route.params.status ? 'Active clients' : 'Inactive clients' });
    }
  }, [navigation, route.params?.status]);

  const load = useCallback(async () => {
    try {
      const [list, roster, dueList] = await Promise.allSettled([listTrainees(filter), fetchAdherenceRoster(200), listDues(200)]);
      if (list.status === 'rejected') {
        throw list.reason;
      }
      setTrainees(list.value);
      setWeeks(roster.status === 'fulfilled' ? new Map(roster.value.map((r) => [r.trainee_id, r])) : new Map());
      setDues(dueList.status === 'fulfilled' ? new Map(dueList.value.items.map((d) => [d.trainee_id, d.due_paise])) : new Map());
      setExtrasFailed(roster.status === 'rejected' || dueList.status === 'rejected');
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? trainees.filter((t) => t.name.toLowerCase().includes(q)) : trainees;
  }, [trainees, query]);

  const onChangeFilter = (value: TraineeStatusFilter): void => {
    if (value !== filter) {
      setLoading(true);
      setFilter(value);
    }
  };

  const header = (
    <View>
      <TextField
        label="Search clients"
        value={query}
        onChangeText={setQuery}
        placeholder="Name"
        autoCorrect={false}
        returnKeyType="search"
      />
      {extrasFailed ? (
        <AppText variant="caption" tone="muted" style={styles.note}>
          Last logged and fees are not available right now. Pull down to retry.
        </AppText>
      ) : null}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Chip key={f.value} label={f.label} selected={filter === f.value} onPress={() => onChangeFilter(f.value)} />
        ))}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Trainee }): React.JSX.Element => {
    const week = weeks.get(item.id);
    const due = dues.get(item.id) ?? 0;
    return (
      <Pressable
        onPress={() => navigation.navigate('TraineeDetail', { trainee: { id: item.id, name: item.name } })}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.name}`}
        style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <AppText variant="subheading" tone="brand">
              {(item.name || 'C').charAt(0).toUpperCase()}
            </AppText>
          </View>
        )}
        <View style={styles.rowBody}>
          <AppText variant="subheading" numberOfLines={1}>
            {item.name}
          </AppText>
          <View style={styles.meta}>
            <View style={[styles.badge, item.user_id ? styles.badgeOn : styles.badgeOff]}>
              <AppText variant="caption" style={{ color: item.user_id ? Colors.success : Colors.textSecondary }}>
                {item.user_id ? 'On app' : 'Not on app yet'}
              </AppText>
            </View>
            {!item.active_status ? (
              <AppText variant="caption" tone="muted">
                Inactive
              </AppText>
            ) : null}
            {(item.rating_count ?? 0) > 0 ? <StarRating value={item.rating ?? 0} readonly size={14} showValue /> : null}
          </View>
          {week ? (
            <AppText variant="caption" tone={week.at_risk ? 'error' : 'secondary'} numberOfLines={1}>
              {lastLoggedLabel(week.last_activity_date)}
              {week.at_risk ? ', slipping' : ''}
            </AppText>
          ) : item.goals ? (
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {item.goals}
            </AppText>
          ) : null}
          {due > 0 ? (
            <AppText variant="caption" tone="error" numberOfLines={1}>
              {formatRupees(due)} due
            </AppText>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </Pressable>
    );
  };

  if (loading && trainees.length === 0) {
    return <LoadingState />;
  }
  if (loadError && trainees.length === 0) {
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
    <View style={styles.root}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={visible}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
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
          query ? (
            <EmptyState icon="search-outline" title="No matches" message={`No client named "${query}".`} />
          ) : (
            <EmptyState
              icon="people-outline"
              title={filter === 'inactive' ? 'No inactive clients' : 'No clients yet'}
              message="Add a client to log their workouts and meals, then invite them to the app."
              actionLabel="Add client"
              onAction={() => navigation.navigate('TraineeForm')}
            />
          )
        }
      />
      <View style={styles.footer}>
        <Button title="Add client" icon="person-add-outline" onPress={() => navigation.navigate('TraineeForm')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    flex: 1,
  },
  content: {
    padding: Spacing.medium,
    flexGrow: 1,
  },
  note: {
    marginBottom: Spacing.small,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.small,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.medium,
    marginBottom: Spacing.small,
  },
  pressed: {
    opacity: 0.85,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Spacing.medium,
    backgroundColor: Colors.backgroundAlt,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.small,
    marginVertical: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.small,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  badgeOn: {
    backgroundColor: Colors.activeCard,
  },
  badgeOff: {
    backgroundColor: Colors.backgroundAlt,
  },
  footer: {
    padding: Spacing.medium,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
