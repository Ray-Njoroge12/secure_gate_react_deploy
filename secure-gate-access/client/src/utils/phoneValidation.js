import { isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Validate phone number using libphonenumber-js
 * @param {string} phone - Phone number to validate
 * @param {string} country - ISO country code (default: 'KE' for Kenya)
 * @returns {boolean}
 */
export function isValidPhone(phone, country = 'KE') {
  if (!phone || typeof phone !== 'string') return false;
  try {
    return isValidPhoneNumber(phone, country);
  } catch {
    return false;
  }
}
