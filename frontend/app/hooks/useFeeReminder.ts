import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import Toast from 'react-native-toast-message';

import { useAuth } from '../contexts/AuthContext';
import { errorMessage } from '../services/http';
import { fetchTrainerProfile } from '../services/trainerService';
import { buildReminderMessage, buildWhatsAppUrl } from '../utils/reminder';

export type ReminderTarget = {
  clientName: string;
  /** The client's phone number as the trainer typed it (may be empty). */
  phone?: string;
  duePaise: number;
};

/**
 * One-tap fee reminder: builds the message on the device (with the trainer's UPI id when set) and
 * opens WhatsApp with it ready to send. Nothing is sent by the server and no money moves.
 */
export function useFeeReminder(): { remind: (target: ReminderTarget) => Promise<void>; busy: boolean } {
  const { user } = useAuth();
  const userName = user?.name;
  const [busy, setBusy] = useState(false);

  const remind = useCallback(
    async (target: ReminderTarget): Promise<void> => {
      if (busy) {
        return;
      }
      setBusy(true);
      try {
        const profile = await fetchTrainerProfile();
        const upiId = profile.upi_id?.trim() || undefined;
        if (!upiId) {
          Toast.show({
            type: 'info',
            text1: 'No UPI id set',
            text2: 'The reminder will only state the amount. Add your UPI id under Fees.',
          });
        }
        const message = buildReminderMessage({
          clientName: target.clientName,
          duePaise: target.duePaise,
          trainerName: profile.name || userName || 'your trainer',
          upiId,
        });
        await Linking.openURL(buildWhatsAppUrl(target.phone, message));
      } catch (e: unknown) {
        Toast.show({ type: 'error', text1: 'Could not open WhatsApp', text2: errorMessage(e) });
      } finally {
        setBusy(false);
      }
    },
    [busy, userName]
  );

  return { remind, busy };
}
