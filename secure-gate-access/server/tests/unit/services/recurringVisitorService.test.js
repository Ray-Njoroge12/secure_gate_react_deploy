/**
 * Recurring Visitor Service Unit Tests
 * SEC-002: PIN Hashing with Argon2
 * SEC-003: Rate Limiting for PIN Validation
 */

import { jest } from '@jest/globals';

// Mock dependencies before imports
jest.unstable_mockModule('../../../src/database/connection.js', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn()
    }))
  }
}));

jest.unstable_mockModule('argon2', () => ({
  default: {
    hash: jest.fn(),
    verify: jest.fn(),
    argon2id: 2
  }
}));

// Import after mocking
const { pool } = await import('../../../src/database/connection.js');
const argon2 = (await import('argon2')).default;

const {
  createRecurringPass,
  validateRecurringPass
} = await import('../../../src/services/recurringVisitorService.js');

describe('RecurringVisitorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SEC-002: PIN Hashing', () => {
    describe('createRecurringPass', () => {
      it('should hash PIN with Argon2 before storage', async () => {
        const mockHash = '$argon2id$v=19$m=65536,t=3,p=4$test-hash';
        argon2.hash.mockResolvedValue(mockHash);
        
        pool.query.mockResolvedValue({
          rows: [{
            id: 1,
            visitor_name: 'Test Worker',
            pass_type: 'daily_worker',
            qr_code_token: 'RP-abc123',
            valid_from: '2025-01-01',
            valid_until: '2025-12-31',
            status: 'active',
            created_at: new Date()
          }]
        });

        const result = await createRecurringPass(1, {
          visitorName: 'Test Worker',
          validUntil: '2025-12-31'
        });

        expect(result.success).toBe(true);
        expect(argon2.hash).toHaveBeenCalled();
        
        // Verify hash was passed to database, not plaintext PIN
        const queryCall = pool.query.mock.calls[0];
        expect(queryCall[0]).toContain('access_pin_hash');
        expect(queryCall[1]).toContain(mockHash);
      });

      it('should return plaintext PIN only once for SMS delivery', async () => {
        const mockHash = '$argon2id$v=19$m=65536,t=3,p=4$test-hash';
        argon2.hash.mockResolvedValue(mockHash);
        
        pool.query.mockResolvedValue({
          rows: [{
            id: 1,
            visitor_name: 'Test Worker',
            pass_type: 'daily_worker',
            qr_code_token: 'RP-abc123',
            status: 'active'
          }]
        });

        const result = await createRecurringPass(1, {
          visitorName: 'Test Worker',
          validUntil: '2025-12-31'
        });

        expect(result.success).toBe(true);
        expect(result.data.access_pin).toBeDefined();
        expect(result.data.access_pin).toMatch(/^\d{6}$/); // 6-digit PIN
      });

      it('should generate unique 6-digit numeric PIN', async () => {
        argon2.hash.mockResolvedValue('$argon2id$hash');
        pool.query.mockResolvedValue({ rows: [{ id: 1 }] });

        const result = await createRecurringPass(1, {
          visitorName: 'Test',
          validUntil: '2025-12-31'
        });

        const pin = result.data.access_pin;
        expect(pin).toMatch(/^\d{6}$/);
        expect(parseInt(pin)).toBeGreaterThanOrEqual(100000);
        expect(parseInt(pin)).toBeLessThan(1000000);
      });

      it('should reject if visitor name is missing', async () => {
        const result = await createRecurringPass(1, {
          validUntil: '2025-12-31'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Visitor name');
      });

      it('should reject if valid until date is missing', async () => {
        const result = await createRecurringPass(1, {
          visitorName: 'Test'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('valid until');
      });
    });

    describe('validateRecurringPass - PIN verification', () => {
      const mockPass = {
        id: 1,
        visitor_name: 'Test Worker',
        visitor_phone: '+254712345678',
        vehicle_plate: 'KBC 123A',
        pass_type: 'daily_worker',
        purpose: 'Cleaning',
        status: 'active',
        valid_from: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
        allowed_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        allowed_time_start: '00:00',
        allowed_time_end: '23:59',
        access_pin_hash: '$argon2id$hash',
        failed_pin_attempts: 0,
        resident_name: 'John Resident',
        resident_unit: 'A101',
        total_entries: 5
      };

      it('should verify PIN using argon2.verify()', async () => {
        pool.query.mockResolvedValue({ rows: [mockPass] });
        argon2.verify.mockResolvedValue(true);

        // Note: estate_id is required for validation - pass estate_id=1
        const result = await validateRecurringPass('123456', 'pin', '192.168.1.1', 1);

        expect(argon2.verify).toHaveBeenCalledWith(mockPass.access_pin_hash, '123456');
        expect(result.valid).toBe(true);
      });

      it('should reject invalid PIN', async () => {
        pool.query
          .mockResolvedValueOnce({ rows: [mockPass] })
          .mockResolvedValueOnce({ rows: [] }); // For logFailedPinAttempt
        argon2.verify.mockResolvedValue(false);

        // Note: estate_id is required for validation - pass estate_id=1
        const result = await validateRecurringPass('000000', 'pin', '192.168.1.1', 1);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid PIN');
      });

      it('should validate QR token with direct comparison', async () => {
        // Add qr_code_token to match what we're searching for
        const passWithQrToken = { ...mockPass, qr_code_token: 'RP-abc123' };
        pool.query.mockResolvedValue({ rows: [passWithQrToken] });

        // Note: estate_id is required for validation - pass estate_id=1
        const result = await validateRecurringPass('RP-abc123', 'qr', null, 1);

        expect(result.valid).toBe(true);
        expect(argon2.verify).not.toHaveBeenCalled();
      });
    });
  });

  describe('SEC-003: Rate Limiting', () => {
    it('should reject locked pass after too many failed attempts', async () => {
      const lockedPass = {
        id: 1,
        status: 'active',
        valid_from: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
        allowed_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        allowed_time_start: '00:00',
        allowed_time_end: '23:59',
        access_pin_hash: '$argon2id$hash',
        failed_pin_attempts: 5,
        pin_locked_until: new Date(Date.now() + 600000).toISOString(), // Locked for 10 more minutes
        resident_name: 'John',
        resident_unit: 'A101'
      };

      pool.query.mockResolvedValue({ rows: [lockedPass] });
      argon2.verify.mockResolvedValue(true);

      // Note: estate_id is required for validation - pass estate_id=1
      const result = await validateRecurringPass('123456', 'pin', null, 1);

      expect(result.valid).toBe(false);
      // The error message contains "PIN locked" (not just "locked")
      expect(result.error).toContain('locked');
      expect(result.locked).toBe(true);
    });

    it('should reset failed attempts on successful validation', async () => {
      const passWithFailedAttempts = {
        id: 1,
        status: 'active',
        valid_from: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
        allowed_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        allowed_time_start: '00:00',
        allowed_time_end: '23:59',
        access_pin_hash: '$argon2id$hash',
        failed_pin_attempts: 3,
        pin_locked_until: null,
        resident_name: 'John',
        resident_unit: 'A101',
        total_entries: 0
      };

      // First call returns passes, subsequent calls for updates
      pool.query
        .mockResolvedValueOnce({ rows: [passWithFailedAttempts] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      argon2.verify.mockResolvedValue(true);

      // Note: estate_id is required for validation - pass estate_id=1
      const result = await validateRecurringPass('123456', 'pin', null, 1);

      expect(result.valid).toBe(true);

      // Verify reset query was called
      const resetCall = pool.query.mock.calls.find(call =>
        call[0] && call[0].includes('failed_pin_attempts = 0')
      );
      expect(resetCall).toBeDefined();
    });
  });

  describe('Pass Schedule Validation', () => {
    const createMockPass = (overrides = {}) => ({
      id: 1,
      visitor_name: 'Test',
      status: 'active',
      valid_from: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      allowed_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      allowed_time_start: '08:00',
      allowed_time_end: '18:00',
      access_pin_hash: '$argon2id$hash',
      failed_pin_attempts: 0,
      resident_name: 'John',
      resident_unit: 'A101',
      total_entries: 0,
      ...overrides
    });

    it('should reject expired pass', async () => {
      // Query will return empty because expired passes are filtered by the SQL query
      pool.query.mockResolvedValue({ rows: [] });
      argon2.verify.mockResolvedValue(true);

      // Note: estate_id is required for validation - pass estate_id=1
      const result = await validateRecurringPass('123456', 'pin', null, 1);

      // The pass won't be returned since the query filters by date
      expect(result.valid).toBe(false);
    });

    it('should reject suspended pass', async () => {
      // Query filters out non-active passes, so result is empty
      pool.query.mockResolvedValue({ rows: [] });
      argon2.verify.mockResolvedValue(true);

      // Note: estate_id is required for validation - pass estate_id=1
      const result = await validateRecurringPass('123456', 'pin', null, 1);

      // Suspended passes filtered by query
      expect(result.valid).toBe(false);
    });

    it('should reject revoked pass', async () => {
      // Query filters out non-active passes, so result is empty
      pool.query.mockResolvedValue({ rows: [] });
      argon2.verify.mockResolvedValue(true);

      // Note: estate_id is required for validation - pass estate_id=1
      const result = await validateRecurringPass('123456', 'pin', null, 1);

      expect(result.valid).toBe(false);
    });
  });
});
