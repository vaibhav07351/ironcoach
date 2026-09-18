import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';
import {
  createCoachRequest,
  discoverTrainers,
  type DiscoverTrainer,
} from '../services/trainerService';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { StarRating } from '@/components/StarRating';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainerDiscover'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

export default function TrainerDiscoverScreen({ navigation }: Props) {
  const { token } = useContext(AuthContext);
  const [trainers, setTrainers] = useState<DiscoverTrainer[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cityFallback, setCityFallback] = useState('');
  const [needsCity, setNeedsCity] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const trainersRef = useRef(trainers);
  const indexRef = useRef(index);
  const tokenRef = useRef(token);
  const submittingRef = useRef(submitting);

  trainersRef.current = trainers;
  indexRef.current = index;
  tokenRef.current = token;
  submittingRef.current = submitting;

  const load = useCallback(
    async (lat?: number, lng?: number) => {
      if (!token) {
        return;
      }
      setLoading(true);
      try {
        const items = await discoverTrainers(token, lat, lng);
        setTrainers(items);
        setIndex(0);
        position.setValue({ x: 0, y: 0 });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to load coaches';
        Toast.show({ type: 'error', text1: 'Discover', text2: message });
      } finally {
        setLoading(false);
      }
    },
    [token, position]
  );

  useEffect(() => {
    const init = async (): Promise<void> => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          await load(pos.coords.latitude, pos.coords.longitude);
          return;
        }
      } catch {
        // fall through
      }
      setNeedsCity(true);
      setLoading(false);
    };
    void init();
  }, [load]);

  const advance = useCallback(() => {
    position.setValue({ x: 0, y: 0 });
    setIndex((prev) => prev + 1);
  }, [position]);

  const onSkip = useCallback(() => {
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH * 1.2, y: 0 },
      duration: 220,
      useNativeDriver: true,
    }).start(() => advance());
  }, [advance, position]);

  const onInterested = useCallback(async () => {
    const current = trainersRef.current[indexRef.current];
    const authToken = tokenRef.current;
    if (!current || !authToken || submittingRef.current) {
      return;
    }
    setSubmitting(true);
    try {
      await createCoachRequest(authToken, current.email);
      Toast.show({
        type: 'success',
        text1: 'Request sent',
        text2: `Waiting for ${current.name} to approve.`,
      });
      Animated.timing(position, {
        toValue: { x: SCREEN_WIDTH * 1.2, y: 0 },
        duration: 220,
        useNativeDriver: true,
      }).start(() => advance());
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not send request';
      Toast.show({ type: 'error', text1: 'Request failed', text2: message });
      position.setValue({ x: 0, y: 0 });
    } finally {
      setSubmitting(false);
    }
  }, [advance, position]);

  const onSkipRef = useRef(onSkip);
  const onInterestedRef = useRef(onInterested);
  onSkipRef.current = onSkip;
  onInterestedRef.current = onInterested;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderMove: (_, g) => {
        position.setValue({ x: g.dx, y: g.dy * 0.15 });
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) {
          void onInterestedRef.current();
          return;
        }
        if (g.dx < -SWIPE_THRESHOLD) {
          onSkipRef.current();
          return;
        }
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  const current = trainers[index];

  if (needsCity && !loading && trainers.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Share your city</Text>
        <Text style={styles.sub}>
          Location permission was denied. Enter a city to browse coaches.
        </Text>
        <TextInput
          style={styles.input}
          value={cityFallback}
          onChangeText={setCityFallback}
          placeholder="City name"
          placeholderTextColor={Colors.textSecondary}
        />
        <TouchableOpacity
          style={styles.btn}
          onPress={() => {
            setNeedsCity(false);
            void load();
          }}
        >
          <Text style={styles.btnText}>Browse coaches</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color={Colors.primary}
        style={{ marginTop: 200 }}
      />
    );
  }

  if (!current) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>
          {trainers.length === 0
            ? 'No coaches to show yet'
            : 'No more coaches nearby'}
        </Text>
        <Text style={styles.sub}>
          {trainers.length === 0
            ? 'Coaches appear here only if they turned on “Visible in discovery” and saved a city or GPS location. Ask your coach to enable that on their profile, or join with an invite code.'
            : 'Check back later, or join with an invite code.'}
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('InviteRedeem')}
        >
          <Text style={styles.btnText}>Enter invite code</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const distanceLabel =
    current.distance_km >= 0
      ? `${current.distance_km.toFixed(1)} km away`
      : current.city
        ? [current.area, current.city].filter(Boolean).join(', ')
        : 'Nearby';

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Swipe right to request · left to skip</Text>
      <Animated.View
        style={[
          styles.card,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Image
          source={{
            uri: current.image_url || 'https://via.placeholder.com/400x500',
          }}
          style={styles.photo}
        />
        <View style={styles.cardBody}>
          <Text style={styles.name}>{current.name}</Text>
          <Text style={styles.distance}>{distanceLabel}</Text>
          {current.rating > 0 ? (
            <View style={styles.ratingRow}>
              <StarRating value={current.rating} readonly size={18} showValue />
              {(current.rating_count ?? 0) > 0 ? (
                <Text style={styles.ratingCount}>
                  ({current.rating_count})
                </Text>
              ) : null}
            </View>
          ) : null}
          {current.headline ? (
            <Text style={styles.headline}>{current.headline}</Text>
          ) : null}
          {current.speciality ? (
            <Text style={styles.meta}>{current.speciality}</Text>
          ) : null}
          {current.bio ? (
            <Text style={styles.bio} numberOfLines={3}>
              {current.bio}
            </Text>
          ) : null}
          <Text style={styles.rate}>
            {current.hourly_rate > 0
              ? `₹${current.hourly_rate}/hr`
              : 'Rate on request'}
            {current.experience > 0 ? ` · ${current.experience} yrs` : ''}
          </Text>
        </View>
      </Animated.View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.skip} onPress={onSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.like}
          onPress={() => void onInterested()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.textOnPrimary} />
          ) : (
            <Text style={styles.likeText}>Interested</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.medium,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.large,
    justifyContent: 'center',
  },
  hint: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing.small,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.small,
  },
  sub: { color: Colors.textSecondary, marginBottom: Spacing.medium, lineHeight: 22 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    padding: 12,
    marginBottom: Spacing.medium,
    color: Colors.textPrimary,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photo: { width: '100%', height: '55%', backgroundColor: Colors.backgroundAlt },
  cardBody: { padding: Spacing.medium },
  name: {
    fontFamily: Fonts.display,
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  distance: { color: Colors.accent, fontWeight: '600', marginTop: 2 },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  ratingCount: { color: Colors.textSecondary, fontSize: 12 },
  headline: { color: Colors.textPrimary, marginTop: 8, fontSize: 16 },
  meta: { color: Colors.textSecondary, marginTop: 4 },
  bio: { color: Colors.textSecondary, marginTop: 8, lineHeight: 20 },
  rate: {
    marginTop: Spacing.medium,
    fontWeight: '700',
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.medium,
    marginBottom: Spacing.small,
  },
  skip: {
    flex: 1,
    padding: 14,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  skipText: { fontWeight: '700', color: Colors.textSecondary },
  like: {
    flex: 1,
    padding: 14,
    borderRadius: Radii.md,
    alignItems: 'center',
    backgroundColor: Colors.accent,
  },
  likeText: { fontWeight: '800', color: Colors.textPrimary },
  btn: {
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  btnText: { color: Colors.textOnPrimary, fontWeight: '700' },
});
