import React, { useState, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Trainee } from '../types/trainee';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../contexts/AuthContext';
import { fetchMyRating, upsertRating } from '../services/ratingService';
import { StarRating } from '@/components/StarRating';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';

type Props = {
    trainee: Trainee;
    navigation: any;
};

type DetailRow = { label: string; value: string };

export default function AboutDetailsScreen({ trainee, navigation }: Props) {
    const { token, role } = useContext(AuthContext);
    const isTrainer = role === 'trainer';
    const [currentTrainee, setCurrentTrainee] = useState<Trainee>(trainee);
    const [myScore, setMyScore] = useState(0);
    const [savingRating, setSavingRating] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            if (trainee.id) {
                void fetchUpdatedTrainee(trainee.id);
            }
        }, [trainee.id])
    );

    const fetchUpdatedTrainee = async (id: string) => {
        const backendUrl = Constants.expoConfig?.extra?.backendUrl;
        try {
            const authToken = token || (await AsyncStorage.getItem('token'));
            const response = await fetch(`${backendUrl}/trainees/${id}`, {
                headers: { Authorization: `${authToken}` },
            });
            const updatedTrainee = await response.json();
            setCurrentTrainee(updatedTrainee);

            if (authToken) {
                const mine = await fetchMyRating(authToken, 'client', id);
                setMyScore(mine.score ?? 0);
            }
        } catch (error) {
            console.error('Error fetching trainee data:', error);
        }
    };

    const handleEditPress = () => {
        const params = {
            trainee: currentTrainee,
            traineeId: currentTrainee.id,
        };
        const root =
            navigation.getParent()?.getParent() ??
            navigation.getParent() ??
            navigation;
        if (root?.navigate) {
            root.navigate('TraineeForm', params);
            return;
        }
        navigation.navigate('TraineeForm', params);
    };

    const onRateClient = async (score: number): Promise<void> => {
        if (!token || !currentTrainee.id) {
            return;
        }
        setMyScore(score);
        setSavingRating(true);
        try {
            await upsertRating(token, {
                to_kind: 'client',
                to_id: currentTrainee.id,
                score,
            });
            await fetchUpdatedTrainee(currentTrainee.id);
            Toast.show({ type: 'success', text1: 'Saved', text2: 'Client rating updated.' });
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : 'Could not save rating';
            Toast.show({ type: 'error', text1: 'Rating', text2: message });
        } finally {
            setSavingRating(false);
        }
    };

    const heightCm = currentTrainee.height ?? 0;
    const heightFt = Math.floor(heightCm / 2.54 / 12);
    const heightIn = Math.round((heightCm / 2.54) % 12);

    const rows: DetailRow[] = [
        { label: 'Name', value: currentTrainee.name || '—' },
        { label: 'Phone', value: currentTrainee.phone_number || '—' },
        { label: 'Goals', value: currentTrainee.goals || '—' },
        { label: 'Notes', value: currentTrainee.notes || '—' },
        { label: 'Supplements', value: currentTrainee.active_supplements || '—' },
        { label: 'Medical history', value: currentTrainee.medical_history || '—' },
        { label: 'Gender', value: currentTrainee.gender || '—' },
        { label: 'Date of birth', value: currentTrainee.dob || '—' },
        {
            label: 'Height',
            value: heightCm
                ? `${heightCm} cm (${heightFt}'${heightIn}")`
                : '—',
        },
        { label: 'Profession', value: currentTrainee.profession || '—' },
        { label: 'Start date', value: currentTrainee.start_date || '—' },
        { label: 'Membership', value: currentTrainee.membership_type || '—' },
        { label: 'Emergency contact', value: currentTrainee.emergency_contact || '—' },
        { label: 'Social', value: currentTrainee.social_handle || '—' },
        {
            label: 'Status',
            value: currentTrainee.active_status ? 'Active' : 'Inactive',
        },
    ];

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.hero}>
                <Image
                    source={{
                        uri: currentTrainee.image_url
                            ? currentTrainee.image_url
                            : 'https://res.cloudinary.com/vaibhav07351/image/upload/v1735825573/tisqhtqxaydhprbwtsld.png',
                    }}
                    style={styles.image}
                    resizeMode="cover"
                />
                <View style={styles.heroText}>
                    <Text style={styles.eyebrow}>IronCoach</Text>
                    <Text style={styles.title}>
                        {isTrainer ? 'Client profile' : 'My profile'}
                    </Text>
                    <Text style={styles.name}>{currentTrainee.name}</Text>
                    <View
                        style={[
                            styles.statusPill,
                            currentTrainee.active_status
                                ? styles.statusActive
                                : styles.statusInactive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.statusText,
                                currentTrainee.active_status
                                    ? styles.statusTextActive
                                    : styles.statusTextInactive,
                            ]}
                        >
                            {currentTrainee.active_status ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
                    <Icon name="pencil-outline" size={18} color={Colors.textOnPrimary} />
                </TouchableOpacity>
            </View>

            {isTrainer ? (
                currentTrainee.user_id ? (
                    <View style={styles.linkedBanner}>
                        <Icon name="check-circle-outline" size={18} color={Colors.primary} />
                        <Text style={styles.linkedText}>
                            Already on the app — no invite needed
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.inviteButton}
                        onPress={() => {
                            const root = navigation.getParent()?.getParent();
                            if (root) {
                                root.navigate('InviteClient', {
                                    traineeId: currentTrainee.id,
                                    traineeName: currentTrainee.name,
                                });
                            }
                        }}
                        activeOpacity={0.88}
                    >
                        <Icon name="qrcode" size={18} color={Colors.textPrimary} />
                        <Text style={styles.inviteButtonText}>Invite client to app</Text>
                    </TouchableOpacity>
                )
            ) : null}

            {isTrainer ? (
                <View style={styles.ratingBlock}>
                    <Text style={styles.ratingTitle}>Your rating for this client</Text>
                    {(currentTrainee.rating_count ?? 0) > 0 ? (
                        <View style={styles.avgRow}>
                            <StarRating
                                value={currentTrainee.rating ?? 0}
                                readonly
                                size={18}
                                showValue
                            />
                            <Text style={styles.avgMeta}>
                                avg · {currentTrainee.rating_count} rating
                                {currentTrainee.rating_count === 1 ? '' : 's'}
                            </Text>
                        </View>
                    ) : null}
                    <StarRating
                        value={myScore}
                        onChange={(score) => {
                            void onRateClient(score);
                        }}
                        size={30}
                    />
                    {savingRating ? (
                        <ActivityIndicator
                            color={Colors.primary}
                            style={{ marginTop: Spacing.small }}
                        />
                    ) : (
                        <Text style={styles.ratingHint}>
                            Tap left/right half of a star for half ratings
                        </Text>
                    )}
                </View>
            ) : (currentTrainee.rating_count ?? 0) > 0 ? (
                <View style={styles.ratingBlock}>
                    <Text style={styles.ratingTitle}>Your coach rating of you</Text>
                    <StarRating
                        value={currentTrainee.rating ?? 0}
                        readonly
                        size={22}
                        showValue
                    />
                </View>
            ) : null}

            <Text style={styles.sectionLabel}>Details</Text>
            <View style={styles.card}>
                {rows.map((row, index) => (
                    <View
                        key={row.label}
                        style={[
                            styles.row,
                            index === rows.length - 1 ? styles.rowLast : null,
                        ]}
                    >
                        <Text style={styles.label}>{row.label}</Text>
                        <Text style={styles.value}>{row.value}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        padding: Spacing.medium,
        paddingBottom: Spacing.xl,
    },
    hero: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: Radii.lg,
        padding: Spacing.medium,
        marginBottom: Spacing.medium,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.medium,
    },
    image: {
        width: 88,
        height: 88,
        borderRadius: Radii.lg,
        backgroundColor: Colors.backgroundAlt,
    },
    heroText: {
        flex: 1,
    },
    eyebrow: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: Colors.accent,
        marginBottom: 2,
    },
    title: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    name: {
        fontFamily: Fonts.display,
        fontSize: 22,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: Spacing.small,
    },
    statusPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Radii.sm,
    },
    statusActive: {
        backgroundColor: Colors.activeCard,
    },
    statusInactive: {
        backgroundColor: Colors.inactiveCard,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    statusTextActive: {
        color: Colors.success,
    },
    statusTextInactive: {
        color: Colors.atRisk,
    },
    editButton: {
        backgroundColor: Colors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inviteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.accent,
        paddingVertical: 14,
        borderRadius: Radii.md,
        marginBottom: Spacing.medium,
    },
    inviteButtonText: {
        color: Colors.textPrimary,
        fontWeight: '800',
        fontSize: 15,
    },
    linkedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.activeCard,
        paddingVertical: 12,
        borderRadius: Radii.md,
        marginBottom: Spacing.medium,
    },
    linkedText: {
        color: Colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    ratingBlock: {
        backgroundColor: Colors.surface,
        borderRadius: Radii.md,
        padding: Spacing.medium,
        marginBottom: Spacing.medium,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    ratingTitle: {
        fontWeight: '700',
        fontSize: 15,
        color: Colors.textPrimary,
        marginBottom: Spacing.small,
    },
    avgRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: Spacing.small,
    },
    avgMeta: { color: Colors.textSecondary, fontSize: 12 },
    ratingHint: {
        color: Colors.textSecondary,
        fontSize: 12,
        marginTop: Spacing.small,
    },
    sectionLabel: {
        fontFamily: Fonts.display,
        fontSize: 18,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: Spacing.small,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    row: {
        paddingHorizontal: Spacing.medium,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    rowLast: {
        borderBottomWidth: 0,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    value: {
        fontSize: 16,
        color: Colors.textPrimary,
        lineHeight: 22,
    },
});
