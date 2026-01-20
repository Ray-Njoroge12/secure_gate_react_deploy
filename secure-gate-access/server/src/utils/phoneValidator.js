/**
 * Phone Validation Utility
 * Provides consistent phone number validation and formatting across the application
 */

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import logger from '../config/logger.js';
import { maskPhone } from './redaction.js';

class PhoneValidator {
  constructor() {
    this.defaultCountry = 'KE'; // Kenya as default
  }

  /**
   * Validate and format a phone number
   * @param {string} phoneNumber - The phone number to validate
   * @param {string} country - Country code (default: KE)
   * @returns {Object} Validation result with formatted numbers
   */
  validateAndFormat(phoneNumber, country = this.defaultCountry) {
    try {
      if (!phoneNumber || typeof phoneNumber !== 'string') {
        return {
          isValid: false,
          error: 'Phone number is required',
          original: phoneNumber
        };
      }

      // Clean the phone number
      const cleaned = phoneNumber.trim().replace(/\s+/g, '');
      
      // Handle Kenyan local format (0xxxxxxxxx -> +254xxxxxxxxx)
      let processedNumber = cleaned;
      if (country === 'KE' && cleaned.startsWith('0') && cleaned.length === 10) {
        processedNumber = '+254' + cleaned.substring(1);
      }

      // Parse and validate
      const parsed = parsePhoneNumber(processedNumber, country);
      
      if (!parsed.isValid()) {
        return {
          isValid: false,
          error: 'Invalid phone number format',
          original: phoneNumber,
          processed: processedNumber
        };
      }

      return {
        isValid: true,
        international: parsed.formatInternational(),
        national: parsed.formatNational(),
        e164: parsed.format('E.164'),
        country: parsed.country,
        original: phoneNumber,
        processed: processedNumber
      };

    } catch (error) {
      logger.warn('Phone validation error:', { phoneNumber: maskPhone(phoneNumber), error: error.message });
      
      return {
        isValid: false,
        error: 'Phone number validation failed',
        original: phoneNumber,
        details: error.message
      };
    }
  }

  /**
   * Quick validation check
   * @param {string} phoneNumber - The phone number to validate
   * @param {string} country - Country code (default: KE)
   * @returns {boolean} True if valid
   */
  isValid(phoneNumber, country = this.defaultCountry) {
    const result = this.validateAndFormat(phoneNumber, country);
    return result.isValid;
  }

  /**
   * Convert local format to international format
   * @param {string} phoneNumber - The phone number to convert
   * @param {string} country - Country code (default: KE)
   * @returns {string} International format or original if conversion fails
   */
  toInternational(phoneNumber, country = this.defaultCountry) {
    const result = this.validateAndFormat(phoneNumber, country);
    return result.isValid ? result.e164 : phoneNumber;
  }

  /**
   * Get validation rules for frontend
   * @param {string} country - Country code (default: KE)
   * @returns {Object} Validation rules
   */
  getValidationRules(country = this.defaultCountry) {
    const rules = {
      KE: {
        pattern: /^(\+254|0)[17]\d{8}$/,
        placeholder: '+254712345678 or 0712345678',
        description: 'Kenya mobile number (+254XXXXXXXXX or 0XXXXXXXXX)',
        maxLength: 13,
        minLength: 10
      }
    };

    return rules[country] || {
      pattern: /^\+?[1-9]\d{1,14}$/,
      placeholder: '+1234567890',
      description: 'International phone number',
      maxLength: 15,
      minLength: 7
    };
  }

  /**
   * Format phone number for display
   * @param {string} phoneNumber - The phone number to format
   * @param {string} format - Format type ('international', 'national', 'e164')
   * @param {string} country - Country code (default: KE)
   * @returns {string} Formatted phone number
   */
  format(phoneNumber, format = 'international', country = this.defaultCountry) {
    const result = this.validateAndFormat(phoneNumber, country);
    
    if (!result.isValid) {
      return phoneNumber; // Return original if invalid
    }

    switch (format.toLowerCase()) {
      case 'national':
        return result.national;
      case 'e164':
        return result.e164;
      case 'international':
      default:
        return result.international;
    }
  }
}

export default new PhoneValidator();
