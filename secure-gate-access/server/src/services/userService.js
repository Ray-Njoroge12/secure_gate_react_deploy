import { passwordService, accountSecurity } from './tokenService.js';
import { db } from '../database/db.enhanced.js';
import { AppError } from '../middleware/standardizedErrorHandler.js';
import crypto from 'crypto';

/**
 * User Service with SQL Injection Protection
 * Implements secure user management with parameterized queries
 */

class UserService {
  constructor() {
    this.db = db;
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new user with email verification
   */
  async createUser(userData) {
    const { username, email, password, role } = userData;

    // Input validation
    if (!username || !email || !password || !role) {
      throw new Error('Missing required fields');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate role
    const validRoles = ['resident', 'guard', 'admin'];
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role');
    }

    // Validate username (alphanumeric and underscore only)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      throw new Error('Username must contain only letters, numbers, and underscores');
    }

    // Check password strength
    const strengthCheck = passwordService.checkPasswordStrength(password);
    if (strengthCheck.strength === 'weak') {
      throw new Error(`Password is too weak: ${strengthCheck.message}`);
    }

    try {
      // Check if user already exists using parameterized queries
      const existingUser = await this.db.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        throw new AppError('Username or email already exists', 409, 'DUPLICATE_ENTRY');
      }

      // Hash password securely
      const hashedPassword = await passwordService.hashPassword(password);

      // Generate email verification token
      const emailVerificationToken = this.generateEmailVerificationToken();
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user with email verification fields
      const result = await this.db.query(
        `INSERT INTO users (username, email, password_hash, role, email_verification_token, email_verification_expires, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
         RETURNING id, username, email, role, email_verification_token, created_at`,
        [username, email, hashedPassword, role, emailVerificationToken, emailVerificationExpires]
      );

      const user = result.rows[0];
      
      // Remove password hash from response but keep verification token for email sending
      delete user.password_hash;

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        // Re-throw AppError instances (like DUPLICATE_ENTRY) without wrapping
        throw error;
      }
      if (error.code === '23505') { // PostgreSQL unique violation
        throw new AppError('Username or email already exists', 409, 'DUPLICATE_ENTRY');
      }
      throw new AppError(`User creation failed: ${error.message}`, 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Verify email verification token
   */
  async verifyEmailToken(token) {
    try {
      const result = await this.db.query(
        `SELECT id, username, email, email_verification_expires 
         FROM users 
         WHERE email_verification_token = $1 AND email_verified_at IS NULL`,
        [token]
      );

      if (result.rows.length === 0) {
        throw new AppError('Invalid or already used verification token', 400, 'INVALID_TOKEN');
      }

      const user = result.rows[0];

      // Check if token has expired
      if (new Date() > new Date(user.email_verification_expires)) {
        throw new AppError('Verification token has expired', 400, 'TOKEN_EXPIRED');
      }

      // Mark email as verified
      await this.db.query(
        `UPDATE users 
         SET email_verified_at = NOW(), email_verification_token = NULL, email_verification_expires = NULL, updated_at = NOW()
         WHERE id = $1`,
        [user.id]
      );

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        verified: true
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Email verification failed: ${error.message}`, 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Resend email verification token
   */
  async resendEmailVerification(email) {
    try {
      // Find user by email who hasn't verified yet
      const userResult = await this.db.query(
        `SELECT id, username, email 
         FROM users 
         WHERE email = $1 AND email_verified_at IS NULL`,
        [email]
      );

      if (userResult.rows.length === 0) {
        throw new AppError('User not found or email already verified', 400, 'USER_NOT_FOUND');
      }

      const user = userResult.rows[0];

      // Generate new verification token
      const emailVerificationToken = this.generateEmailVerificationToken();
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new token
      await this.db.query(
        `UPDATE users 
         SET email_verification_token = $1, email_verification_expires = $2, updated_at = NOW()
         WHERE id = $3`,
        [emailVerificationToken, emailVerificationExpires, user.id]
      );

      return {
        ...user,
        email_verification_token: emailVerificationToken
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to resend verification email: ${error.message}`, 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Authenticate user with proper SQL injection protection
   */
  async authenticateUser(username, password) {
    // DEBUG: Log exact parameters received
    console.log('🔍 USERSERVICE DEBUG - authenticateUser called with:', {
      username: username,
      usernameType: typeof username,
      password: password ? '[PRESENT]' : '[MISSING]',
      passwordType: typeof password
    });
    
    if (!username || !password) {
      console.log('🔍 USERSERVICE DEBUG - Validation failed:', {
        usernameEmpty: !username,
        passwordEmpty: !password
      });
      throw new Error('Username and password required');
    }

    // Check if account is locked
    const lockoutInfo = accountSecurity.getLockoutInfo(username);
    if (lockoutInfo && lockoutInfo.isLocked) {
      throw new Error(`Account is locked until ${lockoutInfo.lockedUntil}`);
    }

    try {
      // DEBUG: Temporary logging
      console.log('🔍 USERSERVICE DEBUG - Looking up user:', username);
      
      // Get user by username OR email using parameterized query, including email verification status
      const result = await this.db.query(
        'SELECT id, username, email, password_hash, role, created_at, email_verified_at FROM users WHERE username = $1 OR email = $1',
        [username]
      );

      console.log('🔍 USERSERVICE DEBUG - Query result rows:', result.rows.length);
      if (result.rows.length > 0) {
        console.log('🔍 USERSERVICE DEBUG - Found user:', { 
          id: result.rows[0].id, 
          username: result.rows[0].username, 
          email: result.rows[0].email 
        });
      }

      if (result.rows.length === 0) {
        // Record failed attempt even for non-existent users (security)
        accountSecurity.recordFailedAttempt(username, 'unknown');
        throw new Error('Invalid credentials');
      }

      const user = result.rows[0];

      // DEBUG: Temporary logging
      console.log('🔍 USERSERVICE DEBUG - Password verification for user:', user.username);
      console.log('🔍 USERSERVICE DEBUG - Has password hash:', !!user.password_hash);
      console.log('🔍 USERSERVICE DEBUG - Password hash length:', user.password_hash?.length);

      // Verify password
      const isValidPassword = await passwordService.verifyPassword(password, user.password_hash);
      
      console.log('🔍 USERSERVICE DEBUG - Password verification result:', isValidPassword);
      
      if (!isValidPassword) {
        // Record failed attempt
        accountSecurity.recordFailedAttempt(username, 'unknown');
        throw new Error('Invalid credentials');
      }

      // Check if email is verified (skip in development if EMAIL_VERIFICATION_REQUIRED=false)
      const requireEmailVerification = process.env.EMAIL_VERIFICATION_REQUIRED !== 'false';
      if (requireEmailVerification && !user.email_verified_at) {
        throw new AppError('Please verify your email address before logging in. Check your inbox for the verification link.', 403, 'EMAIL_NOT_VERIFIED', {
          email: user.email,
          requiresVerification: true
        });
      }

      // Clear failed attempts on successful login
      accountSecurity.clearFailedAttempts(username);

      // Remove password hash from response
      delete user.password_hash;

      return user;
    } catch (error) {
      if (error.message.includes('Invalid credentials')) {
        throw error; // Re-throw authentication errors
      }
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Get user by ID with parameterized query
   */
  async getUserById(userId) {
    if (!userId) {
      throw new Error('User ID required');
    }

    try {
      const result = await this.db.query(
        'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Get user by username with parameterized query
   */
  async getUserByUsername(username) {
    if (!username) {
      throw new Error('Username required');
    }

    try {
      const result = await this.db.query(
        'SELECT id, username, email, role, created_at, updated_at FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Update user with parameterized queries
   */
  async updateUser(userId, updateData) {
    if (!userId) {
      throw new Error('User ID required');
    }

    const allowedFields = ['username', 'email', 'role'];
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update query with parameterized values
    for (const [field, value] of Object.entries(updateData)) {
      if (allowedFields.includes(field) && value !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add updated_at timestamp
    updates.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    paramCount++;

    // Add user ID for WHERE clause
    values.push(userId);

    try {
      const result = await this.db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, role, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique violation
        throw new Error('Username or email already exists');
      }
      throw new Error(`User update failed: ${error.message}`);
    }
  }

  /**
   * Delete user with parameterized query
   */
  async deleteUser(userId) {
    if (!userId) {
      throw new Error('User ID required');
    }

    try {
      const result = await this.db.query(
        'DELETE FROM users WHERE id = $1 RETURNING id, username, email',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`User deletion failed: ${error.message}`);
    }
  }

  /**
   * List users with pagination and parameterized queries
   */
  async listUsers(page = 1, limit = 10, role = null) {
    const offset = (page - 1) * limit;
    let query = 'SELECT id, username, email, role, created_at, updated_at FROM users';
    const values = [];
    let paramCount = 1;

    // Add role filter if specified
    if (role) {
      query += ` WHERE role = $${paramCount}`;
      values.push(role);
      paramCount++;
    }

    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }
  }

  /**
   * Change user password with proper validation
   */
  async changePassword(userId, currentPassword, newPassword) {
    if (!userId || !currentPassword || !newPassword) {
      throw new Error('User ID, current password, and new password required');
    }

    // Check password strength
    const strengthCheck = passwordService.checkPasswordStrength(newPassword);
    if (strengthCheck.strength === 'weak') {
      throw new Error(`New password is too weak: ${strengthCheck.message}`);
    }

    try {
      // Get current password hash
      const result = await this.db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const { password_hash } = result.rows[0];

      // Verify current password
      const isValidCurrentPassword = await passwordService.verifyPassword(currentPassword, password_hash);
      if (!isValidCurrentPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await passwordService.hashPassword(newPassword);

      // Update password
      await this.db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      throw new Error(`Password change failed: ${error.message}`);
    }
  }

  /**
   * Reset user password (admin function)
   */
  async resetPassword(userId, newPassword) {
    if (!userId || !newPassword) {
      throw new Error('User ID and new password required');
    }

    // Check password strength
    const strengthCheck = passwordService.checkPasswordStrength(newPassword);
    if (strengthCheck.strength === 'weak') {
      throw new Error(`Password is too weak: ${strengthCheck.message}`);
    }

    try {
      // Hash new password
      const newPasswordHash = await passwordService.hashPassword(newPassword);

      // Update password
      const result = await this.db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email',
        [newPasswordHash, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  /**
   * Search users with parameterized query
   */
  async searchUsers(searchTerm, role = null) {
    if (!searchTerm) {
      throw new Error('Search term required');
    }

    let query = `
      SELECT id, username, email, role, created_at, updated_at 
      FROM users 
      WHERE (username ILIKE $1 OR email ILIKE $1)
    `;
    const values = [`%${searchTerm}%`];
    let paramCount = 2;

    // Add role filter if specified
    if (role) {
      query += ` AND role = $${paramCount}`;
      values.push(role);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`User search failed: ${error.message}`);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'resident' THEN 1 END) as residents,
          COUNT(CASE WHEN role = 'guard' THEN 1 END) as guards,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d
        FROM users
      `);

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to get user statistics: ${error.message}`);
    }
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Request password reset - Generate token and store in database
   */
  async requestPasswordReset(email) {
    if (!email) {
      throw new Error('Email is required');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    try {
      // Check if user exists
      const userCheck = await this.db.query(
        'SELECT id, username, email, verified FROM users WHERE email = $1',
        [email]
      );

      // Always return success to prevent email enumeration attacks
      if (userCheck.rows.length === 0) {
        console.log(`Password reset requested for non-existent email: ${email}`);
        return {
          success: true,
          message: 'If this email exists, a password reset link has been sent.'
        };
      }

      const user = userCheck.rows[0];

      // Generate reset token and expiration (1 hour from now)
      const resetToken = this.generatePasswordResetToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token in database
      await this.db.query(
        `UPDATE users 
         SET password_reset_token = $1, 
             password_reset_expires = $2, 
             password_reset_used_at = NULL,
             updated_at = NOW() 
         WHERE id = $3`,
        [resetToken, resetExpires, user.id]
      );

      console.log(`Password reset token generated for user: ${user.email}`);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        resetToken: resetToken,
        expiresAt: resetExpires
      };
    } catch (error) {
      throw new Error(`Password reset request failed: ${error.message}`);
    }
  }

  /**
   * Verify password reset token
   */
  async verifyResetToken(token) {
    if (!token) {
      throw new Error('Reset token is required');
    }

    try {
      const result = await this.db.query(
        `SELECT id, username, email, password_reset_expires, password_reset_used_at 
         FROM users 
         WHERE password_reset_token = $1`,
        [token]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid reset token');
      }

      const user = result.rows[0];

      // Check if token has been used
      if (user.password_reset_used_at) {
        throw new Error('Reset token has already been used');
      }

      // Check if token has expired
      const now = new Date();
      if (new Date(user.password_reset_expires) < now) {
        throw new Error('Reset token has expired');
      }

      return {
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      };
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Reset password using valid token
   */
  async resetPasswordWithToken(token, newPassword) {
    if (!token || !newPassword) {
      throw new Error('Reset token and new password are required');
    }

    // Check password strength
    const strengthCheck = passwordService.checkPasswordStrength(newPassword);
    if (strengthCheck.strength === 'weak') {
      throw new Error(`Password is too weak: ${strengthCheck.message}`);
    }

    try {
      // First verify the token is valid
      const tokenVerification = await this.verifyResetToken(token);
      
      if (!tokenVerification.valid) {
        throw new Error('Invalid or expired reset token');
      }

      const userId = tokenVerification.user.id;

      // Hash the new password
      const newPasswordHash = await passwordService.hashPassword(newPassword);

      // Update password and mark token as used
      const result = await this.db.query(
        `UPDATE users 
         SET password_hash = $1, 
             password_reset_used_at = NOW(),
             updated_at = NOW()
         WHERE id = $2 
         RETURNING id, username, email`,
        [newPasswordHash, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Failed to update password');
      }

      const user = result.rows[0];
      console.log(`Password successfully reset for user: ${user.email}`);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      };
    } catch (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  /**
   * Clean up expired password reset tokens (maintenance function)
   */
  async cleanupExpiredResetTokens() {
    try {
      const result = await this.db.query(
        `UPDATE users 
         SET password_reset_token = NULL, 
             password_reset_expires = NULL,
             updated_at = NOW()
         WHERE password_reset_expires < NOW() 
         AND password_reset_token IS NOT NULL
         RETURNING COUNT(*) as cleaned_count`
      );

      const cleanedCount = result.rows[0]?.cleaned_count || 0;
      console.log(`Cleaned up ${cleanedCount} expired password reset tokens`);

      return { cleanedCount };
    } catch (error) {
      throw new Error(`Token cleanup failed: ${error.message}`);
    }
  }

}

// Export singleton instance
export const userService = new UserService();
