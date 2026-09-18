import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  ScrollView,
  PanResponder,
  Modal,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Trainee } from '../types/trainee';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { StarRating } from '@/components/StarRating';

type Props = NativeStackScreenProps<RootStackParamList, 'Trainees'>;

function DeleteConfirmationModal({
  visible,
  onConfirm,
  onCancel,
  traineeName,
  isLoading,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  traineeName: string;
  isLoading: boolean;
}): React.JSX.Element {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[styles.modalContainer, { transform: [{ scale: scaleAnim }] }]}
        >
          <Text style={styles.modalTitle}>Delete client</Text>
          <Text style={styles.modalMessage}>
            Permanently remove{' '}
            <Text style={styles.modalName}>{traineeName}</Text>? This cannot be
            undone.
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelBtn]}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.deleteBtn]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.deleteBtnText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default function TraineeListScreen({ route, navigation }: Props) {
  const { status } = route.params;
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [filteredTrainees, setFilteredTrainees] = useState<Trainee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isFocused = useIsFocused();
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [traineeToDelete, setTraineeToDelete] = useState<Trainee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hoveredChar, setHoveredChar] = useState<string | null>(null);
  const [alphabetHeight, setAlphabetHeight] = useState(0);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  useEffect(() => {
    navigation.setOptions({
      title: status ? 'Active clients' : 'Inactive clients',
    });
  }, [navigation, status]);

  const fetchTrainees = async (): Promise<void> => {
    setIsLoading(true);
    const backendUrl = Constants.expoConfig?.extra?.backendUrl;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(
        `${backendUrl}/trainees?active_status=${status}`,
        { headers: { Authorization: `${token}` } }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        setTrainees([]);
        setFilteredTrainees([]);
        return;
      }

      const sorted = data.sort((a: Trainee, b: Trainee) =>
        a.name.localeCompare(b.name)
      );
      setTrainees(sorted);
      setFilteredTrainees(sorted);
    } catch {
      setTrainees([]);
      setFilteredTrainees([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string): void => {
    setSearchQuery(query);
    setSelectedChar(null);
    if (query.trim() === '') {
      setFilteredTrainees(trainees);
    } else {
      setFilteredTrainees(
        trainees.filter((t) =>
          t.name.toLowerCase().includes(query.toLowerCase())
        )
      );
    }
  };

  const handleAlphabeticalFilter = (character: string): void => {
    setSelectedChar(character);
    setSearchQuery('');
    setFilteredTrainees(
      trainees.filter((t) =>
        t.name.toLowerCase().startsWith(character.toLowerCase())
      )
    );
  };

  const resetFilter = (): void => {
    setSelectedChar(null);
    setSearchQuery('');
    setFilteredTrainees(trainees);
  };

  const deleteTrainee = async (id: string): Promise<void> => {
    setIsDeleting(true);
    const backendUrl = Constants.expoConfig?.extra?.backendUrl;
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${backendUrl}/trainees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to delete client');
      }
      setTrainees((prev) => prev.filter((t) => t.id !== id));
      setFilteredTrainees((prev) => prev.filter((t) => t.id !== id));
      setDeleteModalVisible(false);
      setTraineeToDelete(null);
    } catch {
      Alert.alert('Error', 'Failed to delete client. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      void fetchTrainees();
    }
  }, [isFocused, status]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationY } = evt.nativeEvent;
        const itemHeight = Math.max(20, (alphabetHeight - 40) / 26);
        const index = Math.floor((locationY - 20) / itemHeight);
        if (index >= 0 && index < 26) {
          const char = alphabet[index];
          setHoveredChar(char);
          setSelectedChar(char);
          handleAlphabeticalFilter(char);
        }
      },
      onPanResponderMove: (evt) => {
        const { locationY } = evt.nativeEvent;
        const itemHeight = Math.max(20, (alphabetHeight - 40) / 26);
        const index = Math.floor((locationY - 20) / itemHeight);
        if (index >= 0 && index < 26) {
          const char = alphabet[index];
          if (char !== hoveredChar) {
            setHoveredChar(char);
            setSelectedChar(char);
            handleAlphabeticalFilter(char);
          }
        }
      },
      onPanResponderRelease: () => setHoveredChar(null),
    })
  ).current;

  const renderItem = ({ item }: { item: Trainee }): React.JSX.Element => {
    const initial = (item.name || 'C').charAt(0).toUpperCase();
    const hasPhoto = Boolean(item.image_url?.trim());

    return (
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('TraineeDetail', { trainee: item })}
          activeOpacity={0.85}
        >
          {hasPhoto ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.metaRow}>
              {item.user_id ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>On app</Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.badgeMuted]}>
                  <Text style={styles.badgeMutedText}>Invite pending</Text>
                </View>
              )}
              {(item.rating_count ?? 0) > 0 ? (
                <StarRating value={item.rating ?? 0} readonly size={14} showValue />
              ) : null}
            </View>
            {item.goals ? (
              <Text style={styles.cardGoals} numberOfLines={1}>
                {item.goals}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setTraineeToDelete(item);
            setDeleteModalVisible(true);
          }}
          style={styles.deleteIconBtn}
          accessibilityLabel={`Delete ${item.name}`}
          activeOpacity={0.75}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading clients…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={styles.alphabetSidebar}
        onLayout={(e) => setAlphabetHeight(e.nativeEvent.layout.height)}
      >
        <ScrollView
          contentContainerStyle={styles.alphabetScroll}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          <View style={styles.alphabetInner} {...panResponder.panHandlers}>
            {alphabet.map((char) => {
              const isActive =
                selectedChar === char || hoveredChar === char;
              return (
                <TouchableOpacity
                  key={char}
                  style={[styles.alphaItem, isActive && styles.alphaItemActive]}
                  onPress={() => handleAlphabeticalFilter(char)}
                >
                  <Text
                    style={[styles.alphaText, isActive && styles.alphaTextActive]}
                  >
                    {char}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        {selectedChar ? (
          <TouchableOpacity style={styles.resetAlpha} onPress={resetFilter}>
            <Ionicons name="close" size={14} color={Colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.main}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryMuted]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroTitle}>
            {status ? 'Active clients' : 'Inactive clients'}
          </Text>
          <Text style={styles.heroSub}>
            {filteredTrainees.length}{' '}
            {filteredTrainees.length === 1 ? 'client' : 'clients'}
            {selectedChar ? ` · ${selectedChar}` : ''}
          </Text>
        </LinearGradient>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name"
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {selectedChar ? (
          <View style={styles.filterChip}>
            <Text style={styles.filterChipText}>
              Names starting with “{selectedChar}”
            </Text>
            <TouchableOpacity onPress={resetFilter}>
              <Text style={styles.filterClear}>Clear</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {filteredTrainees.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No clients found</Text>
            <Text style={styles.emptySub}>
              {searchQuery || selectedChar
                ? 'Try a different search or letter'
                : status
                  ? 'Add your first client to get started'
                  : 'No inactive clients'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTrainees}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          />
        )}

        {status === true ? (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('TraineeForm', {})}
            activeOpacity={0.9}
          >
            <Ionicons name="add" size={22} color={Colors.textPrimary} />
            <Text style={styles.fabText}>Add client</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <DeleteConfirmationModal
        visible={deleteModalVisible}
        onConfirm={() => {
          if (traineeToDelete) {
            void deleteTrainee(traineeToDelete.id);
          }
        }}
        onCancel={() => {
          setDeleteModalVisible(false);
          setTraineeToDelete(null);
        }}
        traineeName={traineeToDelete?.name || ''}
        isLoading={isDeleting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.medium,
    color: Colors.textSecondary,
  },
  alphabetSidebar: {
    width: 36,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingVertical: 8,
    alignItems: 'center',
  },
  alphabetScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  alphabetInner: { alignItems: 'center' },
  alphaItem: {
    width: 26,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 13,
  },
  alphaItemActive: { backgroundColor: Colors.primary },
  alphaText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  alphaTextActive: { color: Colors.textOnPrimary, fontWeight: '700' },
  resetAlpha: {
    marginTop: 6,
    padding: 4,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 10,
  },
  main: { flex: 1 },
  hero: {
    paddingHorizontal: Spacing.medium,
    paddingTop: Spacing.medium,
    paddingBottom: Spacing.large,
    borderBottomLeftRadius: Radii.lg,
    borderBottomRightRadius: Radii.lg,
  },
  heroTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.textOnPrimary,
  },
  heroSub: {
    color: Colors.accentSoft,
    marginTop: 4,
    fontSize: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.medium,
    marginTop: -18,
    marginBottom: Spacing.small,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    padding: 0,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.medium,
    marginBottom: Spacing.small,
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.sm,
  },
  filterChipText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '500' },
  filterClear: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  list: {
    paddingHorizontal: Spacing.medium,
    paddingBottom: 100,
    paddingTop: Spacing.small,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 10,
    gap: 8,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundAlt,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryMuted,
  },
  avatarInitial: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 18,
  },
  cardBody: { flex: 1 },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: Colors.activeCard,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeMuted: { backgroundColor: Colors.backgroundAlt },
  badgeMutedText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  cardGoals: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  deleteIconBtn: {
    width: 48,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.inactiveCard,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: '#E8B4A8',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySub: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: Spacing.medium,
    bottom: Spacing.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 28,
    shadowColor: '#14201B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  fabText: {
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 32, 27, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.large,
    marginHorizontal: Spacing.large,
    minWidth: 280,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.large,
  },
  modalName: { fontWeight: '700', color: Colors.textPrimary },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radii.sm,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: Colors.backgroundAlt,
  },
  cancelBtnText: { fontWeight: '600', color: Colors.textPrimary },
  deleteBtn: { backgroundColor: Colors.error },
  deleteBtnText: { fontWeight: '700', color: '#fff' },
});
