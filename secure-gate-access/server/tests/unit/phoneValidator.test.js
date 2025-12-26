/**
 * PhoneValidator Unit Tests
 * 
 * Tests for phone number validation and formatting utility.
 * Priority: P1 (Core Utility)
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock logger
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

describe('PhoneValidator', () => {
  let phoneValidator;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../src/utils/phoneValidator.js');
    phoneValidator = module.default;
  });
  
  describe('validateAndFormat', () => {
    describe('valid Kenyan numbers', () => {
      it('should validate local format (0xxxxxxxxx)', () => {
        const result = phoneValidator.validateAndFormat('0712345678');
        
        expect(result.isValid).toBe(true);
        expect(result.e164).toBe('+254712345678');
        expect(result.country).toBe('KE');
      });
      
      it('should validate international format (+254xxxxxxxxx)', () => {
        const result = phoneValidator.validateAndFormat('+254712345678');
        
        expect(result.isValid).toBe(true);
        expect(result.e164).toBe('+254712345678');
      });
      
      it('should handle numbers with spaces', () => {
        const result = phoneValidator.validateAndFormat('0712 345 678');
        
        expect(result.isValid).toBe(true);
        expect(result.e164).toBe('+254712345678');
      });
      
      it('should return original and processed number', () => {
        const result = phoneValidator.validateAndFormat('0712345678');
        
        expect(result.original).toBe('0712345678');
        expect(result.processed).toBe('+254712345678');
      });
      
      it('should return international format', () => {
        const result = phoneValidator.validateAndFormat('0712345678');
        
        expect(result.international).toBeDefined();
        expect(result.international).toContain('254');
      });
      
      it('should return national format', () => {
        const result = phoneValidator.validateAndFormat('+254712345678');
        
        expect(result.national).toBeDefined();
      });
    });
    
    describe('invalid numbers', () => {
      it('should reject empty string', () => {
        const result = phoneValidator.validateAndFormat('');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Phone number is required');
      });
      
      it('should reject null', () => {
        const result = phoneValidator.validateAndFormat(null);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Phone number is required');
      });
      
      it('should reject undefined', () => {
        const result = phoneValidator.validateAndFormat(undefined);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Phone number is required');
      });
      
      it('should reject non-string input', () => {
        const result = phoneValidator.validateAndFormat(12345);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Phone number is required');
      });
      
      it('should reject too short numbers', () => {
        const result = phoneValidator.validateAndFormat('0712');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid');
      });
      
      it('should reject invalid format', () => {
        const result = phoneValidator.validateAndFormat('invalid-phone');
        
        expect(result.isValid).toBe(false);
      });
    });
    
    describe('different countries', () => {
      it('should validate US numbers', () => {
        const result = phoneValidator.validateAndFormat('+14155551234', 'US');
        
        expect(result.isValid).toBe(true);
        expect(result.country).toBe('US');
      });
      
      it('should validate UK numbers', () => {
        const result = phoneValidator.validateAndFormat('+447911123456', 'GB');
        
        expect(result.isValid).toBe(true);
        // libphonenumber may detect as GB or GG (Guernsey) for some numbers
        expect(['GB', 'GG']).toContain(result.country);
      });
    });
  });
  
  describe('isValid', () => {
    it('should return true for valid Kenyan number', () => {
      expect(phoneValidator.isValid('0712345678')).toBe(true);
    });
    
    it('should return true for valid international number', () => {
      expect(phoneValidator.isValid('+254712345678')).toBe(true);
    });
    
    it('should return false for invalid number', () => {
      expect(phoneValidator.isValid('123')).toBe(false);
    });
    
    it('should return false for empty string', () => {
      expect(phoneValidator.isValid('')).toBe(false);
    });
    
    it('should accept country parameter', () => {
      expect(phoneValidator.isValid('+14155551234', 'US')).toBe(true);
    });
  });
  
  describe('toInternational', () => {
    it('should convert local format to E.164', () => {
      const result = phoneValidator.toInternational('0712345678');
      
      expect(result).toBe('+254712345678');
    });
    
    it('should return original for invalid number', () => {
      const result = phoneValidator.toInternational('invalid');
      
      expect(result).toBe('invalid');
    });
    
    it('should keep valid international format', () => {
      const result = phoneValidator.toInternational('+254712345678');
      
      expect(result).toBe('+254712345678');
    });
    
    it('should accept country parameter', () => {
      const result = phoneValidator.toInternational('07911123456', 'GB');
      
      // GB local format should be converted
      expect(result).toBeDefined();
    });
  });
  
  describe('getValidationRules', () => {
    it('should return Kenya rules by default', () => {
      const rules = phoneValidator.getValidationRules();
      
      expect(rules.placeholder).toContain('254');
      expect(rules.description).toContain('Kenya');
      expect(rules.maxLength).toBe(13);
      expect(rules.minLength).toBe(10);
    });
    
    it('should return Kenya rules when KE is specified', () => {
      const rules = phoneValidator.getValidationRules('KE');
      
      expect(rules.placeholder).toContain('254');
    });
    
    it('should return default rules for unknown country', () => {
      const rules = phoneValidator.getValidationRules('XX');
      
      expect(rules.description).toContain('International');
      expect(rules.maxLength).toBe(15);
      expect(rules.minLength).toBe(7);
    });
    
    it('should include regex pattern', () => {
      const rules = phoneValidator.getValidationRules('KE');
      
      expect(rules.pattern).toBeDefined();
      expect(rules.pattern instanceof RegExp).toBe(true);
    });
  });
  
  describe('format', () => {
    it('should format to international by default', () => {
      const result = phoneValidator.format('0712345678');
      
      expect(result).toContain('254');
    });
    
    it('should format to national when specified', () => {
      const result = phoneValidator.format('+254712345678', 'national');
      
      expect(result).toBeDefined();
    });
    
    it('should format to E.164 when specified', () => {
      const result = phoneValidator.format('0712345678', 'e164');
      
      expect(result).toBe('+254712345678');
    });
    
    it('should return original for invalid number', () => {
      const result = phoneValidator.format('invalid');
      
      expect(result).toBe('invalid');
    });
    
    it('should handle case-insensitive format parameter', () => {
      const result = phoneValidator.format('0712345678', 'E164');
      
      expect(result).toBe('+254712345678');
    });
    
    it('should default to international for unknown format', () => {
      const result = phoneValidator.format('0712345678', 'unknown');
      
      expect(result).toContain('254');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle leading/trailing whitespace', () => {
      const result = phoneValidator.validateAndFormat('  0712345678  ');
      
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe('+254712345678');
    });
    
    it('should handle multiple spaces', () => {
      const result = phoneValidator.validateAndFormat('0712  345  678');
      
      expect(result.isValid).toBe(true);
    });
    
    it('should handle numbers starting with +254 (already international)', () => {
      const result = phoneValidator.validateAndFormat('+254712345678', 'KE');
      
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe('+254712345678');
    });
  });
});
