import { passwordService, accountSecurity } from './tokenService.js';
import { db } from '../database/db.enhanced.js';
import { AppError } from '../middleware/standardizedErrorHandler.js';
import loggingService from './loggingService.js';
import * as crypto from 'crypto';

/**
 * User Service with SQL Injection Protection
 * Implements secure user management with parameterized queries
 */

class UserService {
  constructor() {
    this.db = db;
  }

  redactEmail(email) {
    if (!email || typeof email !== 'string') {
      return 'redacted';
    }
    const [localPart, domain] = email.split('@');
    if (!domain) {
      return 'redacted';
    }
    const firstChar = localPart ? localPart[0] : '';
    return `${firstChar || 'redacted'}***@${domain}`;
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
  async createUser(userData, client = null) {
    const {
      username,
      email,
      password,
      role,
      estate_id,
      estateId,
      account_status,
      accountStatus,
      first_name,
      lastName,
      last_name,
      phone,
      unit_number
    } = userData;
    const db = client || this.db;

    // Resolve ambiguous fields (support both camelCase and snake_case)
    const finalEstateId = estate_id !== undefined ? estate_id : estateId;
    const finalAccountStatus = account_status || accountStatus || 'pending';

    // Support optional email/names for guards
    let finalEmail = email;
    if (!finalEmail && role === 'guard') {
      finalEmail = `${username}@guards.local`;
    }

    const firstName = first_name || userData.first_name || (role === 'guard' ? 'Guard' : '');
    const lastNameVal = last_name || lastName || userData.last_name || (role === 'guard' ? 'User' : '');

    // Input validation
    if (!username || !finalEmail || !password || !role) {
      throw new Error('Missing required fields');
    }

    // Validate email format if provided (or if generated)
    if (finalEmail && !finalEmail.endsWith('@guards.local')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(finalEmail)) {
        throw new Error('Invalid email format');
      }
    }

    // Validate role
    const validRoles = ['resident', 'guard', 'admin', 'super_admin'];
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
      // We check globally because email and username must be unique across the platform
      const existingUser = await db.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, finalEmail]
      );

      if (existingUser.rows.length > 0) {
        throw new AppError('Username or email already exists', 409, 'DUPLICATE_ENTRY');
      }

      // Hash password securely
      const hashedPassword = await passwordService.hashPassword(password);

      // Generate email verification token
      const verificationToken = this.generateEmailVerificationToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user with email verification fields and account_status

      // Create user with email verification fields and account_status
      const result = await db.query(
        `INSERT INTO users (
          username, 
          first_name, 
          last_name, 
          email, 
          password, 
          password_hash, 
          role, 
          estate_id, 
          account_status, 
          phone,
          unit_number,
          verification_token, 
          verification_expires, 
          created_at, 
          updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()) 
        RETURNING id, username, first_name, last_name, email, role, estate_id, account_status, phone, unit_number, created_at`,
        [
          username,
          firstName,
          lastNameVal,
          finalEmail,
          hashedPassword,
          hashedPassword,
          role,
          finalEstateId,
          finalAccountStatus,
          phone || null,
          unit_number || null,
          verificationToken,
          verificationExpires
        ]
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
      // Uses column names matching render_init.sql schema
      const result = await this.db.query(
        `SELECT id, username, email, verification_expires 
         FROM users 
         WHERE verification_token = $1 AND verified = false`,
        [token]
      );

      if (result.rows.length === 0) {
        throw new AppError('Invalid or already used verification token', 400, 'INVALID_TOKEN');
      }

      const user = result.rows[0];

      // Check if token has expired
      if (new Date() > new Date(user.verification_expires)) {
        throw new AppError('Verification token has expired', 400, 'TOKEN_EXPIRED');
      }

      // Mark email as verified - uses verified column instead of email_verified_at
      await this.db.query(
        `UPDATE users 
         SET verified = true, verification_token = NULL, verification_expires = NULL, updated_at = NOW()
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
      // Uses column names matching render_init.sql schema
      const userResult = await this.db.query(
        `SELECT id, username, email 
         FROM users 
         WHERE email = $1 AND verified = false`,
        [email]
      );

      if (userResult.rows.length === 0) {
        throw new AppError('User not found or email already verified', 400, 'USER_NOT_FOUND');
      }

      const user = userResult.rows[0];

      // Generate new verification token
      const verificationToken = this.generateEmailVerificationToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new token - uses column names matching render_init.sql schema
      await this.db.query(
        `UPDATE users 
         SET verification_token = $1, verification_expires = $2, updated_at = NOW()
         WHERE id = $3`,
        [verificationToken, verificationExpires, user.id]
      );

      return {
        ...user,
        verification_token: verificationToken
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
  async authenticateUser(username, password, estateId = null) {
    if (!username || !password) {
      throw new Error('Username and password required');
    }

    // Check if account is locked
    const lockoutInfo = accountSecurity.getLockoutInfo(username);
    if (lockoutInfo && lockoutInfo.isLocked) {
      throw new Error(`Account is locked until ${lockoutInfo.lockedUntil}`);
    }

    try {
      // Get user by username OR email using parameterized query, including email verification status.
      // Uses column names matching render_init.sql schema: verified instead of email_verified_at.
      // Keep login tolerant of partial MFA schema rollout: this path only needs mfa_enabled.
      const result = await this.db.query(
        `SELECT id, username, first_name, last_name, email, password_hash, role, estate_id, 
                created_at, verified, mfa_enabled
         FROM users
         WHERE (username = $1 OR email = $1)
           AND estate_id IS NOT DISTINCT FROM COALESCE($2, estate_id)`,
        [username, estateId]
      );

      if (result.rows.length === 0) {
        // Record failed attempt even for non-existent users (security)
        accountSecurity.recordFailedAttempt(username, 'unknown');
        throw new AppError('Invalid credentials', 401, 'AUTH_INVALID_CREDENTIALS');
      }

      const user = result.rows[0];

      // Verify password
      const isValid = await passwordService.verifyPassword(password, user.password_hash);

      if (!isValid) {
        // Record failed attempt
        accountSecurity.recordFailedAttempt(username, 'unknown');
        throw new AppError('Invalid credentials', 401, 'AUTH_INVALID_CREDENTIALS');
      }

      // Check if email is verified (skip in development if EMAIL_VERIFICATION_REQUIRED=false)
      // Uses verified column (boolean) instead of email_verified_at (timestamp) per render_init.sql schema
      const requireEmailVerification =
        typeof process.env.EMAIL_VERIFICATION_REQUIRED === 'string'
          ? process.env.EMAIL_VERIFICATION_REQUIRED !== 'false'
          : process.env.NODE_ENV === 'production';
      if (requireEmailVerification && !user.verified) {
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
      if (error instanceof AppError) {
        throw error;
      }
      if (error.message?.includes('Invalid credentials')) {
        throw new AppError('Invalid credentials', 401, 'AUTH_INVALID_CREDENTIALS');
      }
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Verify password for an existing user (for sensitive operations)
   */
  async verifyPassword(userId, password) {
    if (!userId || !password) {
      throw new Error('User ID and password required');
    }

    try {
      // Get password hash
      const result = await this.db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const { password_hash } = result.rows[0];

      if (!password_hash) {
        return false;
      }

      // Verify password using passwordService
      if (passwordService && typeof passwordService.verifyPassword === 'function') {
        return await passwordService.verifyPassword(password, password_hash);
      }

      // Fallback if service is somehow missing (should not happen)
      const argon2 = await import('argon2');
      return await argon2.verify(password_hash, password);

    } catch (error) {
      throw new Error(`Password verification failed: ${error.message}`);
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
      // Keep generic user fetches tolerant of partial MFA schema rollout.
      // Dedicated MFA operations read secret/backup columns through mfaService instead.
      const result = await this.db.query(
        `SELECT id, username, first_name, last_name, email, role, estate_id, 
                created_at, updated_at, mfa_enabled 
         FROM users WHERE id = $1`,
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
        'SELECT id, username, email, role, estate_id, created_at, updated_at FROM users WHERE username = $1',
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

    // FIX P1-9: Add phone and account_status for guard/resident management
    const allowedFields = ['username', 'first_name', 'last_name', 'email', 'phone', 'account_status', 'role', 'mfa_enabled', 'mfa_secret', 'backup_codes', 'mfa_methods'];
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
    let query = 'SELECT id, username, email, role, estate_id, created_at, updated_at FROM users';
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
        'SELECT id, username, email, estate_id, verified FROM users WHERE email = $1',
        [email]
      );

      // Always return success to prevent email enumeration attacks
      if (userCheck.rows.length === 0) {
        loggingService.logInfo('Password reset requested for non-existent email', {
          email: this.redactEmail(email)
        });
        return {
          success: true,
          message: 'If this email exists, a password reset link has been sent.'
        };
      }

      const user = userCheck.rows[0];

      // Generate reset token and expiration (1 hour from now)
      const resetToken = this.generatePasswordResetToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store hashed reset token in database (AUTH-011)
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      await this.db.query(
        `UPDATE users 
         SET password_reset_token = $1, 
             password_reset_expires = $2, 
             password_reset_used_at = NULL,
             updated_at = NOW() 
         WHERE id = $3`,
        [resetTokenHash, resetExpires, user.id]
      );

      loggingService.logInfo('Password reset token generated', {
        userId: user.id
      });

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
      const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const result = await this.db.query(
        `SELECT id, username, email, password_reset_expires, password_reset_used_at 
         FROM users 
         WHERE password_reset_token = $1`,
        [resetTokenHash]
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
      loggingService.logInfo('Password successfully reset', {
        userId: user.id
      });

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
      loggingService.logInfo('Expired password reset tokens cleaned', {
        cleanedCount
      });

      return { cleanedCount };
    } catch (error) {
      throw new Error(`Token cleanup failed: ${error.message}`);
    }
  }

  /**
   * Export user data for DPA compliance (Kenya DPA 2019)
   * Provides complete data portability as required by law
   */
  async exportUserData(userId) {
    try {
      // Get user profile
      const userResult = await this.db.query(
        `SELECT id, username, email, role, phone, unit, address, 
                created_at, updated_at, email_verified, last_login
         FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Get visitors created by user
      const visitorsResult = await this.db.query(
        `SELECT id, name, phone, email, purpose, status, invite_code,
                visit_date, check_in_time AS check_in, check_out_time AS check_out, created_at
         FROM visitors WHERE host_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      // Get recurring passes
      const passesResult = await this.db.query(
        `SELECT id, visitor_name, visitor_phone, visitor_email,
                valid_from, valid_until, days_of_week, status, created_at
         FROM recurring_passes WHERE resident_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      // Get delivery logs
      const deliveriesResult = await this.db.query(
        `SELECT id, carrier, tracking_number, recipient_name,
                status, received_at, picked_up_at, created_at
         FROM delivery_logs WHERE recipient_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      // Get audit logs related to user
      const auditLogsResult = await this.db.query(
        `SELECT action, resource, timestamp, ip_address, user_agent, details
         FROM audit_logs WHERE user_id = $1
         ORDER BY timestamp DESC
         LIMIT 1000`,
        [userId]
      );

      // Get access logs related to user
      const accessLogsResult = await this.db.query(
        `SELECT action, log_time, request_id, entity_type, entity_id, outcome, message, metadata
         FROM access_logs WHERE user_id = $1
         ORDER BY log_time DESC
         LIMIT 1000`,
        [userId]
      );

      return {
        profile: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          phone: user.phone,
          unit: user.unit,
          address: user.address,
          emailVerified: user.email_verified,
          accountCreated: user.created_at,
          lastLogin: user.last_login
        },
        visitors: visitorsResult.rows,
        recurringPasses: passesResult.rows,
        deliveries: deliveriesResult.rows,
        accessLogs: accessLogsResult.rows,
        auditLogs: auditLogsResult.rows,
        exportMetadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: userId,
          recordCounts: {
            visitors: visitorsResult.rows.length,
            passes: passesResult.rows.length,
            deliveries: deliveriesResult.rows.length,
            accessLogs: accessLogsResult.rows.length,
            auditLogs: auditLogsResult.rows.length
          }
        }
      };
    } catch (error) {
      throw new Error(`Data export failed: ${error.message}`);
    }
  }

  /**
   * Delete user data for DPA compliance (Right to be Forgotten)
   * Deletes personal data while preserving audit trail integrity
   */
  async deleteUserData(userId) {
    try {
      // Start transaction for data deletion
      await this.db.query('BEGIN');

      // Delete user's visitors (cascade should handle related records)
      await this.db.query(
        `DELETE FROM visitors WHERE host_id = $1`,
        [userId]
      );

      // Delete recurring passes
      await this.db.query(
        `DELETE FROM recurring_passes WHERE resident_id = $1`,
        [userId]
      );

      // Delete delivery logs
      await this.db.query(
        `DELETE FROM delivery_logs WHERE recipient_id = $1`,
        [userId]
      );

      // Delete rideshare entries
      await this.db.query(
        `DELETE FROM rideshare_entries WHERE resident_id = $1`,
        [userId]
      );

      // Anonymize audit logs (preserve for compliance but remove PII)
      await this.db.query(
        `UPDATE audit_logs 
         SET details = jsonb_set(
           COALESCE(details, '{}'::jsonb),
           '{anonymized}',
           'true'
         ),
         user_id = NULL
         WHERE user_id = $1`,
        [userId]
      );

      // Delete user account
      const deleteResult = await this.db.query(
        `DELETE FROM users WHERE id = $1 RETURNING id, email`,
        [userId]
      );

      if (deleteResult.rows.length === 0) {
        throw new Error('User not found');
      }

      await this.db.query('COMMIT');

      await this.db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          null,
          'data_deletion_completed',
          'user_account',
          String(userId),
          JSON.stringify({ email: deleteResult.rows[0].email })
        ]
      );

      loggingService.logInfo('User data deleted', { userId });

      return {
        success: true,
        deletedUserId: userId,
        deletedAt: new Date().toISOString()
      };
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw new Error(`User deletion failed: ${error.message}`);
    }
  }

  /**
   * Anonymize historical records while preserving audit trail
   * Used when user requests data deletion but historical data must be retained
   */
  async anonymizeHistoricalRecords(userId) {
    try {
      // Anonymize visitor records (keep for analytics but remove PII)
      await this.db.query(
        `UPDATE visitors 
         SET name = 'Anonymized User',
             phone = NULL,
             email = NULL,
             purpose = 'Historical Record - User Deleted'
         WHERE host_id = $1 AND status = 'checked_out'`,
        [userId]
      );

      await this.db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          null,
          'data_anonymization_completed',
          'visitor_records',
          String(userId),
          JSON.stringify({ source: 'user_deletion' })
        ]
      );

      loggingService.logInfo('User history anonymized', { userId });

      return { success: true };
    } catch (error) {
      throw new Error(`Anonymization failed: ${error.message}`);
    }
  }

  /**
   * Record user consent for DPA compliance
   */
  async recordConsent(userId, consentType, consentGiven = true) {
    try {
      const result = await this.db.query(
        `UPDATE users 
         SET consent_given = $1,
             consent_timestamp = NOW(),
             consent_type = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING id, consent_given, consent_timestamp`,
        [consentGiven, consentType, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      // Log consent action in audit trail
      await this.db.query(
        `INSERT INTO audit_logs (action, resource, user_id, user_role, request_id, ip_address, details, timestamp, created_at)
         VALUES ($1, $2, $3, 
                 (SELECT role FROM users WHERE id = $3),
                 $4, $5, $6, NOW(), NOW())`,
        [
          consentGiven ? 'consent.given' : 'consent.withdrawn',
          'user_consent',
          userId,
          `consent-${Date.now()}`,
          '127.0.0.1',
          JSON.stringify({ consentType, consentGiven })
        ]
      );

      return {
        success: true,
        consent: {
          userId: result.rows[0].id,
          consentGiven: result.rows[0].consent_given,
          consentTimestamp: result.rows[0].consent_timestamp,
          consentType
        }
      };
    } catch (error) {
      throw new Error(`Consent recording failed: ${error.message}`);
    }
  }

  /**
   * Withdraw user consent for DPA compliance
   */
  async withdrawConsent(userId, consentType) {
    return this.recordConsent(userId, consentType, false);
  }

  /**
   * Get user consent status
   */
  async getConsentStatus(userId) {
    try {
      const result = await this.db.query(
        `SELECT consent_given, consent_timestamp, consent_type
         FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to get consent status: ${error.message}`);
    }
  }

}

// Export singleton instance
export const userService = new UserService();
export default userService;
