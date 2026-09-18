import React, { useCallback, useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../types/navigation';
import { AuthContext } from '../contexts/AuthContext';
import {
  acceptCoachRequest,
  listCoachRequests,
  rejectCoachRequest,
  type CoachRequest,
} from '../services/trainerService';
import { Colors, Radii, Spacing } from '@/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CoachRequests'>;

export default function CoachRequestsScreen({ navigation }: Props) {
  const { token } = useContext(AuthContext);
  const [items, setItems] = useState<CoachRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      navigation.replace('Login');
      return;
    }
    setLoading(true);
    try {
      const data = await listCoachRequests(token);
      setItems(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load requests';
      Toast.show({ type: 'error', text1: 'Requests', text2: message });
    } finally {
      setLoading(false);
    }
  }, [token, navigation]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onAccept = async (id: string): Promise<void> => {
    if (!token) {
      return;
    }
    setActingId(id);
    try {
      await acceptCoachRequest(token, id);
      Toast.show({
        type: 'success',
        text1: 'Accepted',
        text2: 'Client is now linked to you.',
      });
      await load();
      navigation.navigate('Dashboard');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Accept failed';
      Toast.show({ type: 'error', text1: 'Accept', text2: message });
    } finally {
      setActingId(null);
    }
  };

  const onReject = async (id: string): Promise<void> => {
    if (!token) {
      return;
    }
    setActingId(id);
    try {
      await rejectCoachRequest(token, id);
      Toast.show({ type: 'success', text1: 'Rejected' });
      await load();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Reject failed';
      Toast.show({ type: 'error', text1: 'Reject', text2: message });
    } finally {
      setActingId(null);
    }
  };

  if (loading && items.length === 0) {
    return (
      <ActivityIndicator
        size="large"
        color={Colors.primary}
        style={{ marginTop: 200 }}
      />
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void load()} />
      }
      ListEmptyComponent={
        <Text style={styles.empty}>No pending coaching requests.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.client_name || 'Client'}</Text>
          <Text style={styles.email}>{item.client_email}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.reject}
              disabled={actingId === item.id}
              onPress={() => void onReject(item.id)}
            >
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.accept}
              disabled={actingId === item.id}
              onPress={() => void onAccept(item.id)}
            >
              {actingId === item.id ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <Text style={styles.acceptText}>Accept</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.medium, paddingBottom: 40 },
  empty: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 80,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.medium,
    marginBottom: Spacing.small,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  name: { fontWeight: '700', fontSize: 17, color: Colors.textPrimary },
  email: { color: Colors.textSecondary, marginTop: 2, marginBottom: Spacing.medium },
  row: { flexDirection: 'row', gap: 10 },
  reject: {
    flex: 1,
    padding: 12,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  rejectText: { fontWeight: '600', color: Colors.textSecondary },
  accept: {
    flex: 1,
    padding: 12,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  acceptText: { fontWeight: '700', color: Colors.textOnPrimary },
});
