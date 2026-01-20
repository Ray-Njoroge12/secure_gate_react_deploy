/**
 * Encryption Service
 * 
 * Provides field-level encryption for personal data using AWS KMS, HashiCorp Vault, or local encryption.
 * Supports multiple encryption methods for flexibility across deployment environments.
 * 
 * Compliance: Kenya DPA 2019, GDPR Article 32
 */

import * as crypto from 'crypto';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

// Encryption configuration
const ENCRYPTION_METHOD = process.env.ENCRYPTION_METHOD || 'local';
const AWS_KMS_KEY_ID = process.env.AWS_KMS_KEY_ID;
const AWS_REGION = process.env.AWS_REGION || 'af-south-1';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Algorithm for local encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

// AWS KMS Client (lazy initialized)
let kmsClient = null;
let vaultServicePromise = null;

/**
 * Initialize AWS KMS Client
 */
function initializeKMSClient() {
  if (!kmsClient && ENCRYPTION_METHOD === 'aws-kms') {
    if (!AWS_KMS_KEY_ID) {
      throw new Error('AWS_KMS_KEY_ID is required for AWS KMS encryption');
    }
    kmsClient = new KMSClient({ region: AWS_REGION });
  }
  return kmsClient;
}

/**
 * Lazily load Vault service to avoid startup failures when Vault is not configured.
 */
async function getVaultService() {
  if (!vaultServicePromise) {
    vaultServicePromise = import('./vaultService.js').then((module) => module.default || module);
  }
  return vaultServicePromise;
}

/**
 * Encrypt data using AWS KMS
 * @param {string} plaintext - Data to encrypt
 * @returns {Promise<string>} Base64 encoded encrypted data
 */
async function encryptWithKMS(plaintext) {
  try {
    const client = initializeKMSClient();
    const command = new EncryptCommand({
      KeyId: AWS_KMS_KEY_ID,
      Plaintext: Buffer.from(plaintext, 'utf-8')
    });
    
    const response = await client.send(command);
    const encrypted = Buffer.from(response.CiphertextBlob).toString('base64');
    
    return `kms:${encrypted}`;
  } catch (error) {
    console.error('KMS encryption failed:', error.message);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt data using AWS KMS
 * @param {string} ciphertext - Base64 encoded encrypted data
 * @returns {Promise<string>} Decrypted plaintext
 */
async function decryptWithKMS(ciphertext) {
  try {
    // Remove 'kms:' prefix if present
    const encodedData = ciphertext.startsWith('kms:') ? ciphertext.slice(4) : ciphertext;
    
    const client = initializeKMSClient();
    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(encodedData, 'base64')
    });
    
    const response = await client.send(command);
    const decrypted = Buffer.from(response.Plaintext).toString('utf-8');
    
    return decrypted;
  } catch (error) {
    console.error('KMS decryption failed:', error.message);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Encrypt data using HashiCorp Vault Transit
 * @param {string} plaintext - Data to encrypt
 * @returns {Promise<string>} Vault ciphertext
 */
async function encryptWithVault(plaintext) {
  try {
    const vaultService = await getVaultService();
    const keyName = process.env.VAULT_TRANSIT_KEY || 'secure-gate-key';
    const encrypted = await vaultService.encryptData(plaintext, keyName);
    return encrypted.startsWith('vault:') ? encrypted : `vault:${encrypted}`;
  } catch (error) {
    console.error('Vault encryption failed:', error.message);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt data using HashiCorp Vault Transit
 * @param {string} ciphertext - Vault ciphertext
 * @returns {Promise<string>} Decrypted plaintext
 */
async function decryptWithVault(ciphertext) {
  try {
    const vaultService = await getVaultService();
    const keyName = process.env.VAULT_TRANSIT_KEY || 'secure-gate-key';
    const decrypted = await vaultService.decryptData(ciphertext, keyName);
    return typeof decrypted === 'string' ? decrypted : JSON.stringify(decrypted);
  } catch (error) {
    console.error('Vault decryption failed:', error.message);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Encrypt data using local AES-256-GCM encryption
 * @param {string} plaintext - Data to encrypt
 * @returns {string} Encrypted data with IV and auth tag
 */
function encryptLocal(plaintext) {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is required for local encryption');
  }
  
  try {
    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from base encryption key
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine salt + IV + auth tag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]).toString('base64');
    
    return `local:${combined}`;
  } catch (error) {
    console.error('Local encryption failed:', error.message);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt data using local AES-256-GCM encryption
 * @param {string} ciphertext - Encrypted data
 * @returns {string} Decrypted plaintext
 */
function decryptLocal(ciphertext) {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is required for local encryption');
  }
  
  try {
    // Remove 'local:' prefix if present
    const encodedData = ciphertext.startsWith('local:') ? ciphertext.slice(6) : ciphertext;
    
    // Decode from base64
    const combined = Buffer.from(encodedData, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const encryptedData = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    
    // Derive key
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt data
    let decrypted = decipher.update(encryptedData.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Local decryption failed:', error.message);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Encrypt data using configured encryption method
 * @param {string|null} data - Data to encrypt
 * @returns {Promise<string|null>} Encrypted data
 */
export async function encrypt(data) {
  // Handle null/undefined/empty values
  if (data === null || data === undefined || data === '') {
    return null;
  }
  
  // Convert to string if not already
  const plaintext = String(data);
  
  try {
    switch (ENCRYPTION_METHOD) {
      case 'aws-kms':
        return await encryptWithKMS(plaintext);
      
      case 'vault':
        return await encryptWithVault(plaintext);
      
      case 'local':
        return encryptLocal(plaintext);
      
      default:
        throw new Error(`Unknown encryption method: ${ENCRYPTION_METHOD}`);
    }
  } catch (error) {
    console.error('Encryption failed:', error.message);
    throw error;
  }
}

/**
 * Decrypt data using configured encryption method
 * @param {string|null} encryptedData - Encrypted data to decrypt
 * @returns {Promise<string|null>} Decrypted data
 */
export async function decrypt(encryptedData) {
  // Handle null/undefined/empty values
  if (encryptedData === null || encryptedData === undefined || encryptedData === '') {
    return null;
  }
  
  try {
    // Detect encryption method from prefix
    if (encryptedData.startsWith('kms:')) {
      return await decryptWithKMS(encryptedData);
    } else if (encryptedData.startsWith('local:')) {
      return decryptLocal(encryptedData);
    } else if (encryptedData.startsWith('vault:')) {
      return await decryptWithVault(encryptedData);
    } else {
      // No prefix - assume current method
      switch (ENCRYPTION_METHOD) {
        case 'aws-kms':
          return await decryptWithKMS(encryptedData);
        
        case 'vault':
          return await decryptWithVault(encryptedData);

        case 'local':
          return decryptLocal(encryptedData);
        
        default:
          throw new Error(`Unknown encryption method: ${ENCRYPTION_METHOD}`);
      }
    }
  } catch (error) {
    console.error('Decryption failed:', error.message);
    throw error;
  }
}

/**
 * Encrypt multiple fields in an object
 * @param {Object} obj - Object with fields to encrypt
 * @param {Array<string>} fields - Field names to encrypt
 * @returns {Promise<Object>} Object with encrypted fields
 */
export async function encryptFields(obj, fields) {
  if (!obj || !fields || fields.length === 0) {
    return obj;
  }
  
  const encrypted = { ...obj };
  
  for (const field of fields) {
    if (obj[field] !== null && obj[field] !== undefined) {
      encrypted[field] = await encrypt(obj[field]);
    }
  }
  
  return encrypted;
}

/**
 * Decrypt multiple fields in an object
 * @param {Object} obj - Object with fields to decrypt
 * @param {Array<string>} fields - Field names to decrypt
 * @returns {Promise<Object>} Object with decrypted fields
 */
export async function decryptFields(obj, fields) {
  if (!obj || !fields || fields.length === 0) {
    return obj;
  }
  
  const decrypted = { ...obj };
  
  for (const field of fields) {
    if (obj[field] !== null && obj[field] !== undefined) {
      try {
        decrypted[field] = await decrypt(obj[field]);
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error.message);
        // Keep original value if decryption fails (might be unencrypted legacy data)
        decrypted[field] = obj[field];
      }
    }
  }
  
  return decrypted;
}

/**
 * Hash data for one-way encryption (e.g., search indexes)
 * @param {string} data - Data to hash
 * @returns {string} SHA-256 hash
 */
export function hash(data) {
  if (!data) {
    return null;
  }
  
  return crypto.createHash('sha256').update(String(data)).digest('hex');
}

/**
 * Generate a secure encryption key for local encryption
 * @returns {string} Base64 encoded 256-bit key
 */
export function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Validate encryption configuration
 * @returns {Object} Validation result
 */
export function validateEncryptionConfig() {
  const errors = [];
  const warnings = [];
  
  if (!ENCRYPTION_METHOD) {
    errors.push('ENCRYPTION_METHOD is not configured');
  }
  
  switch (ENCRYPTION_METHOD) {
    case 'aws-kms':
      if (!AWS_KMS_KEY_ID) {
        errors.push('AWS_KMS_KEY_ID is required for AWS KMS encryption');
      }
      if (!AWS_REGION) {
        warnings.push('AWS_REGION not set, using default: af-south-1');
      }
      break;
    
    case 'local':
      if (!process.env.ENCRYPTION_KEY) {
        errors.push('ENCRYPTION_KEY is required for local encryption');
      }
      if (ENCRYPTION_KEY && ENCRYPTION_KEY.length < 32) {
        errors.push('ENCRYPTION_KEY must be at least 32 characters (256 bits)');
      }
      // Only warn about local encryption if ENCRYPTION_KEY is not explicitly set
      // (i.e., user hasn't intentionally configured local encryption)
      if (process.env.NODE_ENV === 'production' && process.env.ENCRYPTION_KEY) {
        // User has explicitly configured local encryption - just note it
        warnings.push('Using local encryption (consider AWS KMS or Vault for enhanced security)');
      }
      break;
    
    case 'vault':
      if (!process.env.VAULT_ADDR) {
        errors.push('VAULT_ADDR is required for Vault encryption');
      }
      if (!process.env.VAULT_TOKEN && !process.env.VAULT_ROOT_TOKEN) {
        errors.push('VAULT_TOKEN or VAULT_ROOT_TOKEN is required for Vault encryption');
      }
      if (!process.env.VAULT_TRANSIT_KEY) {
        warnings.push('VAULT_TRANSIT_KEY not set; using default secure-gate-key');
      }
      break;
    
    default:
      errors.push(`Unknown encryption method: ${ENCRYPTION_METHOD}`);
  }
  
  return {
    isValid: errors.length === 0,
    method: ENCRYPTION_METHOD,
    errors,
    warnings
  };
}

// Log encryption configuration on startup
if (process.env.NODE_ENV !== 'test') {
  const validation = validateEncryptionConfig();
  
  if (validation.isValid) {
    console.log(`✅ Encryption configured: ${validation.method}`);
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(w => console.warn(`⚠️  ${w}`));
    }
  } else {
    console.error('❌ Encryption configuration errors:');
    validation.errors.forEach(e => console.error(`  - ${e}`));
  }
}

export default {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  hash,
  generateEncryptionKey,
  validateEncryptionConfig
};
