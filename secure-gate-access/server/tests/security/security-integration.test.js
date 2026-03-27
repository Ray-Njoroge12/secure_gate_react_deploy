/**
 * Modernized cross-control security integration baseline tests.
 */

import { describe, it, expect } from '@jest/globals';
import { hash, validateEncryptionConfig } from '../../src/services/encryptionService.js';
import { canAccessField } from '../../src/middleware/dataMinimization.js';
import qrTokenService from '../../src/services/qrTokenService.js';

describe('SEC-INTEGRATION: Cross-Control Baseline', () => {
  it('should provide stable, deterministic hashing for identifiers', () => {
    const input = '254712345678';
    const first = hash(input);
    const second = hash(input);

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should enforce estate context at token validation boundary', async () => {
    const result = await qrTokenService.validateToken('integration-token');

    expect(result.success).toBe(false);
    expect(result.code).toBe('ESTATE_REQUIRED');
  });

  it('should expose encryption configuration validation output shape', () => {
    const validation = validateEncryptionConfig();

    expect(validation).toHaveProperty('isValid');
    expect(validation).toHaveProperty('method');
    expect(Array.isArray(validation.errors)).toBe(true);
    expect(Array.isArray(validation.warnings)).toBe(true);
  });

  it('should deny resident access to audit log internals', () => {
    expect(canAccessField('resident', 'auditLog', 'details')).toBe(false);
    expect(canAccessField('admin', 'auditLog', 'details')).toBe(true);
  });
});
