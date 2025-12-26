/**
 * Audit Logger Middleware Unit Tests
 * Tests for comprehensive audit logging and data access tracking
 * Priority: P1 - Compliance and audit middleware
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies before importing
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: {
    logAudit: jest.fn().mockResolvedValue()
  }
}));

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
  }
}));

jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-1234')
}));

describe('Audit Logger Middleware', () => {
  let auditLogger;
  let AUDIT_EVENTS;
  let AUDIT_LEVELS;
  let getAuditLogs;
  let getAuditStatistics;
  let cleanupAuditLogs;
  let dbManager;
  let loggingService;
  let mockReq;
  let mockRes;
  let mockNext;
  let consoleErrorSpy;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Import modules after mocks are set up
    const dbModule = await import('../../src/database/db.enhanced.js');
    dbManager = dbModule.dbManager;
    
    const loggingModule = await import('../../src/services/loggingService.js');
    loggingService = loggingModule.default;
    
    const auditLoggerModule = await import('../../src/middleware/auditLogger.js');
    auditLogger = auditLoggerModule.default;
    AUDIT_EVENTS = auditLoggerModule.AUDIT_EVENTS;
    AUDIT_LEVELS = auditLoggerModule.AUDIT_LEVELS;
    getAuditLogs = auditLoggerModule.getAuditLogs;
    getAuditStatistics = auditLoggerModule.getAuditStatistics;
    cleanupAuditLogs = auditLoggerModule.cleanupAuditLogs;
    
    mockReq = {
      method: 'GET',
      path: '/api/visitors',
      originalUrl: '/api/visitors?page=1',
      query: { page: '1' },
      body: {},
      headers: {
        'user-agent': 'Mozilla/5.0',
        'content-type': 'application/json'
      },
      user: { id: 1, email: 'test@test.com', role: 'admin' },
      ip: '192.168.1.100',
      connection: { remoteAddress: '192.168.1.100' },
      get: jest.fn((header) => mockReq.headers[header.toLowerCase()]),
      requestId: 'request-123'
    };
    
    mockRes = {
      statusCode: 200,
      send: jest.fn(function(data) { return this; }),
      json: jest.fn(function(data) { return this; }),
      end: jest.fn(function(data) { return this; }),
      on: jest.fn((event, callback) => {
        if (event === 'finish') {
          // Store callback for later invocation
          mockRes._finishCallback = callback;
        }
      }),
      getHeaders: jest.fn().mockReturnValue({})
    };
    
    mockNext = jest.fn();
    
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('AUDIT_EVENTS', () => {
    it('should have authentication events', () => {
      expect(AUDIT_EVENTS.LOGIN_SUCCESS).toBe('auth.login.success');
      expect(AUDIT_EVENTS.LOGIN_FAILED).toBe('auth.login.failed');
      expect(AUDIT_EVENTS.LOGOUT).toBe('auth.logout');
      expect(AUDIT_EVENTS.TOKEN_REFRESH).toBe('auth.token.refresh');
      expect(AUDIT_EVENTS.PASSWORD_CHANGE).toBe('auth.password.change');
    });

    it('should have data access events', () => {
      expect(AUDIT_EVENTS.DATA_READ).toBe('data.read');
      expect(AUDIT_EVENTS.DATA_CREATE).toBe('data.create');
      expect(AUDIT_EVENTS.DATA_UPDATE).toBe('data.update');
      expect(AUDIT_EVENTS.DATA_DELETE).toBe('data.delete');
      // Note: DATA_EXPORT is defined twice in source - later privacy.data.export wins
      expect(AUDIT_EVENTS.DATA_EXPORT).toBe('privacy.data.export');
    });

    it('should have user management events', () => {
      expect(AUDIT_EVENTS.USER_CREATE).toBe('user.create');
      expect(AUDIT_EVENTS.USER_UPDATE).toBe('user.update');
      expect(AUDIT_EVENTS.USER_DELETE).toBe('user.delete');
      expect(AUDIT_EVENTS.USER_ACCESS).toBe('user.access');
    });

    it('should have visitor management events', () => {
      expect(AUDIT_EVENTS.VISITOR_CREATE).toBe('visitor.create');
      expect(AUDIT_EVENTS.VISITOR_READ).toBe('visitor.read');
      expect(AUDIT_EVENTS.VISITOR_CHECKIN).toBe('visitor.checkin');
      expect(AUDIT_EVENTS.VISITOR_CHECKOUT).toBe('visitor.checkout');
    });

    it('should have security events', () => {
      expect(AUDIT_EVENTS.SECURITY_ALERT).toBe('security.alert');
      expect(AUDIT_EVENTS.SUSPICIOUS_ACTIVITY).toBe('security.suspicious');
      expect(AUDIT_EVENTS.ACCESS_DENIED).toBe('security.access.denied');
      expect(AUDIT_EVENTS.RATE_LIMIT_EXCEEDED).toBe('security.rate_limit');
    });

    it('should have privacy events', () => {
      expect(AUDIT_EVENTS.CONSENT_GIVEN).toBe('privacy.consent.given');
      expect(AUDIT_EVENTS.CONSENT_WITHDRAWN).toBe('privacy.consent.withdrawn');
      expect(AUDIT_EVENTS.DATA_REQUEST).toBe('privacy.data.request');
      expect(AUDIT_EVENTS.DATA_DELETION).toBe('privacy.data.deletion');
    });
  });

  describe('AUDIT_LEVELS', () => {
    it('should have all log levels', () => {
      expect(AUDIT_LEVELS.INFO).toBe('info');
      expect(AUDIT_LEVELS.WARN).toBe('warn');
      expect(AUDIT_LEVELS.ERROR).toBe('error');
      expect(AUDIT_LEVELS.CRITICAL).toBe('critical');
    });
  });

  describe('auditLogger middleware', () => {
    it('should return a middleware function when called with options', () => {
      const middleware = auditLogger({});
      expect(typeof middleware).toBe('function');
    });

    it('should call next()', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should add auditId to request', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditId).toBeDefined();
    });

    it('should add auditStartTime to request', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditStartTime).toBeDefined();
      expect(typeof mockReq.auditStartTime).toBe('number');
    });

    it('should add audit helper function to request', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(typeof mockReq.audit).toBe('function');
    });

    it('should skip excluded paths', async () => {
      mockReq.path = '/health';
      const middleware = auditLogger({ excludePaths: ['/health'] });
      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      // Should not set up response logging for excluded paths
    });

    it('should skip /api/health path by default', async () => {
      mockReq.path = '/api/health';
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should override res.send to capture response', async () => {
      const originalSend = mockRes.send;
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockRes.send).not.toBe(originalSend);
    });

    it('should override res.json to capture response', async () => {
      const originalJson = mockRes.json;
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockRes.json).not.toBe(originalJson);
    });

    it('should override res.end to capture response', async () => {
      const originalEnd = mockRes.end;
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockRes.end).not.toBe(originalEnd);
    });

    it('should handle direct middleware usage (req, res, next)', async () => {
      // Call auditLogger directly with req, res, next
      await auditLogger(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set up finish event listener', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('req.audit helper', () => {
    it('should insert audit log to database', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      
      await mockReq.audit('test_action', 'test_entity', 123, { extra: 'data' });
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.any(Array)
      );
    });

    it('should handle database errors silently', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('DB error'));
      
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      
      // Should not throw
      await expect(mockReq.audit('action', 'entity', 1)).resolves.not.toThrow();
    });

    it('should use request user info', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      
      await mockReq.audit('action', 'entity', 1);
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([1, 'admin']) // user_id and user_role
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should query audit logs with default filters', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      
      await getAuditLogs();
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM audit_logs'),
        expect.arrayContaining([100, 0]) // default limit and offset
      );
    });

    it('should filter by userId', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      
      await getAuditLogs({ userId: 5 });
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1'),
        expect.arrayContaining([5])
      );
    });

    it('should filter by eventType', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      
      await getAuditLogs({ eventType: 'auth.login.success' });
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('action = $'),
        expect.arrayContaining(['auth.login.success'])
      );
    });

    it('should filter by level', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      
      await getAuditLogs({ level: 'warn' });
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining("details::json->>'level'"),
        expect.arrayContaining(['warn'])
      );
    });

    it('should filter by date range', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      
      await getAuditLogs({ startDate, endDate });
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at >='),
        expect.arrayContaining([startDate, endDate])
      );
    });

    it('should apply custom limit and offset', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      
      await getAuditLogs({ limit: 50, offset: 10 });
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([50, 10])
      );
    });

    it('should return rows from query result', async () => {
      const mockRows = [{ id: 1 }, { id: 2 }];
      dbManager.query.mockResolvedValueOnce({ rows: mockRows });
      
      const result = await getAuditLogs();
      
      expect(result).toEqual(mockRows);
    });

    it('should throw on database error', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('DB error'));
      
      await expect(getAuditLogs()).rejects.toThrow('DB error');
    });
  });

  describe('getAuditStatistics', () => {
    it('should query statistics with default 24h period', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      
      await getAuditStatistics();
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '24 hours'")
      );
    });

    it('should support 1h period', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      
      await getAuditStatistics('1h');
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '1 hour'")
      );
    });

    it('should support 7d period', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      
      await getAuditStatistics('7d');
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '7 days'")
      );
    });

    it('should support 30d period', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      
      await getAuditStatistics('30d');
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '30 days'")
      );
    });

    it('should return statistics rows', async () => {
      const mockStats = [
        { event_type: 'auth.login.success', count: 100 },
        { event_type: 'data.read', count: 50 }
      ];
      dbManager.query.mockResolvedValueOnce({ rows: mockStats });
      
      const result = await getAuditStatistics();
      
      expect(result).toEqual(mockStats);
    });

    it('should throw on database error', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('Stats error'));
      
      await expect(getAuditStatistics()).rejects.toThrow('Stats error');
    });
  });

  describe('cleanupAuditLogs', () => {
    it('should delete logs older than 90 days by default', async () => {
      dbManager.query.mockResolvedValueOnce({ rowCount: 10 });
      
      await cleanupAuditLogs();
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '90 days'")
      );
    });

    it('should use custom retention days', async () => {
      dbManager.query.mockResolvedValueOnce({ rowCount: 5 });
      
      await cleanupAuditLogs(30);
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '30 days'")
      );
    });

    it('should return number of deleted rows', async () => {
      dbManager.query.mockResolvedValueOnce({ rowCount: 25 });
      
      const result = await cleanupAuditLogs();
      
      expect(result).toBe(25);
    });

    it('should throw on database error', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('Cleanup error'));
      
      await expect(cleanupAuditLogs()).rejects.toThrow('Cleanup error');
    });
  });
});
