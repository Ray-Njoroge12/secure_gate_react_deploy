/**
 * Unit Tests for Audit Service
 * Phase 3: Compliance & Audit
 * 
 * Tests core audit logging functionality for security and compliance
 * Coverage: Audit log creation, database operations, error handling
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock the database manager
const mockQuery = jest.fn();
const mockDbManager = {
  query: mockQuery
};

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

// Import the service after mocking
const auditServiceModule = await import('../../src/services/auditService.js');
const auditService = auditServiceModule.default;
const { auditLog } = auditServiceModule;

describe('AuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to successful query
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('auditLog function', () => {
    it('should insert audit log with all parameters', async () => {
      const userId = 'user-123';
      const action = 'LOGIN_SUCCESS';
      const entityType = 'user';
      const entityId = 'entity-456';
      const details = { browser: 'Chrome', os: 'Windows' };
      const ip = '192.168.1.100';

      await auditLog(userId, action, entityType, entityId, details, ip);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, estate_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [userId, action, entityType, entityId, JSON.stringify(details), ip, null]
      );
    });

    it('should handle null userId', async () => {
      const action = 'SYSTEM_EVENT';

      await auditLog(null, action);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([null, action])
      );
    });

    it('should handle undefined userId', async () => {
      const action = 'ANONYMOUS_ACTION';

      await auditLog(undefined, action);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([null, action])
      );
    });

    it('should handle null entity_type', async () => {
      const userId = 'user-123';
      const action = 'GENERAL_ACTION';

      await auditLog(userId, action, null);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [userId, action, null, null, null, null, null]
      );
    });

    it('should handle null entity_id', async () => {
      const userId = 'user-123';
      const action = 'ACTION';
      const entityType = 'visitor';

      await auditLog(userId, action, entityType, null);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [userId, action, entityType, null, null, null, null]
      );
    });

    it('should stringify details object', async () => {
      const userId = 'user-123';
      const action = 'DATA_UPDATE';
      const details = {
        oldValue: 'old',
        newValue: 'new',
        field: 'name'
      };

      await auditLog(userId, action, null, null, details);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([JSON.stringify(details)])
      );
    });

    it('should handle null details', async () => {
      const userId = 'user-123';
      const action = 'SIMPLE_ACTION';

      await auditLog(userId, action, null, null, null);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [userId, action, null, null, null, null]
      );
    });

    it('should handle null ip address', async () => {
      const userId = 'user-123';
      const action = 'INTERNAL_ACTION';

      await auditLog(userId, action, null, null, null, null);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [userId, action, null, null, null, null]
      );
    });

    it('should handle database query errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValue(dbError);

      // Should not throw, just log error
      await expect(auditLog('user-123', 'ACTION')).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith('auditLog failed', dbError);
      consoleSpy.mockRestore();
    });

    it('should handle complex details object', async () => {
      const details = {
        nested: {
          deep: {
            value: 'test'
          }
        },
        array: [1, 2, 3],
        timestamp: new Date().toISOString()
      };

      await auditLog('user-123', 'COMPLEX_ACTION', null, null, details);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([JSON.stringify(details)])
      );
    });
  });

  describe('Audit Action Types', () => {
    it('should log LOGIN_SUCCESS action', async () => {
      await auditLog('user-123', 'LOGIN_SUCCESS', 'user', 'user-123', { method: '2FA' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['LOGIN_SUCCESS'])
      );
    });

    it('should log LOGIN_FAILURE action', async () => {
      await auditLog(null, 'LOGIN_FAILURE', 'user', null, { reason: 'invalid_password' }, '192.168.1.1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['LOGIN_FAILURE'])
      );
    });

    it('should log VISITOR_CHECK_IN action', async () => {
      await auditLog('guard-456', 'VISITOR_CHECK_IN', 'visitor', 'visitor-789', {
        name: 'John Doe',
        checkInTime: new Date().toISOString()
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['VISITOR_CHECK_IN'])
      );
    });

    it('should log VISITOR_CHECK_OUT action', async () => {
      await auditLog('guard-456', 'VISITOR_CHECK_OUT', 'visitor', 'visitor-789', {
        checkOutTime: new Date().toISOString()
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['VISITOR_CHECK_OUT'])
      );
    });

    it('should log DATA_ACCESS action', async () => {
      await auditLog('admin-123', 'DATA_ACCESS', 'report', 'report-456', {
        reportType: 'visitor_summary'
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['DATA_ACCESS'])
      );
    });

    it('should log DATA_EXPORT action', async () => {
      await auditLog('admin-123', 'DATA_EXPORT', 'visitors', null, {
        format: 'csv',
        recordCount: 1500
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['DATA_EXPORT'])
      );
    });

    it('should log USER_CREATE action', async () => {
      await auditLog('admin-123', 'USER_CREATE', 'user', 'new-user-789', {
        role: 'guard',
        email: 'guard@example.com'
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['USER_CREATE'])
      );
    });

    it('should log USER_UPDATE action', async () => {
      await auditLog('admin-123', 'USER_UPDATE', 'user', 'user-456', {
        changedFields: ['role', 'permissions']
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['USER_UPDATE'])
      );
    });

    it('should log USER_DELETE action', async () => {
      await auditLog('admin-123', 'USER_DELETE', 'user', 'user-789', {
        reason: 'terminated'
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['USER_DELETE'])
      );
    });

    it('should log SECURITY_ALERT action', async () => {
      await auditLog('system', 'SECURITY_ALERT', 'security', null, {
        alertType: 'multiple_failed_logins',
        severity: 'high'
      }, '10.0.0.1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['SECURITY_ALERT'])
      );
    });

    it('should log PERMISSION_CHANGE action', async () => {
      await auditLog('admin-123', 'PERMISSION_CHANGE', 'user', 'user-456', {
        oldPermissions: ['view'],
        newPermissions: ['view', 'edit', 'delete']
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['PERMISSION_CHANGE'])
      );
    });

    it('should log CONFIG_CHANGE action', async () => {
      await auditLog('admin-123', 'CONFIG_CHANGE', 'settings', 'global-config', {
        setting: 'auto_approval_enabled',
        oldValue: false,
        newValue: true
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['CONFIG_CHANGE'])
      );
    });
  });

  describe('Entity Types', () => {
    const entityTypes = [
      'user', 'visitor', 'guard', 'resident', 'admin',
      'invite', 'delivery', 'emergency', 'report', 
      'settings', 'security', 'system'
    ];

    entityTypes.forEach(entityType => {
      it(`should handle ${entityType} entity type`, async () => {
        await auditLog('user-123', 'ACTION', entityType, 'entity-456');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([entityType])
        );
      });
    });
  });

  describe('IP Address Handling', () => {
    it('should log IPv4 address', async () => {
      const ip = '192.168.1.100';
      await auditLog('user-123', 'ACTION', null, null, null, ip);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([ip])
      );
    });

    it('should log IPv6 address', async () => {
      const ip = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      await auditLog('user-123', 'ACTION', null, null, null, ip);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([ip])
      );
    });

    it('should log localhost address', async () => {
      const ip = '127.0.0.1';
      await auditLog('user-123', 'ACTION', null, null, null, ip);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([ip])
      );
    });
  });

  describe('Compliance Scenarios', () => {
    it('should log GDPR data access request', async () => {
      await auditLog('dpo-123', 'GDPR_DATA_ACCESS_REQUEST', 'compliance', 'request-456', {
        subjectId: 'user-789',
        requestType: 'access',
        status: 'processed'
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['GDPR_DATA_ACCESS_REQUEST'])
      );
    });

    it('should log GDPR data deletion request', async () => {
      await auditLog('dpo-123', 'GDPR_DATA_DELETION', 'compliance', 'request-456', {
        subjectId: 'user-789',
        recordsDeleted: 150,
        status: 'completed'
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['GDPR_DATA_DELETION'])
      );
    });

    it('should log Kenya DPA audit event', async () => {
      await auditLog('compliance-officer', 'KENYA_DPA_AUDIT', 'compliance', 'audit-123', {
        auditType: 'quarterly_review',
        findings: 0,
        status: 'passed'
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['KENYA_DPA_AUDIT'])
      );
    });

    it('should log consent change', async () => {
      await auditLog('user-123', 'CONSENT_CHANGE', 'consent', 'consent-456', {
        previousConsent: { marketing: true },
        newConsent: { marketing: false },
        reason: 'user_preference'
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['CONSENT_CHANGE'])
      );
    });

    it('should log data breach notification', async () => {
      await auditLog('security-team', 'DATA_BREACH_NOTIFICATION', 'security', 'breach-789', {
        affectedUsers: 10,
        breachType: 'unauthorized_access',
        notificationSentAt: new Date().toISOString()
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['DATA_BREACH_NOTIFICATION'])
      );
    });
  });

  describe('Default Export', () => {
    it('should export auditLog function on default object', () => {
      expect(auditService).toHaveProperty('auditLog');
      expect(typeof auditService.auditLog).toBe('function');
    });

    it('should be callable via default export', async () => {
      await auditService.auditLog('user-123', 'TEST_ACTION');

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('Database Query Structure', () => {
    it('should use correct SQL query format', async () => {
      await auditLog('user-123', 'ACTION', 'type', 'id', { key: 'value' }, '127.0.0.1');

      const expectedQuery = 'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, estate_id) VALUES ($1,$2,$3,$4,$5,$6,$7)';
      expect(mockQuery).toHaveBeenCalledWith(expectedQuery, expect.any(Array));
    });

    it('should pass parameters in correct order', async () => {
      const userId = 'user-123';
      const action = 'ACTION';
      const entityType = 'type';
      const entityId = 'id-456';
      const details = { test: true };
      const ip = '192.168.1.1';

      await auditLog(userId, action, entityType, entityId, details, ip);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [userId, action, entityType, entityId, JSON.stringify(details), ip]
      );
    });
  });

  describe('High-Volume Scenarios', () => {
    it('should handle multiple concurrent audit logs', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(auditLog(`user-${i}`, 'BULK_ACTION', 'test', `entity-${i}`));
      }

      await Promise.all(promises);

      expect(mockQuery).toHaveBeenCalledTimes(100);
    });

    it('should handle large details object', async () => {
      const largeDetails = {
        records: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Record ${i}`,
          timestamp: new Date().toISOString()
        }))
      };

      await auditLog('user-123', 'BULK_OPERATION', 'batch', 'batch-456', largeDetails);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([JSON.stringify(largeDetails)])
      );
    });
  });

  describe('Error Resilience', () => {
    it('should not throw on database timeout', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValue(new Error('Query timeout'));

      await expect(auditLog('user-123', 'ACTION')).resolves.toBeUndefined();

      consoleSpy.mockRestore();
    });

    it('should not throw on connection refused', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValue(new Error('Connection refused'));

      await expect(auditLog('user-123', 'ACTION')).resolves.toBeUndefined();

      consoleSpy.mockRestore();
    });

    it('should log error details on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const specificError = new Error('Specific database error');
      mockQuery.mockRejectedValue(specificError);

      await auditLog('user-123', 'ACTION');

      expect(consoleSpy).toHaveBeenCalledWith('auditLog failed', specificError);
      consoleSpy.mockRestore();
    });
  });
});
