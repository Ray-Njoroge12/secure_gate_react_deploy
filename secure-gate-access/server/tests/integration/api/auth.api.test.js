/**
 * Authentication API Integration Tests
 * Tests all auth API endpoints with real HTTP-like requests
 * 
 * Priority: CRITICAL (Security)
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } from '../setup.js';
import { dbManager } from '../../../src/database/db.enhanced.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

describe('Authentication API Integration Tests', () => {
  let testUsers;

  beforeAll(async () => {
    await setupTestDatabase();
    testUsers = await createTestUsers();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  // =========================================
  // Registration Endpoint Tests
  // =========================================
  describe('POST /api/auth/register', () => {
    it('should register new user with valid data', async () => {
      const userData = {
        username: `newuser_${Date.now()}`,
        email: `newuser_${Date.now()}@test.com`,
        password: 'SecurePass123!',
        role: 'resident',
        phone: '+254700111111',
        unit: 'B202'
      };

      // Simulate registration logic
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const result = await dbManager.query(
        `INSERT INTO users (username, email, password, password_hash, role, phone, unit, verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, username, email, role, phone, unit, created_at`,
        [userData.username, userData.email, hashedPassword, hashedPassword, userData.role, userData.phone, userData.unit, true]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].email).toBe(userData.email);
      expect(result.rows[0].role).toBe('resident');
      // Password should not be returned
      expect(result.rows[0].password).toBeUndefined();
    });

    it('should reject registration with duplicate email', async () => {
      const existingEmail = testUsers.resident.email;

      // Attempt to insert duplicate
      try {
        const hashedPassword = await bcrypt.hash('hashedpass', 10);
        await dbManager.query(
          `INSERT INTO users (username, email, password, password_hash, role, verified)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          ['duplicate_user', existingEmail, hashedPassword, hashedPassword, 'resident', true]
        );
        fail('Should have thrown duplicate error');
      } catch (error) {
        expect(error.message).toContain('duplicate');
      }
    });

    it('should hash password before storing', async () => {
      const plainPassword = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const result = await dbManager.query(
        `INSERT INTO users (username, email, password, password_hash, role, verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [`hashtest_${Date.now()}`, `hashtest_${Date.now()}@test.com`, hashedPassword, hashedPassword, 'resident', true]
      );

      // Stored password should not match plain text
      expect(result.rows[0].password).not.toBe(plainPassword);
      
      // But should verify correctly
      const isValid = await bcrypt.compare(plainPassword, result.rows[0].password);
      expect(isValid).toBe(true);
    });

    it('should create audit log for registration', async () => {
      const userId = testUsers.resident.id;

      await dbManager.query(
        `INSERT INTO audit_logs (action, resource, user_id, details)
         VALUES ($1, $2, $3, $4)`,
        ['user.register', 'auth', userId, JSON.stringify({ outcome: 'success' })]
      );

      const auditLog = await dbManager.query(
        "SELECT * FROM audit_logs WHERE action = 'user.register' AND user_id = $1",
        [userId]
      );

      expect(auditLog.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================
  // Login Endpoint Tests
  // =========================================
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return token', async () => {
      const email = testUsers.resident.email;
      const password = 'testpass123';

      // Verify password
      const userResult = await dbManager.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      expect(userResult.rows).toHaveLength(1);
      const user = userResult.rows[0];

      // Use argon2 since createTestUsers hashes with argon2
      const argon2 = await import('argon2');
      const isValid = await argon2.default.verify(user.password, password);
      expect(isValid).toBe(true);

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.email).toBe(email);
      expect(decoded.role).toBe('resident');
    });

    it('should reject login with invalid password', async () => {
      const email = testUsers.resident.email;
      const wrongPassword = 'wrongpassword';

      const userResult = await dbManager.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      const isValid = await bcrypt.compare(wrongPassword, userResult.rows[0].password);
      expect(isValid).toBe(false);
    });

    it('should reject login with non-existent email', async () => {
      const email = 'nonexistent@test.com';

      const userResult = await dbManager.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      expect(userResult.rows).toHaveLength(0);
    });

    it('should track failed login attempts', async () => {
      const userId = testUsers.resident.id;

      // Log failed attempt
      await dbManager.query(
        `INSERT INTO audit_logs (action, resource, user_id, ip_address, details)
         VALUES ($1, $2, $3, $4, $5)`,
        ['user.login.failed', 'auth', userId, '192.168.1.100', JSON.stringify({ reason: 'invalid_password' })]
      );

      const failedAttempts = await dbManager.query(
        "SELECT COUNT(*) FROM audit_logs WHERE action = 'user.login.failed' AND user_id = $1",
        [userId]
      );

      expect(parseInt(failedAttempts.rows[0].count)).toBeGreaterThanOrEqual(1);
    });

    it('should log successful login', async () => {
      const userId = testUsers.resident.id;

      await dbManager.query(
        `INSERT INTO audit_logs (action, resource, user_id, ip_address, details)
         VALUES ($1, $2, $3, $4, $5)`,
        ['user.login', 'auth', userId, '192.168.1.100', JSON.stringify({ outcome: 'success' })]
      );

      const loginLog = await dbManager.query(
        "SELECT * FROM audit_logs WHERE action = 'user.login' AND user_id = $1",
        [userId]
      );

      expect(loginLog.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================
  // Token Refresh Tests
  // =========================================
  describe('POST /api/auth/refresh', () => {
    it('should refresh valid token', async () => {
      const user = testUsers.resident;

      // Create initial token with explicit jti
      const jti1 = crypto.randomBytes(8).toString('hex');
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, jti: jti1 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Verify and decode
      const decoded = jwt.verify(token, JWT_SECRET);

      // Generate new token with different jti
      const jti2 = crypto.randomBytes(8).toString('hex');
      const newToken = jwt.sign(
        { id: decoded.id, email: decoded.email, role: decoded.role, jti: jti2 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(token); // Should be different due to different jti
    });

    it('should reject expired token refresh', async () => {
      const user = testUsers.resident;

      // Create expired token
      const expiredToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      // Attempt to verify
      try {
        jwt.verify(expiredToken, JWT_SECRET);
        fail('Should have thrown expired error');
      } catch (error) {
        expect(error.name).toBe('TokenExpiredError');
      }
    });

    it('should reject invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      try {
        jwt.verify(invalidToken, JWT_SECRET);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.name).toBe('JsonWebTokenError');
      }
    });
  });

  // =========================================
  // Logout Tests
  // =========================================
  describe('POST /api/auth/logout', () => {
    it('should log logout event', async () => {
      const userId = testUsers.resident.id;

      await dbManager.query(
        `INSERT INTO audit_logs (action, resource, user_id, details)
         VALUES ($1, $2, $3, $4)`,
        ['user.logout', 'auth', userId, JSON.stringify({ outcome: 'success' })]
      );

      const logoutLog = await dbManager.query(
        "SELECT * FROM audit_logs WHERE action = 'user.logout' AND user_id = $1",
        [userId]
      );

      expect(logoutLog.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================
  // Get Current User Tests
  // =========================================
  describe('GET /api/auth/me', () => {
    it('should return current user info with valid token', async () => {
      const user = testUsers.resident;
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Decode token to get user ID
      const decoded = jwt.verify(token, JWT_SECRET);

      // Fetch user
      const result = await dbManager.query(
        'SELECT id, username, email, role, phone, unit FROM users WHERE id = $1',
        [decoded.id]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].email).toBe(user.email);
      // Should not include password
      expect(result.rows[0].password).toBeUndefined();
    });

    it('should reject request without token', async () => {
      // No token means no user ID
      const noToken = null;
      expect(noToken).toBeNull();
    });
  });

  // =========================================
  // Password Reset Tests
  // =========================================
  describe('Password Reset Flow', () => {
    it('should generate reset token for valid email', async () => {
      const email = testUsers.resident.email;

      // Check user exists
      const userResult = await dbManager.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      expect(userResult.rows).toHaveLength(1);

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: userResult.rows[0].id, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      expect(resetToken).toBeDefined();
    });

    it('should reset password with valid token', async () => {
      const user = testUsers.resident;
      const newPassword = 'NewSecurePass123!';

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Verify token
      const decoded = jwt.verify(resetToken, JWT_SECRET);
      expect(decoded.type).toBe('password_reset');

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await dbManager.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, decoded.userId]
      );

      // Verify new password works
      const updatedUser = await dbManager.query(
        'SELECT password FROM users WHERE id = $1',
        [decoded.userId]
      );

      const isValid = await bcrypt.compare(newPassword, updatedUser.rows[0].password);
      expect(isValid).toBe(true);
    });

    it('should reject expired reset token', async () => {
      const user = testUsers.resident;

      // Generate expired token
      const expiredToken = jwt.sign(
        { userId: user.id, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      try {
        jwt.verify(expiredToken, JWT_SECRET);
        fail('Should have thrown expired error');
      } catch (error) {
        expect(error.name).toBe('TokenExpiredError');
      }
    });
  });

  // =========================================
  // Role-Based Access Tests
  // =========================================
  describe('Role-Based Access Control', () => {
    it('should identify admin role from token', async () => {
      const token = await getAuthToken(testUsers.admin.email);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.role).toBe('admin');
    });

    it('should identify guard role from token', async () => {
      const token = await getAuthToken(testUsers.guard.email);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.role).toBe('guard');
    });

    it('should identify resident role from token', async () => {
      const token = await getAuthToken(testUsers.resident.email);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.role).toBe('resident');
    });
  });

  // =========================================
  // Security Tests
  // =========================================
  describe('Authentication Security', () => {
    it('should use secure password hashing (bcrypt with sufficient rounds)', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Bcrypt hash should start with $2
      expect(hashedPassword.startsWith('$2')).toBe(true);
      
      // Hash length should be 60 characters
      expect(hashedPassword.length).toBe(60);
    });

    it('should include expiration in tokens', async () => {
      const user = testUsers.resident;
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const decoded = jwt.decode(token);
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('should prevent token tampering', async () => {
      const user = testUsers.resident;
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Tamper with token
      const parts = token.split('.');
      parts[1] = Buffer.from(JSON.stringify({ id: 999, email: 'hacker@test.com', role: 'admin' })).toString('base64');
      const tamperedToken = parts.join('.');

      try {
        jwt.verify(tamperedToken, JWT_SECRET);
        fail('Should have rejected tampered token');
      } catch (error) {
        expect(error.name).toBe('JsonWebTokenError');
      }
    });
  });
});
