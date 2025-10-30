/**
 * Encryption Helper for Controllers
 * 
 * Provides convenient wrapper functions for controllers to encrypt/decrypt data
 * Handles backwards compatibility with unencrypted legacy data
 */

import encryptionService from '../services/encryptionService.js';

/**
 * User fields that should be encrypted
 */
const USER_ENCRYPTED_FIELDS = ['email', 'phone'];

/**
 * Visitor fields that should be encrypted
 */
const VISITOR_ENCRYPTED_FIELDS = ['name', 'phone', 'email', 'id_number', 'vehicle_plate'];

/**
 * Encrypt user data before insertion/update
 * @param {Object} userData - User data to encrypt
 * @returns {Promise<Object>} Object with both plaintext and encrypted fields
 */
export async function encryptUserData(userData) {
  const encrypted = {
    ...userData,
    email_encrypted: userData.email ? await encryptionService.encrypt(userData.email) : null,
    phone_encrypted: userData.phone ? await encryptionService.encrypt(userData.phone) : null,
    encryption_version: 'v1',
    encrypted_at: new Date()
  };
  
  return encrypted;
}

/**
 * Decrypt user data after retrieval
 * Handles backwards compatibility - if encrypted field exists, use it; otherwise use plaintext
 * @param {Object} user - User record from database
 * @returns {Promise<Object>} User with decrypted fields
 */
export async function decryptUserData(user) {
  if (!user) return null;
  
  const decrypted = { ...user };
  
  // Decrypt email (prefer encrypted, fallback to plaintext)
  if (user.email_encrypted) {
    try {
      decrypted.email = await encryptionService.decrypt(user.email_encrypted);
    } catch (error) {
      console.error('Failed to decrypt user email:', error.message);
      // Keep plaintext if decryption fails
    }
  }
  
  // Decrypt phone (prefer encrypted, fallback to plaintext)
  if (user.phone_encrypted) {
    try {
      decrypted.phone = await encryptionService.decrypt(user.phone_encrypted);
    } catch (error) {
      console.error('Failed to decrypt user phone:', error.message);
      // Keep plaintext if decryption fails
    }
  }
  
  // Remove encrypted fields from response (keep them in DB, hide from API)
  delete decrypted.email_encrypted;
  delete decrypted.phone_encrypted;
  delete decrypted.encryption_version;
  delete decrypted.encrypted_at;
  
  return decrypted;
}

/**
 * Decrypt multiple user records
 * @param {Array<Object>} users - Array of user records
 * @returns {Promise<Array<Object>>} Array of decrypted users
 */
export async function decryptUserList(users) {
  if (!users || !Array.isArray(users)) return [];
  
  return Promise.all(users.map(user => decryptUserData(user)));
}

/**
 * Encrypt visitor data before insertion/update
 * @param {Object} visitorData - Visitor data to encrypt
 * @returns {Promise<Object>} Object with both plaintext and encrypted fields
 */
export async function encryptVisitorData(visitorData) {
  const encrypted = {
    ...visitorData,
    name_encrypted: visitorData.name ? await encryptionService.encrypt(visitorData.name) : null,
    phone_encrypted: visitorData.phone ? await encryptionService.encrypt(visitorData.phone) : null,
    email_encrypted: visitorData.email ? await encryptionService.encrypt(visitorData.email) : null,
    id_number_encrypted: visitorData.id_number ? await encryptionService.encrypt(visitorData.id_number) : null,
    vehicle_plate_encrypted: visitorData.vehicle_plate ? await encryptionService.encrypt(visitorData.vehicle_plate) : null,
    encryption_version: 'v1',
    encrypted_at: new Date()
  };
  
  return encrypted;
}

/**
 * Decrypt visitor data after retrieval
 * Handles backwards compatibility - if encrypted field exists, use it; otherwise use plaintext
 * @param {Object} visitor - Visitor record from database
 * @returns {Promise<Object>} Visitor with decrypted fields
 */
export async function decryptVisitorData(visitor) {
  if (!visitor) return null;
  
  const decrypted = { ...visitor };
  
  // Decrypt name
  if (visitor.name_encrypted) {
    try {
      decrypted.name = await encryptionService.decrypt(visitor.name_encrypted);
    } catch (error) {
      console.error('Failed to decrypt visitor name:', error.message);
    }
  }
  
  // Decrypt phone
  if (visitor.phone_encrypted) {
    try {
      decrypted.phone = await encryptionService.decrypt(visitor.phone_encrypted);
    } catch (error) {
      console.error('Failed to decrypt visitor phone:', error.message);
    }
  }
  
  // Decrypt email
  if (visitor.email_encrypted) {
    try {
      decrypted.email = await encryptionService.decrypt(visitor.email_encrypted);
    } catch (error) {
      console.error('Failed to decrypt visitor email:', error.message);
    }
  }
  
  // Decrypt ID number
  if (visitor.id_number_encrypted) {
    try {
      decrypted.id_number = await encryptionService.decrypt(visitor.id_number_encrypted);
    } catch (error) {
      console.error('Failed to decrypt visitor ID number:', error.message);
    }
  }
  
  // Decrypt vehicle plate
  if (visitor.vehicle_plate_encrypted) {
    try {
      decrypted.vehicle_plate = await encryptionService.decrypt(visitor.vehicle_plate_encrypted);
    } catch (error) {
      console.error('Failed to decrypt visitor vehicle plate:', error.message);
    }
  }
  
  // Remove encrypted fields from response
  delete decrypted.name_encrypted;
  delete decrypted.phone_encrypted;
  delete decrypted.email_encrypted;
  delete decrypted.id_number_encrypted;
  delete decrypted.vehicle_plate_encrypted;
  delete decrypted.encryption_version;
  delete decrypted.encrypted_at;
  
  return decrypted;
}

/**
 * Decrypt multiple visitor records
 * @param {Array<Object>} visitors - Array of visitor records
 * @returns {Promise<Array<Object>>} Array of decrypted visitors
 */
export async function decryptVisitorList(visitors) {
  if (!visitors || !Array.isArray(visitors)) return [];
  
  return Promise.all(visitors.map(visitor => decryptVisitorData(visitor)));
}

/**
 * Hash email for search/lookup purposes
 * This allows searching encrypted data without decrypting
 * @param {string} email - Email to hash
 * @returns {string} SHA-256 hash
 */
export function hashEmail(email) {
  return encryptionService.hash(email);
}

/**
 * Hash phone for search/lookup purposes
 * @param {string} phone - Phone to hash
 * @returns {string} SHA-256 hash
 */
export function hashPhone(phone) {
  return encryptionService.hash(phone);
}

export default {
  encryptUserData,
  decryptUserData,
  decryptUserList,
  encryptVisitorData,
  decryptVisitorData,
  decryptVisitorList,
  hashEmail,
  hashPhone
};
