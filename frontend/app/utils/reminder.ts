import { formatRupees, paiseToDecimal } from './money';

/**
 * A WhatsApp fee reminder. Everything is built on the device: the server never sends messages and
 * no money passes through the app.
 */

/**
 * Turns an Indian phone number as typed ("98765 43210", "+91 98765-43210", "09876543210") into the
 * international digits WhatsApp wants ("919876543210"). Returns null when it is not a valid
 * 10-digit mobile number.
 */
export function toWhatsAppNumber(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return /^[6-9]\d{9}$/.test(digits) ? `91${digits}` : null;
}

type UpiLinkInput = {
  upiId: string;
  payeeName: string;
  amountPaise: number;
  note: string;
};

/** A upi://pay deep link that opens the payer's UPI app with the amount filled in. */
export function buildUpiLink({ upiId, payeeName, amountPaise, note }: UpiLinkInput): string {
  const params = [
    ['pa', upiId],
    ['pn', payeeName],
    ['am', paiseToDecimal(amountPaise)],
    ['cu', 'INR'],
    ['tn', note],
  ];
  return `upi://pay?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}

type ReminderInput = {
  clientName: string;
  duePaise: number;
  trainerName: string;
  /** The trainer's UPI id; without it the message just states the amount. */
  upiId?: string;
};

/**
 * The message text. WhatsApp often does not make upi:// links tappable, so the UPI id and amount
 * are also written out in plain words for the client to copy.
 */
export function buildReminderMessage({ clientName, duePaise, trainerName, upiId }: ReminderInput): string {
  const firstName = clientName.trim().split(/\s+/)[0] || 'there';
  const amount = formatRupees(duePaise);
  const lines = [`Hi ${firstName}, a gentle reminder that ${amount} is due for your training fees.`];
  if (upiId) {
    lines.push(`Pay by UPI to ${upiId} (${trainerName}).`);
    lines.push(buildUpiLink({ upiId, payeeName: trainerName, amountPaise: duePaise, note: 'Training fees' }));
  }
  lines.push('Thank you!');
  return lines.join('\n');
}

/**
 * The wa.me link that opens WhatsApp with the message ready to send. Without a usable phone
 * number it opens WhatsApp's own contact picker instead.
 */
export function buildWhatsAppUrl(phone: string | undefined, message: string): string {
  const number = toWhatsAppNumber(phone);
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}
