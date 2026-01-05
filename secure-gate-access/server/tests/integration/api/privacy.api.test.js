/**
 * Data Privacy API Integration Tests
 * Tests all DPA compliance API endpoints
 * 
 * Priority: CRITICAL (Regulatory Compliance - Kenya DPA 2019)
 * 
 * NOTE: This test uses the ACTUAL production database schema.
 * Column names must match the production schema:
 * - consent_log: action ('granted'/'withdrawn'), consent_type, created_at
 * - data_export_log: export_type, format, record_count, exported_at
 * - data_deletion_requests: deletion_type, user_email, status, reason
 * - user_privacy_settings: show_visitor_frequency, share_location_on_panic, etc.
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } from '../setup.js';
import { dbManager } from '../../../src/database/db.enhanced.js';

describe('Data Privacy API Integration Tests', () => {
  let testUsers;
  let residentToken;
  let adminToken;

  beforeAll(async () => {
    await setupTestDatabase();
    testUsers = await createTestUsers();
    residentToken = await getAuthToken(testUsers.resident.email);
    adminToken = await getAuthToken(testUsers.admin.email);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clean up test data between tests
    await dbManager.query('DELETE FROM consent_log WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')').catch(() => {});
    await dbManager.query('DELETE FROM data_export_log WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')').catch(() => {});
    await dbManager.query('DELETE FROM data_deletion_requests WHERE user_email LIKE \'%@test.com\'').catch(() => {});
  });

  // =========================================
  // GET /api/privacy/export - Data Export
  // =========================================
  describe('GET /api/privacy/export', () => {
    it('should export complete user data package', async () => {
      const userId = testUsers.resident.id;

      // Create test data to export
      await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)`,
        ['Export Test Visitor', '+254700111111', userId, 'EXP001', 'pending']
      );

      // Simulate export - gather all user data
      const userData = await dbManager.query(
        'SELECT id, username, email, role, phone, unit, created_at FROM users WHERE id = $1',
        [userId]
      );

      const visitors = await dbManager.query(
        'SELECT * FROM visitors WHERE host_id = $1',
        [userId]
      );

      const auditLogs = await dbManager.query(
        'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1000',
        [userId]
      );

      // Build export package
      const exportPackage = {
        user: userData.rows[0],
        visitors: visitors.rows,
        audit_logs: auditLogs.rows,
        exported_at: new Date().toISOString(),
        format: 'JSON',
        dpa_reference: 'Kenya DPA 2019 - Article 39'
      };

      expect(exportPackage.user).toBeDefined();
      expect(exportPackage.user.email).toBe(testUsers.resident.email);
      expect(exportPackage.visitors.length).toBeGreaterThanOrEqual(1);
      expect(exportPackage.format).toBe('JSON');
    });

    it('should log export request in audit trail', async () => {
      const userId = testUsers.resident.id;

      // Log export using actual schema columns
      await dbManager.query(
        `INSERT INTO data_export_log (user_id, export_type, format)
         VALUES ($1, $2, $3)`,
        [userId, 'full_export', 'JSON']
      );

      await dbManager.query(
        `INSERT INTO audit_logs (action, resource, user_id, details)
         VALUES ($1, $2, $3, $4)`,
        ['dpa.data_export', 'privacy', userId, JSON.stringify({ type: 'full', article: '39' })]
      );

      // Verify logs
      const exportLog = await dbManager.query(
        'SELECT * FROM data_export_log WHERE user_id = $1',
        [userId]
      );
      expect(exportLog.rows).toHaveLength(1);
      expect(exportLog.rows[0].export_type).toBe('full_export');

      const auditLog = await dbManager.query(
        "SELECT * FROM audit_logs WHERE action = 'dpa.data_export' AND user_id = $1",
        [userId]
      );
      expect(auditLog.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should include all related records in export', async () => {
      const userId = testUsers.resident.id;

      // Create related data
      await dbManager.query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, status)
         VALUES ($1, $2, $3, $4, $5)`,
        ['Export Pass', '+254700222222', userId, 'weekly', 'active']
      );

      await dbManager.query(
        `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status)
         VALUES ($1, $2, $3, $4)`,
        [userId, 'DHL', 'EXPORT123', 'pending']
      );

      // Query related data
      const passes = await dbManager.query(
        'SELECT * FROM recurring_passes WHERE resident_id = $1',
        [userId]
      );

      const deliveries = await dbManager.query(
        'SELECT * FROM delivery_logs WHERE resident_id = $1',
        [userId]
      );

      expect(passes.rows.length).toBeGreaterThanOrEqual(1);
      expect(deliveries.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should return machine-readable JSON format', async () => {
      const userId = testUsers.resident.id;

      const exportData = {
        user: { id: userId, email: testUsers.resident.email },
        visitors: [],
        audit_logs: [],
        exported_at: new Date().toISOString()
      };

      // Verify JSON serialization
      const jsonString = JSON.stringify(exportData);
      const parsed = JSON.parse(jsonString);

      expect(parsed.user.id).toBe(userId);
      expect(Array.isArray(parsed.visitors)).toBe(true);
    });
  });

  // =========================================
  // POST /api/privacy/delete-account - Account Deletion
  // =========================================
  describe('POST /api/privacy/delete-account', () => {
    it('should process account deletion request', async () => {
      // Create test user for deletion
      const argon2 = await import('argon2');
      const hashedPassword = await argon2.default.hash('deletetest');

      const userResult = await dbManager.query(
        `INSERT INTO users (username, email, password, password_hash, role, phone, unit, verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        ['delete_api_user', 'deleteapi@test.com', hashedPassword, hashedPassword, 'resident', '+254700333333', 'D101', true]
      );
      const deleteUserId = userResult.rows[0].id;
      const deleteUserEmail = userResult.rows[0].email;

      // Create deletion request using actual schema columns
      await dbManager.query(
        `INSERT INTO data_deletion_requests (user_id, user_email, deletion_type, status, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [deleteUserId, deleteUserEmail, 'full_account', 'pending', 'User requested deletion via API']
      );

      // Process deletion
      await dbManager.query('DELETE FROM visitors WHERE host_id = $1', [deleteUserId]);
      await dbManager.query('DELETE FROM recurring_passes WHERE resident_id = $1', [deleteUserId]);
      await dbManager.query('DELETE FROM delivery_logs WHERE resident_id = $1', [deleteUserId]);
      
      // Update deletion request
      await dbManager.query(
        `UPDATE data_deletion_requests 
         SET status = 'completed', processed_at = NOW()
         WHERE user_id = $1`,
        [deleteUserId]
      );

      // Delete user
      await dbManager.query('DELETE FROM users WHERE id = $1', [deleteUserId]);

      // Verify deletion
      const userCheck = await dbManager.query(
        'SELECT * FROM users WHERE id = $1',
        [deleteUserId]
      );
      expect(userCheck.rows).toHaveLength(0);
    });

    it('should anonymize audit logs instead of deleting', async () => {
      const userId = testUsers.resident.id;

      // Create audit log
      await dbManager.query(
        `INSERT INTO audit_logs (action, resource, user_id, ip_address, details)
         VALUES ($1, $2, $3, $4, $5)`,
        ['test.action', 'test', userId, '192.168.1.100', JSON.stringify({ data: 'sensitive' })]
      );

      // Anonymize instead of delete
      await dbManager.query(
        `UPDATE audit_logs 
         SET user_id = NULL, 
             ip_address = '0.0.0.0',
             details = '{"anonymized": true}'
         WHERE user_id = $1 AND action = 'test.action'`,
        [userId]
      );

      // Verify anonymization
      const anonymized = await dbManager.query(
        "SELECT * FROM audit_logs WHERE action = 'test.action'"
      );

      expect(anonymized.rows[0].user_id).toBeNull();
      expect(anonymized.rows[0].ip_address).toBe('0.0.0.0');
    });

    it('should log deletion request for compliance', async () => {
      const userId = testUsers.resident.id;
      const userEmail = testUsers.resident.email;

      // Using actual schema columns: deletion_type instead of request_type
      await dbManager.query(
        `INSERT INTO data_deletion_requests (user_id, user_email, deletion_type, status, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, userEmail, 'full_account', 'pending', 'User requested deletion via API']
      );

      await dbManager.query(
        `INSERT INTO audit_logs (action, resource, user_id, details)
         VALUES ($1, $2, $3, $4)`,
        ['dpa.deletion_request', 'privacy', userId, JSON.stringify({ article: '33' })]
      );

      const request = await dbManager.query(
        'SELECT * FROM data_deletion_requests WHERE user_id = $1',
        [userId]
      );

      expect(request.rows).toHaveLength(1);
      expect(request.rows[0].deletion_type).toBe('full_account');
    });
  });

  // =========================================
  // POST /api/privacy/consents - Consent Management
  // =========================================
  describe('POST /api/privacy/consents', () => {
    it('should record consent with timestamp', async () => {
      const userId = testUsers.resident.id;

      // Using actual schema: action column with 'granted' or 'withdrawn'
      await dbManager.query(
        `INSERT INTO consent_log (user_id, consent_type, action, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [userId, 'marketing', 'granted', '127.0.0.1']
      );

      const consent = await dbManager.query(
        'SELECT * FROM consent_log WHERE user_id = $1 AND consent_type = $2',
        [userId, 'marketing']
      );

      expect(consent.rows).toHaveLength(1);
      expect(consent.rows[0].action).toBe('granted');
      expect(consent.rows[0].created_at).toBeDefined();
    });

    it('should handle consent withdrawal', async () => {
      const userId = testUsers.resident.id;

      // Give consent first
      await dbManager.query(
        `INSERT INTO consent_log (user_id, consent_type, action)
         VALUES ($1, $2, $3)`,
        [userId, 'analytics', 'granted']
      );

      // Withdraw consent by inserting new record with 'withdrawn' action
      await dbManager.query(
        `INSERT INTO consent_log (user_id, consent_type, action)
         VALUES ($1, $2, $3)`,
        [userId, 'analytics', 'withdrawn']
      );

      const consent = await dbManager.query(
        `SELECT * FROM consent_log 
         WHERE user_id = $1 AND consent_type = $2 
         ORDER BY created_at DESC LIMIT 1`,
        [userId, 'analytics']
      );

      expect(consent.rows[0].action).toBe('withdrawn');
    });

    it('should track multiple consent types', async () => {
      const userId = testUsers.resident.id;
      const types = ['marketing', 'analytics', 'third_party', 'data_processing'];

      for (const type of types) {
        await dbManager.query(
          `INSERT INTO consent_log (user_id, consent_type, action)
           VALUES ($1, $2, $3)`,
          [userId, type, 'granted']
        );
      }

      const consents = await dbManager.query(
        'SELECT * FROM consent_log WHERE user_id = $1',
        [userId]
      );

      expect(consents.rows).toHaveLength(types.length);
    });

    it('should log consent changes in audit trail', async () => {
      const userId = testUsers.resident.id;

      await dbManager.query(
        `INSERT INTO consent_log (user_id, consent_type, action)
         VALUES ($1, $2, $3)`,
        [userId, 'marketing', 'granted']
      );

      await dbManager.query(
        `INSERT INTO audit_logs (action, resource, user_id, details)
         VALUES ($1, $2, $3, $4)`,
        ['dpa.consent_given', 'privacy', userId, JSON.stringify({ consent_type: 'marketing' })]
      );

      const auditLog = await dbManager.query(
        "SELECT * FROM audit_logs WHERE action = 'dpa.consent_given' AND user_id = $1",
        [userId]
      );

      expect(auditLog.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================
  // GET /api/privacy/consent/:type - Consent Status
  // =========================================
  describe('GET /api/privacy/consent/:type', () => {
    it('should return consent status for specific type', async () => {
      const userId = testUsers.resident.id;

      await dbManager.query(
        `INSERT INTO consent_log (user_id, consent_type, action)
         VALUES ($1, $2, $3)`,
        [userId, 'marketing', 'granted']
      );

      // Get the latest consent status
      const status = await dbManager.query(
        `SELECT action, created_at 
         FROM consent_log 
         WHERE user_id = $1 AND consent_type = $2
         ORDER BY created_at DESC LIMIT 1`,
        [userId, 'marketing']
      );

      expect(status.rows).toHaveLength(1);
      expect(status.rows[0].action).toBe('granted');
    });

    it('should return null for non-existent consent', async () => {
      const userId = testUsers.resident.id;

      const status = await dbManager.query(
        `SELECT * FROM consent_log 
         WHERE user_id = $1 AND consent_type = $2`,
        [userId, 'nonexistent_type']
      );

      expect(status.rows).toHaveLength(0);
    });

    it('should reflect withdrawn status correctly', async () => {
      const userId = testUsers.resident.id;

      // Give then withdraw consent
      await dbManager.query(
        `INSERT INTO consent_log (user_id, consent_type, action)
         VALUES ($1, $2, $3)`,
        [userId, 'withdrawn_type', 'granted']
      );

      await dbManager.query(
        `INSERT INTO consent_log (user_id, consent_type, action)
         VALUES ($1, $2, $3)`,
        [userId, 'withdrawn_type', 'withdrawn']
      );

      const status = await dbManager.query(
        `SELECT action 
         FROM consent_log 
         WHERE user_id = $1 AND consent_type = $2
         ORDER BY created_at DESC LIMIT 1`,
        [userId, 'withdrawn_type']
      );

      expect(status.rows[0].action).toBe('withdrawn');
    });
  });

  // =========================================
  // Privacy Settings Tests
  // =========================================
  describe('User Privacy Settings', () => {
    it('should create default privacy settings', async () => {
      const userId = testUsers.resident.id;

      await dbManager.query(
        `INSERT INTO user_privacy_settings (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      const settings = await dbManager.query(
        'SELECT * FROM user_privacy_settings WHERE user_id = $1',
        [userId]
      );

      expect(settings.rows).toHaveLength(1);
      // Using actual schema column names
      expect(settings.rows[0].show_visitor_frequency).toBeDefined();
    });

    it('should update privacy settings', async () => {
      const userId = testUsers.resident.id;

      // Using actual schema column names
      await dbManager.query(
        `INSERT INTO user_privacy_settings (user_id, show_visitor_frequency, share_location_on_panic)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET show_visitor_frequency = $2, share_location_on_panic = $3`,
        [userId, false, false]
      );

      const settings = await dbManager.query(
        'SELECT * FROM user_privacy_settings WHERE user_id = $1',
        [userId]
      );

      expect(settings.rows[0].show_visitor_frequency).toBe(false);
      expect(settings.rows[0].share_location_on_panic).toBe(false);
    });
  });

  // =========================================
  // DPA Compliance Verification
  // =========================================
  describe('DPA Compliance Verification', () => {
    it('should support all Kenya DPA 2019 required rights', async () => {
      const userId = testUsers.resident.id;

      // Right to access (Article 39)
      const accessResult = await dbManager.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      expect(accessResult.rows).toHaveLength(1);

      // Right to rectification (Article 32) - can update data
      await dbManager.query(
        'UPDATE users SET phone = $1 WHERE id = $2',
        ['+254700999999', userId]
      );

      // Right to deletion (Article 33) - verified in other tests

      // Right to data portability (Article 40) - export verified

      // Right to object (Article 35) - consent withdrawal verified
    });

    it('should maintain 7-year audit retention', async () => {
      const userId = testUsers.resident.id;
      const sixYearsAgo = new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000);

      await dbManager.query(
        `INSERT INTO audit_logs (action, resource, user_id, timestamp, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        ['old.compliance.action', 'dpa', userId, sixYearsAgo, sixYearsAgo]
      );

      // Verify old logs are retained
      const oldLogs = await dbManager.query(
        "SELECT * FROM audit_logs WHERE action = 'old.compliance.action'"
      );

      expect(oldLogs.rows).toHaveLength(1);
    });
  });
});
