import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { PackageCard } from '@/components/PackageCard';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '../app/contexts/AuthContext';
import { useTraineeRecord } from '../app/contexts/TraineeRecordContext';
import { useFeeReminder } from '../app/hooks/useFeeReminder';
import { deletePackage, deletePayment, getFees } from '../app/services/feesService';
import { errorMessage } from '../app/services/http';
import { getTrainee } from '../app/services/traineeService';
import type { FeeSummary } from '../app/types/fees';
import type { RootStackParamList } from '../app/types/navigation';
import { confirmAction } from '../app/utils/confirm';
import { longDateLabel } from '../app/utils/date';
import { formatRupees } from '../app/utils/money';

/**
 * Fees of the current client record: what was sold, what was paid, what is due. Trainers record
 * packages and payments and send a WhatsApp reminder; clients see the same numbers read-only.
 * The app only records: no money moves through it.
 */
export function FeesSection(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const record = useTraineeRecord();
  const { user } = useAuth();
  const isTrainer = user?.role === 'trainer';
  const { remind, busy } = useFeeReminder();
  const [fees, setFees] = useState<FeeSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setFees(await getFees(record.id));
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [record.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const remove = async (kind: 'package' | 'payment', id: string, label: string): Promise<void> => {
    const ok = await confirmAction({
      title: `Delete ${kind}?`,
      message: `${label} will be removed and the amount due will change.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) {
      return;
    }
    try {
      await (kind === 'package' ? deletePackage(id) : deletePayment(id));
      await load();
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not deleted', text2: errorMessage(e) });
    }
  };

  const sendReminder = async (due: number): Promise<void> => {
    let phone: string | undefined;
    try {
      phone = (await getTrainee(record.id)).phone_number;
    } catch (e: unknown) {
      // The reminder still works without a number: WhatsApp opens its contact picker instead.
      Toast.show({ type: 'info', text1: 'Phone number not loaded', text2: `${errorMessage(e)} Pick the contact in WhatsApp.` });
    }
    await remind({ clientName: record.name, phone, duePaise: due });
  };

  if (!fees) {
    return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;
  }

  const hasMoney = fees.packages.length > 0 || fees.payments.length > 0;

  return (
    <ScrollView
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
      <Card style={styles.summary}>
        <AppText variant="label" tone="secondary">
          {fees.credit_paise > 0 ? 'Paid in advance' : 'Amount due'}
        </AppText>
        <AppText variant="title" tone={fees.due_paise > 0 ? 'error' : 'success'}>
          {formatRupees(fees.credit_paise > 0 ? fees.credit_paise : fees.due_paise)}
        </AppText>
        <AppText variant="caption" tone="secondary">
          Paid {formatRupees(fees.paid_paise)} of {formatRupees(fees.total_paise)}
        </AppText>
      </Card>

      {isTrainer ? (
        <View style={styles.actions}>
          <Button
            title="Sell package"
            icon="pricetag-outline"
            onPress={() => navigation.navigate('AddPackage', { traineeId: record.id, traineeName: record.name })}
          />
          <Button
            title="Record payment"
            icon="cash-outline"
            variant="secondary"
            onPress={() =>
              navigation.navigate('AddPayment', {
                traineeId: record.id,
                traineeName: record.name,
                duePaise: fees.due_paise,
              })
            }
          />
          {fees.due_paise > 0 ? (
            <Button
              title="Remind on WhatsApp"
              icon="logo-whatsapp"
              variant="secondary"
              loading={busy}
              onPress={() => void sendReminder(fees.due_paise)}
            />
          ) : null}
          <Pressable
            onPress={() => navigation.navigate('UpiSettings')}
            accessibilityRole="button"
            style={styles.link}
          >
            <Ionicons name="wallet-outline" size={16} color={Colors.primary} />
            <AppText variant="label" tone="brand" style={styles.linkText}>
              My UPI id for reminders
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {!hasMoney ? (
        <AppText tone="secondary" center style={styles.empty}>
          {isTrainer
            ? 'No packages yet. Sell a package to start tracking sessions and fees.'
            : 'Your coach has not added any packages yet.'}
        </AppText>
      ) : null}

      {fees.packages.length > 0 ? (
        <>
          <AppText variant="subheading" style={styles.heading}>
            Packages
          </AppText>
          {[...fees.packages].reverse().map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onDelete={isTrainer ? () => void remove('package', pkg.id, pkg.name) : undefined}
            />
          ))}
        </>
      ) : null}

      {fees.payments.length > 0 ? (
        <>
          <AppText variant="subheading" style={styles.heading}>
            Payments
          </AppText>
          {fees.payments.map((pay) => (
            <Card key={pay.id} style={styles.payment}>
              <View style={styles.flex}>
                <AppText variant="subheading">{formatRupees(pay.amount_paise)}</AppText>
                <AppText variant="caption" tone="secondary">
                  {longDateLabel(pay.date)}
                  {pay.note ? `, ${pay.note}` : ''}
                </AppText>
              </View>
              {isTrainer ? (
                <Pressable
                  onPress={() => void remove('payment', pay.id, formatRupees(pay.amount_paise))}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete payment of ${formatRupees(pay.amount_paise)}`}
                  hitSlop={10}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
                </Pressable>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.medium,
    paddingBottom: 120,
  },
  summary: {
    marginBottom: Spacing.medium,
  },
  actions: {
    gap: Spacing.small,
    marginBottom: Spacing.medium,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  linkText: {
    marginLeft: Spacing.xs,
  },
  heading: {
    marginTop: Spacing.small,
    marginBottom: Spacing.small,
  },
  empty: {
    marginVertical: Spacing.large,
  },
  payment: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
});
