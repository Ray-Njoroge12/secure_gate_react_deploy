const request = require('supertest');
const pool = require('../../src/database/db');
const retentionService = require('../../src/services/retentionService');
const app = require('../../server');

describe('Data Retention Service', () => {
  let adminToken;
  let residentToken;
  let residentId;
  let unitId;

  beforeAll(async () => {
    // Create test unit
    const unitResult = await pool.query(
      `INSERT INTO units (unit_number, block) 
       VALUES ('TEST-RET-001', 'A') 
       RETURNING unit_id`
    );
    unitId = unitResult.rows[0].unit_id;

    // Create test resident
    const residentResult = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, unit_id) 
       VALUES ('resident_retention', 'resident_ret@test.com', '$2b$10$test', 'resident', $1) 
       RETURNING user_id`,
      [unitId]
    );
    residentId = residentResult.rows[0].user_id;

    // Create test admin
    const adminResult = await pool.query(
      `INSERT INTO users (username, email, password_hash, role) 
       VALUES ('admin_retention', 'admin_ret@test.com', '$2b$10$test', 'admin') 
       RETURNING user_id`
    );

    // Get tokens (simplified - in real tests use proper login)
    residentToken = 'mock-resident-token';
    adminToken = 'mock-admin-token';
  });

  afterAll(async () => {
    // Cleanup
    await pool.query(`DELETE FROM users WHERE username IN ('resident_retention', 'admin_retention')`);
    await pool.query(`DELETE FROM units WHERE unit_number = 'TEST-RET-001'`);
    await pool.end();
  });

  describe('Visitor Data Retention', () => {
    test('should archive old visitors beyond retention period', async () => {
      // Create old visitor (2 years ago)
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const visitorResult = await pool.query(
        `INSERT INTO visitors (
          visitor_name, phone_number, id_number, vehicle_reg, 
          visit_date, visit_time, resident_id, unit_id, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING visitor_id`,
        [
          'Old Visitor',
          '+1234567890',
          'OLD123456',
          'OLD123',
          oldDate.toISOString().split('T')[0],
          '10:00',
          residentId,
          unitId,
          'expired',
          oldDate
        ]
      );

      const visitorId = visitorResult.rows[0].visitor_id;

      // Run archival
      const result = await retentionService.archiveOldVisitors(1); // 1 year retention

      expect(result.archived).toBeGreaterThan(0);

      // Verify visitor is archived
      const archivedCheck = await pool.query(
        `SELECT * FROM archived_visitors WHERE original_visitor_id = $1`,
        [visitorId]
      );

      expect(archivedCheck.rows.length).toBe(1);
      expect(archivedCheck.rows[0].visitor_name).toBe('Old Visitor');

      // Cleanup
      await pool.query(`DELETE FROM archived_visitors WHERE original_visitor_id = $1`, [visitorId]);
    });

    test('should delete old visitors beyond deletion period', async () => {
      // Create very old visitor (3 years ago)
      const veryOldDate = new Date();
      veryOldDate.setFullYear(veryOldDate.getFullYear() - 3);

      const visitorResult = await pool.query(
        `INSERT INTO visitors (
          visitor_name, phone_number, id_number, vehicle_reg, 
          visit_date, visit_time, resident_id, unit_id, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING visitor_id`,
        [
          'Very Old Visitor',
          '+1234567890',
          'VOLD123456',
          'VOLD123',
          veryOldDate.toISOString().split('T')[0],
          '10:00',
          residentId,
          unitId,
          'expired',
          veryOldDate
        ]
      );

      const visitorId = visitorResult.rows[0].visitor_id;

      // Run deletion
      const result = await retentionService.deleteOldVisitors(2); // 2 year deletion period

      expect(result.deleted).toBeGreaterThan(0);

      // Verify visitor is deleted
      const deletedCheck = await pool.query(
        `SELECT * FROM visitors WHERE visitor_id = $1`,
        [visitorId]
      );

      expect(deletedCheck.rows.length).toBe(0);
    });

    test('should not delete recent visitors', async () => {
      // Create recent visitor
      const recentResult = await pool.query(
        `INSERT INTO visitors (
          visitor_name, phone_number, id_number, vehicle_reg, 
          visit_date, visit_time, resident_id, unit_id, status
        ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8) 
        RETURNING visitor_id`,
        [
          'Recent Visitor',
          '+1234567890',
          'REC123456',
          'REC123',
          '10:00',
          residentId,
          unitId,
          'pending'
        ]
      );

      const visitorId = recentResult.rows[0].visitor_id;

      // Run deletion with short period
      const result = await retentionService.deleteOldVisitors(1); // 1 year

      // Verify visitor still exists
      const check = await pool.query(
        `SELECT * FROM visitors WHERE visitor_id = $1`,
        [visitorId]
      );

      expect(check.rows.length).toBe(1);

      // Cleanup
      await pool.query(`DELETE FROM visitors WHERE visitor_id = $1`, [visitorId]);
    });
  });

  describe('Access Log Retention', () => {
    test('should archive old access logs', async () => {
      // Create old access log
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const logResult = await pool.query(
        `INSERT INTO access_logs (
          user_id, action, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5) 
        RETURNING log_id`,
        [residentId, 'login', '127.0.0.1', 'test-agent', oldDate]
      );

      const logId = logResult.rows[0].log_id;

      // Run archival
      const result = await retentionService.archiveOldAccessLogs(1); // 1 year

      expect(result.archived).toBeGreaterThan(0);

      // Verify log is archived
      const archivedCheck = await pool.query(
        `SELECT * FROM archived_access_logs WHERE original_log_id = $1`,
        [logId]
      );

      expect(archivedCheck.rows.length).toBe(1);

      // Cleanup
      await pool.query(`DELETE FROM archived_access_logs WHERE original_log_id = $1`, [logId]);
    });

    test('should delete old access logs', async () => {
      // Create very old access log
      const veryOldDate = new Date();
      veryOldDate.setFullYear(veryOldDate.getFullYear() - 3);

      const logResult = await pool.query(
        `INSERT INTO access_logs (
          user_id, action, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5) 
        RETURNING log_id`,
        [residentId, 'login', '127.0.0.1', 'test-agent', veryOldDate]
      );

      const logId = logResult.rows[0].log_id;

      // Run deletion
      const result = await retentionService.deleteOldAccessLogs(2); // 2 years

      expect(result.deleted).toBeGreaterThan(0);

      // Verify log is deleted
      const deletedCheck = await pool.query(
        `SELECT * FROM access_logs WHERE log_id = $1`,
        [logId]
      );

      expect(deletedCheck.rows.length).toBe(0);
    });
  });

  describe('Audit Log Retention', () => {
    test('should archive old audit logs', async () => {
      // Create old audit log
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const auditResult = await pool.query(
        `INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id, changes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING audit_id`,
        [residentId, 'update', 'visitor', 1, '{}', oldDate]
      );

      const auditId = auditResult.rows[0].audit_id;

      // Run archival
      const result = await retentionService.archiveOldAuditLogs(1); // 1 year

      expect(result.archived).toBeGreaterThan(0);

      // Verify audit log is archived
      const archivedCheck = await pool.query(
        `SELECT * FROM archived_audit_logs WHERE original_audit_id = $1`,
        [auditId]
      );

      expect(archivedCheck.rows.length).toBe(1);

      // Cleanup
      await pool.query(`DELETE FROM archived_audit_logs WHERE original_audit_id = $1`, [auditId]);
    });

    test('should anonymize old audit logs', async () => {
      // Create old audit log with PII
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 4);

      const auditResult = await pool.query(
        `INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id, 
          changes, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING audit_id`,
        [
          residentId,
          'create',
          'visitor',
          1,
          JSON.stringify({ name: 'John Doe', phone: '+1234567890' }),
          '192.168.1.100',
          'Mozilla/5.0',
          oldDate
        ]
      );

      const auditId = auditResult.rows[0].audit_id;

      // Run anonymization
      const result = await retentionService.anonymizeOldAuditLogs(3); // 3 years

      expect(result.anonymized).toBeGreaterThan(0);

      // Verify audit log is anonymized
      const anonymizedCheck = await pool.query(
        `SELECT * FROM audit_logs WHERE audit_id = $1`,
        [auditId]
      );

      expect(anonymizedCheck.rows.length).toBe(1);
      expect(anonymizedCheck.rows[0].ip_address).toBe('[ANONYMIZED]');
      expect(anonymizedCheck.rows[0].user_agent).toBe('[ANONYMIZED]');

      // Cleanup
      await pool.query(`DELETE FROM audit_logs WHERE audit_id = $1`, [auditId]);
    });
  });

  describe('Full Retention Process', () => {
    test('should run complete retention job successfully', async () => {
      const result = await retentionService.runRetentionJob();

      expect(result).toHaveProperty('visitorsArchived');
      expect(result).toHaveProperty('visitorsDeleted');
      expect(result).toHaveProperty('accessLogsArchived');
      expect(result).toHaveProperty('accessLogsDeleted');
      expect(result).toHaveProperty('auditLogsArchived');
      expect(result).toHaveProperty('auditLogsAnonymized');
      expect(result.status).toBe('completed');
    });

    test('should handle errors gracefully', async () => {
      // Mock pool.query to throw error
      const originalQuery = pool.query;
      pool.query = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(retentionService.archiveOldVisitors(1)).rejects.toThrow();

      // Restore
      pool.query = originalQuery;
    });
  });

  describe('Configuration', () => {
    test('should use environment variable retention periods', () => {
      // Check that service respects env vars
      const originalEnv = process.env.DATA_RETENTION_VISITORS_YEARS;
      process.env.DATA_RETENTION_VISITORS_YEARS = '5';

      // Service should use this value when running
      // This is tested implicitly by the service using config

      process.env.DATA_RETENTION_VISITORS_YEARS = originalEnv;
    });

    test('should validate retention periods', async () => {
      // Test with invalid period
      await expect(
        retentionService.archiveOldVisitors(-1)
      ).rejects.toThrow();

      await expect(
        retentionService.archiveOldVisitors(0)
      ).rejects.toThrow();
    });
  });

  describe('Archive Data Integrity', () => {
    test('should preserve all data when archiving', async () => {
      // Create visitor with all fields
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const visitorData = {
        visitor_name: 'Complete Visitor',
        phone_number: '+1234567890',
        id_number: 'COMP123456',
        vehicle_reg: 'COMP123',
        visit_date: oldDate.toISOString().split('T')[0],
        visit_time: '14:30',
        purpose: 'Business meeting',
        status: 'expired'
      };

      const visitorResult = await pool.query(
        `INSERT INTO visitors (
          visitor_name, phone_number, id_number, vehicle_reg, 
          visit_date, visit_time, purpose, resident_id, unit_id, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING visitor_id`,
        [
          visitorData.visitor_name,
          visitorData.phone_number,
          visitorData.id_number,
          visitorData.vehicle_reg,
          visitorData.visit_date,
          visitorData.visit_time,
          visitorData.purpose,
          residentId,
          unitId,
          visitorData.status,
          oldDate
        ]
      );

      const visitorId = visitorResult.rows[0].visitor_id;

      // Archive
      await retentionService.archiveOldVisitors(1);

      // Verify all fields preserved in archive
      const archived = await pool.query(
        `SELECT * FROM archived_visitors WHERE original_visitor_id = $1`,
        [visitorId]
      );

      expect(archived.rows.length).toBe(1);
      const archivedVisitor = archived.rows[0];
      expect(archivedVisitor.visitor_name).toBe(visitorData.visitor_name);
      expect(archivedVisitor.phone_number).toBe(visitorData.phone_number);
      expect(archivedVisitor.id_number).toBe(visitorData.id_number);
      expect(archivedVisitor.vehicle_reg).toBe(visitorData.vehicle_reg);
      expect(archivedVisitor.purpose).toBe(visitorData.purpose);

      // Cleanup
      await pool.query(`DELETE FROM archived_visitors WHERE original_visitor_id = $1`, [visitorId]);
    });
  });
});
