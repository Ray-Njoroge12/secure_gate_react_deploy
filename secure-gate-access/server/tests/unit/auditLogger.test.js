/**
 * Audit Logger Middleware Unit Tests
 * Tests for comprehensive audit logging for data access tracking
 * and compliance with Kenya DPA 2019 requirements.
 * Priority: P1 - Core audit middleware
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies before importing
const mockDbManager = {
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
};

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: {
    logAudit: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager,
  db: mockDbManager,
  default: mockDbManager
}));

jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-12345')
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
  let originalEnv;
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    originalEnv = process.env.NODE_ENV;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

    // Import modules after mocks are set up
    const dbModule = await import('../../src/database/db.enhanced.js');
    dbManager = dbModule.dbManager;

    const loggingModule = await import('../../src/services/loggingService.js');
    loggingService = loggingModule.default;

    const auditModule = await import('../../src/middleware/auditLogger.js');
    auditLogger = auditModule.default;
    AUDIT_EVENTS = auditModule.AUDIT_EVENTS;
    AUDIT_LEVELS = auditModule.AUDIT_LEVELS;
    getAuditLogs = auditModule.getAuditLogs;
    getAuditStatistics = auditModule.getAuditStatistics;
    cleanupAuditLogs = auditModule.cleanupAuditLogs;

    mockReq = {
      headers: {
        'user-agent': 'Mozilla/5.0',
        'x-request-id': 'test-request-123',
        'content-length': '100'
      },
      method: 'GET',
      url: '/api/test',
      originalUrl: '/api/test',
      path: '/api/test',
      query: { limit: 10 },
      body: { data: 'test' },
      ip: '192.168.1.100',
      connection: { remoteAddress: '192.168.1.100' },
      user: { id: 1, email: 'test@example.com', role: 'admin' },
      get: jest.fn((header) => {
        const headers = {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Content-Length': '100',
          'API-Version': '1.0',
          'X-Client-ID': 'client-123'
        };
        return headers[header];
      })
    };

    mockRes = {
      statusCode: 200,
      send: jest.fn(function (data) { return this; }),
      json: jest.fn(function (data) { return this; }),
      end: jest.fn(function (data) { return this; }),
      on: jest.fn(),
      getHeaders: jest.fn().mockReturnValue({
        'content-type': 'application/json',
        'x-powered-by': 'Express'
      })
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('AUDIT_EVENTS', () => {
    it('should define authentication event types', () => {
      expect(AUDIT_EVENTS.LOGIN_SUCCESS).toBe('auth.login.success');
      expect(AUDIT_EVENTS.LOGIN_FAILED).toBe('auth.login.failed');
      expect(AUDIT_EVENTS.LOGOUT).toBe('auth.logout');
      expect(AUDIT_EVENTS.TOKEN_REFRESH).toBe('auth.token.refresh');
      expect(AUDIT_EVENTS.PASSWORD_CHANGE).toBe('auth.password.change');
    });

    it('should define data access event types', () => {
      expect(AUDIT_EVENTS.DATA_READ).toBe('data.read');
      expect(AUDIT_EVENTS.DATA_CREATE).toBe('data.create');
      expect(AUDIT_EVENTS.DATA_UPDATE).toBe('data.update');
      expect(AUDIT_EVENTS.DATA_DELETE).toBe('data.delete');
      // Note: DATA_EXPORT is defined twice in source - later privacy.data.export wins
      expect(AUDIT_EVENTS.DATA_EXPORT).toBe('privacy.data.export');
    });

    it('should define user management event types', () => {
      expect(AUDIT_EVENTS.USER_CREATE).toBe('user.create');
      expect(AUDIT_EVENTS.USER_UPDATE).toBe('user.update');
      expect(AUDIT_EVENTS.USER_DELETE).toBe('user.delete');
      expect(AUDIT_EVENTS.USER_ACCESS).toBe('user.access');
    });

    it('should define visitor management event types', () => {
      expect(AUDIT_EVENTS.VISITOR_CREATE).toBe('visitor.create');
      expect(AUDIT_EVENTS.VISITOR_READ).toBe('visitor.read');
      expect(AUDIT_EVENTS.VISITOR_UPDATE).toBe('visitor.update');
      expect(AUDIT_EVENTS.VISITOR_DELETE).toBe('visitor.delete');
      expect(AUDIT_EVENTS.VISITOR_CHECKIN).toBe('visitor.checkin');
      expect(AUDIT_EVENTS.VISITOR_CHECKOUT).toBe('visitor.checkout');
    });

    it('should define administrative event types', () => {
      expect(AUDIT_EVENTS.ADMIN_ACCESS).toBe('admin.access');
      expect(AUDIT_EVENTS.ADMIN_ACTION).toBe('admin.action');
      expect(AUDIT_EVENTS.SYSTEM_CONFIG).toBe('system.config');
      expect(AUDIT_EVENTS.BACKUP_TRIGGER).toBe('backup.trigger');
    });

    it('should define security event types', () => {
      expect(AUDIT_EVENTS.SECURITY_ALERT).toBe('security.alert');
      expect(AUDIT_EVENTS.SUSPICIOUS_ACTIVITY).toBe('security.suspicious');
      expect(AUDIT_EVENTS.ACCESS_DENIED).toBe('security.access.denied');
      expect(AUDIT_EVENTS.RATE_LIMIT_EXCEEDED).toBe('security.rate_limit');
    });

    it('should define data privacy event types', () => {
      expect(AUDIT_EVENTS.CONSENT_GIVEN).toBe('privacy.consent.given');
      expect(AUDIT_EVENTS.CONSENT_WITHDRAWN).toBe('privacy.consent.withdrawn');
      expect(AUDIT_EVENTS.DATA_REQUEST).toBe('privacy.data.request');
      expect(AUDIT_EVENTS.DATA_DELETION).toBe('privacy.data.deletion');
    });
  });

  describe('AUDIT_LEVELS', () => {
    it('should define all audit levels', () => {
      expect(AUDIT_LEVELS.INFO).toBe('info');
      expect(AUDIT_LEVELS.WARN).toBe('warn');
      expect(AUDIT_LEVELS.ERROR).toBe('error');
      expect(AUDIT_LEVELS.CRITICAL).toBe('critical');
    });
  });

  describe('auditLogger middleware', () => {
    it('should return middleware function when called with options', () => {
      const middleware = auditLogger({});
      expect(typeof middleware).toBe('function');
    });

    it('should call next() for normal requests', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach auditId to request', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditId).toBeDefined();
      expect(mockReq.auditId).toBe('mock-uuid-12345');
    });

    it('should attach audit helper to request', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.audit).toBeDefined();
      expect(typeof mockReq.audit).toBe('function');
    });

    it('should attach auditStartTime to request', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditStartTime).toBeDefined();
      expect(typeof mockReq.auditStartTime).toBe('number');
    });

    it('should skip logging for excluded paths', async () => {
      mockReq.path = '/health';
      const middleware = auditLogger({ excludePaths: ['/health', '/api/health'] });
      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      // No audit data should be attached for excluded paths
    });

    it('should skip logging for health check path by default', async () => {
      mockReq.path = '/api/health';
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should override res.send method', async () => {
      const originalSend = mockRes.send;
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockRes.send).not.toBe(originalSend);
    });

    it('should override res.json method', async () => {
      const originalJson = mockRes.json;
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockRes.json).not.toBe(originalJson);
    });

    it('should override res.end method', async () => {
      const originalEnd = mockRes.end;
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockRes.end).not.toBe(originalEnd);
    });

    it('should capture response body from res.send', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      mockRes.send('test response');
      expect(mockReq.auditData).toBeDefined();
    });

    it('should capture response body from res.json', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      mockRes.json({ success: true });
      expect(mockReq.auditData).toBeDefined();
    });

    it('should set up response finish handler', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should handle direct middleware usage (req, res, next)', async () => {
      // Some routes call auditLogger(req, res, next) directly
      await auditLogger(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should respect custom sensitive fields option', async () => {
      const middleware = auditLogger({
        sensitiveFields: ['password', 'secret', 'creditCard']
      });
      mockReq.body = { password: 'secret123', name: 'John' };
      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should respect includeRequestBody option', async () => {
      const middleware = auditLogger({ includeRequestBody: true });
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditData.request.body).not.toBeNull();
    });

    it('should not include request body by default', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditData.request.body).toBeNull();
    });

    it('should respect custom logLevel option', async () => {
      const middleware = auditLogger({ logLevel: AUDIT_LEVELS.WARN });
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditData.level).toBe(AUDIT_LEVELS.WARN);
    });

    it('should use INFO log level by default', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditData.level).toBe(AUDIT_LEVELS.INFO);
    });
  });

  describe('req.audit helper function', () => {
    it('should insert audit log into database', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      await mockReq.audit('user.create', 'user', 123, { name: 'Test User' });

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.any(Array)
      );
    });

    it('should handle database errors silently', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('DB Error'));

      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      // Should not throw
      await expect(mockReq.audit('test.action', 'test', 1)).resolves.toBeUndefined();
    });

    it('should use request user information if available', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      await mockReq.audit('data.read', 'document', 456);

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([mockReq.user.id, mockReq.user.role])
      );
    });

    it('should truncate action to 100 characters', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      const longAction = 'a'.repeat(150);
      await mockReq.audit(longAction, 'test', 1);

      const callArgs = dbManager.query.mock.calls[0][1];
      expect(callArgs[0].length).toBeLessThanOrEqual(100);
    });

    it('should truncate resource to 100 characters', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      const longResource = 'b'.repeat(150);
      await mockReq.audit('test', longResource, 1);

      const callArgs = dbManager.query.mock.calls[0][1];
      expect(callArgs[1].length).toBeLessThanOrEqual(100);
    });
  });

  describe('Event type determination', () => {
    it('should determine LOGIN_SUCCESS for login paths', async () => {
      mockReq.path = '/auth/login';
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditData.event).toBe(AUDIT_EVENTS.LOGIN_SUCCESS);
    });

    it('should determine LOGOUT for logout paths', async () => {
      mockReq.path = '/auth/logout';
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditData.event).toBe(AUDIT_EVENTS.LOGOUT);
    });

    it('should determine TOKEN_REFRESH for refresh paths', async () => {
      mockReq.path = '/auth/refresh';
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditData.event).toBe(AUDIT_EVENTS.TOKEN_REFRESH);
    });

    it('should determine DATA_READ for GET requests', async () => {
      mockReq.method = 'GET';
      mockReq.path = '/api/users';
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditData.event).toBe(AUDIT_EVENTS.DATA_READ);
    });

    it('should determine DATA_CREATE for POST requests', async () => {
      mockReq.method = 'POST';
      mockReq.path = '/api/users';
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditData.event).toBe(AUDIT_EVENTS.DATA_CREATE);
    });

    it('should determine DATA_UPDATE for PUT requests', async () => {
      mockReq.method = 'PUT';
      mockReq.path = '/api/users/1';
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditData.event).toBe(AUDIT_EVENTS.DATA_UPDATE);
    });

    it('should determine DATA_UPDATE for PATCH requests', async () => {
      mockReq.method = 'PATCH';
      mockReq.path = '/api/users/1';
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditData.event).toBe(AUDIT_EVENTS.DATA_UPDATE);
    });

    it('should determine DATA_DELETE for DELETE requests', async () => {
      mockReq.method = 'DELETE';
      mockReq.path = '/api/users/1';
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);
      expect(mockReq.auditData.event).toBe(AUDIT_EVENTS.DATA_DELETE);
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with default filters', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [{ id: 1, action: 'test' }] });

      const result = await getAuditLogs();

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM audit_logs'),
        expect.any(Array)
      );
      expect(result).toEqual([{ id: 1, action: 'test' }]);
    });

    it('should filter by userId', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      await getAuditLogs({ userId: 123 });

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $'),
        expect.arrayContaining([123])
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
        expect.stringContaining("details::json->>'level' = $"),
        expect.arrayContaining(['warn'])
      );
    });

    it('should filter by date range', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      await getAuditLogs({ startDate, endDate });

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= $'),
        expect.arrayContaining([startDate, endDate])
      );
    });

    it('should apply limit and offset', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      await getAuditLogs({ limit: 50, offset: 100 });

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([50, 100])
      );
    });

    it('should use default limit of 100 and offset of 0', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      await getAuditLogs({});

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([100, 0])
      );
    });

    it('should throw error on database failure', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('DB Error'));

      await expect(getAuditLogs()).rejects.toThrow('DB Error');
    });
  });

  describe('getAuditStatistics', () => {
    it('should retrieve statistics for 24h period by default', async () => {
      dbManager.query.mockResolvedValueOnce({
        rows: [{ event_type: 'auth.login', count: 100 }]
      });

      const result = await getAuditStatistics();

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('24 hours')
      );
      expect(result).toEqual([{ event_type: 'auth.login', count: 100 }]);
    });

    it('should retrieve statistics for 1h period', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      await getAuditStatistics('1h');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('1 hour')
      );
    });

    it('should retrieve statistics for 7d period', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      await getAuditStatistics('7d');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('7 days')
      );
    });

    it('should retrieve statistics for 30d period', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      await getAuditStatistics('30d');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('30 days')
      );
    });

    it('should default to 24 hours for unknown period', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      await getAuditStatistics('unknown');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('24 hours')
      );
    });

    it('should throw error on database failure', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('DB Error'));

      await expect(getAuditStatistics()).rejects.toThrow('DB Error');
    });
  });

  describe('cleanupAuditLogs', () => {
    it('should delete logs older than 90 days by default', async () => {
      dbManager.query.mockResolvedValueOnce({ rowCount: 50 });

      const result = await cleanupAuditLogs();

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('90 days')
      );
      expect(result).toBe(50);
    });

    it('should delete logs older than custom retention days', async () => {
      dbManager.query.mockResolvedValueOnce({ rowCount: 25 });

      const result = await cleanupAuditLogs(30);

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('30 days')
      );
      expect(result).toBe(25);
    });

    it('should log cleanup result', async () => {
      dbManager.query.mockResolvedValueOnce({ rowCount: 10 });

      await cleanupAuditLogs();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up 10 old audit logs')
      );
    });

    it('should throw error on database failure', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('DB Error'));

      await expect(cleanupAuditLogs()).rejects.toThrow('DB Error');
    });
  });

  describe('Response finish handler', () => {
    it('should log audit event to database on response finish', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      // Get the finish handler
      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];

      // Simulate response finish
      await finishHandler();

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.any(Array)
      );
    });

    it('should log to centralized service on response finish', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
      await finishHandler();

      expect(loggingService.logAudit).toHaveBeenCalled();
    });

    it('should handle database logging errors gracefully', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('DB Error'));

      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];

      // Should not throw
      await expect(finishHandler()).resolves.not.toThrow();
    });

    it('should handle centralized logging errors gracefully', async () => {
      loggingService.logAudit.mockRejectedValueOnce(new Error('Logging Error'));

      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];

      // Should not throw
      await expect(finishHandler()).resolves.not.toThrow();
    });

    it('should upgrade to WARN level for 401 responses', async () => {
      mockRes.statusCode = 401;

      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
      await finishHandler();

      expect(mockReq.auditData.level).toBe(AUDIT_LEVELS.WARN);
    });

    it('should upgrade to WARN level for 403 responses', async () => {
      mockRes.statusCode = 403;

      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
      await finishHandler();

      expect(mockReq.auditData.level).toBe(AUDIT_LEVELS.WARN);
    });

    it('should upgrade to WARN level for 429 responses', async () => {
      mockRes.statusCode = 429;

      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
      await finishHandler();

      expect(mockReq.auditData.level).toBe(AUDIT_LEVELS.WARN);
    });

    it('should detect suspicious admin access', async () => {
      mockReq.path = '/admin/users';
      mockReq.user = { id: 1, role: 'user' }; // Non-admin trying to access admin

      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
      await finishHandler();

      expect(mockReq.auditData.level).toBe(AUDIT_LEVELS.WARN);
    });

    it('should detect privacy event for export paths', async () => {
      mockReq.path = '/api/data/export';

      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
      await finishHandler();

      expect(mockReq.auditData.event).toBe(AUDIT_EVENTS.DATA_EXPORT);
    });

    it('should detect privacy event for user deletion', async () => {
      mockReq.method = 'DELETE';
      mockReq.path = '/api/users/123';

      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
      await finishHandler();

      expect(mockReq.auditData.event).toBe(AUDIT_EVENTS.DATA_DELETION);
    });

    it('should detect consent event', async () => {
      mockReq.path = '/api/consent/update';

      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
      await finishHandler();

      expect(mockReq.auditData.event).toBe(AUDIT_EVENTS.CONSENT_GIVEN);
    });
  });

  describe('Data sanitization', () => {
    it('should sanitize sensitive fields in request body', async () => {
      mockReq.body = {
        username: 'testuser',
        password: 'secret123',
        token: 'abc123',
        name: 'Test'
      };

      const middleware = auditLogger({ includeRequestBody: true });
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.auditData.request.body.password).toBe('[REDACTED]');
      expect(mockReq.auditData.request.body.token).toBe('[REDACTED]');
      expect(mockReq.auditData.request.body.name).toBe('Test');
    });

    it('should sanitize sensitive headers', async () => {
      mockReq.headers = {
        'authorization': 'Bearer token123',
        'cookie': 'session=abc',
        'content-type': 'application/json'
      };

      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.auditData.request.headers.authorization).toBe('[REDACTED]');
      expect(mockReq.auditData.request.headers.cookie).toBe('[REDACTED]');
      expect(mockReq.auditData.request.headers['content-type']).toBe('application/json');
    });

    it('should handle nested object sanitization', async () => {
      mockReq.body = {
        user: {
          name: 'Test',
          credentials: {
            password: 'secret',
            key: 'api-key'
          }
        }
      };

      const middleware = auditLogger({ includeRequestBody: true });
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.auditData.request.body.user.credentials.password).toBe('[REDACTED]');
      expect(mockReq.auditData.request.body.user.credentials.key).toBe('[REDACTED]');
      expect(mockReq.auditData.request.body.user.name).toBe('Test');
    });

    it('should handle null or undefined data', async () => {
      mockReq.body = null;

      const middleware = auditLogger({ includeRequestBody: true });
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.auditData.request.body).toBeNull();
    });
  });

  describe('Audit metadata', () => {
    it('should capture user information', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.auditData.user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'admin',
        estate_id: null,
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0'
      });
    });

    it('should handle missing user information', async () => {
      mockReq.user = null;

      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.auditData.user.id).toBeNull();
      expect(mockReq.auditData.user.email).toBeNull();
      expect(mockReq.auditData.user.role).toBeNull();
    });

    it('should capture request metadata', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.auditData.request.method).toBe('GET');
      expect(mockReq.auditData.request.url).toBe('/api/test');
      expect(mockReq.auditData.request.path).toBe('/api/test');
    });

    it('should capture API version from headers', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.auditData.metadata.apiVersion).toBe('1.0');
    });

    it('should capture client ID from headers', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.auditData.metadata.clientId).toBe('client-123');
    });

    it('should capture performance metrics', async () => {
      const middleware = auditLogger({});
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.auditData.performance).toBeDefined();
      expect(mockReq.auditData.performance.memoryUsage).toBeDefined();
    });
  });
});
