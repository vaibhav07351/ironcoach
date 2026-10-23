import { formatRupees, parseRupeesToPaise, paiseToDecimal, MAX_PAISE } from '../app/utils/money';

describe('money', () => {
  it('formats rupees with Indian digit grouping', () => {
    expect(formatRupees(0)).toBe('\u20B90');
    expect(formatRupees(99900)).toBe('\u20B9999');
    expect(formatRupees(200000)).toBe('\u20B92,000');
    expect(formatRupees(123456700)).toBe('\u20B912,34,567');
    expect(formatRupees(150050)).toBe('\u20B91,500.50');
    expect(formatRupees(5)).toBe('\u20B90.05');
  });

  it('writes the decimal amount a payment link needs', () => {
    expect(paiseToDecimal(200000)).toBe('2000.00');
    expect(paiseToDecimal(150050)).toBe('1500.50');
    expect(paiseToDecimal(5)).toBe('0.05');
  });

  it('parses typed amounts into whole paise without float errors', () => {
    expect(parseRupeesToPaise('6000')).toBe(600000);
    expect(parseRupeesToPaise(' 6,000 ')).toBe(600000);
    expect(parseRupeesToPaise('1500.5')).toBe(150050);
    expect(parseRupeesToPaise('0.29')).toBe(29);
    expect(parseRupeesToPaise('19.99')).toBe(1999);
  });

  it('rejects anything that is not a positive amount within the limit', () => {
    for (const bad of ['', '0', '0.00', '-5', 'abc', '1.234', '1e5', '12 000', '1,0,0.5x']) {
      expect(parseRupeesToPaise(bad)).toBeNull();
    }
    expect(parseRupeesToPaise(String(MAX_PAISE / 100))).toBe(MAX_PAISE);
    expect(parseRupeesToPaise(String(MAX_PAISE / 100 + 1))).toBeNull();
  });
});
