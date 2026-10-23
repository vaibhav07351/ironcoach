import { buildReminderMessage, buildUpiLink, buildWhatsAppUrl, toWhatsAppNumber } from '../app/utils/reminder';

describe('reminder', () => {
  it('normalises Indian phone numbers for WhatsApp', () => {
    expect(toWhatsAppNumber('98765 43210')).toBe('919876543210');
    expect(toWhatsAppNumber('+91 98765-43210')).toBe('919876543210');
    expect(toWhatsAppNumber('09876543210')).toBe('919876543210');
    expect(toWhatsAppNumber('919876543210')).toBe('919876543210');
  });

  it('rejects numbers that cannot be a mobile number', () => {
    for (const bad of [undefined, '', '12345', '5876543210', '98765432101234', 'call me']) {
      expect(toWhatsAppNumber(bad)).toBeNull();
    }
  });

  it('builds a UPI deep link with an exact amount and encoded fields', () => {
    const link = buildUpiLink({ upiId: 'ravi@okhdfc', payeeName: 'Ravi Kumar', amountPaise: 200000, note: 'Training fees' });
    expect(link).toBe('upi://pay?pa=ravi%40okhdfc&pn=Ravi%20Kumar&am=2000.00&cu=INR&tn=Training%20fees');
  });

  it('writes the amount and UPI id in plain words as well as the link', () => {
    const text = buildReminderMessage({ clientName: 'Priya Sharma', duePaise: 200000, trainerName: 'Ravi', upiId: 'ravi@okhdfc' });
    expect(text).toContain('Hi Priya');
    expect(text).toContain('\u20B92,000');
    expect(text).toContain('Pay by UPI to ravi@okhdfc (Ravi).');
    expect(text).toContain('upi://pay?pa=ravi%40okhdfc');
  });

  it('still works without a UPI id', () => {
    const text = buildReminderMessage({ clientName: '', duePaise: 50000, trainerName: 'Ravi' });
    expect(text).toContain('Hi there');
    expect(text).not.toContain('upi://');
  });

  it('opens a chat when the number is valid and the contact picker when it is not', () => {
    expect(buildWhatsAppUrl('9876543210', 'Hi & bye')).toBe('https://wa.me/919876543210?text=Hi%20%26%20bye');
    expect(buildWhatsAppUrl('nope', 'Hi')).toBe('https://wa.me/?text=Hi');
  });
});
