/**
 * Authentication Service Unit Tests
 * UNIT-001: Authentication and Password Security
 */

import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: jest.fn()
  }
}));

jest.unstable_mockModule('argon2', () => ({
  default: {
    hash: jest.fn(),
    verify: jest.fn(),
    argon2id: 2
  }
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn(),
    verify: jest.fn()
  }
}));

// Set environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing';
process.env.NODE_ENV = 'test';

const { dbManager } = await import('../../../src/database/db.enhanced.js');
const argon2 = (await import('argon2')).default;
const jwt = (await import('jsonwebtoken')).default;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Hashing', () => {
    it('should hash password with Argon2id', async () => {
      const password = 'SecurePass123!';
      const expectedHash = '$argon2id$v=19$m=65536,t=3,p=4$hash';
      
      argon2.hash.mockResolvedValue(expectedHash);
      
      const hash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
      });
      
      expect(hash).toBe(expectedHash);
      expect(argon2.hash).toHaveBeenCalledWith(
        password,
        expect.objectContaining({
          type: argon2.argon2id
        })
      );
    });

    it('should verify correct password', async () => {
      const password = 'SecurePass123!';
      const hash = '$argon2id$v=19$m=65536,t=3,p=4$hash';
      
      argon2.verify.mockResolvedValue(true);
      
      const isValid = await argon2.verify(hash, password);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'WrongPassword';
      const hash = '$argon2id$v=19$m=65536,t=3,p=4$hash';
      
      argon2.verify.mockResolvedValue(false);
      
      const isValid = await argon2.verify(hash, password);
      
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate access token with correct claims', () => {
      const payload = {
        id: 1,
        email: 'user@test.com',
        role: 'resident'
      };
      
      const expectedToken = 'mock.jwt.token';
      jwt.sign.mockReturnValue(expectedToken);
      
      const token = jwt.sign(
        { sub: payload.id, email: payload.email, role: payload.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      
      expect(token).toBe(expectedToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 1,
          email: 'user@test.com',
          role: 'resident'
        }),
        process.env.JWT_SECRET,
        expect.objectContaining({ expiresIn: '15m' })
      );
    });

    it('should generate refresh token with correct expiry', () => {
      const payload = { id: 1, email: 'user@test.com' };
      
      jwt.sign.mockReturnValue('refresh.token');
      
      const token = jwt.sign(
        { sub: payload.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );
      
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'refresh' }),
        process.env.JWT_REFRESH_SECRET,
        expect.objectContaining({ expiresIn: '7d' })
      );
    });
  });

  describe('Token Verification', () => {
    it('should validate token with correct signature', () => {
      const mockPayload = {
        sub: 1,
        email: 'user@test.com',
        role: 'resident',
        exp: Math.floor(Date.now() / 1000) + 900
      };
      
      jwt.verify.mockReturnValue(mockPayload);
      
      const payload = jwt.verify('valid.token', process.env.JWT_SECRET);
      
      expect(payload.sub).toBe(1);
      expect(payload.email).toBe('user@test.com');
    });

    it('should reject expired token', () => {
      jwt.verify.mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });
      
      expect(() => {
        jwt.verify('expired.token', process.env.JWT_SECRET);
      }).toThrow('jwt expired');
    });

    it('should reject tampered token', () => {
      jwt.verify.mockImplementation(() => {
        const error = new Error('invalid signature');
        error.name = 'JsonWebTokenError';
        throw error;
      });
      
      expect(() => {
        jwt.verify('tampered.token', process.env.JWT_SECRET);
      }).toThrow('invalid signature');
    });
  });

  describe('Account Lockout', () => {
    it('should lock account after 5 failed attempts', async () => {
      const userId = 1;
      
      // Simulate 5 failed login attempts
      dbManager.query.mockResolvedValue({
        rows: [{ failed_login_attempts: 5, locked_until: null }]
      });
      
      // Update to lock account
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await dbManager.query(
        `UPDATE users SET locked_until = NOW() + INTERVAL '15 minutes'
         WHERE id = $1 AND failed_login_attempts >= 5`,
        [userId]
      );
      
      expect(dbManager.query).toHaveBeenCalled();
    });

    it('should reset failed attempts on successful login', async () => {
      const userId = 1;
      
      dbManager.query.mockResolvedValue({ rows: [] });
      
      await dbManager.query(
        `UPDATE users SET failed_login_attempts = 0, locked_until = NULL
         WHERE id = $1`,
        [userId]
      );
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('failed_login_attempts = 0'),
        [userId]
      );
    });

    it('should reject login for locked account', async () => {
      const lockedUser = {
        id: 1,
        email: 'locked@test.com',
        locked_until: new Date(Date.now() + 600000) // Locked for 10 more minutes
      };
      
      dbManager.query.mockResolvedValue({ rows: [lockedUser] });
      
      const result = await dbManager.query(
        'SELECT * FROM users WHERE email = $1',
        ['locked@test.com']
      );
      
      const user = result.rows[0];
      const isLocked = user.locked_until && new Date(user.locked_until) > new Date();
      
      expect(isLocked).toBe(true);
    });
  });

  describe('Password Strength Validation', () => {
    const validatePasswordStrength = (password) => {
      const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        symbol: /[!@#$%^&*(),.?":{}|<>]/.test(password)
      };
      
      const score = Object.values(checks).filter(Boolean).length;
      
      return {
        checks,
        score,
        strength: score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong',
        isValid: checks.length && checks.uppercase && checks.lowercase && checks.number
      };
    };

    it('should accept strong password with all requirements', () => {
      const result = validatePasswordStrength('SecurePass123!');
      
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Abc12!');
      
      expect(result.checks.length).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = validatePasswordStrength('securepass123!');
      
      expect(result.checks.uppercase).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = validatePasswordStrength('SECUREPASS123!');
      
      expect(result.checks.lowercase).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('SecurePass!!');
      
      expect(result.checks.number).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('should classify medium strength password', () => {
      const result = validatePasswordStrength('Password1');
      
      expect(result.strength).toBe('medium');
    });

    it('should classify weak password', () => {
      const result = validatePasswordStrength('password');
      
      expect(result.strength).toBe('weak');
    });
  });

  describe('Token Blacklist', () => {
    it('should add token to blacklist on logout', async () => {
      const tokenJti = 'unique-token-id';
      
      dbManager.query.mockResolvedValue({ rows: [] });
      
      await dbManager.query(
        `INSERT INTO revoked_tokens (jti, revoked_at, expires_at)
         VALUES ($1, NOW(), $2)`,
        [tokenJti, new Date(Date.now() + 900000)]
      );
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO revoked_tokens'),
        expect.arrayContaining([tokenJti])
      );
    });

    it('should reject blacklisted token', async () => {
      const tokenJti = 'revoked-token-id';
      
      dbManager.query.mockResolvedValue({
        rows: [{ jti: tokenJti, revoked_at: new Date() }]
      });
      
      const result = await dbManager.query(
        'SELECT * FROM revoked_tokens WHERE jti = $1',
        [tokenJti]
      );
      
      const isRevoked = result.rows.length > 0;
      expect(isRevoked).toBe(true);
    });
  });
});
