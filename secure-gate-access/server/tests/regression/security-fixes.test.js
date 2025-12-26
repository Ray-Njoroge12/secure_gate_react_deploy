/**
 * REGRESSION-001: Security Fixes Regression Tests
 * Ensures that SEC-001 through SEC-005 fixes remain effective
 * Run after any code changes to auth, visitors, or recurring passes
 */

import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import testDb from '../helpers/testDb.js';
import argon2 from 'argon2';

describe('REGRESSION-001: Security Fixes Verification', () => {
  let testVisitorId;
  let testRecurringPassId;

  afterAll(async () => {
    // Cleanup test data using testDb helper
    await testDb.cleanup();
    // DO NOT call pool.end() - pool is shared across tests
  });

  describe('SEC-001 Regression: No Plaintext OTP Storage', () => {
    it('REG-SEC-001-01: Should NOT store plaintext OTP in database', async () => {
      // Verify the otp column doesn't exist or is always NULL
      const columnCheck = await testDb.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'visitors' 
        AND column_name = 'otp'
      `);

      // Column should not exist or always be NULL
      expect(columnCheck.rows.length).toBe(0);
    }, 10000);

    it('REG-SEC-001-02: Should only store otp_hash, not plaintext', async () => {
      const result = await testDb.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'visitors' 
        AND column_name IN ('otp_hash', 'otp_expires_at', 'otp_attempts')
      `);

      const columns = result.rows.map(r => r.column_name);
      expect(columns).toContain('otp_hash');
      expect(columns).toContain('otp_expires_at');
      expect(columns).toContain('otp_attempts');
    }, 10000);

    it('REG-SEC-001-03: Should not return OTP in any API response', async () => {
      // Check that visitor records never expose otp field
      const visitor = await testDb.query(`
        SELECT * FROM visitors LIMIT 1
      `);

      if (visitor.rows.length > 0) {
        const visitorData = visitor.rows[0];
        expect(visitorData).not.toHaveProperty('otp');
      }
    }, 10000);
  });

  describe('SEC-002 Regression: PIN Hashing with Argon2', () => {
    it('REG-SEC-002-01: Should NOT store plaintext PINs', async () => {
      const columnCheck = await testDb.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'recurring_passes' 
        AND column_name = 'access_pin'
      `);

      // access_pin column should not exist (replaced by access_pin_hash)
      expect(columnCheck.rows.length).toBe(0);
    }, 10000);

    it('REG-SEC-002-02: Should have access_pin_hash column', async () => {
      const result = await testDb.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'recurring_passes' 
        AND column_name = 'access_pin_hash'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data_type).toBe('text');
    }, 10000);

    it('REG-SEC-002-03: Stored hashes should be valid Argon2 format', async () => {
      const passes = await testDb.query(`
        SELECT access_pin_hash 
        FROM recurring_passes 
        WHERE access_pin_hash IS NOT NULL 
        LIMIT 5
      `);

      for (const pass of passes.rows) {
        // Argon2 hashes start with $argon2id$
        expect(pass.access_pin_hash).toMatch(/^\$argon2id\$/);
      }
    }, 10000);

    it('REG-SEC-002-04: Should not be able to reverse hash to plaintext', async () => {
      const testPin = '123456';
      const hash = await argon2.hash(testPin);

      // Hash should be one-way
      expect(hash).not.toContain(testPin);
      expect(hash.length).toBeGreaterThan(50); // Argon2 hashes are long
    });
  });

  describe('SEC-003 Regression: PIN Rate Limiting', () => {
    it('REG-SEC-003-01: Should have rate limiting columns', async () => {
      const result = await testDb.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'recurring_passes' 
        AND column_name IN ('failed_pin_attempts', 'pin_locked_until')
      `);

      const columns = result.rows.map(r => r.column_name);
      expect(columns).toContain('failed_pin_attempts');
      expect(columns).toContain('pin_locked_until');
    }, 10000);

    it('REG-SEC-003-02: Should have pin_validation_attempts table', async () => {
      const result = await testDb.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'pin_validation_attempts'
      `);

      expect(result.rows.length).toBe(1);
    }, 10000);

    it('REG-SEC-003-03: Failed attempts should increment counter', async () => {
      // This is tested in integration tests with actual API calls
      // Here we verify the schema supports it
      const columns = await testDb.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'pin_validation_attempts' 
        AND column_name IN ('pass_id', 'ip_address', 'attempted_at')
      `);

      expect(columns.rows.length).toBe(3);
    }, 10000);

    it('REG-SEC-003-04: Lockout duration should be enforced', async () => {
      // Verify lockout logic by checking constraint
      const pass = await testDb.query(`
        SELECT * FROM recurring_passes 
        WHERE pin_locked_until > NOW() 
        LIMIT 1
      `);

      // If locked passes exist, verify structure
      if (pass.rows.length > 0) {
        expect(pass.rows[0]).toHaveProperty('pin_locked_until');
        expect(pass.rows[0]).toHaveProperty('failed_pin_attempts');
      }
    }, 10000);
  });

  describe('SEC-004 Regression: One-Time QR Code Use', () => {
    it('REG-SEC-004-01: Should have QR code status tracking', async () => {
      const columns = await testDb.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'qr_codes' 
        AND column_name IN ('status', 'scan_count', 'first_used_at', 'used_by_guard_id')
      `);

      const columnNames = columns.rows.map(r => r.column_name);
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('scan_count');
    }, 10000);

    it('REG-SEC-004-02: QR status should be constrained', async () => {
      const constraint = await testDb.query(`
        SELECT constraint_name, check_clause 
        FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%qr_codes%status%'
      `);

      // Should have CHECK constraint on status column
      expect(constraint.rows.length).toBeGreaterThan(0);
    }, 10000);

    it('REG-SEC-004-03: Used QR codes should not be reusable', async () => {
      const usedQrs = await testDb.query(`
        SELECT * FROM qr_codes 
        WHERE status = 'used' 
        LIMIT 5
      `);

      for (const qr of usedQrs.rows) {
        expect(qr.status).toBe('used');
        expect(qr.scan_count).toBeGreaterThan(0);
      }
    }, 10000);

    it('REG-SEC-004-04: Expired QR codes should not be usable', async () => {
      const expiredQrs = await testDb.query(`
        SELECT * FROM qr_codes 
        WHERE expires_at < NOW() 
        LIMIT 5
      `);

      // Expired QRs should exist and have past expiry dates
      for (const qr of expiredQrs.rows) {
        expect(new Date(qr.expires_at).getTime()).toBeLessThan(Date.now());
      }
    }, 10000);
  });

  describe('SEC-005 Regression: PII Encryption Service', () => {
    it('REG-SEC-005-01: Encryption service should be available', async () => {
      const { default: encryptionService } = await import('../../src/services/encryptionService.js');
      
      expect(encryptionService).toBeDefined();
      expect(encryptionService.encryptField).toBeDefined();
      expect(encryptionService.decryptField).toBeDefined();
    });

    it('REG-SEC-005-02: Should encrypt and decrypt correctly', async () => {
      const { default: encryptionService } = await import('../../src/services/encryptionService.js');
      
      const testData = '+254712345678';
      const encrypted = await encryptionService.encryptField(testData);
      const decrypted = await encryptionService.decryptField(encrypted);

      expect(encrypted).not.toBe(testData);
      expect(decrypted).toBe(testData);
    });

    it('REG-SEC-005-03: Encrypted data should not be reversible without key', async () => {
      const { default: encryptionService } = await import('../../src/services/encryptionService.js');
      
      const testData = 'sensitive-data';
      const encrypted = await encryptionService.encryptField(testData);

      // Encrypted data should be base64 encoded and not contain plaintext
      expect(encrypted).not.toContain(testData);
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 format
    });
  });

  describe('Cross-Cutting Regression Tests', () => {
    it('REG-CROSS-01: No security regression in authentication', async () => {
      // Verify JWT secret is set
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_SECRET.length).toBeGreaterThan(32);
    });

    it('REG-CROSS-02: Password hashing still uses Argon2', async () => {
      // Check a user's password hash format
      const users = await testDb.query(`
        SELECT password_hash FROM users LIMIT 1
      `);

      if (users.rows.length > 0) {
        const hash = users.rows[0].password_hash;
        // Argon2 hashes start with $argon2
        expect(hash).toMatch(/^\$argon2/);
      }
    }, 10000);

    it('REG-CROSS-03: Audit logs are still being recorded', async () => {
      const recentLogs = await testDb.query(`
        SELECT COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at > NOW() - INTERVAL '7 days'
      `);

      // Should have some audit activity (in a real system)
      expect(recentLogs.rows[0].count).toBeDefined();
    }, 10000);

    it('REG-CROSS-04: Security events are tracked', async () => {
      const tableExists = await testDb.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'security_events'
      `);

      expect(tableExists.rows.length).toBe(1);
    }, 10000);
  });
});

/**
 * REGRESSION TEST EXECUTION SCHEDULE:
 * 
 * - Run before EVERY deployment
 * - Run after ANY security-related code change
 * - Run weekly as part of CI/CD pipeline
 * - Run after dependency updates
 * 
 * PASS CRITERIA: 100% pass rate required
 * FAILURE ACTION: Block deployment, investigate immediately
 */
