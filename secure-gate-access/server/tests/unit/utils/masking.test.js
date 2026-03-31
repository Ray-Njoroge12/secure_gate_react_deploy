import { describe, it, expect } from '@jest/globals';
import { maskPhoneNumber, maskEmail, maskName } from '../../../src/utils/masking.js';


describe('maskPhoneNumber', () => {
  it('masks all but last 4 digits', () => {
    expect(maskPhoneNumber('+254712345678')).toBe('******5678');
    expect(maskPhoneNumber('0712345678')).toBe('******5678');
  });
  it('returns empty string for empty/null', () => {
    expect(maskPhoneNumber('')).toBe('');
    expect(maskPhoneNumber(null)).toBe('');
  });
});

describe('maskEmail', () => {
  it('masks local part except first and last 2 chars', () => {
    expect(maskEmail('john.doe@example.com')).toBe('j***oe@example.com');
    expect(maskEmail('ab@example.com')).toBe('a***@example.com');
  });
  it('returns empty string for empty/null', () => {
    expect(maskEmail('')).toBe('');
    expect(maskEmail(null)).toBe('');
  });
  it('returns as is for invalid format', () => {
    expect(maskEmail('notanemail')).toBe('notanemail');
  });
});

describe('maskName', () => {
  it('returns Private Visitor for any input', () => {
    expect(maskName('John Doe')).toBe('Private Visitor');
    expect(maskName('')).toBe('Private Visitor');
    expect(maskName(null)).toBe('Private Visitor');
  });
});
