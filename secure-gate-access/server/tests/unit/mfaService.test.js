/**
 * Comprehensive Unit Tests - mfaService.js
 * Phase 1, Week 1, Day 4, Phase C - Priority 2
 * 
 * Test Coverage:
 * - TOTP: Secret generation, QR code generation, token verification
 * - Backup codes: Generation, verification, usage tracking
 * - OTP: SMS/Email OTP generation, sending, verification
 * - MFA management: Enable/disable, method retrieval, requirement checking
 * - Security: Lockouts, failed attempts, encryption, masking
 * - Utility functions: OTP generation, secret encryption/decryption
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockSpeakeasy = {
  generateSecret: jest.fn(),
  totp: {
    verify: jest.fn()
  }
};

const mockQRCode = {
  toDataURL: jest.fn()
};

const mockCrypto = {
  randomBytes: jest.fn(),
  createHash: jest.fn(),
  scryptSync: jest.fn(),
  createCipher: jest.fn(),
  createDecipher: jest.fn()
};

const mockLoggingService = {
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn()
};

const mockEmailService = {
  sendOTP: jest.fn()
};

const mockSmsService = {
  sendOTP: jest.fn()
};

const mockDatabaseService = {
  query: jest.fn()
};

// Setup module mocks
jest.unstable_mockModule('speakeasy', () => ({ default: mockSpeakeasy }));
jest.unstable_mockModule('qrcode', () => ({ default: mockQRCode }));
jest.unstable_mockModule('crypto', () => ({ default: mockCrypto }));
jest.unstable_mockModule('../../../src/services/loggingService.js', () => ({ default: mockLoggingService }));
jest.unstable_mockModule('../../../src/services/emailService.js', () => ({ default: mockEmailService }));
jest.unstable_mockModule('../../../src/services/smsService.js', () => ({ default: mockSmsService }));
jest.unstable_mockModule('../../../src/services/databaseService.js', () => ({ default: mockDatabaseService }));

const mfaService = await import('../../../src/services/mfaService.js').then(m => m.default);

describe('MFAService - TOTP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTOTPSecret', () => {
    test('should generate TOTP secret for user', async () => {
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Secure+Gate'
      };
      mockSpeakeasy.generateSecret.mockReturnValue(mockSecret);
      mockDatabaseService.query.mockResolvedValue({ rows: [] });

      const result = await mfaService.generateTOTPSecret(1, 'test@example.com');

      expect(result).toHaveProperty('secret', mockSecret.base32);
      expect(result).toHaveProperty('qrCodeUrl', mockSecret.otpauth_url);
      expect(result).toHaveProperty('manualEntryKey', mockSecret.base32);
      expect(mockSpeakeasy.generateSecret).toHaveBeenCalledWith({
        name: 'test@example.com',
        issuer: expect.any(String),
        length: 32
      });
    });

    test('should store encrypted secret in database', async () => {
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP'
      };
      mockSpeakeasy.generateSecret.mockReturnValue(mockSecret);
      mockDatabaseService.query.mockResolvedValue({ rows: [] });

      await mfaService.generateTOTPSecret(1, 'test@example.com');

      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_mfa_secrets'),
        expect.arrayContaining([1, expect.any(String), 'totp', expect.any(Date)])
      );
    });

    test('should log successful generation', async () => {
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP'
      };
      mockSpeakeasy.generateSecret.mockReturnValue(mockSecret);
      mockDatabaseService.query.mockResolvedValue({ rows: [] });

      await mfaService.generateTOTPSecret(1, 'test@example.com');

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'TOTP secret generated for user',
        expect.objectContaining({ userId: 1, method: 'totp' })
      );
    });

    test('should handle database error', async () => {
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP'
      };
      mockSpeakeasy.generateSecret.mockReturnValue(mockSecret);
      mockDatabaseService.query.mockRejectedValue(new Error('Database error'));

      await expect(mfaService.generateTOTPSecret(1, 'test@example.com')).rejects.toThrow();
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('generateQRCode', () => {
    test('should generate QR code from otpauth URL', async () => {
      const mockQRData = 'data:image/png;base64,iVBORw0KGgo...';
      mockQRCode.toDataURL.mockResolvedValue(mockQRData);

      const result = await mfaService.generateQRCode('otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP');

      expect(result).toBe(mockQRData);
      expect(mockQRCode.toDataURL).toHaveBeenCalledWith(
        'otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP',
        expect.objectContaining({
          width: 200,
          margin: 2
        })
      );
    });

    test('should handle QR generation error', async () => {
      mockQRCode.toDataURL.mockRejectedValue(new Error('QR generation failed'));

      await expect(mfaService.generateQRCode('otpauth://totp/test')).rejects.toThrow();
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('verifyTOTPToken', () => {
    test('should verify valid TOTP token', async () => {
      mockDatabaseService.query.mockResolvedValue({
        rows: [{ secret: 'encrypted-secret' }]
      });
      mockSpeakeasy.totp.verify.mockReturnValue(true);

      const result = await mfaService.verifyTOTPToken(1, '123456');

      expect(result).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'TOTP token verified successfully',
        expect.objectContaining({ userId: 1 })
      );
    });

    test('should reject invalid TOTP token', async () => {
      mockDatabaseService.query.mockResolvedValue({
        rows: [{ secret: 'encrypted-secret' }]
      });
      mockSpeakeasy.totp.verify.mockReturnValue(false);

      const result = await mfaService.verifyTOTPToken(1, '999999');

      expect(result).toBe(false);
      expect(mockLoggingService.logWarn).toHaveBeenCalled();
    });

    test('should reject if TOTP not configured', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });

      await expect(mfaService.verifyTOTPToken(1, '123456')).rejects.toThrow('TOTP not configured for user');
    });

    test('should reject if user is locked out', async () => {
      // Simulate lockout
      mfaService.lockouts.set(1, Date.now());

      await expect(mfaService.verifyTOTPToken(1, '123456')).rejects.toThrow('User is temporarily locked out');
    });

    test('should increment failed attempts on failure', async () => {
      mockDatabaseService.query.mockResolvedValue({
        rows: [{ secret: 'encrypted-secret' }]
      });
      mockSpeakeasy.totp.verify.mockReturnValue(false);

      await mfaService.verifyTOTPToken(1, '999999');

      expect(mfaService.attempts.get(1)).toBe(1);
    });

    test('should reset failed attempts on success', async () => {
      mfaService.attempts.set(1, 2);
      mockDatabaseService.query.mockResolvedValue({
        rows: [{ secret: 'encrypted-secret' }]
      });
      mockSpeakeasy.totp.verify.mockReturnValue(true);

      await mfaService.verifyTOTPToken(1, '123456');

      expect(mfaService.attempts.has(1)).toBe(false);
    });
  });
});

describe('MFAService - Backup Codes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateBackupCodes', () => {
    test('should generate 10 backup codes by default', async () => {
      mockCrypto.randomBytes.mockImplementation((length) => ({
        toString: () => 'A'.repeat(length * 2)
      }));
      mockDatabaseService.query.mockResolvedValue({ rows: [] });

      const codes = await mfaService.generateBackupCodes(1);

      expect(codes).toHaveLength(10);
      expect(codes.every(code => typeof code === 'string')).toBe(true);
    });

    test('should store hashed codes in database', async () => {
      mockCrypto.randomBytes.mockImplementation((length) => ({
        toString: () => 'A'.repeat(length * 2)
      }));
      mockDatabaseService.query.mockResolvedValue({ rows: [] });

      await mfaService.generateBackupCodes(1);

      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_backup_codes'),
        expect.arrayContaining([1, expect.any(String), expect.any(Date)])
      );
    });

    test('should log successful generation', async () => {
      mockCrypto.randomBytes.mockImplementation((length) => ({
        toString: () => 'A'.repeat(length * 2)
      }));
      mockDatabaseService.query.mockResolvedValue({ rows: [] });

      await mfaService.generateBackupCodes(1);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Backup codes generated for user',
        expect.objectContaining({ userId: 1, count: 10 })
      );
    });

    test('should handle database error', async () => {
      mockCrypto.randomBytes.mockImplementation((length) => ({
        toString: () => 'A'.repeat(length * 2)
      }));
      mockDatabaseService.query.mockRejectedValue(new Error('Database error'));

      await expect(mfaService.generateBackupCodes(1)).rejects.toThrow();
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('verifyBackupCode', () => {
    test('should verify valid backup code', async () => {
      const hashedCode = 'hashed-code-123';
      mockDatabaseService.query
        .mockResolvedValueOnce({
          rows: [{ codes: JSON.stringify([hashedCode, 'other-code']) }]
        })
        .mockResolvedValueOnce({ rows: [] }); // Update query

      const result = await mfaService.verifyBackupCode(1, 'raw-code');

      expect(result).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Backup code verified successfully',
        expect.objectContaining({ userId: 1, remainingCodes: 1 })
      );
    });

    test('should remove used backup code', async () => {
      const hashedCode = 'hashed-code-123';
      mockDatabaseService.query
        .mockResolvedValueOnce({
          rows: [{ codes: JSON.stringify([hashedCode, 'other-code']) }]
        })
        .mockResolvedValueOnce({ rows: [] });

      await mfaService.verifyBackupCode(1, 'raw-code');

      expect(mockDatabaseService.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE user_backup_codes'),
        expect.arrayContaining([expect.any(String), expect.any(Date), 1])
      );
    });

    test('should reject invalid backup code', async () => {
      mockDatabaseService.query.mockResolvedValue({
        rows: [{ codes: JSON.stringify(['different-hash']) }]
      });

      const result = await mfaService.verifyBackupCode(1, 'wrong-code');

      expect(result).toBe(false);
      expect(mockLoggingService.logWarn).toHaveBeenCalled();
    });

    test('should reject if no backup codes found', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });

      await expect(mfaService.verifyBackupCode(1, 'code')).rejects.toThrow('No backup codes found for user');
    });

    test('should reject if user is locked out', async () => {
      mfaService.lockouts.set(1, Date.now());

      await expect(mfaService.verifyBackupCode(1, 'code')).rejects.toThrow('User is temporarily locked out');
    });

    test('should increment failed attempts on invalid code', async () => {
      mockDatabaseService.query.mockResolvedValue({
        rows: [{ codes: JSON.stringify(['different-hash']) }]
      });

      await mfaService.verifyBackupCode(1, 'wrong-code');

      expect(mfaService.attempts.get(1)).toBe(1);
    });
  });
});

describe('MFAService - OTP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendSMSOTP', () => {
    test('should generate and send SMS OTP', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });
      mockSmsService.sendOTP.mockResolvedValue({ success: true });

      const result = await mfaService.sendSMSOTP(1, '+15551234567');

      expect(result).toEqual({ success: true, message: 'SMS OTP sent successfully' });
      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_otp_codes'),
        expect.arrayContaining([1, expect.any(String), 'sms', expect.any(Date), expect.any(Date)])
      );
      expect(mockSmsService.sendOTP).toHaveBeenCalledWith('+15551234567', expect.any(String));
    });

    test('should generate 6-digit OTP', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });
      mockSmsService.sendOTP.mockResolvedValue({ success: true });

      await mfaService.sendSMSOTP(1, '+15551234567');

      const otpCall = mockDatabaseService.query.mock.calls[0];
      const otp = otpCall[1][1];
      expect(otp).toMatch(/^\d{6}$/);
    });

    test('should set OTP expiration', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });
      mockSmsService.sendOTP.mockResolvedValue({ success: true });

      await mfaService.sendSMSOTP(1, '+15551234567');

      const otpCall = mockDatabaseService.query.mock.calls[0];
      const expiresAt = otpCall[1][3];
      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test('should mask phone number in logs', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });
      mockSmsService.sendOTP.mockResolvedValue({ success: true });

      await mfaService.sendSMSOTP(1, '+15551234567');

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'SMS OTP sent successfully',
        expect.objectContaining({
          phoneNumber: expect.not.stringContaining('5551234567')
        })
      );
    });

    test('should handle SMS sending error', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });
      mockSmsService.sendOTP.mockRejectedValue(new Error('SMS service down'));

      await expect(mfaService.sendSMSOTP(1, '+15551234567')).rejects.toThrow();
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('sendEmailOTP', () => {
    test('should generate and send email OTP', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });
      mockEmailService.sendOTP.mockResolvedValue({ success: true });

      const result = await mfaService.sendEmailOTP(1, 'test@example.com');

      expect(result).toEqual({ success: true, message: 'Email OTP sent successfully' });
      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_otp_codes'),
        expect.arrayContaining([1, expect.any(String), 'email', expect.any(Date), expect.any(Date)])
      );
      expect(mockEmailService.sendOTP).toHaveBeenCalledWith('test@example.com', expect.any(String));
    });

    test('should generate 6-digit OTP', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });
      mockEmailService.sendOTP.mockResolvedValue({ success: true });

      await mfaService.sendEmailOTP(1, 'test@example.com');

      const otpCall = mockDatabaseService.query.mock.calls[0];
      const otp = otpCall[1][1];
      expect(otp).toMatch(/^\d{6}$/);
    });

    test('should mask email in logs', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });
      mockEmailService.sendOTP.mockResolvedValue({ success: true });

      await mfaService.sendEmailOTP(1, 'test@example.com');

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Email OTP sent successfully',
        expect.objectContaining({
          email: expect.stringMatching(/t\*+t@example\.com/)
        })
      );
    });

    test('should handle email sending error', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });
      mockEmailService.sendOTP.mockRejectedValue(new Error('Email service down'));

      await expect(mfaService.sendEmailOTP(1, 'test@example.com')).rejects.toThrow();
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('verifyOTP', () => {
    test('should verify valid OTP', async () => {
      mockDatabaseService.query
        .mockResolvedValueOnce({ rows: [{ code: '123456' }] }) // Get OTP
        .mockResolvedValueOnce({ rows: [] }); // Delete OTP

      const result = await mfaService.verifyOTP(1, '123456', 'sms');

      expect(result).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'OTP verified successfully',
        expect.objectContaining({ userId: 1, method: 'sms' })
      );
    });

    test('should delete used OTP', async () => {
      mockDatabaseService.query
        .mockResolvedValueOnce({ rows: [{ code: '123456' }] })
        .mockResolvedValueOnce({ rows: [] });

      await mfaService.verifyOTP(1, '123456', 'sms');

      expect(mockDatabaseService.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('DELETE FROM user_otp_codes'),
        [1, 'sms', '123456']
      );
    });

    test('should reject invalid OTP', async () => {
      mockDatabaseService.query.mockResolvedValue({
        rows: [{ code: '123456' }]
      });

      const result = await mfaService.verifyOTP(1, '999999', 'sms');

      expect(result).toBe(false);
      expect(mockLoggingService.logWarn).toHaveBeenCalled();
    });

    test('should reject if no valid OTP found', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });

      await expect(mfaService.verifyOTP(1, '123456', 'sms')).rejects.toThrow('No valid OTP found for user');
    });

    test('should reject if user is locked out', async () => {
      mfaService.lockouts.set(1, Date.now());

      await expect(mfaService.verifyOTP(1, '123456', 'sms')).rejects.toThrow('User is temporarily locked out');
    });

    test('should reset failed attempts on success', async () => {
      mfaService.attempts.set(1, 2);
      mockDatabaseService.query
        .mockResolvedValueOnce({ rows: [{ code: '123456' }] })
        .mockResolvedValueOnce({ rows: [] });

      await mfaService.verifyOTP(1, '123456', 'sms');

      expect(mfaService.attempts.has(1)).toBe(false);
    });

    test('should increment failed attempts on failure', async () => {
      mockDatabaseService.query.mockResolvedValue({
        rows: [{ code: '123456' }]
      });

      await mfaService.verifyOTP(1, '999999', 'sms');

      expect(mfaService.attempts.get(1)).toBe(1);
    });
  });
});

describe('MFAService - Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isMFARequired', () => {
    test('should return true if MFA is enabled', async () => {
      mockDatabaseService.query.mockResolvedValue({
        rows: [{ mfa_enabled: true, mfa_methods: ['totp'] }]
      });

      const result = await mfaService.isMFARequired(1);

      expect(result).toBe(true);
    });

    test('should return false if MFA is disabled', async () => {
      mockDatabaseService.query.mockResolvedValue({
        rows: [{ mfa_enabled: false, mfa_methods: null }]
      });

      const result = await mfaService.isMFARequired(1);

      expect(result).toBe(false);
    });

    test('should return false if user not found', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });

      const result = await mfaService.isMFARequired(1);

      expect(result).toBe(false);
    });

    test('should return false on database error', async () => {
      mockDatabaseService.query.mockRejectedValue(new Error('Database error'));

      const result = await mfaService.isMFARequired(1);

      expect(result).toBe(false);
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('getUserMFAMethods', () => {
    test('should return user MFA methods', async () => {
      const methods = [
        { method: 'totp', created_at: new Date('2024-01-01') },
        { method: 'sms', created_at: new Date('2024-01-02') }
      ];
      mockDatabaseService.query.mockResolvedValue({ rows: methods });

      const result = await mfaService.getUserMFAMethods(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ method: 'totp', createdAt: methods[0].created_at });
      expect(result[1]).toEqual({ method: 'sms', createdAt: methods[1].created_at });
    });

    test('should return empty array if no methods', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });

      const result = await mfaService.getUserMFAMethods(1);

      expect(result).toEqual([]);
    });

    test('should return empty array on database error', async () => {
      mockDatabaseService.query.mockRejectedValue(new Error('Database error'));

      const result = await mfaService.getUserMFAMethods(1);

      expect(result).toEqual([]);
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('enableMFA', () => {
    test('should enable MFA for user', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });

      await mfaService.enableMFA(1, ['totp', 'sms']);

      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET mfa_enabled = true'),
        expect.arrayContaining([JSON.stringify(['totp', 'sms']), expect.any(Date), 1])
      );
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'MFA enabled for user',
        expect.objectContaining({ userId: 1, methods: ['totp', 'sms'] })
      );
    });

    test('should handle database error', async () => {
      mockDatabaseService.query.mockRejectedValue(new Error('Database error'));

      await expect(mfaService.enableMFA(1, ['totp'])).rejects.toThrow();
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('disableMFA', () => {
    test('should disable MFA and remove all secrets', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });

      await mfaService.disableMFA(1);

      expect(mockDatabaseService.query).toHaveBeenCalledTimes(3);
      expect(mockDatabaseService.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('DELETE FROM user_mfa_secrets'),
        [1]
      );
      expect(mockDatabaseService.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('DELETE FROM user_backup_codes'),
        [1]
      );
      expect(mockDatabaseService.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE users SET mfa_enabled = false'),
        [expect.any(Date), 1]
      );
    });

    test('should log successful disable', async () => {
      mockDatabaseService.query.mockResolvedValue({ rows: [] });

      await mfaService.disableMFA(1);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'MFA disabled for user',
        expect.objectContaining({ userId: 1 })
      );
    });

    test('should handle database error', async () => {
      mockDatabaseService.query.mockRejectedValue(new Error('Database error'));

      await expect(mfaService.disableMFA(1)).rejects.toThrow();
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });
});

describe('MFAService - Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mfaService.attempts.clear();
    mfaService.lockouts.clear();
  });

  describe('isUserLockedOut', () => {
    test('should return false for non-locked user', () => {
      const result = mfaService.isUserLockedOut(1);

      expect(result).toBe(false);
    });

    test('should return true for locked user', () => {
      mfaService.lockouts.set(1, Date.now());

      const result = mfaService.isUserLockedOut(1);

      expect(result).toBe(true);
    });

    test('should return false after lockout expires', () => {
      mfaService.lockouts.set(1, Date.now() - (20 * 60 * 1000)); // 20 minutes ago

      const result = mfaService.isUserLockedOut(1);

      expect(result).toBe(false);
      expect(mfaService.lockouts.has(1)).toBe(false);
    });
  });

  describe('incrementFailedAttempts', () => {
    test('should increment failed attempts', () => {
      mfaService.incrementFailedAttempts(1);

      expect(mfaService.attempts.get(1)).toBe(1);
    });

    test('should lock user after max attempts', () => {
      for (let i = 0; i < 3; i++) {
        mfaService.incrementFailedAttempts(1);
      }

      expect(mfaService.lockouts.has(1)).toBe(true);
      expect(mockLoggingService.logWarn).toHaveBeenCalledWith(
        'User locked out due to too many failed MFA attempts',
        expect.objectContaining({ userId: 1, attempts: 3 })
      );
    });
  });

  describe('maskPhoneNumber', () => {
    test('should mask middle digits of phone number', () => {
      const masked = mfaService.maskPhoneNumber('+15551234567');

      expect(masked).toBe('+15****4567');
      expect(masked).not.toContain('1234');
    });

    test('should handle null phone number', () => {
      const masked = mfaService.maskPhoneNumber(null);

      expect(masked).toBe('N/A');
    });
  });

  describe('maskEmail', () => {
    test('should mask local part of email', () => {
      const masked = mfaService.maskEmail('test@example.com');

      expect(masked).toMatch(/t\*+t@example\.com/);
      expect(masked).not.toContain('est');
    });

    test('should handle short local part', () => {
      const masked = mfaService.maskEmail('ab@example.com');

      expect(masked).toBe('ab@example.com');
    });

    test('should handle null email', () => {
      const masked = mfaService.maskEmail(null);

      expect(masked).toBe('N/A');
    });
  });
});

describe('MFAService - Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOTP', () => {
    test('should generate OTP of specified length', () => {
      const otp = mfaService.generateOTP(6);

      expect(otp).toHaveLength(6);
      expect(otp).toMatch(/^\d{6}$/);
    });

    test('should generate different OTPs', () => {
      const otp1 = mfaService.generateOTP(6);
      const otp2 = mfaService.generateOTP(6);

      expect(otp1).not.toBe(otp2);
    });

    test('should generate numeric only', () => {
      const otp = mfaService.generateOTP(10);

      expect(otp).toMatch(/^\d+$/);
    });
  });

  describe('getStatus', () => {
    test('should return service status', () => {
      mfaService.attempts.set(1, 2);
      mfaService.lockouts.set(2, Date.now());

      const status = mfaService.getStatus();

      expect(status).toEqual({
        initialized: true,
        config: expect.objectContaining({
          issuer: expect.any(String),
          algorithm: expect.any(String),
          digits: expect.any(Number),
          period: expect.any(Number)
        }),
        activeAttempts: 1,
        activeLockouts: 1
      });
    });
  });
});
