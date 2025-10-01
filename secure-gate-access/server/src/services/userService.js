import { passwordService, accountSecurity } from './tokenService.js';
import { db } from '../database/db.enhanced.js';

/**
 * User Service with SQL Injection Protection
 * Implements secure user management with parameterized queries
 */

class UserService {
  constructor() {
    this.db = db;
  }

  /**
   * Create a new user with proper input validation and SQL injection protection
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
        throw new Error('Username or email already exists');
      }

      // Hash password securely
      const hashedPassword = await passwordService.hashPassword(password);

      // Create user with parameterized query
      const result = await this.db.query(
        `INSERT INTO users (username, email, password_hash, role, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, NOW(), NOW()) 
         RETURNING id, username, email, role, created_at`,
        [username, email, hashedPassword, role]
      );

      const user = result.rows[0];
      
      // Remove password hash from response
      delete user.password_hash;

      return user;
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique violation
        throw new Error('Username or email already exists');
      }
      throw new Error(`User creation failed: ${error.message}`);
    }
  }

  /**
   * Authenticate user with proper SQL injection protection
   */
  async authenticateUser(username, password) {
    if (!username || !password) {
      throw new Error('Username and password required');
    }

    // Check if account is locked
    const lockoutInfo = accountSecurity.getLockoutInfo(username);
    if (lockoutInfo && lockoutInfo.isLocked) {
      throw new Error(`Account is locked until ${lockoutInfo.lockedUntil}`);
    }

    try {
      // Get user by username using parameterized query
      const result = await this.db.query(
        'SELECT id, username, email, password_hash, role, created_at FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        // Record failed attempt even for non-existent users (security)
        accountSecurity.recordFailedAttempt(username, 'unknown');
        throw new Error('Invalid credentials');
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await passwordService.verifyPassword(password, user.password_hash);
      
      if (!isValidPassword) {
        // Record failed attempt
        accountSecurity.recordFailedAttempt(username, 'unknown');
        throw new Error('Invalid credentials');
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
}

// Export singleton instance
export const userService = new UserService();
