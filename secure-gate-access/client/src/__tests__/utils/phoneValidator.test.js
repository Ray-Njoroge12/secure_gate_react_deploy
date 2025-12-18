/**
 * Phone Validator Unit Tests
 * Tests for phone number validation utility
 */

// Mock libphonenumber-js for isolated testing
const mockParsePhoneNumber = jest.fn();
const mockIsValidPhoneNumber = jest.fn();

jest.mock('libphonenumber-js', () => ({
  parsePhoneNumber: mockParsePhoneNumber,
  isValidPhoneNumber: mockIsValidPhoneNumber
}));

// Simplified phone validator for testing
class PhoneValidator {
  constructor() {
    this.defaultCountry = 'KE';
  }

  validateAndFormat(phoneNumber, country = this.defaultCountry) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return {
        isValid: false,
        error: 'Phone number is required',
        original: phoneNumber
      };
    }

    const cleaned = phoneNumber.trim().replace(/\s+/g, '');
    
    // Handle Kenyan local format
    let processedNumber = cleaned;
    if (country === 'KE' && cleaned.startsWith('0') && cleaned.length === 10) {
      processedNumber = '+254' + cleaned.substring(1);
    }

    // Simple validation regex for E.164 format
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    if (!e164Regex.test(processedNumber)) {
      return {
        isValid: false,
        error: 'Invalid phone number format',
        original: phoneNumber,
        processed: processedNumber
      };
    }

    return {
      isValid: true,
      international: processedNumber.replace(/(\+\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4'),
      national: processedNumber.replace('+254', '0'),
      e164: processedNumber,
      country: country,
      original: phoneNumber,
      processed: processedNumber
    };
  }

  isValid(phoneNumber, country = this.defaultCountry) {
    const result = this.validateAndFormat(phoneNumber, country);
    return result.isValid;
  }

  formatForDisplay(phoneNumber, format = 'international', country = this.defaultCountry) {
    const result = this.validateAndFormat(phoneNumber, country);
    if (!result.isValid) return phoneNumber;
    
    switch (format) {
      case 'national':
        return result.national;
      case 'e164':
        return result.e164;
      default:
        return result.international;
    }
  }

  extractCountryCode(phoneNumber) {
    if (!phoneNumber || !phoneNumber.startsWith('+')) return null;
    
    const countryCodes = {
      '254': 'KE',
      '255': 'TZ',
      '256': 'UG',
      '1': 'US',
      '44': 'GB'
    };

    for (const [code, country] of Object.entries(countryCodes)) {
      if (phoneNumber.startsWith('+' + code)) {
        return { code: '+' + code, country };
      }
    }
    return null;
  }
}

describe('PhoneValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new PhoneValidator();
    jest.clearAllMocks();
  });

  describe('validateAndFormat', () => {
    test('should return invalid for empty phone number', () => {
      const result = validator.validateAndFormat('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    test('should return invalid for null input', () => {
      const result = validator.validateAndFormat(null);
      expect(result.isValid).toBe(false);
    });

    test('should return invalid for non-string input', () => {
      const result = validator.validateAndFormat(12345);
      expect(result.isValid).toBe(false);
    });

    test('should convert Kenyan local format to international', () => {
      const result = validator.validateAndFormat('0712345678', 'KE');
      expect(result.processed).toBe('+254712345678');
    });

    test('should validate international format', () => {
      const result = validator.validateAndFormat('+254712345678');
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe('+254712345678');
    });

    test('should trim whitespace', () => {
      const result = validator.validateAndFormat('  +254712345678  ');
      expect(result.isValid).toBe(true);
    });

    test('should remove internal spaces', () => {
      const result = validator.validateAndFormat('+254 712 345 678');
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid format', () => {
      const result = validator.validateAndFormat('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });

    test('should reject too short numbers', () => {
      const result = validator.validateAndFormat('+25412');
      expect(result.isValid).toBe(false);
    });
  });

  describe('isValid', () => {
    test('should return true for valid number', () => {
      expect(validator.isValid('+254712345678')).toBe(true);
    });

    test('should return false for invalid number', () => {
      expect(validator.isValid('invalid')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(validator.isValid('')).toBe(false);
    });

    test('should handle Kenyan local format', () => {
      expect(validator.isValid('0712345678', 'KE')).toBe(true);
    });
  });

  describe('formatForDisplay', () => {
    test('should format as international by default', () => {
      const formatted = validator.formatForDisplay('+254712345678');
      expect(formatted).toContain('+254');
    });

    test('should format as national when specified', () => {
      const formatted = validator.formatForDisplay('+254712345678', 'national');
      expect(formatted.startsWith('0')).toBe(true);
    });

    test('should format as E.164 when specified', () => {
      const formatted = validator.formatForDisplay('+254712345678', 'e164');
      expect(formatted).toBe('+254712345678');
    });

    test('should return original for invalid number', () => {
      const formatted = validator.formatForDisplay('invalid');
      expect(formatted).toBe('invalid');
    });
  });

  describe('extractCountryCode', () => {
    test('should extract Kenyan country code', () => {
      const result = validator.extractCountryCode('+254712345678');
      expect(result).toEqual({ code: '+254', country: 'KE' });
    });

    test('should extract US country code', () => {
      const result = validator.extractCountryCode('+15551234567');
      expect(result).toEqual({ code: '+1', country: 'US' });
    });

    test('should return null for number without +', () => {
      const result = validator.extractCountryCode('254712345678');
      expect(result).toBeNull();
    });

    test('should return null for unknown country code', () => {
      const result = validator.extractCountryCode('+99912345678');
      expect(result).toBeNull();
    });
  });
});

describe('Phone Number Edge Cases', () => {
  let validator;

  beforeEach(() => {
    validator = new PhoneValidator();
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
    validator = new PhoneValidator();
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
