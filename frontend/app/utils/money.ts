/**
 * Money is handled as whole paise (integers) everywhere, so there is no floating point rounding.
 * Rupees are only a display and input format.
 */

const RUPEE = '₹';

/** Groups digits the Indian way: 1234567 -> "12,34,567". */
function groupIndian(digits: string): string {
  if (digits.length <= 3) {
    return digits;
  }
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

/** "₹2,000" for whole rupees, "₹2,000.50" when there are paise. */
export function formatRupees(paise: number): string {
  const negative = paise < 0;
  const abs = Math.abs(Math.round(paise));
  const rupees = Math.floor(abs / 100);
  const rest = abs % 100;
  const fraction = rest === 0 ? '' : `.${String(rest).padStart(2, '0')}`;
  return `${negative ? '-' : ''}${RUPEE}${groupIndian(String(rupees))}${fraction}`;
}

/** Amount as the payment link needs it: "2000.00". */
export function paiseToDecimal(paise: number): string {
  const abs = Math.abs(Math.round(paise));
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Largest amount the server accepts (1 crore rupees). */
export const MAX_PAISE = 1_000_000_000;

/**
 * Parses what a person types ("6000", "6,000", "1500.50") into paise. Returns null for anything
 * that is not a positive amount with at most two decimals, or is above the server limit.
 */
export function parseRupeesToPaise(text: string): number | null {
  const cleaned = text.trim().replace(/,/g, '');
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) {
    return null;
  }
  const paise = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0') || '0');
  return paise > 0 && paise <= MAX_PAISE ? paise : null;
}
