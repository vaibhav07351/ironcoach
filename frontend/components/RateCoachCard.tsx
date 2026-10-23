import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { StarRating } from '@/components/StarRating';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '../app/services/http';
import { fetchMyRating, upsertRating } from '../app/services/ratingService';

/** Lets a client rate their coach (half-star steps) and shows the coach's average. */
export function RateCoachCard({ coachId }: { coachId: string }): React.JSX.Element {
  const [myScore, setMyScore] = useState(0);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const mine = await fetchMyRating('trainer', coachId);
      setMyScore(mine.score ?? 0);
      setAverage(mine.average ?? 0);
      setCount(mine.rating_count ?? 0);
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Could not load the coach rating', text2: errorMessage(e) });
    }
  }, [coachId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRate = async (score: number): Promise<void> => {
    const previous = myScore;
    setMyScore(score);
    setSaving(true);
    try {
      await upsertRating('trainer', coachId, score);
      await load();
      Toast.show({ type: 'success', text1: 'Thanks!', text2: 'Coach rating saved.' });
    } catch (e: unknown) {
      setMyScore(previous);
      Toast.show({ type: 'error', text1: 'Rating not saved', text2: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <AppText variant="subheading">Rate your coach</AppText>
      {count > 0 ? (
        <View style={styles.avg}>
          <StarRating value={average} readonly size={18} showValue />
          <AppText variant="caption" tone="secondary" style={styles.avgText}>
            average of {count} rating{count === 1 ? '' : 's'}
          </AppText>
        </View>
      ) : (
        <AppText variant="caption" tone="secondary">
          Be the first to rate your coach
        </AppText>
      )}
      <View style={styles.stars} pointerEvents={saving ? 'none' : 'auto'}>
        <StarRating value={myScore} onChange={(score) => void onRate(score)} size={32} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  avg: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  avgText: {
    marginLeft: Spacing.small,
  },
  stars: {
    marginTop: Spacing.small,
  },
});
