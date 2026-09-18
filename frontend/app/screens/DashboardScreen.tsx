import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import Toast from 'react-native-toast-message';
import { fetchAdherenceRoster } from '../services/adherenceService';
import { AdherenceSummary } from '../types/auth';
import {
  countCoachRequests,
  fetchTrainerDetails,
  type TrainerDetails,
} from '../services/trainerService';
import { TrainerHeaderAvatar } from '@/components/TrainerHeaderAvatar';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen({ navigation }: Props) {
  const { isAuthenticated, token, role } = useContext(AuthContext);
  const [trainerDetails, setTrainerDetails] = useState<TrainerDetails | null>(
    null
  );
  const [roster, setRoster] = useState<AdherenceSummary[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.replace('Login');
      return;
    }
    if (role === 'client') {
      navigation.replace('ClientHome');
      return;
    }

    try {
      const authToken = token;
      if (!authToken) {
        navigation.replace('Login');
        return;
      }
      const details = await fetchTrainerDetails(authToken);
      setTrainerDetails(details);

      const [items, count] = await Promise.all([
        fetchAdherenceRoster(authToken, 20),
        countCoachRequests(authToken),
      ]);
      setRoster(items);
      setRequestCount(count);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load dashboard.',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, navigation, role, token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    navigation.setOptions({
      title: 'IronCoach',
      headerRight: () => <TrainerHeaderAvatar />,
    });
  }, [navigation]);

  const firstName = trainerDetails?.name?.split(' ')[0] || 'Coach';
  const greeting = greetingForHour(new Date().getHours());

  const stats = useMemo(() => {
    const avgScore =
      roster.length === 0
        ? 0
        : Math.round(
            roster.reduce((sum, r) => sum + r.score, 0) / roster.length
          );
    return {
      clients: roster.length,
      avgScore,
    };
  }, [roster]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
    >
      <LinearGradient
        colors={[Colors.primary, Colors.primaryMuted]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroEyebrow}>{greeting}</Text>
        <Text style={styles.heroName}>{firstName}</Text>
        <Text style={styles.heroSub}>
          Keep your clients accountable this week.
        </Text>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.clients}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {stats.clients > 0 ? stats.avgScore : '—'}
            </Text>
            <Text style={styles.statLabel}>Avg score</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{requestCount}</Text>
            <Text style={styles.statLabel}>Requests</Text>
          </View>
        </View>
      </LinearGradient>

      {requestCount > 0 && (
        <TouchableOpacity
          style={styles.requestsBanner}
          onPress={() => navigation.navigate('CoachRequests')}
          activeOpacity={0.85}
        >
          <View style={styles.requestsBadge}>
            <Text style={styles.requestsBadgeText}>{requestCount}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.requestsTitle}>
              New coaching request{requestCount === 1 ? '' : 's'}
            </Text>
            <Text style={styles.requestsMeta}>Review and accept clients</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.section}>This week</Text>
        {roster.length > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Trainees', { status: true })}
          >
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        )}
      </View>

      {roster.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyTitle}>No clients yet</Text>
          <Text style={styles.empty}>
            Add your first client to start tracking adherence and streaks.
          </Text>
        </View>
      ) : (
        roster.slice(0, 6).map((item) => (
          <View key={item.trainee_id} style={styles.rosterRow}>
            <View style={[styles.scorePill, styles.scorePillOk]}>
              <Text style={styles.rosterScore}>{Math.round(item.score)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rosterName}>
                {item.trainee_name || 'Client'}
              </Text>
              <Text style={styles.rosterMeta}>
                {item.workout_days}/{item.expected_days} workouts · streak{' '}
                {item.streak_days}
              </Text>
            </View>
          </View>
        ))
      )}

      <Text style={[styles.section, styles.rosterHeading]}>
        Your roster
      </Text>
      <View style={styles.navGrid}>
        <TouchableOpacity
          style={[styles.navTile, styles.navTilePrimary]}
          onPress={() => navigation.navigate('Trainees', { status: true })}
          activeOpacity={0.88}
        >
          <Text style={styles.navTileTitleOnDark}>Active</Text>
          <Text style={styles.navTileSubOnDark}>Clients on program</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navTile}
          onPress={() => navigation.navigate('Trainees', { status: false })}
          activeOpacity={0.88}
        >
          <Text style={styles.navTileTitle}>Inactive</Text>
          <Text style={styles.navTileSub}>Paused or archived</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navTile, styles.navTileWide]}
          onPress={() => navigation.navigate('CoachRequests')}
          activeOpacity={0.88}
        >
          <Text style={styles.navTileTitle}>
            Requests{requestCount > 0 ? ` · ${requestCount}` : ''}
          </Text>
          <Text style={styles.navTileSub}>Incoming coaching requests</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('TraineeForm', {})}
        activeOpacity={0.9}
        accessibilityLabel="Add client"
      >
        <Ionicons name="add" size={24} color={Colors.textPrimary} />
        <Text style={styles.fabText}>Add client</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 88 },
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    paddingHorizontal: Spacing.large,
    paddingTop: Spacing.large,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: Radii.lg,
    borderBottomRightRadius: Radii.lg,
  },
  heroEyebrow: {
    color: Colors.accentSoft,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  heroName: {
    fontFamily: Fonts.display,
    fontSize: 36,
    color: Colors.textOnPrimary,
    marginTop: 4,
    marginBottom: 6,
  },
  heroSub: {
    color: 'rgba(247, 244, 236, 0.78)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.large,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 244, 236, 0.12)',
    borderRadius: Radii.md,
    paddingVertical: Spacing.medium,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: {
    color: Colors.textOnPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.accentSoft,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(247, 244, 236, 0.22)',
  },
  requestsBanner: {
    marginHorizontal: Spacing.medium,
    marginTop: Spacing.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.accentSoft,
    borderRadius: Radii.md,
    padding: Spacing.medium,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  requestsBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsBadgeText: {
    fontWeight: '800',
    color: Colors.textPrimary,
    fontSize: 15,
  },
  requestsTitle: {
    fontWeight: '700',
    color: Colors.textPrimary,
    fontSize: 15,
  },
  requestsMeta: { color: Colors.textSecondary, marginTop: 2, fontSize: 13 },
  chevron: {
    fontSize: 28,
    color: Colors.textPrimary,
    fontWeight: '300',
    marginTop: -2,
  },
  fab: {
    position: 'absolute',
    right: Spacing.large,
    bottom: Spacing.large,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    shadowColor: '#14201B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  fabText: {
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  sectionHeader: {
    marginHorizontal: Spacing.medium,
    marginTop: Spacing.large,
    marginBottom: Spacing.small,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 0,
  },
  rosterHeading: {
    marginHorizontal: Spacing.medium,
    marginTop: Spacing.large,
    marginBottom: Spacing.small,
  },
  sectionLink: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyBlock: {
    marginHorizontal: Spacing.medium,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.large,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontWeight: '700',
    color: Colors.textPrimary,
    fontSize: 16,
    marginBottom: 4,
  },
  empty: {
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  rosterRow: {
    marginHorizontal: Spacing.medium,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.medium,
    marginBottom: Spacing.small,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  scorePill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorePillOk: { backgroundColor: Colors.activeCard },
  rosterName: { fontWeight: '700', color: Colors.textPrimary, fontSize: 15 },
  rosterMeta: { color: Colors.textSecondary, fontSize: 12, marginTop: 3 },
  rosterScore: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.success,
  },
  navGrid: {
    marginHorizontal: Spacing.medium,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  navTile: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 88,
    justifyContent: 'center',
  },
  navTilePrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  navTileWide: { width: '100%' },
  navTileTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  navTileSub: {
    color: Colors.textSecondary,
    marginTop: 4,
    fontSize: 13,
  },
  navTileTitleOnDark: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  navTileSubOnDark: {
    color: Colors.accentSoft,
    marginTop: 4,
    fontSize: 13,
  },
});
