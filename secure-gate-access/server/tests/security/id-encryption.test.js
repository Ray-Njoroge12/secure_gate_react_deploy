/**
 * Modernized ID encryption security baseline tests.
 */

import { describe, it, expect } from '@jest/globals';
import {
  hash,
  generateEncryptionKey,
  encryptFields,
  decryptFields,
  validateEncryptionConfig
} from '../../src/services/encryptionService.js';

describe('SEC-ID: Identifier Encryption Baseline', () => {
  it('should hash identifiers without leaking plaintext', () => {
    const idNumber = '12345678';
    const hashed = hash(idNumber);

    expect(hashed).toMatch(/^[a-f0-9]{64}$/);
    expect(hashed).not.toContain(idNumber);
  });

  it('should generate 256-bit encryption keys', () => {
    const key = generateEncryptionKey();
    const decoded = Buffer.from(key, 'base64');

    expect(decoded.length).toBe(32);
  });

  it('should no-op field encryption/decryption for empty field lists', async () => {
    const payload = { idNumber: '12345678', phone: '+254712345678' };

    const encrypted = await encryptFields(payload, []);
    const decrypted = await decryptFields(payload, []);

    expect(encrypted).toEqual(payload);
    expect(decrypted).toEqual(payload);
  });

  it('should return structured encryption configuration diagnostics', () => {
    const validation = validateEncryptionConfig();

    expect(typeof validation.isValid).toBe('boolean');
    expect(typeof validation.method).toBe('string');
    expect(Array.isArray(validation.errors)).toBe(true);
    expect(Array.isArray(validation.warnings)).toBe(true);
  });
});
