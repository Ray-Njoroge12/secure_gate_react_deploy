/**
 * Modernized QR tokenization security baseline tests.
 */

import { describe, it, expect } from '@jest/globals';
import qrTokenService from '../../src/services/qrTokenService.js';

describe('SEC-QR: QR Tokenization Security Baseline', () => {
  it('should generate opaque URL-safe tokens', () => {
    const token = qrTokenService.generateToken();

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('should generate unique tokens across invocations', () => {
    const first = qrTokenService.generateToken();
    const second = qrTokenService.generateToken();

    expect(first).not.toBe(second);
  });

  it('should require estate context before DB-backed validation', async () => {
    const result = await qrTokenService.validateToken('dummy-token');

    expect(result.success).toBe(false);
    expect(result.code).toBe('ESTATE_REQUIRED');
  });
});
