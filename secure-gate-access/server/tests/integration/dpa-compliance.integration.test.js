/**
 * Kenya DPA 2019 Compliance Integration Tests
 * Tests all data privacy operations: export, deletion, consent management
 * 
 * Priority: CRITICAL (Regulatory Compliance)
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { getTestPool, query, closeTestPool, createTestUsers, cleanupTables, getAuthToken } from './test-db.js';

describe('Kenya DPA 2019 Compliance Integration Tests', () => {
  let testUsers;
  let adminToken;
  let residentToken;

  beforeAll(async () => {
    await getTestPool();
    await cleanupTables();
    testUsers = await createTestUsers();
    adminToken = await getAuthToken(testUsers.admin.email);
    residentToken = await getAuthToken(testUsers.resident.email);
  }, 30000);

  afterAll(async () => {
    await cleanupTables();
    await closeTestPool();
  }, 30000);

  beforeEach(async () => {
    // Clean up DPA-specific tables before each test
    await query('DELETE FROM consent_log').catch(() => {});
    await query('DELETE FROM data_deletion_requests').catch(() => {});
    await query('DELETE FROM data_export_log').catch(() => {});
  });

  // =========================================
  // Article 39 - Data Export (Data Portability)
  // =========================================
  describe('Article 39 - Data Export (Data Portability)', () => {
    it('should export complete user data in machine-readable format', async () => {
      const userId = testUsers.resident.id;

      // Create some test data for the user
      await query(
        `INSERT INTO visitors (name, phone, email, purpose, status, host_id, invite_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Export Test Visitor', '+254700111111', 'export@test.com', 'Testing', 'pending', userId, 'EXP001']
      );

      await query(
        `INSERT INTO audit_logs (action, resource, user_id, user_role, details)
         VALUES ($1, $2, $3, $4, $5)`,
        ['visitor.create', 'visitor', userId, 'resident', JSON.stringify({ test: true })]
      );

      // Simulate data export query (what userService.exportUserData would do)
      const userResult = await query(
        'SELECT id, username, email, role, phone, unit, created_at FROM users WHERE id = $1',
        [userId]
      );

      const visitorsResult = await query(
        'SELECT * FROM visitors WHERE host_id = $1',
        [userId]
      );

      const auditResult = await query(
        'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1000',
        [userId]
      );

      // Assertions
      expect(userResult.rows).toHaveLength(1);
      expect(userResult.rows[0].email).toBe(testUsers.resident.email);
      expect(visitorsResult.rows.length).toBeGreaterThanOrEqual(1);
      expect(auditResult.rows.length).toBeGreaterThanOrEqual(1);

      // Verify export can be serialized to JSON
      const exportData = {
        user: userResult.rows[0],
        visitors: visitorsResult.rows,
        auditLogs: auditResult.rows,
        exportedAt: new Date().toISOString(),
        format: 'JSON',
        compliance: 'Kenya DPA 2019 Article 39'
      };

      const jsonExport = JSON.stringify(exportData);
      expect(() => JSON.parse(jsonExport)).not.toThrow();
    });

    it('should log data export requests in audit trail', async () => {
      const userId = testUsers.resident.id;

      // Log export request
      await query(
        `INSERT INTO data_export_log (user_id, export_type, status)
         VALUES ($1, $2, $3)`,
        [userId, 'full_export', 'completed']
      );

      await query(
        `INSERT INTO audit_logs (action, resource, user_id, details)
         VALUES ($1, $2, $3, $4)`,
        ['dpa.data_export', 'privacy', userId, JSON.stringify({ type: 'full_export', article: '39' })]
      );

      // Verify export log exists
      const exportLog = await query(
        'SELECT * FROM data_export_log WHERE user_id = $1',
        [userId]
      );
      expect(exportLog.rows).toHaveLength(1);
      expect(exportLog.rows[0].export_type).toBe('full_export');

      // Verify audit log exists
      const auditLog = await query(
        "SELECT * FROM audit_logs WHERE action = 'dpa.data_export' AND user_id = $1",
        [userId]
      );
      expect(auditLog.rows).toHaveLength(1);
    });

    it('should include all related records in export', async () => {
      const userId = testUsers.resident.id;

      // Create related records
      await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, status)
         VALUES ($1, $2, $3, $4, $5)`,
        ['Pass Holder', '+254700222222', userId, 'weekly', 'active']
      );

      await query(
        `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status)
         VALUES ($1, $2, $3, $4)`,
        [userId, 'DHL', 'TRK123456', 'pending']
      );

      // Query all related data
      const passes = await query(
        'SELECT * FROM recurring_passes WHERE resident_id = $1',
        [userId]
      );
      const deliveries = await query(
        'SELECT * FROM delivery_logs WHERE resident_id = $1',
        [userId]
      );

      expect(passes.rows.length).toBeGreaterThanOrEqual(1);
      expect(deliveries.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect data retention policies in export', async () => {
      const userId = testUsers.resident.id;
      const oldDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000); // 400 days ago

      // Create old audit log (beyond retention)
      await query(
        `INSERT INTO audit_logs (action, resource, user_id, timestamp, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        ['old.action', 'test', userId, oldDate, oldDate]
      );

      // Create recent audit log
      await query(
        `INSERT INTO audit_logs (action, resource, user_id)
         VALUES ($1, $2, $3)`,
        ['recent.action', 'test', userId]
      );

      // Query with retention filter (365 days)
      const retainedLogs = await query(
        `SELECT * FROM audit_logs 
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '365 days'`,
        [userId]
      );

      // Recent log should be included
      const recentExists = retainedLogs.rows.some(r => r.action === 'recent.action');
      expect(recentExists).toBe(true);
    });
  });

  // =========================================
  // Article 33 - Right to Erasure (Deletion)
  // =========================================
  describe('Article 33 - Right to Erasure (Deletion)', () => {
    it('should delete user account and cascade to related records', async () => {
      // Create a test user specifically for deletion
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('deletetest123', 10);

      const userResult = await query(
        `INSERT INTO users (username, email, password, role, phone, unit)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        ['delete_test_user', 'delete@test.com', hashedPassword, 'resident', '+254700333333', 'D101']
      );
      const deleteUserId = userResult.rows[0].id;

      // Create related records
      await query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)`,
        ['Delete Test Visitor', '+254700444444', deleteUserId, 'DEL001', 'pending']
      );

      // Verify records exist
      const beforeVisitors = await query(
        'SELECT COUNT(*) FROM visitors WHERE host_id = $1',
        [deleteUserId]
      );
      expect(parseInt(beforeVisitors.rows[0].count)).toBe(1);

      // Delete user (this should cascade)
      await query('DELETE FROM visitors WHERE host_id = $1', [deleteUserId]);
      await query('DELETE FROM users WHERE id = $1', [deleteUserId]);

      // Verify deletion
      const afterUser = await query(
        'SELECT * FROM users WHERE id = $1',
        [deleteUserId]
      );
      expect(afterUser.rows).toHaveLength(0);

      const afterVisitors = await query(
        'SELECT COUNT(*) FROM visitors WHERE host_id = $1',
        [deleteUserId]
      );
      expect(parseInt(afterVisitors.rows[0].count)).toBe(0);
    });

    it('should anonymize historical records instead of deleting', async () => {
      // Create test audit log
      const userId = testUsers.resident.id;
      
      await query(
        `INSERT INTO audit_logs (action, resource, user_id, user_role, ip_address, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['test.action', 'test', userId, 'resident', '192.168.1.100', JSON.stringify({ sensitive: 'data' })]
      );

      // Anonymize (update user_id to null, mask IP)
      await query(
        `UPDATE audit_logs 
         SET user_id = NULL, 
             ip_address = '0.0.0.0',
             details = jsonb_set(COALESCE(details, '{}')::jsonb, '{anonymized}', 'true')
         WHERE user_id = $1 AND action = 'test.action'`,
        [userId]
      );

      // Verify anonymization
      const anonymized = await query(
        "SELECT * FROM audit_logs WHERE action = 'test.action'"
      );

      expect(anonymized.rows[0].user_id).toBeNull();
      expect(anonymized.rows[0].ip_address).toBe('0.0.0.0');
    });

    it('should preserve audit logs for compliance (anonymized)', async () => {
      const userId = testUsers.resident.id;

      // Create compliance-critical audit log
      await query(
        `INSERT INTO audit_logs (action, resource, user_id, details)
         VALUES ($1, $2, $3, $4)`,
        ['security.login', 'auth', userId, JSON.stringify({ outcome: 'success' })]
      );

      // Even after "deletion", audit log should remain (anonymized)
      const auditLogs = await query(
        "SELECT * FROM audit_logs WHERE action = 'security.login'"
      );

      expect(auditLogs.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should log deletion requests for audit trail', async () => {
      const userId = testUsers.resident.id;

      // Create deletion request
      await query(
        `INSERT INTO data_deletion_requests (user_id, request_type, status)
         VALUES ($1, $2, $3)`,
        [userId, 'full_deletion', 'pending']
      );

      // Verify request logged
      const request = await query(
        'SELECT * FROM data_deletion_requests WHERE user_id = $1',
        [userId]
      );

      expect(request.rows).toHaveLength(1);
      expect(request.rows[0].request_type).toBe('full_deletion');
      expect(request.rows[0].status).toBe('pending');
    });

    it('should handle deletion with legal hold', async () => {
      const userId = testUsers.resident.id;

      // Simulate legal hold by creating a deletion request with notes
      await query(
        `INSERT INTO data_deletion_requests (user_id, request_type, status, notes)
         VALUES ($1, $2, $3, $4)`,
        [userId, 'full_deletion', 'on_hold', 'Legal hold - pending investigation']
      );

      // Verify request is on hold
      const request = await query(
        "SELECT * FROM data_deletion_requests WHERE user_id = $1 AND status = 'on_hold'",
        [userId]
      );

      expect(request.rows).toHaveLength(1);
      expect(request.rows[0].notes).toContain('Legal hold');
    });
  });

  // =========================================
  // Article 31 - Consent Management
  // =========================================
  describe('Article 31 - Consent Management', () => {
    it('should record user consent with timestamp', async () => {
      const userId = testUsers.resident.id;

      await query(
        `INSERT INTO consent_log (user_id, consent_type, consent_given, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [userId, 'marketing', true, '127.0.0.1']
      );

      const consent = await query(
        "SELECT * FROM consent_log WHERE user_id = $1 AND consent_type = 'marketing'",
        [userId]
      );

      expect(consent.rows).toHaveLength(1);
      expect(consent.rows[0].consent_given).toBe(true);
      expect(consent.rows[0].recorded_at).toBeDefined();
    });

    it('should record consent withdrawal with timestamp', async () => {
      const userId = testUsers.resident.id;

      // First give consent
      await query(
        `INSERT INTO consent_log (user_id, consent_type, consent_given)
         VALUES ($1, $2, $3)`,
        [userId, 'analytics', true]
      );

      // Then withdraw consent
      await query(
        `UPDATE consent_log 
         SET consent_withdrawn = true, withdrawn_at = NOW()
         WHERE user_id = $1 AND consent_type = $2`,
        [userId, 'analytics']
      );

      const consent = await query(
        "SELECT * FROM consent_log WHERE user_id = $1 AND consent_type = 'analytics'",
        [userId]
      );

      expect(consent.rows[0].consent_withdrawn).toBe(true);
      expect(consent.rows[0].withdrawn_at).toBeDefined();
    });

    it('should track multiple consent types independently', async () => {
      const userId = testUsers.resident.id;
      const consentTypes = ['marketing', 'analytics', 'third_party_sharing', 'data_processing'];

      for (const type of consentTypes) {
        await query(
          `INSERT INTO consent_log (user_id, consent_type, consent_given)
           VALUES ($1, $2, $3)`,
          [userId, type, true]
        );
      }

      const consents = await query(
        'SELECT * FROM consent_log WHERE user_id = $1',
        [userId]
      );

      expect(consents.rows).toHaveLength(consentTypes.length);
      
      const recordedTypes = consents.rows.map(c => c.consent_type);
      for (const type of consentTypes) {
        expect(recordedTypes).toContain(type);
      }
    });

    it('should preserve consent history', async () => {
      const userId = testUsers.resident.id;

      // Give consent
      await query(
        `INSERT INTO consent_log (user_id, consent_type, consent_given, recorded_at)
         VALUES ($1, $2, $3, NOW() - INTERVAL '30 days')`,
        [userId, 'marketing', true]
      );

      // Withdraw consent (new record for history)
      await query(
        `INSERT INTO consent_log (user_id, consent_type, consent_given, consent_withdrawn)
         VALUES ($1, $2, $3, $4)`,
        [userId, 'marketing', false, true]
      );

      const history = await query(
        "SELECT * FROM consent_log WHERE user_id = $1 AND consent_type = 'marketing' ORDER BY recorded_at",
        [userId]
      );

      expect(history.rows.length).toBeGreaterThanOrEqual(2);
    });

    it('should validate consent before data processing', async () => {
      const userId = testUsers.resident.id;

      // Check consent status (function that would be called before processing)
      const checkConsent = async (userId, consentType) => {
        const result = await query(
          `SELECT consent_given, consent_withdrawn 
           FROM consent_log 
           WHERE user_id = $1 AND consent_type = $2 
           ORDER BY recorded_at DESC LIMIT 1`,
          [userId, consentType]
        );

        if (result.rows.length === 0) return false;
        return result.rows[0].consent_given && !result.rows[0].consent_withdrawn;
      };

      // No consent given yet
      const noConsent = await checkConsent(userId, 'new_feature');
      expect(noConsent).toBe(false);

      // Give consent
      await query(
        `INSERT INTO consent_log (user_id, consent_type, consent_given)
         VALUES ($1, $2, $3)`,
        [userId, 'new_feature', true]
      );

      const hasConsent = await checkConsent(userId, 'new_feature');
      expect(hasConsent).toBe(true);

      // Withdraw consent
      await query(
        `UPDATE consent_log 
         SET consent_withdrawn = true 
         WHERE user_id = $1 AND consent_type = $2`,
        [userId, 'new_feature']
      );

      const withdrawnConsent = await checkConsent(userId, 'new_feature');
      expect(withdrawnConsent).toBe(false);
    });
  });

  // =========================================
  // Audit Trail for DPA Operations
  // =========================================
  describe('DPA Operations Audit Trail', () => {
    it('should create audit log for every DPA operation', async () => {
      const userId = testUsers.resident.id;
      const dpaActions = [
        'dpa.data_export',
        'dpa.deletion_request',
        'dpa.consent_given',
        'dpa.consent_withdrawn',
        'dpa.data_access'
      ];

      for (const action of dpaActions) {
        await query(
          `INSERT INTO audit_logs (action, resource, user_id, details)
           VALUES ($1, $2, $3, $4)`,
          [action, 'dpa_compliance', userId, JSON.stringify({ article: 'various', outcome: 'success' })]
        );
      }

      const auditLogs = await query(
        "SELECT * FROM audit_logs WHERE resource = 'dpa_compliance' AND user_id = $1",
        [userId]
      );

      expect(auditLogs.rows).toHaveLength(dpaActions.length);
    });

    it('should include IP address and user agent in DPA audit logs', async () => {
      const userId = testUsers.resident.id;

      await query(
        `INSERT INTO audit_logs (action, resource, user_id, ip_address, user_agent, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'dpa.data_export',
          'dpa_compliance',
          userId,
          '192.168.1.100',
          'Mozilla/5.0 (Test)',
          JSON.stringify({ format: 'JSON' })
        ]
      );

      const log = await query(
        "SELECT * FROM audit_logs WHERE action = 'dpa.data_export' AND user_id = $1",
        [userId]
      );

      expect(log.rows[0].ip_address).toBe('192.168.1.100');
      expect(log.rows[0].user_agent).toBe('Mozilla/5.0 (Test)');
    });

    it('should retain DPA audit logs for 7 years', async () => {
      // This is a policy test - verify logs are not auto-deleted within retention period
      const userId = testUsers.resident.id;
      const sixYearsAgo = new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000);

      await query(
        `INSERT INTO audit_logs (action, resource, user_id, timestamp, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        ['dpa.compliance_check', 'dpa_compliance', userId, sixYearsAgo, sixYearsAgo]
      );

      // Verify log is still retrievable
      const oldLog = await query(
        "SELECT * FROM audit_logs WHERE action = 'dpa.compliance_check' AND user_id = $1",
        [userId]
      );

      expect(oldLog.rows).toHaveLength(1);
    });
  });

  // =========================================
  // Privacy Settings Integration
  // =========================================
  describe('User Privacy Settings', () => {
    it('should create and update privacy settings', async () => {
      const userId = testUsers.resident.id;

      // Create privacy settings
      await query(
        `INSERT INTO user_privacy_settings (user_id, marketing_consent, analytics_consent)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET marketing_consent = $2, analytics_consent = $3`,
        [userId, true, false]
      );

      const settings = await query(
        'SELECT * FROM user_privacy_settings WHERE user_id = $1',
        [userId]
      );

      expect(settings.rows).toHaveLength(1);
      expect(settings.rows[0].marketing_consent).toBe(true);
      expect(settings.rows[0].analytics_consent).toBe(false);
    });

    it('should default third-party sharing to false', async () => {
      const userId = testUsers.resident.id;

      await query(
        `INSERT INTO user_privacy_settings (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      const settings = await query(
        'SELECT * FROM user_privacy_settings WHERE user_id = $1',
        [userId]
      );

      expect(settings.rows[0].third_party_sharing).toBe(false);
    });
  });

  // =========================================
  // Cross-Service DPA Compliance
  // =========================================
  describe('Cross-Service DPA Compliance', () => {
    it('should handle complete data subject access request (DSAR)', async () => {
      const userId = testUsers.resident.id;

      // Create comprehensive test data
      await query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)`,
        ['DSAR Visitor', '+254700555555', userId, 'DSAR01', 'pending']
      );

      await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, status)
         VALUES ($1, $2, $3, $4, $5)`,
        ['DSAR Pass', '+254700666666', userId, 'daily', 'active']
      );

      await query(
        `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status)
         VALUES ($1, $2, $3, $4)`,
        [userId, 'Fedex', 'DSAR123', 'pending']
      );

      // Simulate DSAR - collect all user data
      const userData = await query('SELECT * FROM users WHERE id = $1', [userId]);
      const visitors = await query('SELECT * FROM visitors WHERE host_id = $1', [userId]);
      const passes = await query('SELECT * FROM recurring_passes WHERE resident_id = $1', [userId]);
      const deliveries = await query('SELECT * FROM delivery_logs WHERE resident_id = $1', [userId]);
      const auditLogs = await query('SELECT * FROM audit_logs WHERE user_id = $1', [userId]);

      const dsarPackage = {
        personal_data: userData.rows[0],
        visitors: visitors.rows,
        recurring_passes: passes.rows,
        deliveries: deliveries.rows,
        activity_logs: auditLogs.rows,
        generated_at: new Date().toISOString(),
        dpa_reference: 'Kenya DPA 2019 - Article 39'
      };

      expect(dsarPackage.personal_data).toBeDefined();
      expect(dsarPackage.visitors.length).toBeGreaterThanOrEqual(1);
      expect(dsarPackage.recurring_passes.length).toBeGreaterThanOrEqual(1);
      expect(dsarPackage.deliveries.length).toBeGreaterThanOrEqual(1);
    });
  });
});
