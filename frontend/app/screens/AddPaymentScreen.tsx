import React, { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DayNavigator } from '@/components/DayNavigator';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Spacing } from '@/constants/theme';
import { addPayment } from '../services/feesService';
import { errorMessage } from '../services/http';
import type { RootStackParamList } from '../types/navigation';
import { todayLocal } from '../utils/date';
import { newClientId } from '../utils/ids';
import { formatRupees, parseRupeesToPaise } from '../utils/money';

type Props = NativeStackScreenProps<RootStackParamList, 'AddPayment'>;

/** Record money a client has paid. The amount starts at what is currently due. */
export default function AddPaymentScreen({ route, navigation }: Props): React.JSX.Element {
  const { traineeId, traineeName, duePaise } = route.params;
  // One key per screen visit: a retry after a timeout cannot record the payment twice.
  const clientId = useRef(newClientId()).current;
  const [amount, setAmount] = useState(duePaise && duePaise > 0 ? String(duePaise / 100) : '');
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const onSave = async (): Promise<void> => {
    const amountPaise = parseRupeesToPaise(amount);
    if (amountPaise === null) {
      setError('Enter the amount in rupees, for example 2000');
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await addPayment(traineeId, { amount_paise: amountPaise, date, note: note.trim() || undefined, client_id: clientId });
      Toast.show({ type: 'success', text1: `${formatRupees(amountPaise)} recorded` });
      navigation.goBack();
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Payment not saved', text2: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen footer={<Button title="Save payment" loading={saving} onPress={() => void onSave()} />}>
      <AppText tone="secondary" style={styles.intro}>
        Payment received from {traineeName}.
        {duePaise && duePaise > 0 ? ` ${formatRupees(duePaise)} is due.` : ''}
      </AppText>
      <TextField
        label="Amount (rupees)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="2000"
        error={error}
      />
      <AppText variant="label" tone="secondary" style={styles.label}>
        Paid on
      </AppText>
      <DayNavigator date={date} onChange={setDate} />
      <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="UPI, cash..." maxLength={200} />
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
});
