/**
 * Unit tests for auditLogging middleware
 * Tests comprehensive audit logging for security and compliance
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock the logger module
const mockLogAuditEvent = jest.fn();
const mockAuditLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: mockAuditLogger,
  auditLogger: mockAuditLogger,
  logAuditEvent: mockLogAuditEvent
}));

// Import after mocking
const {
  auditLogging,
  authAuditLogging,
  securityAuditLogging,
  dataAccessAuditLogging,
  configAuditLogging,
  logAuditEventHelper
} = await import('../../src/middleware/auditLogging.js');

describe('Audit Logging Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      id: 'test-request-123',
      method: 'GET',
      originalUrl: '/api/test',
      ip: '192.168.1.100',
      user: { id: 'user-123', role: 'admin' },
      body: { data: 'test' },
      query: { page: 1 },
      params: { id: '123' },
      headers: {
        'user-agent': 'Mozilla/5.0',
        'authorization': 'Bearer token123'
      },
      get: jest.fn((header) => {
        const headers = {
          'User-Agent': 'Mozilla/5.0',
          'Authorization': 'Bearer token123'
        };
        return headers[header];
      })
    };

    mockRes = {
      statusCode: 200,
      end: jest.fn(),
      json: jest.fn().mockReturnThis(),
      get: jest.fn((header) => {
        const headers = {
          'X-Response-Time': '50ms',
          'Content-Length': '1024'
        };
        return headers[header];
      }),
      getHeaders: jest.fn().mockReturnValue({
        'content-type': 'application/json',
        'x-response-time': '50ms'
      })
    };

    mockNext = jest.fn();
  });

  describe('auditLogging middleware factory', () => {
    it('should return a middleware function', () => {
      const middleware = auditLogging();
      expect(typeof middleware).toBe('function');
    });

    it('should skip excluded paths', () => {
      const middleware = auditLogging({ excludePaths: ['/health', '/metrics'] });
      
      mockReq.originalUrl = '/health';
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });

    it('should skip /metrics path', () => {
      const middleware = auditLogging({ excludePaths: ['/health', '/metrics'] });
      
      mockReq.originalUrl = '/metrics/cpu';
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });

    it('should log request when logRequests is true (default)', () => {
      const middleware = auditLogging();
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'request',
        'api',
        expect.objectContaining({
          method: 'GET',
          url: '/api/test',
          ip: '192.168.1.100'
        }),
        mockReq
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not log request when logRequests is false', () => {
      const middleware = auditLogging({ logRequests: false });
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockLogAuditEvent).not.toHaveBeenCalledWith(
        'request',
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    it('should sanitize sensitive headers in request', () => {
      const middleware = auditLogging();
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'request',
        'api',
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: '[REDACTED]'
          })
        }),
        mockReq
      );
    });

    it('should sanitize sensitive body fields', () => {
      const middleware = auditLogging({ sensitiveFields: ['password', 'token'] });
      mockReq.body = { username: 'test', password: 'secret123', token: 'abc' };
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'request',
        'api',
        expect.objectContaining({
          body: expect.objectContaining({
            username: 'test',
            password: '[REDACTED]',
            token: '[REDACTED]'
          })
        }),
        mockReq
      );
    });

    it('should log response when res.end is called', () => {
      const middleware = auditLogging();
      
      middleware(mockReq, mockRes, mockNext);
      
      // Call the overridden res.end
      mockRes.end('response body', 'utf8');
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'response',
        'api',
        expect.objectContaining({
          statusCode: 200,
          responseTime: '50ms',
          contentLength: '1024'
        }),
        mockReq
      );
    });

    it('should not log response when logResponses is false', () => {
      const middleware = auditLogging({ logResponses: false });
      
      middleware(mockReq, mockRes, mockNext);
      mockRes.end('response body', 'utf8');
      
      expect(mockLogAuditEvent).not.toHaveBeenCalledWith(
        'response',
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    it('should log data changes for POST requests', () => {
      const middleware = auditLogging({ logDataChanges: true });
      mockReq.method = 'POST';
      
      middleware(mockReq, mockRes, mockNext);
      
      // Call the overridden res.json
      mockRes.json({ success: true, data: { id: 1 } });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'data_change',
        'api',
        expect.objectContaining({
          method: 'POST',
          url: '/api/test',
          statusCode: 200
        }),
        mockReq
      );
    });

    it('should log data changes for PUT requests', () => {
      const middleware = auditLogging({ logDataChanges: true });
      mockReq.method = 'PUT';
      
      middleware(mockReq, mockRes, mockNext);
      mockRes.json({ success: true });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'data_change',
        'api',
        expect.objectContaining({
          method: 'PUT'
        }),
        mockReq
      );
    });

    it('should log data changes for PATCH requests', () => {
      const middleware = auditLogging({ logDataChanges: true });
      mockReq.method = 'PATCH';
      
      middleware(mockReq, mockRes, mockNext);
      mockRes.json({ success: true });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'data_change',
        'api',
        expect.objectContaining({
          method: 'PATCH'
        }),
        mockReq
      );
    });

    it('should log data changes for DELETE requests', () => {
      const middleware = auditLogging({ logDataChanges: true });
      mockReq.method = 'DELETE';
      
      middleware(mockReq, mockRes, mockNext);
      mockRes.json({ success: true });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'data_change',
        'api',
        expect.objectContaining({
          method: 'DELETE'
        }),
        mockReq
      );
    });

    it('should not log data changes for GET requests', () => {
      const middleware = auditLogging({ logDataChanges: true });
      mockReq.method = 'GET';
      
      middleware(mockReq, mockRes, mockNext);
      
      // res.json should not be overridden for GET
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should handle request without user', () => {
      const middleware = auditLogging();
      mockReq.user = undefined;
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockLogAuditEvent).toHaveBeenCalled();
    });

    it('should handle request without id', () => {
      const middleware = auditLogging();
      mockReq.id = undefined;
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize nested body objects', () => {
      const middleware = auditLogging({ sensitiveFields: ['password'] });
      mockReq.body = {
        user: {
          name: 'test',
          password: 'secret',
          details: {
            password: 'nested-secret'
          }
        }
      };
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'request',
        'api',
        expect.objectContaining({
          body: expect.objectContaining({
            user: expect.objectContaining({
              password: '[REDACTED]',
              details: expect.objectContaining({
                password: '[REDACTED]'
              })
            })
          })
        }),
        mockReq
      );
    });
  });

  describe('authAuditLogging middleware', () => {
    it('should log login attempts on /auth/login', () => {
      mockReq.originalUrl = '/api/auth/login';
      mockReq.body = { email: 'test@example.com' };
      
      authAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ success: true, token: 'xyz' });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'login_attempt',
        'auth',
        expect.objectContaining({
          success: true,
          email: 'test@example.com',
          ip: '192.168.1.100'
        }),
        mockReq
      );
    });

    it('should log failed login attempts', () => {
      mockReq.originalUrl = '/api/auth/login';
      mockReq.body = { email: 'test@example.com' };
      mockRes.statusCode = 401;
      
      authAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ error: 'Invalid credentials' });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'login_attempt',
        'auth',
        expect.objectContaining({
          success: false,
          email: 'test@example.com'
        }),
        mockReq
      );
    });

    it('should log registration attempts on /auth/register', () => {
      mockReq.originalUrl = '/api/auth/register';
      mockReq.body = { email: 'new@example.com', role: 'resident' };
      mockRes.statusCode = 201;
      
      authAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ success: true });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'registration_attempt',
        'auth',
        expect.objectContaining({
          success: true,
          email: 'new@example.com',
          role: 'resident'
        }),
        mockReq
      );
    });

    it('should log failed registration attempts', () => {
      mockReq.originalUrl = '/api/auth/register';
      mockReq.body = { email: 'existing@example.com', role: 'resident' };
      mockRes.statusCode = 400;
      
      authAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ error: 'Email already exists' });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'registration_attempt',
        'auth',
        expect.objectContaining({
          success: false,
          email: 'existing@example.com'
        }),
        mockReq
      );
    });

    it('should log logout events on /auth/logout', () => {
      mockReq.originalUrl = '/api/auth/logout';
      
      authAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ success: true });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'logout',
        'auth',
        expect.objectContaining({
          userId: 'user-123',
          ip: '192.168.1.100'
        }),
        mockReq
      );
    });

    it('should log token refresh events on /auth/refresh', () => {
      mockReq.originalUrl = '/api/auth/refresh';
      
      authAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ success: true, token: 'new-token' });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'token_refresh',
        'auth',
        expect.objectContaining({
          success: true,
          userId: 'user-123'
        }),
        mockReq
      );
    });

    it('should log failed token refresh', () => {
      mockReq.originalUrl = '/api/auth/refresh';
      mockRes.statusCode = 401;
      
      authAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ error: 'Invalid refresh token' });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'token_refresh',
        'auth',
        expect.objectContaining({
          success: false
        }),
        mockReq
      );
    });

    it('should not log events for non-auth URLs', () => {
      mockReq.originalUrl = '/api/users';
      
      authAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ data: [] });
      
      expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });

    it('should call next middleware', () => {
      authAuditLogging(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('securityAuditLogging middleware', () => {
    it('should log unauthorized access on 401 status', () => {
      mockRes.statusCode = 401;
      
      securityAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ message: 'Token expired' });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'unauthorized_access',
        'security',
        expect.objectContaining({
          url: '/api/test',
          method: 'GET',
          ip: '192.168.1.100',
          reason: 'Token expired'
        }),
        mockReq
      );
    });

    it('should use default message for unauthorized access without message', () => {
      mockRes.statusCode = 401;
      
      securityAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({});
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'unauthorized_access',
        'security',
        expect.objectContaining({
          reason: 'Unauthorized access attempt'
        }),
        mockReq
      );
    });

    it('should log permission denied on 403 status', () => {
      mockRes.statusCode = 403;
      
      securityAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ message: 'Admin access required' });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'permission_denied',
        'security',
        expect.objectContaining({
          url: '/api/test',
          method: 'GET',
          ip: '192.168.1.100',
          reason: 'Admin access required'
        }),
        mockReq
      );
    });

    it('should use default message for permission denied without message', () => {
      mockRes.statusCode = 403;
      
      securityAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({});
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'permission_denied',
        'security',
        expect.objectContaining({
          reason: 'Permission denied'
        }),
        mockReq
      );
    });

    it('should log rate limit exceeded on 429 status', () => {
      mockRes.statusCode = 429;
      
      securityAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ error: 'Too many requests' });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'rate_limit_exceeded',
        'security',
        expect.objectContaining({
          url: '/api/test',
          method: 'GET',
          ip: '192.168.1.100',
          reason: 'Rate limit exceeded'
        }),
        mockReq
      );
    });

    it('should not log for successful responses', () => {
      mockRes.statusCode = 200;
      
      securityAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ success: true });
      
      expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });

    it('should not log for 400 Bad Request', () => {
      mockRes.statusCode = 400;
      
      securityAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ error: 'Bad request' });
      
      expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });

    it('should not log for 404 Not Found', () => {
      mockRes.statusCode = 404;
      
      securityAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ error: 'Not found' });
      
      expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });

    it('should not log for 500 Internal Server Error', () => {
      mockRes.statusCode = 500;
      
      securityAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ error: 'Internal server error' });
      
      expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });

    it('should call next middleware', () => {
      securityAuditLogging(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return original json response', () => {
      const responseData = { message: 'test' };
      
      securityAuditLogging(mockReq, mockRes, mockNext);
      const result = mockRes.json(responseData);
      
      expect(result).toBe(mockRes);
    });
  });

  describe('dataAccessAuditLogging middleware', () => {
    it('should log data access for /admin/ paths', () => {
      mockReq.originalUrl = '/api/admin/users';
      
      dataAccessAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ data: [{ id: 1 }, { id: 2 }] });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'data_access',
        'data',
        expect.objectContaining({
          resource: '/api/admin/users',
          method: 'GET',
          userId: 'user-123',
          userRole: 'admin',
          recordCount: 2
        }),
        mockReq
      );
    });

    it('should log data access for /residents/ paths', () => {
      mockReq.originalUrl = '/api/residents/';
      
      dataAccessAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ data: [{ id: 1 }] });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'data_access',
        'data',
        expect.objectContaining({
          resource: '/api/residents/',
          recordCount: 1
        }),
        mockReq
      );
    });

    it('should log data access for /visitors/ paths', () => {
      mockReq.originalUrl = '/api/visitors/';
      
      dataAccessAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'data_access',
        'data',
        expect.objectContaining({
          resource: '/api/visitors/',
          recordCount: 3
        }),
        mockReq
      );
    });

    it('should set recordCount to 1 for non-array data', () => {
      mockReq.originalUrl = '/api/admin/users/123';
      
      dataAccessAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ data: { id: 123, name: 'Test User' } });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'data_access',
        'data',
        expect.objectContaining({
          recordCount: 1
        }),
        mockReq
      );
    });

    it('should not log for non-sensitive paths', () => {
      mockReq.originalUrl = '/api/health';
      
      dataAccessAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ status: 'ok' });
      
      expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });

    it('should include timestamp in audit log', () => {
      mockReq.originalUrl = '/api/admin/users';
      
      dataAccessAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ data: [] });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'data_access',
        'data',
        expect.objectContaining({
          timestamp: expect.any(String)
        }),
        mockReq
      );
    });

    it('should include userAgent in audit log', () => {
      mockReq.originalUrl = '/api/admin/users';
      
      dataAccessAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ data: [] });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'data_access',
        'data',
        expect.objectContaining({
          userAgent: 'Mozilla/5.0'
        }),
        mockReq
      );
    });

    it('should call next middleware', () => {
      dataAccessAuditLogging(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('configAuditLogging middleware', () => {
    it('should log configuration changes for /config/ paths', () => {
      mockReq.originalUrl = '/api/config/security';
      mockReq.method = 'PUT';
      mockReq.body = { rateLimit: 100, maxAttempts: 5 };
      
      configAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ success: true });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'config_change',
        'system',
        expect.objectContaining({
          resource: '/api/config/security',
          method: 'PUT',
          userId: 'user-123',
          userRole: 'admin',
          changes: { rateLimit: 100, maxAttempts: 5 }
        }),
        mockReq
      );
    });

    it('should log configuration changes for /settings/ paths', () => {
      mockReq.originalUrl = '/api/settings/notifications';
      mockReq.method = 'PATCH';
      mockReq.body = { emailEnabled: true };
      
      configAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ success: true });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'config_change',
        'system',
        expect.objectContaining({
          resource: '/api/settings/notifications',
          method: 'PATCH',
          changes: { emailEnabled: true }
        }),
        mockReq
      );
    });

    it('should not log for non-config paths', () => {
      mockReq.originalUrl = '/api/users';
      
      configAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ data: [] });
      
      expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });

    it('should include timestamp in audit log', () => {
      mockReq.originalUrl = '/api/config/general';
      
      configAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ success: true });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'config_change',
        'system',
        expect.objectContaining({
          timestamp: expect.any(String)
        }),
        mockReq
      );
    });

    it('should include IP in audit log', () => {
      mockReq.originalUrl = '/api/config/general';
      
      configAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ success: true });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'config_change',
        'system',
        expect.objectContaining({
          ip: '192.168.1.100'
        }),
        mockReq
      );
    });

    it('should call next middleware', () => {
      configAuditLogging(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('logAuditEventHelper function', () => {
    it('should log audit event with all parameters', () => {
      logAuditEventHelper('test_action', 'test_resource', { key: 'value' }, mockReq);
      
      expect(mockAuditLogger.info).toHaveBeenCalledWith(
        'Audit event',
        expect.objectContaining({
          action: 'test_action',
          resource: 'test_resource',
          details: { key: 'value' },
          timestamp: expect.any(String),
          requestId: 'test-request-123',
          ip: '192.168.1.100',
          userId: 'user-123',
          userRole: 'admin'
        })
      );
    });

    it('should log audit event without request', () => {
      logAuditEventHelper('system_action', 'system', { startup: true });
      
      expect(mockAuditLogger.info).toHaveBeenCalledWith(
        'Audit event',
        expect.objectContaining({
          action: 'system_action',
          resource: 'system',
          details: { startup: true },
          timestamp: expect.any(String)
        })
      );
    });

    it('should not include request fields when req is null', () => {
      logAuditEventHelper('action', 'resource', {}, null);
      
      const call = mockAuditLogger.info.mock.calls[0][1];
      expect(call.requestId).toBeUndefined();
      expect(call.ip).toBeUndefined();
      expect(call.userId).toBeUndefined();
    });

    it('should handle empty details', () => {
      logAuditEventHelper('action', 'resource', {});
      
      expect(mockAuditLogger.info).toHaveBeenCalledWith(
        'Audit event',
        expect.objectContaining({
          details: {}
        })
      );
    });

    it('should handle complex details object', () => {
      const complexDetails = {
        changes: { before: { a: 1 }, after: { a: 2 } },
        metadata: { source: 'api', version: '1.0' }
      };
      
      logAuditEventHelper('complex_action', 'resource', complexDetails);
      
      expect(mockAuditLogger.info).toHaveBeenCalledWith(
        'Audit event',
        expect.objectContaining({
          details: complexDetails
        })
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle undefined body in sanitization', () => {
      const middleware = auditLogging();
      mockReq.body = undefined;
      
      expect(() => middleware(mockReq, mockRes, mockNext)).not.toThrow();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle null body in sanitization', () => {
      const middleware = auditLogging();
      mockReq.body = null;
      
      expect(() => middleware(mockReq, mockRes, mockNext)).not.toThrow();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle primitive body values', () => {
      const middleware = auditLogging();
      mockReq.body = 'string body';
      
      expect(() => middleware(mockReq, mockRes, mockNext)).not.toThrow();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle array body', () => {
      const middleware = auditLogging();
      mockReq.body = [{ password: 'secret' }, { data: 'test' }];
      
      expect(() => middleware(mockReq, mockRes, mockNext)).not.toThrow();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing headers', () => {
      const middleware = auditLogging();
      mockReq.headers = {};
      
      expect(() => middleware(mockReq, mockRes, mockNext)).not.toThrow();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle undefined query and params', () => {
      const middleware = auditLogging();
      mockReq.query = undefined;
      mockReq.params = undefined;
      
      expect(() => middleware(mockReq, mockRes, mockNext)).not.toThrow();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle request with no user on auth logging', () => {
      mockReq.originalUrl = '/api/auth/logout';
      mockReq.user = undefined;
      
      authAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({ success: true });
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'logout',
        'auth',
        expect.objectContaining({
          userId: undefined
        }),
        mockReq
      );
    });

    it('should handle empty response data', () => {
      mockReq.originalUrl = '/api/admin/users';
      
      dataAccessAuditLogging(mockReq, mockRes, mockNext);
      mockRes.json({});
      
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'data_access',
        'data',
        expect.objectContaining({
          recordCount: 1
        }),
        mockReq
      );
    });
  });
});
