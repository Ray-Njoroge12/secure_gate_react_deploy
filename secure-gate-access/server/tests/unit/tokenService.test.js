/**
 * Comprehensive Unit Tests - tokenService.js
 * Phase 1, Week 1, Day 4, Phase C - Priority 1
 * 
 * Test Coverage:
 * - TokenService: Token generation, verification, refresh, revocation, JTI management
 * - PasswordService: Password hashing, verification, strength checking, generation
 * - AccountSecurityService: Lockout management, failed attempts tracking
 */

import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock dependencies
const mockArgon2 = {
  argon2id: 'argon2id',
  hash: jest.fn(),
  verify: jest.fn()
};

const mockRedisService = {
  initialize: jest.fn().mockResolvedValue(true),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  blacklistToken: jest.fn().mockResolvedValue(true)
};

jest.unstable_mockModule('argon2', () => ({ default: mockArgon2 }));
jest.unstable_mockModule('../../src/services/redisService.js', () => ({ 
  default: jest.fn(() => mockRedisService) 
}));

// Set JWT secrets BEFORE importing (TokenService constructor validates these)
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-min-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-unit-tests-min-32-chars';
process.env.NODE_ENV = 'test';

// Import services after mocking and env setup
const { tokenService, passwordService, accountSecurity } = await import('../../src/services/tokenService.js');

describe('TokenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tokenService.clearRevokedTokens();
    // Ensure secrets are 32+ characters (required by TokenService constructor)
    process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-min-32-chars';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-unit-tests-min-32-chars';
    process.env.NODE_ENV = 'test';
  });

  describe('generateTokens', () => {
    test('should generate both access and refresh tokens', () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'resident',
        username: 'testuser'
      };

      const tokens = tokenService.generateTokens(payload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('jti');
      expect(tokens).toHaveProperty('refreshJti');
      expect(tokens).toHaveProperty('expiresIn', 15 * 60 * 1000);
      expect(tokens).toHaveProperty('tokenType', 'Bearer');
    });

    test('should include standard JWT claims in access token', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const tokens = tokenService.generateTokens(payload);
      const decoded = jwt.decode(tokens.accessToken);

      expect(decoded).toHaveProperty('sub');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('jti');
      expect(decoded).toHaveProperty('type', 'access');
      expect(decoded).toHaveProperty('iss', 'secure-gate-api');
      expect(decoded).toHaveProperty('aud', 'secure-gate-client');
    });

    test('should include custom claims for backward compatibility', () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'resident',
        username: 'testuser',
        verified: true
      };
      const tokens = tokenService.generateTokens(payload);
      const decoded = jwt.decode(tokens.accessToken);

      expect(decoded.id).toBe(1);
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('resident');
      expect(decoded.username).toBe('testuser');
      expect(decoded.verified).toBe(true);
    });

    test('should set default verified to false', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const tokens = tokenService.generateTokens(payload);
      const decoded = jwt.decode(tokens.accessToken);

      expect(decoded.verified).toBe(false);
    });

    test('should convert user ID to string in sub claim', () => {
      const payload = { id: 123, email: 'test@example.com', role: 'resident' };
      const tokens = tokenService.generateTokens(payload);
      const decoded = jwt.decode(tokens.accessToken);

      expect(typeof decoded.sub).toBe('string');
      expect(decoded.sub).toBe('123');
    });

    test('should link refresh token to access token', () => {
      const tokens = tokenService.generateTokens({
        id: 1,
        email: 'test@example.com',
        role: 'resident'
      });
      const accessDecoded = jwt.decode(tokens.accessToken);
      const refreshDecoded = jwt.decode(tokens.refreshToken);

      expect(refreshDecoded.accessJti).toBe(accessDecoded.jti);
    });
  });

  describe('generateAccessToken', () => {
    test('should generate access token with default expiry', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateAccessToken(payload);

      expect(token).toBeTruthy();
      const decoded = jwt.decode(token);
      expect(decoded.type).toBe('access');
    });

    test('should accept custom expiry', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateAccessToken(payload, '1h');

      expect(token).toBeTruthy();
      const decoded = jwt.decode(token);
      expect(decoded.type).toBe('access');
    });

    test('should include all required claims', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateAccessToken(payload);
      const decoded = jwt.decode(token);

      expect(decoded).toHaveProperty('sub');
      expect(decoded).toHaveProperty('jti');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('type', 'access');
    });
  });

  describe('generateRefreshToken', () => {
    test('should generate refresh token with default expiry', () => {
      const payload = { id: 1, email: 'test@example.com' };
      const token = tokenService.generateRefreshToken(payload);

      expect(token).toBeTruthy();
      const decoded = jwt.decode(token);
      expect(decoded.type).toBe('refresh');
    });

    test('should accept custom expiry', () => {
      const payload = { id: 1, email: 'test@example.com' };
      const token = tokenService.generateRefreshToken(payload, '30d');

      expect(token).toBeTruthy();
      const decoded = jwt.decode(token);
      expect(decoded.type).toBe('refresh');
    });

    test('should include required claims', () => {
      const payload = { id: 1, email: 'test@example.com' };
      const token = tokenService.generateRefreshToken(payload);
      const decoded = jwt.decode(token);

      expect(decoded).toHaveProperty('sub');
      expect(decoded).toHaveProperty('jti');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('email');
    });
  });

  describe('verifyAccessToken', () => {
    test('should verify valid access token', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateAccessToken(payload);

      const decoded = tokenService.verifyAccessToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded.id).toBe(1);
      expect(decoded.type).toBe('access');
    });

    test('should reject expired token', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateAccessToken(payload, '1ms');

      // Wait for expiration
      return new Promise(resolve => setTimeout(() => {
        expect(() => tokenService.verifyAccessToken(token)).toThrow('Token expired');
        resolve();
      }, 100));
    });

    test('should reject refresh token used as access token', () => {
      const payload = { id: 1, email: 'test@example.com' };
      const token = tokenService.generateRefreshToken(payload);

      expect(() => tokenService.verifyAccessToken(token)).toThrow('Invalid token type');
    });

    test('should reject revoked token by JTI', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateAccessToken(payload);

      tokenService.revokeToken(token);

      expect(() => tokenService.verifyAccessToken(token)).toThrow('Token has been revoked');
    });

    test('should reject token with invalid signature', () => {
      const fakeToken = jwt.sign({ id: 1, type: 'access' }, 'wrong-secret', { expiresIn: '1h' });

      expect(() => tokenService.verifyAccessToken(fakeToken)).toThrow('Invalid token signature');
    });

    test('should reject token without required claims', () => {
      const badToken = jwt.sign({ id: 1, type: 'access' }, process.env.JWT_SECRET, { expiresIn: '1h' });

      expect(() => tokenService.verifyAccessToken(badToken)).toThrow('Token missing required claims');
    });

    test('should reject malformed token', () => {
      expect(() => tokenService.verifyAccessToken('not-a-token')).toThrow('Token verification failed');
    });
  });

  describe('verifyRefreshToken', () => {
    test('should verify valid refresh token', () => {
      const payload = { id: 1, email: 'test@example.com' };
      const token = tokenService.generateRefreshToken(payload);

      const decoded = tokenService.verifyRefreshToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.type).toBe('refresh');
    });

    test('should reject expired refresh token', () => {
      const payload = { id: 1, email: 'test@example.com' };
      const token = tokenService.generateRefreshToken(payload, '1ms');

      return new Promise(resolve => setTimeout(() => {
        expect(() => tokenService.verifyRefreshToken(token)).toThrow('Refresh token expired');
        resolve();
      }, 100));
    });

    test('should reject access token used as refresh token', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateAccessToken(payload);

      expect(() => tokenService.verifyRefreshToken(token)).toThrow('Invalid token type');
    });

    test('should reject revoked refresh token', () => {
      const payload = { id: 1, email: 'test@example.com' };
      const token = tokenService.generateRefreshToken(payload);

      tokenService.revokeToken(token);

      expect(() => tokenService.verifyRefreshToken(token)).toThrow('Refresh token has been revoked');
    });

    test('should reject token without required claims', () => {
      const badToken = jwt.sign({ id: 1, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

      expect(() => tokenService.verifyRefreshToken(badToken)).toThrow('Token missing required claims');
    });
  });

  describe('refreshAccessToken', () => {
    test('should generate new token pair from valid refresh token', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const oldTokens = tokenService.generateTokens(payload);

      const newTokens = tokenService.refreshAccessToken(oldTokens.refreshToken, payload);

      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens).toHaveProperty('refreshToken');
      expect(newTokens.accessToken).not.toBe(oldTokens.accessToken);
      expect(newTokens.refreshToken).not.toBe(oldTokens.refreshToken);
    });

    test('should revoke old refresh token', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const oldTokens = tokenService.generateTokens(payload);

      tokenService.refreshAccessToken(oldTokens.refreshToken, payload);

      expect(() => tokenService.verifyRefreshToken(oldTokens.refreshToken)).toThrow('Refresh token has been revoked');
    });

    test('should reject if user ID mismatch', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const tokens = tokenService.generateTokens(payload);

      const wrongPayload = { id: 999, email: 'other@example.com', role: 'resident' };

      expect(() => tokenService.refreshAccessToken(tokens.refreshToken, wrongPayload)).toThrow('Token subject mismatch');
    });

    test('should reject expired refresh token', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateRefreshToken(payload, '1ms');

      return new Promise(resolve => setTimeout(() => {
        expect(() => tokenService.refreshAccessToken(token, payload)).toThrow('Refresh token expired');
        resolve();
      }, 100));
    });
  });

  describe('revokeToken', () => {
    test('should revoke token by JTI', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateAccessToken(payload);

      tokenService.revokeToken(token);

      expect(() => tokenService.verifyAccessToken(token)).toThrow('Token has been revoked');
    });

    test('should handle token without JTI (backward compatibility)', () => {
      const tokenWithoutJti = jwt.sign({ id: 1, type: 'access' }, process.env.JWT_SECRET, { expiresIn: '1h' });

      expect(() => tokenService.revokeToken(tokenWithoutJti)).not.toThrow();
    });

    test('should handle invalid token gracefully', () => {
      expect(() => tokenService.revokeToken('invalid-token')).not.toThrow();
    });

    test('should cleanup when revoked tokens exceed limit', () => {
      // Add many tokens
      for (let i = 0; i < 10005; i++) {
        tokenService.revokedTokens.add(`token-${i}`);
      }

      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateAccessToken(payload);
      tokenService.revokeToken(token);

      // Should have cleared
      expect(tokenService.revokedTokens.size).toBeLessThan(10000);
    });
  });

  describe('getTokenInfo', () => {
    test('should decode token without verification', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateAccessToken(payload);

      const info = tokenService.getTokenInfo(token);

      expect(info).toBeTruthy();
      expect(info.id).toBe(1);
      expect(info.email).toBe('test@example.com');
    });

    test('should return null for invalid token', () => {
      const info = tokenService.getTokenInfo('not-a-token');
      expect(info).toBeNull();
    });

    test('should decode expired token', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateAccessToken(payload, '1ms');

      return new Promise(resolve => setTimeout(() => {
        const info = tokenService.getTokenInfo(token);
        expect(info).toBeTruthy();
        expect(info.id).toBe(1);
        resolve();
      }, 100));
    });
  });

  describe('createTestToken', () => {
    test('should create test token in test environment', () => {
      process.env.NODE_ENV = 'test';
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };

      const token = tokenService.createTestToken(payload);

      expect(token).toBeTruthy();
      const decoded = jwt.decode(token);
      expect(decoded.id).toBe(1);
      expect(decoded.type).toBe('access');
    });

    test('should accept custom expiry and type', () => {
      process.env.NODE_ENV = 'test';
      const payload = { id: 1, email: 'test@example.com' };

      const token = tokenService.createTestToken(payload, '2h', 'refresh');

      const decoded = jwt.decode(token);
      expect(decoded.type).toBe('refresh');
    });

    test('should reject in non-test environment', () => {
      process.env.NODE_ENV = 'production';
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };

      expect(() => tokenService.createTestToken(payload)).toThrow('can only be used in test environment');
      
      process.env.NODE_ENV = 'test';
    });
  });

  describe('clearRevokedTokens', () => {
    test('should clear revoked tokens in test environment', () => {
      process.env.NODE_ENV = 'test';
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateAccessToken(payload);
      
      tokenService.revokeToken(token);
      expect(tokenService.revokedTokens.size).toBeGreaterThan(0);

      tokenService.clearRevokedTokens();
      expect(tokenService.revokedTokens.size).toBe(0);
    });
  });
});

describe('PasswordService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    test('should hash password successfully', async () => {
      mockArgon2.hash.mockResolvedValue('$argon2id$hashed$password');

      const hash = await passwordService.hashPassword('ValidPass123!');

      expect(hash).toBe('$argon2id$hashed$password');
      expect(mockArgon2.hash).toHaveBeenCalledWith(
        'ValidPass123!',
        expect.objectContaining({
          type: 'argon2id',
          memoryCost: 2 ** 16,
          timeCost: 3,
          parallelism: 1
        })
      );
    });

    test('should reject password less than 8 characters', async () => {
      await expect(passwordService.hashPassword('Short1!')).rejects.toThrow('Password must be at least 8 characters');
    });

    test('should reject empty password', async () => {
      await expect(passwordService.hashPassword('')).rejects.toThrow('Password must be at least 8 characters');
    });

    test('should reject null password', async () => {
      await expect(passwordService.hashPassword(null)).rejects.toThrow('Password must be at least 8 characters');
    });

    test('should handle hashing error', async () => {
      mockArgon2.hash.mockRejectedValue(new Error('Hashing failed'));

      await expect(passwordService.hashPassword('ValidPass123!')).rejects.toThrow('Password hashing failed');
    });
  });

  describe('verifyPassword', () => {
    test('should verify correct password', async () => {
      mockArgon2.verify.mockResolvedValue(true);

      const result = await passwordService.verifyPassword('Password123!', '$argon2id$hash');

      expect(result).toBe(true);
      expect(mockArgon2.verify).toHaveBeenCalledWith('$argon2id$hash', 'Password123!');
    });

    test('should reject incorrect password', async () => {
      mockArgon2.verify.mockResolvedValue(false);

      const result = await passwordService.verifyPassword('WrongPassword', '$argon2id$hash');

      expect(result).toBe(false);
    });

    test('should handle verification error', async () => {
      mockArgon2.verify.mockRejectedValue(new Error('Verification failed'));

      await expect(passwordService.verifyPassword('Password123!', '$argon2id$hash')).rejects.toThrow('Password verification failed');
    });
  });

  describe('generateSecurePassword', () => {
    test('should generate password with default length', () => {
      const password = passwordService.generateSecurePassword();

      expect(password).toHaveLength(16);
      expect(typeof password).toBe('string');
    });

    test('should generate password with custom length', () => {
      const password = passwordService.generateSecurePassword(24);

      expect(password).toHaveLength(24);
    });

    test('should generate different passwords', () => {
      const password1 = passwordService.generateSecurePassword();
      const password2 = passwordService.generateSecurePassword();

      expect(password1).not.toBe(password2);
    });

    test('should include valid characters only', () => {
      const password = passwordService.generateSecurePassword(100);
      const validChars = /^[A-Za-z0-9!@#$%^&*]+$/;

      expect(password).toMatch(validChars);
    });
  });

  describe('checkPasswordStrength', () => {
    test('should rate strong password', () => {
      const result = passwordService.checkPasswordStrength('StrongPass123!@#');

      expect(result.strength).toBe('strong');
      expect(result.score).toBeGreaterThanOrEqual(4);
      expect(result.checks.length).toBe(true);
      expect(result.checks.uppercase).toBe(true);
      expect(result.checks.lowercase).toBe(true);
      expect(result.checks.numbers).toBe(true);
      expect(result.checks.symbols).toBe(true);
    });

    test('should rate medium password', () => {
      const result = passwordService.checkPasswordStrength('Password123');

      expect(result.strength).toBe('medium');
      expect(result.score).toBe(3);
    });

    test('should rate weak password', () => {
      const result = passwordService.checkPasswordStrength('password');

      expect(result.strength).toBe('weak');
      expect(result.score).toBeLessThan(3);
    });

    test('should identify missing requirements', () => {
      const result = passwordService.checkPasswordStrength('password');

      expect(result.checks.uppercase).toBe(false);
      expect(result.checks.numbers).toBe(false);
      expect(result.checks.symbols).toBe(false);
      expect(result.message).toContain('uppercase letter');
      expect(result.message).toContain('number');
      expect(result.message).toContain('special character');
    });

    test('should reject short password', () => {
      const result = passwordService.checkPasswordStrength('Pass1!');

      expect(result.checks.length).toBe(false);
      expect(result.message).toContain('at least 8 characters');
    });
  });
});

describe('AccountSecurityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    accountSecurity.failedAttempts.clear();
    accountSecurity.lockouts.clear();
  });

  describe('recordFailedAttempt', () => {
    test('should record first failed attempt', () => {
      const result = accountSecurity.recordFailedAttempt(1, '192.168.1.1');

      expect(result.isLocked).toBe(false);
      expect(result.remainingAttempts).toBe(4);
      expect(result.lockedUntil).toBeNull();
    });

    test('should increment failed attempts', () => {
      accountSecurity.recordFailedAttempt(1, '192.168.1.1');
      accountSecurity.recordFailedAttempt(1, '192.168.1.1');
      const result = accountSecurity.recordFailedAttempt(1, '192.168.1.1');

      expect(result.remainingAttempts).toBe(2);
    });

    test('should lock account after max attempts', () => {
      for (let i = 0; i < 5; i++) {
        accountSecurity.recordFailedAttempt(1, '192.168.1.1');
      }

      const result = accountSecurity.recordFailedAttempt(1, '192.168.1.1');

      expect(result.isLocked).toBe(true);
      expect(result.remainingAttempts).toBe(0);
      expect(result.lockedUntil).toBeInstanceOf(Date);
    });

    test('should reset attempts after 1 hour', () => {
      const userId = 1;
      accountSecurity.recordFailedAttempt(userId, '192.168.1.1');
      
      // Simulate 1 hour passing
      const current = accountSecurity.failedAttempts.get(userId);
      current.lastAttempt = Date.now() - (61 * 60 * 1000);
      accountSecurity.failedAttempts.set(userId, current);

      const result = accountSecurity.recordFailedAttempt(userId, '192.168.1.1');

      expect(result.remainingAttempts).toBe(4); // Reset to 1 attempt
    });
  });

  describe('clearFailedAttempts', () => {
    test('should clear attempts on successful login', () => {
      accountSecurity.recordFailedAttempt(1, '192.168.1.1');
      accountSecurity.recordFailedAttempt(1, '192.168.1.1');

      accountSecurity.clearFailedAttempts(1);

      expect(accountSecurity.failedAttempts.has(1)).toBe(false);
    });
  });

  describe('isAccountLocked', () => {
    test('should return false for unlocked account', () => {
      const isLocked = accountSecurity.isAccountLocked(1);

      expect(isLocked).toBe(false);
    });

    test('should return true for locked account', () => {
      for (let i = 0; i < 5; i++) {
        accountSecurity.recordFailedAttempt(1, '192.168.1.1');
      }

      const isLocked = accountSecurity.isAccountLocked(1);

      expect(isLocked).toBe(true);
    });

    test('should return false after lockout expires', () => {
      for (let i = 0; i < 5; i++) {
        accountSecurity.recordFailedAttempt(1, '192.168.1.1');
      }

      // Simulate lockout expiration
      const current = accountSecurity.failedAttempts.get(1);
      current.lockedUntil = Date.now() - 1000;
      accountSecurity.failedAttempts.set(1, current);

      const isLocked = accountSecurity.isAccountLocked(1);

      expect(isLocked).toBe(false);
    });
  });

  describe('getLockoutInfo', () => {
    test('should return null for non-existent user', () => {
      const info = accountSecurity.getLockoutInfo(999);

      expect(info).toBeNull();
    });

    test('should return lockout info for locked account', () => {
      for (let i = 0; i < 5; i++) {
        accountSecurity.recordFailedAttempt(1, '192.168.1.1');
      }

      const info = accountSecurity.getLockoutInfo(1);

      expect(info).toBeTruthy();
      expect(info.isLocked).toBe(true);
      expect(info.attemptsCount).toBeGreaterThanOrEqual(5);
      expect(info.lockedUntil).toBeInstanceOf(Date);
      expect(info.remainingTime).toBeGreaterThan(0);
    });

    test('should show unlocked status after expiration', () => {
      for (let i = 0; i < 5; i++) {
        accountSecurity.recordFailedAttempt(1, '192.168.1.1');
      }

      // Simulate lockout expiration
      const current = accountSecurity.failedAttempts.get(1);
      current.lockedUntil = Date.now() - 1000;
      accountSecurity.failedAttempts.set(1, current);

      const info = accountSecurity.getLockoutInfo(1);

      expect(info.isLocked).toBe(false);
      expect(info.lockedUntil).toBeNull();
      expect(info.remainingTime).toBe(0);
    });
  });
});
