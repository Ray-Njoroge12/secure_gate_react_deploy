/**
 * Phone Validator Unit Tests
 * Tests for phone number validation utility
 */

import phoneValidator from '../../utils/phoneValidator';
import { parsePhoneNumber } from 'libphonenumber-js';

jest.mock('libphonenumber-js', () => ({
  parsePhoneNumber: jest.fn(),
  isValidPhoneNumber: jest.fn()
}));

describe('PhoneValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndFormat', () => {
    test('should return invalid for empty phone number', () => {
      const result = phoneValidator.validateAndFormat('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    test('should return invalid for null input', () => {
      const result = phoneValidator.validateAndFormat(null);
      expect(result.isValid).toBe(false);
    });

    test('should return invalid for non-string input', () => {
      const result = phoneValidator.validateAndFormat(12345);
      expect(result.isValid).toBe(false);
    });

    test('should convert Kenyan local format to international', () => {
      parsePhoneNumber.mockReturnValue({
        isValid: () => true,
        formatInternational: () => '+254 712 345 678',
        formatNational: () => '0712 345 678',
        format: () => '+254712345678',
        country: 'KE'
      });
      const result = phoneValidator.validateAndFormat('0712345678', 'KE');
      expect(parsePhoneNumber).toHaveBeenCalledWith('+254712345678', 'KE');
      expect(result.processed).toBe('+254712345678');
    });

    test('should validate international format', () => {
      parsePhoneNumber.mockReturnValue({
        isValid: () => true,
        formatInternational: () => '+254 712 345 678',
        formatNational: () => '0712 345 678',
        format: () => '+254712345678',
        country: 'KE'
      });
      const result = phoneValidator.validateAndFormat('+254712345678');
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe('+254712345678');
    });

    test('should trim whitespace', () => {
      parsePhoneNumber.mockReturnValue({
        isValid: () => true,
        formatInternational: () => '+254 712 345 678',
        formatNational: () => '0712 345 678',
        format: () => '+254712345678',
        country: 'KE'
      });
      const result = phoneValidator.validateAndFormat('  +254712345678  ');
      expect(result.isValid).toBe(true);
    });

    test('should remove internal spaces', () => {
      parsePhoneNumber.mockReturnValue({
        isValid: () => true,
        formatInternational: () => '+254 712 345 678',
        formatNational: () => '0712 345 678',
        format: () => '+254712345678',
        country: 'KE'
      });
      const result = phoneValidator.validateAndFormat('+254 712 345 678');
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid format', () => {
      parsePhoneNumber.mockImplementation(() => {
        throw new Error('Parse failed');
      });
      const result = phoneValidator.validateAndFormat('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number validation failed');
    });

    test('should reject too short numbers', () => {
      parsePhoneNumber.mockReturnValue({
        isValid: () => false,
        formatInternational: () => '+254 12',
        formatNational: () => '012',
        format: () => '+25412',
        country: 'KE'
      });
      const result = phoneValidator.validateAndFormat('+25412');
      expect(result.isValid).toBe(false);
    });
  });

  describe('isValid', () => {
    test('should return true for valid number', () => {
      parsePhoneNumber.mockReturnValue({
        isValid: () => true,
        formatInternational: () => '+254 712 345 678',
        formatNational: () => '0712 345 678',
        format: () => '+254712345678',
        country: 'KE'
      });
      expect(phoneValidator.isValid('+254712345678')).toBe(true);
    });

    test('should return false for invalid number', () => {
      parsePhoneNumber.mockImplementation(() => {
        throw new Error('Parse failed');
      });
      expect(phoneValidator.isValid('invalid')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(phoneValidator.isValid('')).toBe(false);
    });

    test('should handle Kenyan local format', () => {
      parsePhoneNumber.mockReturnValue({
        isValid: () => true,
        formatInternational: () => '+254 712 345 678',
        formatNational: () => '0712 345 678',
        format: () => '+254712345678',
        country: 'KE'
      });
      expect(phoneValidator.isValid('0712345678', 'KE')).toBe(true);
    });
  });

  describe('format', () => {
    test('should return original for invalid number', () => {
      parsePhoneNumber.mockImplementation(() => {
        throw new Error('Parse failed');
      });
      const formatted = phoneValidator.format('invalid');
      expect(formatted).toBe('invalid');
    });
  });
});

describe('Phone Number Edge Cases', () => {
  let validator;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = phoneValidator;
    parsePhoneNumber.mockImplementation(() => {
      throw new Error('Parse failed');
    });
  });

  test('should handle numbers with dashes', () => {
    const result = validator.validateAndFormat('+254-712-345-678');
    // After removing dashes and spaces
    expect(result.original).toBe('+254-712-345-678');
  });

  test('should handle numbers with parentheses', () => {
    const result = validator.validateAndFormat('(0712) 345 678', 'KE');
    expect(result.original).toBe('(0712) 345 678');
  });

  test('should handle very long numbers', () => {
    const result = validator.validateAndFormat('+2547123456789012345');
    expect(result.isValid).toBe(false);
  });

  test('should handle only country code', () => {
    const result = validator.validateAndFormat('+254');
    expect(result.isValid).toBe(false);
  });
});

describe('Safaricom/Kenya Specific', () => {
  let validator;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = phoneValidator;
    parsePhoneNumber.mockReturnValue({
      isValid: () => true,
      formatInternational: () => '+254 712 345 678',
      formatNational: () => '0712 345 678',
      format: () => '+254712345678',
      country: 'KE'
    });
  });

  const validKenyanPrefixes = ['07', '01', '+2547', '+2541'];

  test.each([
    ['0712345678', true],  // Safaricom
    ['0722345678', true],  // Safaricom
    ['0733345678', true],  // Safaricom
    ['0110345678', true],  // Safaricom
    ['0700345678', true],  // Safaricom
  ])('should validate Kenyan number %s', (number, expected) => {
    const result = validator.isValid(number, 'KE');
    expect(result).toBe(expected);
  });

  test('should handle Kenyan mobile money format', () => {
    // M-Pesa sometimes shows numbers without leading zero
    const withZero = validator.validateAndFormat('0712345678', 'KE');
    expect(withZero.isValid).toBe(true);
  });
});
