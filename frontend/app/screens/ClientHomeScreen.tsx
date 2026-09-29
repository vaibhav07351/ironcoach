import React, { useCallback, useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';
import { fetchMyAdherence } from '../services/adherenceService';
import { fetchMyRating, upsertRating } from '../services/ratingService';
import { AdherenceSummary } from '../types/auth';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { StarRating } from '@/components/StarRating';
import { ACTIVITY_OPTIONS, expertiseLabel } from '../constants/expertise';
import FirstRunHints, {
  hasCompletedFirstRunHints,
} from '@/components/FirstRunHints';

type Props = NativeStackScreenProps<RootStackParamList, 'ClientHome'>;

const CLIENT_HINT_STEPS = [
  {
    title: 'Welcome to your week',
    body: 'This home screen shows your adherence score, streak, and quick ways to log what you trained.',
  },
  {
    title: 'Log a session',
    body: 'Tap a sport chip below to log today’s session. Gym opens full workouts; other sports use a quick log.',
  },
  {
    title: 'Training hub',
    body: 'Open Training hub for workouts, diet, and progress in one place. You can skip these tips anytime.',
  },
];

export default function ClientHomeScreen({ navigation }: Props) {
  const { token, user, logout, isAuthenticated } = useContext(AuthContext);
  const [summary, setSummary] = useState<AdherenceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [myScore, setMyScore] = useState(0);
  const [coachAverage, setCoachAverage] = useState(0);
  const [coachRatingCount, setCoachRatingCount] = useState(0);
  const [savingRating, setSavingRating] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const hintsKey = user?.id
    ? `first_run_hints_client_v1_${user.id}`
    : 'first_run_hints_client_v1';

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    if (user?.needs_interests) {
      navigation.replace('ClientInterests');
      return;
    }
    if (user?.needs_invite) {
      navigation.replace('FindCoachHub');
      return;
    }
    setLoading(true);
    try {
      const data = await fetchMyAdherence(token);
      setSummary(data);

      if (user?.trainer_id) {
        const mine = await fetchMyRating(token, 'trainer', user.trainer_id);
        setMyScore(mine.score ?? 0);
        setCoachAverage(mine.average ?? 0);
        setCoachRatingCount(mine.rating_count ?? 0);
      }

      const seen = await hasCompletedFirstRunHints(hintsKey);
      setShowHints(!seen);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load adherence';
      Toast.show({ type: 'error', text1: 'Adherence', text2: message });
    } finally {
      setLoading(false);
    }
  }, [
    token,
    user?.needs_invite,
    user?.needs_interests,
    user?.trainer_id,
    navigation,
    hintsKey,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        navigation.replace('Login');
        return;
      }
      void load();
    }, [isAuthenticated, load, navigation])
  );

  const onRateCoach = async (score: number): Promise<void> => {
    if (!token || !user?.trainer_id) {
      return;
    }
    setMyScore(score);
    setSavingRating(true);
    try {
      await upsertRating(token, {
        to_kind: 'trainer',
        to_id: user.trainer_id,
        score,
      });
      const mine = await fetchMyRating(token, 'trainer', user.trainer_id);
      setCoachAverage(mine.average ?? 0);
      setCoachRatingCount(mine.rating_count ?? 0);
      Toast.show({ type: 'success', text1: 'Thanks!', text2: 'Coach rating saved.' });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not save rating';
      Toast.show({ type: 'error', text1: 'Rating', text2: message });
    } finally {
      setSavingRating(false);
    }
  };

  const traineeId = user?.trainee_id;
  const firstName = user?.name?.split(' ')[0] || 'there';
  const activityCodes =
    user?.interests && user.interests.length > 0
      ? user.interests
      : ACTIVITY_OPTIONS.map((o) => o.code);

  const startActivity = (code: string): void => {
    if (!traineeId) {
      return;
    }
    if (code === 'gym') {
      navigation.navigate('WorkoutCategories', {
        traineeId,
        selectedDate: new Date(),
      });
      return;
    }
    navigation.navigate('LogSession', {
      traineeId,
      selectedDate: new Date(),
      activityType: code,
    });
  };

  return (
    <View style={styles.container}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => void load()}
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
        <Text style={styles.heroEyebrow}>TrainerNearMe</Text>
        <Text style={styles.greeting}>Hey {firstName}</Text>
        <Text style={styles.heroSub}>Your week at a glance</Text>

        {loading && !summary ? (
          <ActivityIndicator color={Colors.accentSoft} style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.scorePanel}>
            <Text style={styles.scoreLabel}>Adherence</Text>
            <Text style={styles.scoreValue}>
              {summary ? Math.round(summary.score) : '—'}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.meta}>
                <Text style={styles.metaValue}>{summary?.streak_days ?? 0}</Text>
                <Text style={styles.metaLabel}>streak</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.meta}>
                <Text style={styles.metaValue}>
                  {summary?.workout_days ?? 0}/{summary?.expected_days ?? 4}
                </Text>
                <Text style={styles.metaLabel}>workouts</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.meta}>
                <Text style={styles.metaValue}>{summary?.diet_days ?? 0}/7</Text>
                <Text style={styles.metaLabel}>diet</Text>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.section}>Log a session</Text>
        <Text style={styles.hint}>
          Pick what you trained — quick fields for each sport.
        </Text>
        <View style={styles.activityRow}>
          {activityCodes.map((code) => (
            <TouchableOpacity
              key={code}
              style={styles.activityChip}
              disabled={!traineeId}
              onPress={() => startActivity(code)}
            >
              <Text style={styles.activityChipText}>{expertiseLabel(code)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.action}
          disabled={!traineeId}
          onPress={() => {
            if (!traineeId) {
              return;
            }
            navigation.navigate('TraineeDetail', {
              trainee: {
                id: traineeId,
                name: user?.name || 'Me',
                trainer_id: user?.trainer_id || '',
              } as never,
            });
          }}
          activeOpacity={0.88}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="grid-outline" size={22} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Training hub</Text>
            <Text style={styles.actionSub}>Sessions, diet, and progress</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        {user?.trainer_id ? (
          <View style={styles.ratingCard}>
            <Text style={styles.section}>Rate your coach</Text>
            {coachRatingCount > 0 ? (
              <View style={styles.avgRow}>
                <StarRating value={coachAverage} readonly size={18} showValue />
                <Text style={styles.avgMeta}>
                  avg · {coachRatingCount} rating
                  {coachRatingCount === 1 ? '' : 's'}
                </Text>
              </View>
            ) : (
              <Text style={styles.hint}>Be the first to rate your coach</Text>
            )}
            <StarRating
              value={myScore}
              onChange={(score) => {
                void onRateCoach(score);
              }}
              size={32}
            />
            {savingRating ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />
            ) : (
              <Text style={styles.hint}>
                Tap left/right half of a star for half ratings
              </Text>
            )}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.signOut}
          onPress={() => {
            void logout().then(() => navigation.replace('Login'));
          }}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>

      <FirstRunHints
        storageKey={hintsKey}
        steps={CLIENT_HINT_STEPS}
        visible={showHints}
        onDismiss={() => setShowHints(false)}
        onPrimary={(stepIndex) => {
          if (stepIndex === 2 && traineeId) {
            navigation.navigate('TraineeDetail', {
              trainee: {
                id: traineeId,
                name: user?.name || 'Me',
                trainer_id: user?.trainer_id || '',
              } as never,
            });
          }
        }}
        primaryLabel={(stepIndex, isLast) => {
          if (stepIndex === 2) return 'Open hub';
          return isLast ? 'Got it' : 'Next';
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 48 },
  hero: {
    paddingHorizontal: Spacing.large,
    paddingTop: Spacing.large,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: Radii.lg,
    borderBottomRightRadius: Radii.lg,
  },
  heroEyebrow: {
    color: Colors.accentSoft,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  greeting: {
    fontFamily: Fonts.display,
    fontSize: 34,
    color: Colors.textOnPrimary,
    marginTop: 4,
  },
  heroSub: {
    color: 'rgba(247, 244, 236, 0.75)',
    marginBottom: Spacing.large,
    marginTop: 4,
  },
  scorePanel: {
    backgroundColor: 'rgba(247, 244, 236, 0.12)',
    borderRadius: Radii.md,
    padding: Spacing.medium,
  },
  scoreLabel: {
    color: Colors.accentSoft,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    color: Colors.textOnPrimary,
    fontSize: 48,
    fontWeight: '700',
    marginVertical: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.small,
  },
  meta: { flex: 1, alignItems: 'center' },
  metaDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(247, 244, 236, 0.22)',
  },
  metaValue: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  metaLabel: {
    color: Colors.accentSoft,
    fontSize: 11,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: Spacing.large,
    paddingTop: Spacing.large,
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.medium,
  },
  activityChip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  activityChipText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: Spacing.small,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.small,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.small,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.activeCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actionSub: {
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
  ratingCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.medium,
  },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.small,
  },
  avgMeta: { color: Colors.textSecondary, fontSize: 12 },
  signOut: { marginTop: Spacing.xl, alignItems: 'center', padding: 12 },
  signOutText: { color: Colors.textSecondary },
});
