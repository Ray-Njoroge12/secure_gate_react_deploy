/**
 * User Factory for Integration Testing
 * Generates test users with all variants and relationships
 */

import bcrypt from 'bcryptjs';
import { dbManager } from '../../src/database/db.enhanced.js';

const DEFAULT_PASSWORD = 'TestPass123!';

/**
 * Generate a unique identifier for test data
 */
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * User Factory - Creates users with various configurations
 */
export const userFactory = {
  /**
   * Build user data without persisting
   */
  build: (overrides = {}) => {
    const id = generateId();
    return {
      username: overrides.username || `user_${id}`,
      email: overrides.email || `user_${id}@test.com`,
      password: overrides.password || DEFAULT_PASSWORD,
      role: overrides.role || 'resident',
      phone: overrides.phone || `+2547${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      unit: overrides.unit || `Unit-${Math.floor(Math.random() * 100)}`,
      mfa_enabled: overrides.mfa_enabled || false,
      mfa_secret: overrides.mfa_secret || null,
      email_verified: overrides.email_verified !== false,
      is_active: overrides.is_active !== false,
      estate_id: overrides.estate_id ?? 1,
      ...overrides
    };
  },

  /**
   * Create and persist user to database
   */
  create: async (overrides = {}) => {
    const userData = userFactory.build(overrides);
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const result = await dbManager.query(
      `INSERT INTO users (username, email, password, password_hash, role, phone, unit, mfa_enabled, mfa_secret, verified, estate_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        userData.username,
        userData.email,
        hashedPassword,
        hashedPassword,
        userData.role,
        userData.phone,
        userData.unit,
        userData.mfa_enabled,
        userData.mfa_secret,
        true,
        userData.estate_id ?? 1
      ]
    );

    return { ...result.rows[0], plainPassword: userData.password };
  },

  /**
   * Create admin user
   */
  createAdmin: async (overrides = {}) => {
    return userFactory.create({ role: 'admin', ...overrides });
  },

  /**
   * Create guard user
   */
  createGuard: async (overrides = {}) => {
    return userFactory.create({ role: 'guard', unit: 'Gate 1', ...overrides });
  },

  /**
   * Create resident user
   */
  createResident: async (overrides = {}) => {
    return userFactory.create({ role: 'resident', ...overrides });
  },

  /**
   * Create suspended user
   */
  createSuspended: async (overrides = {}) => {
    return userFactory.create({ is_active: false, ...overrides });
  },

  /**
   * Create user with MFA enabled
   */
  createWithMFA: async (overrides = {}) => {
    return userFactory.create({ 
      mfa_enabled: true, 
      mfa_secret: 'JBSWY3DPEHPK3PXP', // Test secret
      ...overrides 
    });
  },

  /**
   * Create multiple users
   */
  createMany: async (count, overrides = {}) => {
    const users = [];
    for (let i = 0; i < count; i++) {
      const user = await userFactory.create({
        ...overrides,
        username: `${overrides.username || 'user'}_${i}_${generateId()}`,
        email: `${overrides.email || 'user'}_${i}_${generateId()}@test.com`
      });
      users.push(user);
    }
    return users;
  },

  /**
   * Create user with visitors
   */
  createWithVisitors: async (visitorCount = 3, userOverrides = {}) => {
    const { visitorFactory } = await import('./visitorFactory.js');
    const user = await userFactory.createResident(userOverrides);
    const visitors = await visitorFactory.createMany(visitorCount, { host_id: user.id });
    return { user, visitors };
  },

  /**
   * Create user with consent records
   */
  createWithConsent: async (consentTypes = ['marketing', 'analytics'], userOverrides = {}) => {
    const user = await userFactory.createResident(userOverrides);
    
    for (const consentType of consentTypes) {
      await dbManager.query(
        `INSERT INTO consent_log (user_id, consent_type, consent_given, recorded_at)
         VALUES ($1, $2, true, NOW())
         ON CONFLICT DO NOTHING`,
        [user.id, consentType]
      ).catch(() => {});
    }
    
    return user;
  },

  /**
   * Delete user by ID
   */
  delete: async (userId) => {
    await dbManager.query('DELETE FROM users WHERE id = $1', [userId]);
  },

  /**
   * Clean up all test users
   */
  cleanup: async () => {
    await dbManager.query("DELETE FROM users WHERE email LIKE '%@test.com'");
  }
};

export default userFactory;
