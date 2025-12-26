/**
 * Encryption Service Unit Tests
 * SEC-005: PII Encryption at Rest
 */

import { jest } from '@jest/globals';

// Set up environment before importing
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters!!';
process.env.ENCRYPTION_METHOD = 'local';
process.env.NODE_ENV = 'test';

const {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  hash,
  generateEncryptionKey,
  validateEncryptionConfig
} = await import('../../../src/services/encryptionService.js');

describe('EncryptionService', () => {
  describe('SEC-005: PII Encryption', () => {
    describe('encrypt', () => {
      it('should encrypt plaintext data', async () => {
        const plaintext = 'A123456789'; // ID number
        
        const encrypted = await encrypt(plaintext);
        
        expect(encrypted).not.toBe(plaintext);
        expect(encrypted).toContain('local:');
        expect(encrypted.length).toBeGreaterThan(plaintext.length);
      });

      it('should produce different ciphertext for same plaintext (random IV)', async () => {
        const plaintext = '+254712345678';
        
        const encrypted1 = await encrypt(plaintext);
        const encrypted2 = await encrypt(plaintext);
        
        expect(encrypted1).not.toBe(encrypted2);
      });

      it('should handle null values gracefully', async () => {
        const result = await encrypt(null);
        expect(result).toBeNull();
      });

      it('should handle undefined values gracefully', async () => {
        const result = await encrypt(undefined);
        expect(result).toBeNull();
      });

      it('should handle empty string', async () => {
        const result = await encrypt('');
        expect(result).toBeNull();
      });

      it('should convert numbers to string before encrypting', async () => {
        const result = await encrypt(12345);
        expect(result).toContain('local:');
      });
    });

    describe('decrypt', () => {
      it('should decrypt encrypted data correctly', async () => {
        const plaintext = 'Sensitive PII Data 123';
        
        const encrypted = await encrypt(plaintext);
        const decrypted = await decrypt(encrypted);
        
        expect(decrypted).toBe(plaintext);
      });

      it('should handle phone numbers with special characters', async () => {
        const phone = '+254712345678';
        
        const encrypted = await encrypt(phone);
        const decrypted = await decrypt(encrypted);
        
        expect(decrypted).toBe(phone);
      });

      it('should handle unicode characters', async () => {
        const text = 'Müller José 日本語';
        
        const encrypted = await encrypt(text);
        const decrypted = await decrypt(encrypted);
        
        expect(decrypted).toBe(text);
      });

      it('should handle null values', async () => {
        const result = await decrypt(null);
        expect(result).toBeNull();
      });

      it('should throw error for invalid ciphertext', async () => {
        await expect(decrypt('invalid-ciphertext')).rejects.toThrow();
      });

      it('should throw error for tampered ciphertext', async () => {
        const encrypted = await encrypt('test data');
        const tampered = encrypted.slice(0, -10) + 'tampered!!';
        
        await expect(decrypt(tampered)).rejects.toThrow();
      });
    });

    describe('encryptFields', () => {
      it('should encrypt specified fields in object', async () => {
        const visitor = {
          id: 1,
          name: 'John Doe',
          phone: '+254712345678',
          id_number: 'A123456789',
          purpose: 'Meeting'
        };

        const encrypted = await encryptFields(visitor, ['phone', 'id_number']);

        expect(encrypted.id).toBe(1);
        expect(encrypted.name).toBe('John Doe');
        expect(encrypted.purpose).toBe('Meeting');
        expect(encrypted.phone).toContain('local:');
        expect(encrypted.id_number).toContain('local:');
      });

      it('should skip null fields', async () => {
        const visitor = {
          name: 'Test',
          phone: null,
          id_number: undefined
        };

        const encrypted = await encryptFields(visitor, ['phone', 'id_number']);

        expect(encrypted.phone).toBeNull();
        expect(encrypted.id_number).toBeUndefined();
      });

      it('should handle empty fields array', async () => {
        const obj = { name: 'Test' };
        const result = await encryptFields(obj, []);
        
        expect(result).toEqual(obj);
      });

      it('should handle null object', async () => {
        const result = await encryptFields(null, ['field']);
        expect(result).toBeNull();
      });
    });

    describe('decryptFields', () => {
      it('should decrypt specified fields in object', async () => {
        const visitor = {
          id: 1,
          name: 'John Doe',
          phone: '+254712345678',
          id_number: 'A123456789'
        };

        const encrypted = await encryptFields(visitor, ['phone', 'id_number']);
        const decrypted = await decryptFields(encrypted, ['phone', 'id_number']);

        expect(decrypted.phone).toBe('+254712345678');
        expect(decrypted.id_number).toBe('A123456789');
      });

      it('should handle mixed encrypted and plaintext fields', async () => {
        const originalPhone = '+254712345678';
        const encryptedPhone = await encrypt(originalPhone);
        
        const mixed = {
          name: 'Test',
          phone: encryptedPhone,
          email: 'test@example.com' // Plaintext
        };

        const decrypted = await decryptFields(mixed, ['phone', 'email']);

        expect(decrypted.phone).toBe(originalPhone);
        // Email might fail decryption but should keep original
        expect(decrypted.email).toBeDefined();
      });
    });

    describe('hash', () => {
      it('should create SHA-256 hash', () => {
        const data = 'test@example.com';
        
        const hashed = hash(data);
        
        expect(hashed).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should produce consistent hashes for same input', () => {
        const data = '+254712345678';
        
        const hash1 = hash(data);
        const hash2 = hash(data);
        
        expect(hash1).toBe(hash2);
      });

      it('should produce different hashes for different input', () => {
        const hash1 = hash('input1');
        const hash2 = hash('input2');
        
        expect(hash1).not.toBe(hash2);
      });

      it('should handle null input', () => {
        const result = hash(null);
        expect(result).toBeNull();
      });
    });

    describe('generateEncryptionKey', () => {
      it('should generate 256-bit key in base64', () => {
        const key = generateEncryptionKey();
        
        // Base64 encoded 32 bytes = 44 characters
        expect(key.length).toBe(44);
      });

      it('should generate unique keys', () => {
        const key1 = generateEncryptionKey();
        const key2 = generateEncryptionKey();
        
        expect(key1).not.toBe(key2);
      });
    });

    describe('validateEncryptionConfig', () => {
      it('should validate local encryption config', () => {
        const result = validateEncryptionConfig();
        
        expect(result.isValid).toBe(true);
        expect(result.method).toBe('local');
      });
    });
  });

  describe('Data Integrity', () => {
    it('should preserve data integrity through encrypt/decrypt cycle', async () => {
      const testCases = [
        'A123456789', // ID number
        '+254712345678', // Phone
        'test@example.com', // Email
        '123 Main Street, Nairobi', // Address
        'Special chars: !@#$%^&*()', // Special characters
        '日本語テスト', // Unicode
        'Very long text '.repeat(100) // Long text
      ];

      for (const original of testCases) {
        const encrypted = await encrypt(original);
        const decrypted = await decrypt(encrypted);
        expect(decrypted).toBe(original);
      }
    });
  });
});
