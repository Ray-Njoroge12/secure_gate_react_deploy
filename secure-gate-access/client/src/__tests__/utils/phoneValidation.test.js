import { isValidPhone } from '../../utils/phoneValidation';

describe('isValidPhone', () => {
  it('validates Kenyan local number', () => {
    expect(isValidPhone('0712345678')).toBe(true);
  });

  it('validates Kenyan international number', () => {
    expect(isValidPhone('+254712345678')).toBe(true);
  });

  it('rejects alphabetic input', () => {
    expect(isValidPhone('abc')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidPhone('')).toBe(false);
  });

  it('validates US number with country code', () => {
    expect(isValidPhone('+12025551234', 'US')).toBe(true);
  });

  it('rejects null/undefined', () => {
    expect(isValidPhone(null)).toBe(false);
    expect(isValidPhone(undefined)).toBe(false);
  });
});
