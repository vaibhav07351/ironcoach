import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { DayNavigator } from '@/components/DayNavigator';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Spacing } from '@/constants/theme';
import { addPackage } from '../services/feesService';
import { errorMessage } from '../services/http';
import type { PackageInput, PackageKind } from '../types/fees';
import type { RootStackParamList } from '../types/navigation';
import { packageEndDate, todayLocal } from '../utils/date';
import { newClientId } from '../utils/ids';
import { parseRupeesToPaise } from '../utils/money';

type Props = NativeStackScreenProps<RootStackParamList, 'AddPackage'>;

const MONTH_CHOICES = [1, 2, 3, 6, 12];
const MAX_SESSIONS = 500;

/** Sell a package (a number of sessions, or a monthly plan) to a client. Recording only. */
export default function AddPackageScreen({ route, navigation }: Props): React.JSX.Element {
  const { traineeId, traineeName } = route.params;
  // One key per screen visit: a retry after a timeout cannot sell the package twice.
  const clientId = useRef(newClientId()).current;
  const [kind, setKind] = useState<PackageKind>('sessions');
  const [name, setName] = useState('');
  const [sessions, setSessions] = useState('12');
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(todayLocal());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ sessions?: string; amount?: string }>({});

  const onSave = async (): Promise<void> => {
    const next: typeof errors = {};
    const amountPaise = parseRupeesToPaise(amount);
    if (amountPaise === null) {
      next.amount = 'Enter the price in rupees, for example 6000';
    }
    const sessionCount = Number(sessions);
    if (kind === 'sessions' && (!/^\d+$/.test(sessions) || sessionCount < 1 || sessionCount > MAX_SESSIONS)) {
      next.sessions = `Enter a number from 1 to ${MAX_SESSIONS}`;
    }
    setErrors(next);
    if (amountPaise === null || next.sessions) {
      return;
    }

    const input: PackageInput = {
      kind,
      name: name.trim() || undefined,
      amount_paise: amountPaise,
      start_date: startDate,
      client_id: clientId,
      ...(kind === 'sessions'
        ? { sessions: sessionCount }
        : { end_date: packageEndDate(startDate, months) }),
    };
    setSaving(true);
    try {
      await addPackage(traineeId, input);
      Toast.show({ type: 'success', text1: 'Package added' });
      navigation.goBack();
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Package not saved', text2: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen footer={<Button title="Save package" loading={saving} onPress={() => void onSave()} />}>
      <AppText tone="secondary" style={styles.intro}>
        For {traineeName}. This only records the sale; payments are recorded separately.
      </AppText>

      <AppText variant="label" tone="secondary" style={styles.label}>
        Type
      </AppText>
      <View style={styles.row}>
        <Chip label="Sessions" selected={kind === 'sessions'} onPress={() => setKind('sessions')} />
        <Chip label="Monthly" selected={kind === 'monthly'} onPress={() => setKind('monthly')} />
      </View>

      {kind === 'sessions' ? (
        <TextField
          label="Number of sessions"
          value={sessions}
          onChangeText={setSessions}
          keyboardType="number-pad"
          error={errors.sessions}
        />
      ) : (
        <>
          <AppText variant="label" tone="secondary" style={styles.label}>
            Months
          </AppText>
          <View style={styles.row}>
            {MONTH_CHOICES.map((m) => (
              <Chip key={m} label={String(m)} selected={months === m} onPress={() => setMonths(m)} />
            ))}
          </View>
          <AppText variant="caption" tone="secondary" style={styles.helper}>
            Runs from {startDate} to {packageEndDate(startDate, months)}.
          </AppText>
        </>
      )}

      <TextField
        label="Price (rupees)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="6000"
        error={errors.amount}
      />
      <TextField label="Name (optional)" value={name} onChangeText={setName} placeholder="12 sessions" maxLength={80} />

      <AppText variant="label" tone="secondary" style={styles.label}>
        Starts
      </AppText>
      <DayNavigator date={startDate} onChange={setStartDate} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginBottom: Spacing.medium,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.small,
  },
  helper: {
    marginBottom: Spacing.medium,
  },
});
