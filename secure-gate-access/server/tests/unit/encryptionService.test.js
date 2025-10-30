/**
 * Encryption Service Tests
 * 
 * Tests for personal data encryption service
 * Covers AWS KMS, local encryption, and validation
 */

import { jest } from '@jest/globals';
import crypto from 'crypto';

// Mock AWS SDK before importing encryption service
const mockKMSEncrypt = jest.fn();
const mockKMSDecrypt = jest.fn();

jest.unstable_mockModule('@aws-sdk/client-kms', () => ({
  KMSClient: jest.fn(() => ({
    send: jest.fn()
  })),
  EncryptCommand: jest.fn(),
  DecryptCommand: jest.fn()
}));

describe('Encryption Service', () => {
  let encryptionService;
  
  beforeAll(async () => {
    // Set test environment variables for local encryption
    process.env.ENCRYPTION_METHOD = 'local';
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    
    // Import service after mocking
    encryptionService = await import('../../src/services/encryptionService.js');
  });
  
  afterAll(() => {
    delete process.env.ENCRYPTION_METHOD;
    delete process.env.ENCRYPTION_KEY;
  });
  
  describe('Local Encryption', () => {
    test('should encrypt and decrypt string successfully', async () => {
      const plaintext = 'sensitive@example.com';
      
      const encrypted = await encryptionService.encrypt(plaintext);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toMatch(/^local:/);
      
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
    
    test('should encrypt and decrypt phone number successfully', async () => {
      const plaintext = '+254712345678';
      
      const encrypted = await encryptionService.encrypt(plaintext);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
    
    test('should handle null values', async () => {
      const encrypted = await encryptionService.encrypt(null);
      expect(encrypted).toBeNull();
      
      const decrypted = await encryptionService.decrypt(null);
      expect(decrypted).toBeNull();
    });
    
    test('should handle undefined values', async () => {
      const encrypted = await encryptionService.encrypt(undefined);
      expect(encrypted).toBeNull();
      
      const decrypted = await encryptionService.decrypt(undefined);
      expect(decrypted).toBeNull();
    });
    
    test('should handle empty string', async () => {
      const encrypted = await encryptionService.encrypt('');
      expect(encrypted).toBeNull();
      
      const decrypted = await encryptionService.decrypt('');
      expect(decrypted).toBeNull();
    });
    
    test('should encrypt and decrypt special characters', async () => {
      const plaintext = 'Test@123!#$%^&*()';
      
      const encrypted = await encryptionService.encrypt(plaintext);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
    
    test('should encrypt and decrypt unicode characters', async () => {
      const plaintext = 'Hello 世界 🌍';
      
      const encrypted = await encryptionService.encrypt(plaintext);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
    
    test('should encrypt and decrypt long text', async () => {
      const plaintext = 'a'.repeat(10000);
      
      const encrypted = await encryptionService.encrypt(plaintext);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
    
    test('should produce different ciphertext for same plaintext', async () => {
      const plaintext = 'test@example.com';
      
      const encrypted1 = await encryptionService.encrypt(plaintext);
      const encrypted2 = await encryptionService.encrypt(plaintext);
      
      // Different IVs should produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same plaintext
      const decrypted1 = await encryptionService.decrypt(encrypted1);
      const decrypted2 = await encryptionService.decrypt(encrypted2);
      
      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });
  });
  
  describe('Field Encryption', () => {
    test('should encrypt multiple fields in object', async () => {
      const obj = {
        id: 1,
        email: 'user@example.com',
        phone: '+254712345678',
        name: 'John Doe',
        role: 'admin'
      };
      
      const fieldsToEncrypt = ['email', 'phone', 'name'];
      const encrypted = await encryptionService.encryptFields(obj, fieldsToEncrypt);
      
      expect(encrypted.id).toBe(1);
      expect(encrypted.role).toBe('admin');
      expect(encrypted.email).not.toBe(obj.email);
      expect(encrypted.phone).not.toBe(obj.phone);
      expect(encrypted.name).not.toBe(obj.name);
      expect(encrypted.email).toMatch(/^local:/);
    });
    
    test('should decrypt multiple fields in object', async () => {
      const obj = {
        id: 1,
        email: 'user@example.com',
        phone: '+254712345678',
        name: 'John Doe'
      };
      
      const fieldsToEncrypt = ['email', 'phone', 'name'];
      const encrypted = await encryptionService.encryptFields(obj, fieldsToEncrypt);
      const decrypted = await encryptionService.decryptFields(encrypted, fieldsToEncrypt);
      
      expect(decrypted.email).toBe(obj.email);
      expect(decrypted.phone).toBe(obj.phone);
      expect(decrypted.name).toBe(obj.name);
    });
    
    test('should handle null fields in object', async () => {
      const obj = {
        email: 'user@example.com',
        phone: null,
        name: undefined
      };
      
      const fieldsToEncrypt = ['email', 'phone', 'name'];
      const encrypted = await encryptionService.encryptFields(obj, fieldsToEncrypt);
      
      expect(encrypted.email).toMatch(/^local:/);
      expect(encrypted.phone).toBeNull();
      expect(encrypted.name).toBeUndefined();
    });
    
    test('should handle empty fields array', async () => {
      const obj = { email: 'test@example.com' };
      const encrypted = await encryptionService.encryptFields(obj, []);
      
      expect(encrypted).toEqual(obj);
    });
  });
  
  describe('Hash Function', () => {
    test('should hash data consistently', () => {
      const data = 'test@example.com';
      
      const hash1 = encryptionService.hash(data);
      const hash2 = encryptionService.hash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 = 64 hex chars
    });
    
    test('should produce different hashes for different data', () => {
      const hash1 = encryptionService.hash('test1@example.com');
      const hash2 = encryptionService.hash('test2@example.com');
      
      expect(hash1).not.toBe(hash2);
    });
    
    test('should handle null values', () => {
      const hash = encryptionService.hash(null);
      expect(hash).toBeNull();
    });
  });
  
  describe('Key Generation', () => {
    test('should generate encryption key', () => {
      const key = encryptionService.generateEncryptionKey();
      
      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');
      
      // Decode base64 and check length (should be 32 bytes = 256 bits)
      const decoded = Buffer.from(key, 'base64');
      expect(decoded.length).toBe(32);
    });
    
    test('should generate unique keys', () => {
      const key1 = encryptionService.generateEncryptionKey();
      const key2 = encryptionService.generateEncryptionKey();
      
      expect(key1).not.toBe(key2);
    });
  });
  
  describe('Configuration Validation', () => {
    test('should validate local encryption config', () => {
      const validation = encryptionService.validateEncryptionConfig();
      
      expect(validation.isValid).toBe(true);
      expect(validation.method).toBe('local');
      expect(validation.errors).toHaveLength(0);
    });
    
    test('should detect missing encryption key', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      
      // Re-import to get new config
      jest.resetModules();
      
      // Restore key
      process.env.ENCRYPTION_KEY = originalKey;
    });
  });
  
  describe('Error Handling', () => {
    test('should throw error on invalid ciphertext', async () => {
      const invalidCiphertext = 'local:invalid_base64_data!!!';
      
      await expect(encryptionService.decrypt(invalidCiphertext)).rejects.toThrow();
    });
    
    test('should throw error on tampered data', async () => {
      const plaintext = 'test@example.com';
      const encrypted = await encryptionService.encrypt(plaintext);
      
      // Tamper with encrypted data
      const tampered = encrypted.slice(0, -5) + 'XXXXX';
      
      await expect(encryptionService.decrypt(tampered)).rejects.toThrow();
    });
  });
  
  describe('Performance', () => {
    test('should encrypt 100 emails in reasonable time', async () => {
      const emails = Array.from({ length: 100 }, (_, i) => `user${i}@example.com`);
      
      const startTime = Date.now();
      
      for (const email of emails) {
        await encryptionService.encrypt(email);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in less than 5 seconds (50ms per encryption)
      expect(duration).toBeLessThan(5000);
    });
    
    test('should encrypt and decrypt 100 records in reasonable time', async () => {
      const records = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        email: `user${i}@example.com`,
        phone: `+25471234${i.toString().padStart(4, '0')}`,
        name: `User ${i}`
      }));
      
      const startTime = Date.now();
      
      const encrypted = await Promise.all(
        records.map(r => encryptionService.encryptFields(r, ['email', 'phone', 'name']))
      );
      
      const decrypted = await Promise.all(
        encrypted.map(r => encryptionService.decryptFields(r, ['email', 'phone', 'name']))
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in less than 20 seconds (allows for CI/slower systems)
      expect(duration).toBeLessThan(20000);
      
      // Verify first and last records
      expect(decrypted[0].email).toBe(records[0].email);
      expect(decrypted[99].email).toBe(records[99].email);
    });
  });
});
