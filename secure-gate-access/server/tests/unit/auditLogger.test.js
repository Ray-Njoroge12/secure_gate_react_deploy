/**
 * Unit Tests for auditLogger.js (Service)
 * Tests security audit logging functionality
 * 
 * Coverage:
 * - Audit event creation and logging
 * - File-based logging with rotation
 * - Database logging
 * - Event categorization and severity
 * - Risk score calculation
 * - Security alerts and thresholds
 * - Log cleanup and retention
 * - Convenience logging methods
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Mock dependencies
const mockFs = {
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    appendFile: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ size: 1024 }),
    rename: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue([]),
    unlink: jest.fn().mockResolvedValue(undefined)
  }
};

const mockDbManager = {
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [] })
  }
};

// Mock modules
jest.unstable_mockModule('fs', () => ({
  default: mockFs,
  promises: mockFs.promises
}));

jest.unstable_mockModule('../../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

describe('auditLogger', () => {
  let auditLogger;
  let SecurityAuditLogger;
  let originalEnv;
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeAll(async () => {
    // Save original env and console
    originalEnv = { ...process.env };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.AUDIT_LOG_DIR = '/test/logs';
    process.env.AUDIT_RETENTION_DAYS = '30';
    process.env.AUDIT_MAX_LOG_SIZE_MB = '50';
    process.env.AUDIT_DB_LOGGING = 'true';
    process.env.AUDIT_FILE_LOGGING = 'true';
    process.env.SECURITY_ALERT_THRESHOLD = '3';

    // Import service after mocks
    const module = await import('../../../src/services/auditLogger.js');
    auditLogger = module.default;
    SecurityAuditLogger = module.SecurityAuditLogger;
  });

  afterAll(() => {
    // Restore environment and console
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(auditLogger).toBeDefined();
      expect(auditLogger.logDir).toBe('/test/logs');
      expect(auditLogger.retentionDays).toBe(30);
      expect(auditLogger.maxLogSizeMB).toBe(50);
      expect(auditLogger.alertThreshold).toBe(3);
    });

    it('should create log directory on initialization', () => {
      expect(mockFs.promises.mkdir).toHaveBeenCalledWith(
        '/test/logs',
        { recursive: true }
      );
    });

    it('should use default values when env vars not set', async () => {
      delete process.env.AUDIT_RETENTION_DAYS;
      delete process.env.AUDIT_MAX_LOG_SIZE_MB;

      jest.resetModules();
      const module = await import('../../../src/services/auditLogger.js');
      const logger = module.default;

      expect(logger.retentionDays).toBe(90);
      expect(logger.maxLogSizeMB).toBe(100);

      // Restore
      process.env.AUDIT_RETENTION_DAYS = '30';
      process.env.AUDIT_MAX_LOG_SIZE_MB = '50';
    });
  });

  describe('Event Categorization', () => {
    it('should categorize authentication events', () => {
      expect(auditLogger.categorizeEvent('user.login.success')).toBe('AUTH');
      expect(auditLogger.categorizeEvent('user.login.failure')).toBe('AUTH');
      expect(auditLogger.categorizeEvent('user.logout')).toBe('AUTH');
      expect(auditLogger.categorizeEvent('user.password.change')).toBe('AUTH');
      expect(auditLogger.categorizeEvent('user.account.locked')).toBe('AUTH');
    });

    it('should categorize authorization events', () => {
      expect(auditLogger.categorizeEvent('access.granted')).toBe('AUTHZ');
      expect(auditLogger.categorizeEvent('access.denied')).toBe('AUTHZ');
      expect(auditLogger.categorizeEvent('privilege.escalation')).toBe('AUTHZ');
    });

    it('should categorize data events', () => {
      expect(auditLogger.categorizeEvent('data.access')).toBe('DATA');
      expect(auditLogger.categorizeEvent('data.modify')).toBe('DATA');
      expect(auditLogger.categorizeEvent('data.delete')).toBe('DATA');
      expect(auditLogger.categorizeEvent('data.export')).toBe('DATA');
    });

    it('should categorize security events', () => {
      expect(auditLogger.categorizeEvent('security.rate_limit')).toBe('SECURITY');
      expect(auditLogger.categorizeEvent('security.suspicious_activity')).toBe('SECURITY');
      expect(auditLogger.categorizeEvent('security.brute_force')).toBe('SECURITY');
      expect(auditLogger.categorizeEvent('security.injection_attempt')).toBe('SECURITY');
    });

    it('should categorize system events', () => {
      expect(auditLogger.categorizeEvent('system.startup')).toBe('SYSTEM');
      expect(auditLogger.categorizeEvent('system.shutdown')).toBe('SYSTEM');
      expect(auditLogger.categorizeEvent('system.error')).toBe('SYSTEM');
    });

    it('should return OTHER for unknown events', () => {
      expect(auditLogger.categorizeEvent('unknown.event')).toBe('OTHER');
      expect(auditLogger.categorizeEvent('custom.event')).toBe('OTHER');
    });
  });

  describe('Severity Calculation', () => {
    it('should assign HIGH severity to critical events', () => {
      expect(auditLogger.calculateSeverity('user.login.failure')).toBe('HIGH');
      expect(auditLogger.calculateSeverity('user.account.locked')).toBe('HIGH');
      expect(auditLogger.calculateSeverity('access.denied')).toBe('HIGH');
      expect(auditLogger.calculateSeverity('privilege.escalation')).toBe('HIGH');
      expect(auditLogger.calculateSeverity('security.brute_force')).toBe('HIGH');
      expect(auditLogger.calculateSeverity('security.injection_attempt')).toBe('HIGH');
      expect(auditLogger.calculateSeverity('data.delete')).toBe('HIGH');
      expect(auditLogger.calculateSeverity('system.error')).toBe('HIGH');
    });

    it('should assign MEDIUM severity to moderate events', () => {
      expect(auditLogger.calculateSeverity('user.password.change')).toBe('MEDIUM');
      expect(auditLogger.calculateSeverity('data.modify')).toBe('MEDIUM');
      expect(auditLogger.calculateSeverity('data.export')).toBe('MEDIUM');
      expect(auditLogger.calculateSeverity('security.rate_limit')).toBe('MEDIUM');
      expect(auditLogger.calculateSeverity('security.suspicious_activity')).toBe('MEDIUM');
    });

    it('should assign LOW severity to routine events', () => {
      expect(auditLogger.calculateSeverity('user.login.success')).toBe('LOW');
      expect(auditLogger.calculateSeverity('user.logout')).toBe('LOW');
      expect(auditLogger.calculateSeverity('access.granted')).toBe('LOW');
      expect(auditLogger.calculateSeverity('data.access')).toBe('LOW');
    });
  });

  describe('Risk Score Calculation', () => {
    it('should calculate base risk scores', () => {
      const score1 = auditLogger.calculateRiskScore('user.login.failure', {}, {});
      expect(score1).toBeGreaterThanOrEqual(20);

      const score2 = auditLogger.calculateRiskScore('security.brute_force', {}, {});
      expect(score2).toBeGreaterThanOrEqual(80);

      const score3 = auditLogger.calculateRiskScore('security.injection_attempt', {}, {});
      expect(score3).toBeGreaterThanOrEqual(90);
    });

    it('should increase score for repeated attempts', () => {
      const baseScore = auditLogger.calculateRiskScore('user.login.failure', {}, {});
      const repeatedScore = auditLogger.calculateRiskScore('user.login.failure', { attemptCount: 5 }, {});

      expect(repeatedScore).toBeGreaterThan(baseScore);
    });

    it('should cap risk score at 100', () => {
      const score = auditLogger.calculateRiskScore(
        'security.injection_attempt',
        { attemptCount: 100 },
        {}
      );

      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle events without specific risk scores', () => {
      const score = auditLogger.calculateRiskScore('unknown.event', {}, {});
      expect(score).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Event Creation', () => {
    it('should create complete audit event', () => {
      const eventType = 'user.login.success';
      const data = { username: 'testuser' };
      const context = {
        userId: 123,
        sessionId: 'sess_123',
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent',
        requestId: 'req_123'
      };

      const event = auditLogger.createAuditEvent(eventType, data, context);

      expect(event).toMatchObject({
        eventType: 'user.login.success',
        category: 'AUTH',
        severity: 'LOW',
        userId: 123,
        sessionId: 'sess_123',
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent',
        requestId: 'req_123'
      });

      expect(event.id).toMatch(/^audit_/);
      expect(event.timestamp).toBeDefined();
      expect(event.riskScore).toBeGreaterThanOrEqual(0);
      expect(event.data).toMatchObject({
        username: 'testuser',
        metadata: expect.any(Object)
      });
    });

    it('should handle missing context fields', () => {
      const event = auditLogger.createAuditEvent('user.logout', {}, {});

      expect(event.userId).toBeNull();
      expect(event.sessionId).toBeNull();
      expect(event.ipAddress).toBeNull();
      expect(event.userAgent).toBeNull();
    });

    it('should generate unique event IDs', () => {
      const event1 = auditLogger.createAuditEvent('test.event', {}, {});
      const event2 = auditLogger.createAuditEvent('test.event', {}, {});

      expect(event1.id).not.toBe(event2.id);
    });
  });

  describe('File Logging', () => {
    it('should log events to file', async () => {
      const event = {
        id: 'test_123',
        timestamp: new Date().toISOString(),
        eventType: 'test.event',
        data: { test: true }
      };

      await auditLogger.logToFile(event);

      expect(mockFs.promises.appendFile).toHaveBeenCalled();
      const callArgs = mockFs.promises.appendFile.mock.calls[0];
      expect(callArgs[0]).toContain('security-audit-');
      expect(callArgs[0]).toContain('.log');
      expect(callArgs[1]).toContain('"id":"test_123"');
    });

    it('should check file size after logging', async () => {
      const event = { id: 'test_123', data: {} };

      await auditLogger.logToFile(event);

      expect(mockFs.promises.stat).toHaveBeenCalled();
    });

    it('should rotate log when size exceeds limit', async () => {
      mockFs.promises.stat.mockResolvedValueOnce({
        size: 60 * 1024 * 1024 // 60MB (exceeds 50MB limit)
      });

      const event = { id: 'test_123', data: {} };

      await auditLogger.logToFile(event);

      expect(mockFs.promises.rename).toHaveBeenCalled();
    });

    it('should handle file write errors', async () => {
      mockFs.promises.appendFile.mockRejectedValueOnce(new Error('Write failed'));

      const event = { id: 'test_123', data: {} };

      await auditLogger.logToFile(event);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write to audit log file'),
        expect.any(Error)
      );
    });
  });

  describe('Database Logging', () => {
    it('should log events to database', async () => {
      const event = {
        eventType: 'user.login.success',
        category: 'AUTH',
        severity: 'LOW',
        userId: 123,
        sessionId: 'sess_123',
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent',
        data: { test: true },
        riskScore: 10
      };

      await auditLogger.logToDatabase(event);

      expect(mockDbManager.pool.query).toHaveBeenCalled();
      const callArgs = mockDbManager.pool.query.mock.calls[0];
      expect(callArgs[0]).toContain('INSERT INTO audit_logs');
      expect(callArgs[1]).toContain(123); // userId
      expect(callArgs[1]).toContain('192.168.1.1'); // ipAddress
    });

    it('should handle database write errors', async () => {
      mockDbManager.pool.query.mockRejectedValueOnce(new Error('DB write failed'));

      const event = {
        eventType: 'test.event',
        category: 'OTHER',
        severity: 'LOW',
        data: {}
      };

      await auditLogger.logToDatabase(event);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write to audit database'),
        expect.any(Error)
      );
    });
  });

  describe('Security Logging', () => {
    it('should log complete security event', async () => {
      const eventType = 'user.login.failure';
      const data = { reason: 'invalid_password' };
      const context = {
        userId: 123,
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent'
      };

      await auditLogger.logSecurityEvent(eventType, data, context);

      expect(mockFs.promises.appendFile).toHaveBeenCalled();
      expect(mockDbManager.pool.query).toHaveBeenCalled();
    });

    it('should log to console in non-production', async () => {
      process.env.NODE_ENV = 'development';

      await auditLogger.logSecurityEvent('test.event', {}, {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT]')
      );

      process.env.NODE_ENV = 'test';
    });

    it('should handle logging failures gracefully', async () => {
      mockFs.promises.appendFile.mockRejectedValueOnce(new Error('Write failed'));
      mockDbManager.pool.query.mockRejectedValueOnce(new Error('DB failed'));

      await auditLogger.logSecurityEvent('test.event', {}, {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Audit logging failed'),
        expect.any(Error)
      );
    });
  });

  describe('Security Alerts', () => {
    beforeEach(() => {
      // Clear event counts
      auditLogger.eventCounts.clear();
    });

    it('should trigger alert when threshold exceeded', async () => {
      const event = {
        eventType: 'security.brute_force',
        severity: 'HIGH',
        ipAddress: '10.0.0.1',
        userId: 123,
        riskScore: 80,
        data: {}
      };

      // Log events until threshold
      for (let i = 0; i < 3; i++) {
        await auditLogger.checkSecurityAlerts(event);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY ALERT'),
        expect.any(String)
      );
    });

    it('should not trigger alert for low severity events', async () => {
      const event = {
        eventType: 'user.login.success',
        severity: 'LOW',
        ipAddress: '10.0.0.1',
        data: {}
      };

      await auditLogger.checkSecurityAlerts(event);

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('SECURITY ALERT'),
        expect.any(String)
      );
    });

    it('should track events by IP and type', async () => {
      const event1 = {
        eventType: 'user.login.failure',
        severity: 'HIGH',
        ipAddress: '10.0.0.1',
        data: {}
      };

      const event2 = {
        eventType: 'user.login.failure',
        severity: 'HIGH',
        ipAddress: '10.0.0.2',
        data: {}
      };

      await auditLogger.checkSecurityAlerts(event1);
      await auditLogger.checkSecurityAlerts(event2);

      // Should track separately
      expect(auditLogger.eventCounts.size).toBe(2);
    });
  });

  describe('Log Cleanup', () => {
    it('should cleanup old log files', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days old

      mockFs.promises.readdir.mockResolvedValueOnce([
        'security-audit-2024-01-01.log',
        'security-audit-2024-12-01.log',
        'other-file.txt'
      ]);

      mockFs.promises.stat.mockImplementation((filePath) => {
        if (filePath.includes('2024-01-01')) {
          return Promise.resolve({ mtime: oldDate });
        }
        return Promise.resolve({ mtime: new Date() });
      });

      await auditLogger.cleanupOldLogs();

      expect(mockFs.promises.unlink).toHaveBeenCalled();
    });

    it('should skip non-audit log files', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce([
        'error.log',
        'access.log',
        'random.txt'
      ]);

      await auditLogger.cleanupOldLogs();

      expect(mockFs.promises.stat).not.toHaveBeenCalled();
      expect(mockFs.promises.unlink).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      mockFs.promises.readdir.mockRejectedValueOnce(new Error('Read failed'));

      await auditLogger.cleanupOldLogs();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup old logs'),
        expect.any(Error)
      );
    });
  });

  describe('Convenience Methods', () => {
    it('should log successful login', async () => {
      await auditLogger.logLoginAttempt(
        true,
        123,
        '192.168.1.1',
        'TestAgent',
        'sess_123'
      );

      expect(mockFs.promises.appendFile).toHaveBeenCalled();
      const logData = mockFs.promises.appendFile.mock.calls[0][1];
      expect(logData).toContain('user.login.success');
    });

    it('should log failed login', async () => {
      await auditLogger.logLoginAttempt(
        false,
        null,
        '192.168.1.1',
        'TestAgent',
        null
      );

      expect(mockFs.promises.appendFile).toHaveBeenCalled();
      const logData = mockFs.promises.appendFile.mock.calls[0][1];
      expect(logData).toContain('user.login.failure');
    });

    it('should log password change', async () => {
      await auditLogger.logPasswordChange(
        123,
        '192.168.1.1',
        'TestAgent',
        'sess_123'
      );

      expect(mockFs.promises.appendFile).toHaveBeenCalled();
      const logData = mockFs.promises.appendFile.mock.calls[0][1];
      expect(logData).toContain('user.password.change');
    });

    it('should log account lockout', async () => {
      await auditLogger.logAccountLockout(
        123,
        '192.168.1.1',
        'too_many_attempts',
        5
      );

      expect(mockFs.promises.appendFile).toHaveBeenCalled();
      const logData = mockFs.promises.appendFile.mock.calls[0][1];
      expect(logData).toContain('user.account.locked');
      expect(logData).toContain('too_many_attempts');
    });

    it('should log access denied', async () => {
      await auditLogger.logAccessDenied(
        123,
        '/admin/users',
        'insufficient_privileges',
        '192.168.1.1',
        'TestAgent'
      );

      expect(mockFs.promises.appendFile).toHaveBeenCalled();
      const logData = mockFs.promises.appendFile.mock.calls[0][1];
      expect(logData).toContain('access.denied');
      expect(logData).toContain('/admin/users');
    });

    it('should log data access', async () => {
      await auditLogger.logDataAccess(
        123,
        'visitor_records',
        456,
        '192.168.1.1',
        'TestAgent',
        'sess_123'
      );

      expect(mockFs.promises.appendFile).toHaveBeenCalled();
      const logData = mockFs.promises.appendFile.mock.calls[0][1];
      expect(logData).toContain('data.access');
      expect(logData).toContain('visitor_records');
    });

    it('should log rate limit exceeded', async () => {
      await auditLogger.logRateLimitExceeded(
        '192.168.1.1',
        '/api/login',
        10,
        'TestAgent'
      );

      expect(mockFs.promises.appendFile).toHaveBeenCalled();
      const logData = mockFs.promises.appendFile.mock.calls[0][1];
      expect(logData).toContain('security.rate_limit');
      expect(logData).toContain('/api/login');
    });
  });

  describe('Utility Methods', () => {
    it('should generate unique event IDs', () => {
      const id1 = auditLogger.generateEventId();
      const id2 = auditLogger.generateEventId();

      expect(id1).toMatch(/^audit_[a-z0-9]+_[a-z0-9]+$/);
      expect(id2).toMatch(/^audit_[a-z0-9]+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate date string for filenames', () => {
      const dateStr = auditLogger.getDateString();
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should get severity emoji', () => {
      expect(auditLogger.getSeverityEmoji('LOW')).toBe('📝');
      expect(auditLogger.getSeverityEmoji('MEDIUM')).toBe('⚠️');
      expect(auditLogger.getSeverityEmoji('HIGH')).toBe('🚨');
      expect(auditLogger.getSeverityEmoji('UNKNOWN')).toBe('📋');
    });
  });

  describe('Module Exports', () => {
    it('should export default audit logger instance', () => {
      expect(auditLogger).toBeDefined();
      expect(auditLogger.logSecurityEvent).toBeDefined();
      expect(auditLogger.logLoginAttempt).toBeDefined();
      expect(auditLogger.logPasswordChange).toBeDefined();
    });

    it('should be a singleton instance', () => {
      expect(auditLogger.constructor.name).toBe('SecurityAuditLogger');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large event data', async () => {
      const largeData = {
        details: 'x'.repeat(10000),
        metadata: Array(100).fill({ key: 'value' })
      };

      await auditLogger.logSecurityEvent('test.event', largeData, {});

      expect(mockFs.promises.appendFile).toHaveBeenCalled();
    });

    it('should handle special characters in event data', async () => {
      const specialData = {
        message: 'Test with "quotes" and \\backslashes\\',
        unicode: '测试 🎉'
      };

      await auditLogger.logSecurityEvent('test.event', specialData, {});

      expect(mockFs.promises.appendFile).toHaveBeenCalled();
    });

    it('should handle null and undefined values', async () => {
      const data = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: ''
      };

      await auditLogger.logSecurityEvent('test.event', data, {});

      expect(mockFs.promises.appendFile).toHaveBeenCalled();
    });

    it('should handle IPv6 addresses', () => {
      const event = auditLogger.createAuditEvent('test.event', {}, {
        ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
      });

      expect(event.ipAddress).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });
  });
});
