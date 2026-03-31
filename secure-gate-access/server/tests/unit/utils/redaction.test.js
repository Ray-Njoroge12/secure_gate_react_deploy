import { describe, it, expect } from '@jest/globals';
import { maskEmail, maskPhone, REDACTED_VALUE } from '../../../src/utils/redaction.js';

describe('maskEmail (redaction)', () => {
  it('returns redacted for null/empty', () => {
    expect(maskEmail('')).toBe(REDACTED_VALUE);
    expect(maskEmail(null)).toBe(REDACTED_VALUE);
  });
  it('masks email to first char + *** + domain', () => {
    expect(maskEmail('john@example.com')).toBe('j***@example.com');
    expect(maskEmail('a@b.com')).toBe('a***@b.com');
  });
  it('returns redacted for missing domain', () => {
    expect(maskEmail('nodomain')).toBe(REDACTED_VALUE);
  });
});

describe('maskPhone (redaction)', () => {
  it('returns redacted for null/empty', () => {
    expect(maskPhone('')).toBe(REDACTED_VALUE);
    expect(maskPhone(null)).toBe(REDACTED_VALUE);
  });
  it('masks phone to ***last4', () => {
    expect(maskPhone('+254712345678')).toBe('***5678');
    expect(maskPhone('0712345678')).toBe('***5678');
  });
});
