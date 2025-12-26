/**
 * Unit Tests for UserService
 * 
 * P0 (Critical Security) - User Management Service
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Store original environment
const originalEnv = { ...process.env };

// Mock dependencies before importing
const mockQuery = jest.fn();
const mockDb = { query: mockQuery };

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  db: mockDb
}));

// Mock password service
const mockPasswordService = {
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  checkPasswordStrength: jest.fn(),
  generateSecurePassword: jest.fn()
};

// Mock account security
const mockAccountSecurity = {
  getLockoutInfo: jest.fn(),
  recordFailedAttempt: jest.fn(),
  clearFailedAttempts: jest.fn(),
  isAccountLocked: jest.fn()
};

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({
  passwordService: mockPasswordService,
  accountSecurity: mockAccountSecurity
}));

// Mock AppError
class MockAppError extends Error {
  constructor(message, statusCode, code, data) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
    this.isOperational = true;
  }
}

jest.unstable_mockModule('../../src/middleware/standardizedErrorHandler.js', () => ({
  AppError: MockAppError
}));

// Set test environment
process.env.NODE_ENV = 'test';
process.env.EMAIL_VERIFICATION_REQUIRED = 'false';

// Import after mocks
const { userService } = await import('../../src/services/userService.js');

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    
    // Reset environment
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_VERIFICATION_REQUIRED = 'false';
    
    // Default mock implementations
    mockPasswordService.checkPasswordStrength.mockReturnValue({
      strength: 'strong',
      score: 4,
      checks: { length: true, uppercase: true, lowercase: true, numbers: true, symbols: true },
      message: 'Password is strong'
    });
    mockPasswordService.hashPassword.mockResolvedValue('hashed_password_123');
    mockPasswordService.verifyPassword.mockResolvedValue(true);
    
    mockAccountSecurity.getLockoutInfo.mockReturnValue(null);
    mockAccountSecurity.recordFailedAttempt.mockReturnValue({ isLocked: false, remainingAttempts: 4 });
    mockAccountSecurity.clearFailedAttempts.mockReturnValue(undefined);
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  // =========================================
  // generateEmailVerificationToken Tests
  // =========================================
  describe('generateEmailVerificationToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = userService.generateEmailVerificationToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should generate unique tokens on each call', () => {
      const token1 = userService.generateEmailVerificationToken();
      const token2 = userService.generateEmailVerificationToken();
      expect(token1).not.toBe(token2);
    });
  });

  // =========================================
  // createUser Tests
  // =========================================
  describe('createUser', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'SecurePass123!',
      role: 'resident'
    };

    describe('Input Validation', () => {
      it('should throw error when username is missing', async () => {
        await expect(userService.createUser({
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'resident'
        })).rejects.toThrow('Missing required fields');
      });

      it('should throw error when email is missing', async () => {
        await expect(userService.createUser({
          username: 'testuser',
          password: 'SecurePass123!',
          role: 'resident'
        })).rejects.toThrow('Missing required fields');
      });

      it('should throw error when password is missing', async () => {
        await expect(userService.createUser({
          username: 'testuser',
          email: 'test@example.com',
          role: 'resident'
        })).rejects.toThrow('Missing required fields');
      });

      it('should throw error when role is missing', async () => {
        await expect(userService.createUser({
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!'
        })).rejects.toThrow('Missing required fields');
      });

      it('should throw error for invalid email format', async () => {
        await expect(userService.createUser({
          ...validUserData,
          email: 'invalid-email'
        })).rejects.toThrow('Invalid email format');
      });

      it('should throw error for invalid role', async () => {
        await expect(userService.createUser({
          ...validUserData,
          role: 'superadmin'
        })).rejects.toThrow('Invalid role');
      });

      it('should accept valid roles: resident, guard, admin', async () => {
        for (const role of ['resident', 'guard', 'admin']) {
          mockQuery.mockReset();
          mockQuery.mockResolvedValueOnce({ rows: [] });
          mockQuery.mockResolvedValueOnce({ 
            rows: [{ id: 1, username: 'testuser', email: 'test@example.com', role, verification_token: 'token123', created_at: new Date() }] 
          });
          const result = await userService.createUser({ ...validUserData, role });
          expect(result.role).toBe(role);
        }
      });

      it('should throw error for username with special characters', async () => {
        await expect(userService.createUser({
          ...validUserData,
          username: 'test@user!'
        })).rejects.toThrow('Username must contain only letters, numbers, and underscores');
      });

      it('should accept username with underscores', async () => {
        mockQuery.mockReset();
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ 
          rows: [{ id: 1, username: 'test_user_123', email: 'test@example.com', role: 'resident', verification_token: 'token', created_at: new Date() }] 
        });
        const result = await userService.createUser({ ...validUserData, username: 'test_user_123' });
        expect(result.username).toBe('test_user_123');
      });
    });

    describe('Password Validation', () => {
      it('should reject weak passwords', async () => {
        mockPasswordService.checkPasswordStrength.mockReturnValue({
          strength: 'weak',
          score: 1,
          message: 'Password needs: uppercase letter, number, special character'
        });
        await expect(userService.createUser(validUserData)).rejects.toThrow('Password is too weak');
      });

      it('should accept strong passwords', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ 
          rows: [{ id: 1, username: 'testuser', email: 'test@example.com', role: 'resident', verification_token: 'token', created_at: new Date() }] 
        });
        const result = await userService.createUser(validUserData);
        expect(result).toBeDefined();
        expect(mockPasswordService.hashPassword).toHaveBeenCalledWith('SecurePass123!');
      });
    });

    describe('Duplicate User Handling', () => {
      it('should throw AppError for existing username or email', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com' }] });
        await expect(userService.createUser(validUserData)).rejects.toThrow('Username or email already exists');
      });

      it('should handle PostgreSQL unique constraint violation', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        const pgError = new Error('duplicate key value');
        pgError.code = '23505';
        mockQuery.mockRejectedValueOnce(pgError);
        await expect(userService.createUser(validUserData)).rejects.toThrow('Username or email already exists');
      });
    });

    describe('Successful User Creation', () => {
      it('should create user and return without password_hash', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ 
          rows: [{ id: 1, username: 'testuser', email: 'test@example.com', role: 'resident', verification_token: 'token123', created_at: new Date(), password_hash: 'should_be_removed' }] 
        });
        const result = await userService.createUser(validUserData);
        expect(result.id).toBe(1);
        expect(result.password_hash).toBeUndefined();
      });
    });

    describe('Error Handling', () => {
      it('should wrap database errors in AppError', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockRejectedValueOnce(new Error('Connection refused'));
        await expect(userService.createUser(validUserData)).rejects.toThrow('User creation failed');
      });
    });
  });

  // =========================================
  // verifyEmailToken Tests
  // =========================================
  describe('verifyEmailToken', () => {
    it('should verify valid token and mark user as verified', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ id: 1, username: 'testuser', email: 'test@example.com', verification_expires: futureDate }] 
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await userService.verifyEmailToken('valid_token_123');
      expect(result.id).toBe(1);
      expect(result.verified).toBe(true);
    });

    it('should throw error for invalid token', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(userService.verifyEmailToken('invalid_token')).rejects.toThrow('Invalid or already used verification token');
    });

    it('should throw error for expired token', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000);
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ id: 1, username: 'testuser', email: 'test@example.com', verification_expires: pastDate }] 
      });
      await expect(userService.verifyEmailToken('expired_token')).rejects.toThrow('Verification token has expired');
    });
  });

  // =========================================
  // resendEmailVerification Tests
  // =========================================
  describe('resendEmailVerification', () => {
    it('should generate new verification token for unverified user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await userService.resendEmailVerification('test@example.com');
      expect(result.id).toBe(1);
      expect(result.verification_token).toBeDefined();
      expect(result.verification_token).toHaveLength(64);
    });

    it('should throw error for non-existent email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(userService.resendEmailVerification('nonexistent@example.com')).rejects.toThrow('User not found or email already verified');
    });
  });

  // =========================================
  // authenticateUser Tests
  // =========================================
  describe('authenticateUser', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      role: 'resident',
      created_at: new Date(),
      verified: true
    };

    describe('Input Validation', () => {
      it('should throw error when username is missing', async () => {
        await expect(userService.authenticateUser(null, 'password')).rejects.toThrow('Username and password required');
      });

      it('should throw error when password is missing', async () => {
        await expect(userService.authenticateUser('testuser', null)).rejects.toThrow('Username and password required');
      });
    });

    describe('Account Lockout', () => {
      it('should check lockout status before authentication', async () => {
        mockAccountSecurity.getLockoutInfo.mockReturnValue({ isLocked: false });
        mockQuery.mockResolvedValueOnce({ rows: [{ ...mockUser }] });
        mockPasswordService.verifyPassword.mockResolvedValue(true);
        await userService.authenticateUser('testuser', 'password');
        expect(mockAccountSecurity.getLockoutInfo).toHaveBeenCalledWith('testuser');
      });

      it('should throw error if account is locked', async () => {
        mockAccountSecurity.getLockoutInfo.mockReturnValue({ isLocked: true, lockedUntil: new Date(Date.now() + 15 * 60 * 1000) });
        await expect(userService.authenticateUser('testuser', 'password')).rejects.toThrow('Account is locked');
      });
    });

    describe('User Lookup', () => {
      it('should look up user by username', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ ...mockUser }] });
        mockPasswordService.verifyPassword.mockResolvedValue(true);
        await userService.authenticateUser('testuser', 'password');
        expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE username = $1 OR email = $1'), ['testuser']);
      });

      it('should record failed attempt for non-existent user', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        await expect(userService.authenticateUser('nonexistent', 'password')).rejects.toThrow('Invalid credentials');
        expect(mockAccountSecurity.recordFailedAttempt).toHaveBeenCalledWith('nonexistent', 'unknown');
      });
    });

    describe('Password Verification', () => {
      it('should verify password using passwordService', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ ...mockUser }] });
        mockPasswordService.verifyPassword.mockResolvedValue(true);
        await userService.authenticateUser('testuser', 'password');
        expect(mockPasswordService.verifyPassword).toHaveBeenCalledWith('password', 'hashed_password');
      });

      it('should record failed attempt for wrong password', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ ...mockUser }] });
        mockPasswordService.verifyPassword.mockResolvedValue(false);
        await expect(userService.authenticateUser('testuser', 'wrongpassword')).rejects.toThrow('Invalid credentials');
        expect(mockAccountSecurity.recordFailedAttempt).toHaveBeenCalledWith('testuser', 'unknown');
      });

      it('should clear failed attempts on successful login', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ ...mockUser }] });
        mockPasswordService.verifyPassword.mockResolvedValue(true);
        await userService.authenticateUser('testuser', 'password');
        expect(mockAccountSecurity.clearFailedAttempts).toHaveBeenCalledWith('testuser');
      });
    });

    describe('Email Verification Enforcement', () => {
      it('should allow login when EMAIL_VERIFICATION_REQUIRED is false', async () => {
        process.env.EMAIL_VERIFICATION_REQUIRED = 'false';
        const unverifiedUser = { ...mockUser, verified: false };
        mockQuery.mockResolvedValueOnce({ rows: [unverifiedUser] });
        mockPasswordService.verifyPassword.mockResolvedValue(true);
        const result = await userService.authenticateUser('testuser', 'password');
        expect(result.id).toBe(1);
      });

      it('should reject unverified user when EMAIL_VERIFICATION_REQUIRED is true', async () => {
        process.env.EMAIL_VERIFICATION_REQUIRED = 'true';
        const unverifiedUser = { ...mockUser, verified: false };
        mockQuery.mockResolvedValueOnce({ rows: [unverifiedUser] });
        mockPasswordService.verifyPassword.mockResolvedValue(true);
        await expect(userService.authenticateUser('testuser', 'password')).rejects.toThrow('Please verify your email');
      });
    });

    describe('Successful Authentication', () => {
      it('should return user without password_hash', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ ...mockUser }] });
        mockPasswordService.verifyPassword.mockResolvedValue(true);
        const result = await userService.authenticateUser('testuser', 'password');
        expect(result.id).toBe(1);
        expect(result.password_hash).toBeUndefined();
      });
    });
  });

  // =========================================
  // getUserById Tests
  // =========================================
  describe('getUserById', () => {
    it('should return user for valid ID', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com', role: 'resident' }] });
      const result = await userService.getUserById(1);
      expect(result.id).toBe(1);
    });

    it('should return null for non-existent ID', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await userService.getUserById(999);
      expect(result).toBeNull();
    });

    it('should throw error when ID is missing', async () => {
      await expect(userService.getUserById(null)).rejects.toThrow('User ID required');
    });
  });

  // =========================================
  // getUserByUsername Tests
  // =========================================
  describe('getUserByUsername', () => {
    it('should return user for valid username', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com', role: 'resident' }] });
      const result = await userService.getUserByUsername('testuser');
      expect(result.id).toBe(1);
    });

    it('should return null for non-existent username', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await userService.getUserByUsername('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw error when username is missing', async () => {
      await expect(userService.getUserByUsername(null)).rejects.toThrow('Username required');
    });
  });

  // =========================================
  // updateUser Tests
  // =========================================
  describe('updateUser', () => {
    it('should update allowed fields', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'newusername', email: 'new@example.com', role: 'guard' }] });
      const result = await userService.updateUser(1, { username: 'newusername', email: 'new@example.com' });
      expect(result.username).toBe('newusername');
    });

    it('should ignore non-allowed fields', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com', role: 'resident' }] });
      await userService.updateUser(1, { username: 'newusername', password_hash: 'hacked' });
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).not.toContain('password_hash');
    });

    it('should throw error when no valid fields provided', async () => {
      await expect(userService.updateUser(1, { invalid_field: 'value' })).rejects.toThrow('No valid fields to update');
    });

    it('should throw error when user ID is missing', async () => {
      await expect(userService.updateUser(null, { username: 'test' })).rejects.toThrow('User ID required');
    });

    it('should throw error when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(userService.updateUser(999, { username: 'test' })).rejects.toThrow('User not found');
    });

    it('should handle unique constraint violation', async () => {
      const pgError = new Error('duplicate key');
      pgError.code = '23505';
      mockQuery.mockRejectedValueOnce(pgError);
      await expect(userService.updateUser(1, { email: 'existing@example.com' })).rejects.toThrow('Username or email already exists');
    });
  });

  // =========================================
  // deleteUser Tests
  // =========================================
  describe('deleteUser', () => {
    it('should delete user and return deleted user info', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com' }] });
      const result = await userService.deleteUser(1);
      expect(result.id).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM users'), [1]);
    });

    it('should throw error when user ID is missing', async () => {
      await expect(userService.deleteUser(null)).rejects.toThrow('User ID required');
    });

    it('should throw error when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(userService.deleteUser(999)).rejects.toThrow('User not found');
    });
  });

  // =========================================
  // listUsers Tests
  // =========================================
  describe('listUsers', () => {
    it('should return paginated users', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'user1' }, { id: 2, username: 'user2' }] });
      const result = await userService.listUsers(1, 10);
      expect(result).toHaveLength(2);
    });

    it('should apply default pagination values', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await userService.listUsers();
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[1]).toContain(10);
      expect(queryCall[1]).toContain(0);
    });

    it('should filter by role when specified', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await userService.listUsers(1, 10, 'admin');
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE role = $1');
    });
  });

  // =========================================
  // changePassword Tests
  // =========================================
  describe('changePassword', () => {
    it('should change password when current password is correct', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: 'old_hash' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockPasswordService.verifyPassword.mockResolvedValue(true);
      mockPasswordService.hashPassword.mockResolvedValue('new_hash');
      const result = await userService.changePassword(1, 'oldpass', 'NewSecure123!');
      expect(result.success).toBe(true);
    });

    it('should throw error when current password is wrong', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: 'old_hash' }] });
      mockPasswordService.verifyPassword.mockResolvedValue(false);
      await expect(userService.changePassword(1, 'wrongpass', 'NewSecure123!')).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(userService.changePassword(999, 'oldpass', 'NewSecure123!')).rejects.toThrow('User not found');
    });

    it('should reject weak new password', async () => {
      mockPasswordService.checkPasswordStrength.mockReturnValue({ strength: 'weak', message: 'Password too simple' });
      await expect(userService.changePassword(1, 'oldpass', 'weak')).rejects.toThrow('New password is too weak');
    });

    it('should throw error when parameters are missing', async () => {
      await expect(userService.changePassword(null, 'oldpass', 'newpass')).rejects.toThrow('User ID, current password, and new password required');
    });
  });

  // =========================================
  // resetPassword Tests (Admin)
  // =========================================
  describe('resetPassword', () => {
    it('should reset password for valid user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com' }] });
      mockPasswordService.hashPassword.mockResolvedValue('new_hash');
      const result = await userService.resetPassword(1, 'NewSecure123!');
      expect(result.id).toBe(1);
    });

    it('should throw error when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(userService.resetPassword(999, 'NewSecure123!')).rejects.toThrow('User not found');
    });

    it('should reject weak password', async () => {
      mockPasswordService.checkPasswordStrength.mockReturnValue({ strength: 'weak', message: 'Password too simple' });
      await expect(userService.resetPassword(1, 'weak')).rejects.toThrow('Password is too weak');
    });

    it('should throw error when parameters are missing', async () => {
      await expect(userService.resetPassword(null, 'password')).rejects.toThrow('User ID and new password required');
    });
  });

  // =========================================
  // searchUsers Tests
  // =========================================
  describe('searchUsers', () => {
    it('should search by username and email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com' }] });
      const result = await userService.searchUsers('test');
      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('username ILIKE $1 OR email ILIKE $1'), expect.arrayContaining(['%test%']));
    });

    it('should filter by role when specified', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await userService.searchUsers('test', 'admin');
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('AND role = $2');
    });

    it('should throw error when search term is missing', async () => {
      await expect(userService.searchUsers(null)).rejects.toThrow('Search term required');
    });
  });

  // =========================================
  // getUserStats Tests
  // =========================================
  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '80', guards: '15', admins: '5' }] });
      const result = await userService.getUserStats();
      expect(result.total_users).toBe('100');
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection failed'));
      await expect(userService.getUserStats()).rejects.toThrow('Failed to get user statistics');
    });
  });

  // =========================================
  // requestPasswordReset Tests
  // =========================================
  describe('requestPasswordReset', () => {
    it('should generate reset token for existing user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com', verified: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await userService.requestPasswordReset('test@example.com');
      expect(result.success).toBe(true);
      expect(result.resetToken).toBeDefined();
      expect(result.resetToken).toHaveLength(64);
    });

    it('should return success even for non-existent email (security)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await userService.requestPasswordReset('nonexistent@example.com');
      expect(result.success).toBe(true);
      expect(result.message).toContain('If this email exists');
    });

    it('should throw error for invalid email format', async () => {
      await expect(userService.requestPasswordReset('invalid-email')).rejects.toThrow('Invalid email format');
    });

    it('should throw error when email is missing', async () => {
      await expect(userService.requestPasswordReset(null)).rejects.toThrow('Email is required');
    });

    it('should set reset token expiry to 1 hour', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com', verified: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await userService.requestPasswordReset('test@example.com');
      const expectedExpiry = Date.now() + 60 * 60 * 1000;
      expect(Math.abs(result.expiresAt.getTime() - expectedExpiry)).toBeLessThan(5000);
    });
  });

  // =========================================
  // verifyResetToken Tests
  // =========================================
  describe('verifyResetToken', () => {
    it('should verify valid token', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com', password_reset_expires: futureDate, password_reset_used_at: null }] });
      const result = await userService.verifyResetToken('valid_token');
      expect(result.valid).toBe(true);
    });

    it('should throw error for invalid token', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(userService.verifyResetToken('invalid_token')).rejects.toThrow('Invalid reset token');
    });

    it('should throw error for expired token', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com', password_reset_expires: pastDate, password_reset_used_at: null }] });
      await expect(userService.verifyResetToken('expired_token')).rejects.toThrow('Reset token has expired');
    });

    it('should throw error for already used token', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com', password_reset_expires: futureDate, password_reset_used_at: new Date() }] });
      await expect(userService.verifyResetToken('used_token')).rejects.toThrow('Reset token has already been used');
    });

    it('should throw error when token is missing', async () => {
      await expect(userService.verifyResetToken(null)).rejects.toThrow('Reset token is required');
    });
  });

  // =========================================
  // resetPasswordWithToken Tests
  // =========================================
  describe('resetPasswordWithToken', () => {
    it('should reset password with valid token', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com', password_reset_expires: futureDate, password_reset_used_at: null }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com' }] });
      mockPasswordService.hashPassword.mockResolvedValue('new_hash');
      const result = await userService.resetPasswordWithToken('valid_token', 'NewSecure123!');
      expect(result.success).toBe(true);
    });

    it('should throw error for weak password', async () => {
      mockPasswordService.checkPasswordStrength.mockReturnValue({ strength: 'weak', message: 'Password too simple' });
      await expect(userService.resetPasswordWithToken('token', 'weak')).rejects.toThrow('Password is too weak');
    });

    it('should throw error when parameters are missing', async () => {
      await expect(userService.resetPasswordWithToken(null, 'password')).rejects.toThrow('Reset token and new password are required');
    });

    it('should mark token as used after reset', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com', password_reset_expires: futureDate, password_reset_used_at: null }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com' }] });
      await userService.resetPasswordWithToken('valid_token', 'NewSecure123!');
      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[0]).toContain('password_reset_used_at = NOW()');
    });
  });

  // =========================================
  // cleanupExpiredResetTokens Tests
  // =========================================
  describe('cleanupExpiredResetTokens', () => {
    it('should clean up expired tokens', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ cleaned_count: 5 }] });
      const result = await userService.cleanupExpiredResetTokens();
      expect(result.cleanedCount).toBe(5);
    });

    it('should handle no expired tokens', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ cleaned_count: 0 }] });
      const result = await userService.cleanupExpiredResetTokens();
      expect(result.cleanedCount).toBe(0);
    });
  });

  // =========================================
  // Security Tests
  // =========================================
  describe('Security', () => {
    it('should use parameterized queries for all database operations', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'test', email: 'test@example.com', role: 'resident', verification_token: 'token', created_at: new Date() }] });
      await userService.createUser({ username: 'test', email: 'test@example.com', password: 'SecurePass123!', role: 'resident' });
      for (const call of mockQuery.mock.calls) {
        expect(call[1]).toBeInstanceOf(Array);
      }
    });

    it('should never return password_hash in any user response', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'test', email: 'test@example.com', role: 'resident', password_hash: 'secret', verification_token: 'token', created_at: new Date() }] });
      const created = await userService.createUser({ username: 'test', email: 'test@example.com', password: 'SecurePass123!', role: 'resident' });
      expect(created.password_hash).toBeUndefined();
    });

    it('should prevent timing attacks by recording failed attempts for non-existent users', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(userService.authenticateUser('nonexistent', 'password')).rejects.toThrow('Invalid credentials');
      expect(mockAccountSecurity.recordFailedAttempt).toHaveBeenCalledWith('nonexistent', 'unknown');
    });

    it('should prevent email enumeration in password reset', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result1 = await userService.requestPasswordReset('nonexistent@example.com');
      mockQuery.mockReset();
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, username: 'test', email: 'existing@example.com', verified: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result2 = await userService.requestPasswordReset('existing@example.com');
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });
});
