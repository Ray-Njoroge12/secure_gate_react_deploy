/**
 * Consent Factory for Integration Testing
 * Generates test consent records for DPA compliance testing
 */

import { dbManager } from '../../src/database/db.enhanced.js';

/**
 * Consent Factory - Creates consent records for testing
 */
export const consentFactory = {
  /**
   * Build consent data without persisting
   */
  build: (overrides = {}) => {
    return {
      user_id: overrides.user_id || null,
      consent_type: overrides.consent_type || 'marketing',
      consent_given: overrides.consent_given !== false,
      consent_withdrawn: overrides.consent_withdrawn || false,
      recorded_at: overrides.recorded_at || new Date().toISOString(),
      withdrawn_at: overrides.withdrawn_at || null,
      ip_address: overrides.ip_address || '127.0.0.1',
      user_agent: overrides.user_agent || 'Test-Agent/1.0',
      ...overrides
    };
  },

  /**
   * Create and persist consent to database
   */
  create: async (overrides = {}) => {
    const consentData = consentFactory.build(overrides);

    // Try to insert into consent_log table (may not exist in all setups)
    try {
      const result = await dbManager.query(
        `INSERT INTO consent_log (user_id, consent_type, consent_given, recorded_at, ip_address)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          consentData.user_id,
          consentData.consent_type,
          consentData.consent_given,
          consentData.recorded_at,
          consentData.ip_address
        ]
      );
      return result.rows[0];
    } catch (error) {
      // If consent_log table doesn't exist, update users table directly
      if (error.message.includes('does not exist')) {
        await dbManager.query(
          `UPDATE users SET consent_given = $1, consent_timestamp = $2, consent_type = $3
           WHERE id = $4`,
          [consentData.consent_given, consentData.recorded_at, consentData.consent_type, consentData.user_id]
        );
        return consentData;
      }
      throw error;
    }
  },

  /**
   * Create marketing consent
   */
  createMarketing: async (userId, given = true) => {
    return consentFactory.create({
      user_id: userId,
      consent_type: 'marketing',
      consent_given: given
    });
  },

  /**
   * Create analytics consent
   */
  createAnalytics: async (userId, given = true) => {
    return consentFactory.create({
      user_id: userId,
      consent_type: 'analytics',
      consent_given: given
    });
  },

  /**
   * Create data processing consent
   */
  createDataProcessing: async (userId, given = true) => {
    return consentFactory.create({
      user_id: userId,
      consent_type: 'data_processing',
      consent_given: given
    });
  },

  /**
   * Create all consent types for a user
   */
  createAllTypes: async (userId, allGiven = true) => {
    const types = ['marketing', 'analytics', 'data_processing', 'third_party_sharing'];
    const consents = [];
    
    for (const type of types) {
      const consent = await consentFactory.create({
        user_id: userId,
        consent_type: type,
        consent_given: allGiven
      });
      consents.push(consent);
    }
    
    return consents;
  },

  /**
   * Withdraw consent
   */
  withdraw: async (userId, consentType) => {
    try {
      const result = await dbManager.query(
        `UPDATE consent_log 
         SET consent_withdrawn = true, withdrawn_at = NOW()
         WHERE user_id = $1 AND consent_type = $2
         RETURNING *`,
        [userId, consentType]
      );
      return result.rows[0];
    } catch (error) {
      // Fallback for users table
      await dbManager.query(
        `UPDATE users SET consent_withdrawn = true, consent_withdrawn_at = NOW()
         WHERE id = $1`,
        [userId]
      );
      return { user_id: userId, consent_type: consentType, consent_withdrawn: true };
    }
  },

  /**
   * Get consent status
   */
  getStatus: async (userId, consentType = null) => {
    try {
      const query = consentType
        ? `SELECT * FROM consent_log WHERE user_id = $1 AND consent_type = $2 ORDER BY recorded_at DESC LIMIT 1`
        : `SELECT * FROM consent_log WHERE user_id = $1 ORDER BY recorded_at DESC`;
      
      const params = consentType ? [userId, consentType] : [userId];
      const result = await dbManager.query(query, params);
      return result.rows;
    } catch (error) {
      // Fallback
      const result = await dbManager.query(
        `SELECT consent_given, consent_type, consent_timestamp FROM users WHERE id = $1`,
        [userId]
      );
      return result.rows;
    }
  },

  /**
   * Clean up test consents
   */
  cleanup: async () => {
    try {
      await dbManager.query("DELETE FROM consent_log WHERE ip_address = '127.0.0.1'");
    } catch (error) {
      // Table may not exist
    }
  }
};

export default consentFactory;
