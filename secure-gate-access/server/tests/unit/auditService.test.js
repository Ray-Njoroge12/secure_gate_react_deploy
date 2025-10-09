/**
 * Unit Tests for Audit Service
 * 
 * Coverage:
 * - Audit log creation
 * - Database interaction
 * - Error handling
 * - Parameter validation
 * - JSON serialization
 * - Null/undefined handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { auditLog } from '../../src/services/auditService.js';
import { dbManager } from '../../src/database/db.enhanced.js';

// Mock database manager
vi.mock('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: vi.fn()
  }
}));

describe('Audit Service - auditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful Audit Logging', () => {
    it('should create audit log with all parameters', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      const userId = 'user-123';
      const action = 'LOGIN';
      const entityType = 'User';
      const entityId = 'entity-456';
      const details = { success: true, method: 'password' };
      const ip = '192.168.1.1';

      await auditLog(userId, action, entityType, entityId, details, ip);

      expect(dbManager.query).toHaveBeenCalledTimes(1);
      expect(dbManager.query).toHaveBeenCalledWith(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
        [userId, action, entityType, entityId, JSON.stringify(details), ip]
      );
    });

    it('should create audit log with minimal parameters (userId and action only)', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      const userId = 'user-789';
      const action = 'LOGOUT';

      await auditLog(userId, action);

      expect(dbManager.query).toHaveBeenCalledWith(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
        [userId, action, null, null, null, null]
      );
    });

    it('should handle null userId by storing null', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      await auditLog(null, 'ANONYMOUS_ACCESS');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        [null, 'ANONYMOUS_ACCESS', null, null, null, null]
      );
    });

    it('should handle undefined userId by storing null', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      await auditLog(undefined, 'SYSTEM_EVENT');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        [null, 'SYSTEM_EVENT', null, null, null, null]
      );
    });

    it('should serialize complex details object to JSON', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      const complexDetails = {
        action: 'update',
        changes: {
          before: { status: 'active' },
          after: { status: 'inactive' }
        },
        reason: 'admin request',
        timestamp: new Date('2024-01-01').toISOString()
      };

      await auditLog('user-1', 'UPDATE_STATUS', 'Account', 'acc-1', complexDetails, '10.0.0.1');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-1', 'UPDATE_STATUS', 'Account', 'acc-1', JSON.stringify(complexDetails), '10.0.0.1']
      );
    });

    it('should handle null details parameter', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      await auditLog('user-2', 'LOGIN', 'Session', 'sess-1', null, '192.168.1.5');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-2', 'LOGIN', 'Session', 'sess-1', null, '192.168.1.5']
      );
    });

    it('should handle undefined details parameter', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      await auditLog('user-3', 'LOGOUT', 'Session', 'sess-2', undefined, '192.168.1.6');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-3', 'LOGOUT', 'Session', 'sess-2', null, '192.168.1.6']
      );
    });
  });

  describe('Entity Type and ID Handling', () => {
    it('should log action with entity_type and entity_id', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      await auditLog('admin-1', 'DELETE', 'Document', 'doc-999', { reason: 'expired' });

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['admin-1', 'DELETE', 'Document', 'doc-999', JSON.stringify({ reason: 'expired' }), null]
      );
    });

    it('should handle null entity_type and entity_id', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      await auditLog('user-4', 'GENERAL_ACTION', null, null, { info: 'test' });

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-4', 'GENERAL_ACTION', null, null, JSON.stringify({ info: 'test' }), null]
      );
    });

    it('should log various entity types', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      const entityTypes = ['User', 'Role', 'Permission', 'AuditLog', 'Setting'];
      
      for (const entityType of entityTypes) {
        await auditLog('admin-1', 'VIEW', entityType, `${entityType}-1`);
      }

      expect(dbManager.query).toHaveBeenCalledTimes(entityTypes.length);
    });
  });

  describe('IP Address Handling', () => {
    it('should log IPv4 address', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      await auditLog('user-5', 'LOGIN', null, null, null, '192.168.1.100');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-5', 'LOGIN', null, null, null, '192.168.1.100']
      );
    });

    it('should log IPv6 address', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      await auditLog('user-6', 'LOGIN', null, null, null, '2001:0db8:85a3:0000:0000:8a2e:0370:7334');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-6', 'LOGIN', null, null, null, '2001:0db8:85a3:0000:0000:8a2e:0370:7334']
      );
    });

    it('should handle null IP address', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      await auditLog('user-7', 'BACKGROUND_TASK', null, null, null, null);

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-7', 'BACKGROUND_TASK', null, null, null, null]
      );
    });

    it('should handle undefined IP address', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      await auditLog('user-8', 'SCHEDULED_JOB');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-8', 'SCHEDULED_JOB', null, null, null, null]
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection error gracefully', async () => {
      const dbError = new Error('Database connection failed');
      dbManager.query.mockRejectedValue(dbError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      await expect(auditLog('user-9', 'FAILED_ACTION')).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith('auditLog failed', dbError);
      consoleErrorSpy.mockRestore();
    });

    it('should handle database query error gracefully', async () => {
      const dbError = new Error('Query execution failed');
      dbManager.query.mockRejectedValue(dbError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await auditLog('user-10', 'ERROR_TEST', 'Test', '123', { test: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith('auditLog failed', dbError);
      consoleErrorSpy.mockRestore();
    });

    it('should handle constraint violation error gracefully', async () => {
      const constraintError = new Error('Constraint violation');
      constraintError.code = '23505'; // PostgreSQL unique violation
      dbManager.query.mockRejectedValue(constraintError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await auditLog('user-11', 'DUPLICATE_ACTION');

      expect(consoleErrorSpy).toHaveBeenCalledWith('auditLog failed', constraintError);
      consoleErrorSpy.mockRestore();
    });

    it('should continue execution even if audit logging fails', async () => {
      dbManager.query.mockRejectedValue(new Error('DB unavailable'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw and allow application to continue
      const result = await auditLog('user-12', 'CRITICAL_ACTION');

      expect(result).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Action Types', () => {
    it('should log authentication actions', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      const authActions = ['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_RESET', 'MFA_ENABLED'];

      for (const action of authActions) {
        await auditLog('user-13', action);
      }

      expect(dbManager.query).toHaveBeenCalledTimes(authActions.length);
    });

    it('should log CRUD operations', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      const crudActions = ['CREATE', 'READ', 'UPDATE', 'DELETE'];

      for (const action of crudActions) {
        await auditLog('user-14', action, 'Resource', 'res-1');
      }

      expect(dbManager.query).toHaveBeenCalledTimes(crudActions.length);
    });

    it('should log security events', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      const securityActions = [
        'SUSPICIOUS_ACTIVITY',
        'ACCESS_DENIED',
        'RATE_LIMIT_EXCEEDED',
        'INVALID_TOKEN',
        'ACCOUNT_LOCKED'
      ];

      for (const action of securityActions) {
        await auditLog('user-15', action);
      }

      expect(dbManager.query).toHaveBeenCalledTimes(securityActions.length);
    });
  });

  describe('Details Object Serialization', () => {
    it('should serialize object with nested properties', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      const details = {
        level1: {
          level2: {
            level3: {
              value: 'deep nesting'
            }
          }
        }
      };

      await auditLog('user-16', 'NESTED_TEST', null, null, details);

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-16', 'NESTED_TEST', null, null, JSON.stringify(details), null]
      );
    });

    it('should serialize object with arrays', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      const details = {
        items: ['item1', 'item2', 'item3'],
        tags: ['security', 'audit', 'compliance']
      };

      await auditLog('user-17', 'ARRAY_TEST', null, null, details);

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-17', 'ARRAY_TEST', null, null, JSON.stringify(details), null]
      );
    });

    it('should handle empty object', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      await auditLog('user-18', 'EMPTY_DETAILS', null, null, {});

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-18', 'EMPTY_DETAILS', null, null, JSON.stringify({}), null]
      );
    });

    it('should handle object with special characters', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      const details = {
        message: 'Test with "quotes" and \'apostrophes\'',
        path: 'C:\\Windows\\System32',
        query: 'SELECT * FROM users WHERE id = $1'
      };

      await auditLog('user-19', 'SPECIAL_CHARS', null, null, details);

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-19', 'SPECIAL_CHARS', null, null, JSON.stringify(details), null]
      );
    });
  });

  describe('Concurrent Audit Logging', () => {
    it('should handle multiple concurrent audit logs', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(auditLog(`user-${i}`, `ACTION_${i}`, 'Resource', `res-${i}`));
      }

      await Promise.all(promises);

      expect(dbManager.query).toHaveBeenCalledTimes(10);
    });

    it('should not interfere with other logs when one fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      dbManager.query
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ rowCount: 1 });

      await auditLog('user-20', 'SUCCESS_1');
      await auditLog('user-21', 'FAILURE');
      await auditLog('user-22', 'SUCCESS_2');

      expect(dbManager.query).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long action names', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      const longAction = 'A'.repeat(255);
      await auditLog('user-23', longAction);

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-23', longAction, null, null, null, null]
      );
    });

    it('should handle very large details object', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      const largeDetails = {
        data: 'x'.repeat(10000),
        metadata: Array(100).fill({ key: 'value' })
      };

      await auditLog('user-24', 'LARGE_DETAILS', null, null, largeDetails);

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-24', 'LARGE_DETAILS', null, null, JSON.stringify(largeDetails), null]
      );
    });

    it('should handle numeric userId', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      await auditLog(12345, 'NUMERIC_USER_ID');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        [12345, 'NUMERIC_USER_ID', null, null, null, null]
      );
    });

    it('should handle boolean details values', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      const details = {
        success: true,
        verified: false,
        completed: true
      };

      await auditLog('user-25', 'BOOLEAN_TEST', null, null, details);

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-25', 'BOOLEAN_TEST', null, null, JSON.stringify(details), null]
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should log complete user login flow', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      await auditLog('user-26', 'LOGIN_ATTEMPT', 'User', 'user-26', { method: 'password' }, '192.168.1.1');
      await auditLog('user-26', 'MFA_CHALLENGE', 'Session', 'sess-100', { type: 'TOTP' }, '192.168.1.1');
      await auditLog('user-26', 'MFA_VERIFIED', 'Session', 'sess-100', { success: true }, '192.168.1.1');
      await auditLog('user-26', 'LOGIN_SUCCESS', 'User', 'user-26', { duration_ms: 1500 }, '192.168.1.1');

      expect(dbManager.query).toHaveBeenCalledTimes(4);
    });

    it('should log resource modification chain', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 1 });

      await auditLog('admin-1', 'READ', 'Document', 'doc-1', { action: 'view' });
      await auditLog('admin-1', 'UPDATE', 'Document', 'doc-1', { 
        changes: { title: 'Updated Title' } 
      });
      await auditLog('admin-1', 'SHARE', 'Document', 'doc-1', { 
        shared_with: ['user-1', 'user-2'] 
      });

      expect(dbManager.query).toHaveBeenCalledTimes(3);
    });
  });
});

describe('Audit Service - Default Export', () => {
  it('should export auditLog function in default object', async () => {
    const auditServiceModule = await import('../../src/services/auditService.js');
    
    expect(auditServiceModule.default).toBeDefined();
    expect(auditServiceModule.default.auditLog).toBeDefined();
    expect(typeof auditServiceModule.default.auditLog).toBe('function');
  });
});
