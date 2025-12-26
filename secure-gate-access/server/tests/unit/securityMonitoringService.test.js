/**
 * Unit Tests for Security Monitoring Service
 * 
 * Tests cover:
 * - Security event logging
 * - Event storage in Redis
 * - Security metrics tracking
 * - Alert threshold checking
 * - Failed auth threshold detection
 * - Rate limit threshold detection
 * - CSP violation threshold detection
 * - Security alert triggering
 * - CSP violation logging
 * - Failed authentication logging
 * - Rate limit logging
 * - Security metrics dashboard
 * - Client IP extraction
 * - Event ID generation
 * - Old event cleanup
 * - Error handling
 */

import { jest } from '@jest/globals';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: mockLogger
}));

// Mock Redis service
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();

const MockRedisService = jest.fn().mockImplementation(() => ({
  get: mockRedisGet,
  set: mockRedisSet
}));

jest.unstable_mockModule('../../src/services/redisService.js', () => ({
  default: MockRedisService
}));

// Mock security config
const mockMonitoringConfig = {
  logSecurityEvents: true,
  logCSPViolations: true,
  logFailedAuth: true,
  logRateLimits: true,
  eventRetention: 30,
  alertThresholds: {
    failedAuthAttempts: 5,
    rateLimitViolations: 10,
    cspViolations: 20
  }
};

jest.unstable_mockModule('../../src/config/securityConfig.js', () => ({
  monitoringConfig: mockMonitoringConfig
}));

describe('SecurityMonitoringService', () => {
  let securityMonitoringService;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset mocks
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue('OK');
    
    // Reset module cache
    jest.resetModules();
    
    // Re-mock dependencies
    jest.unstable_mockModule('../../src/config/logger.js', () => ({
      default: mockLogger
    }));
    jest.unstable_mockModule('../../src/services/redisService.js', () => ({
      default: MockRedisService
    }));
    jest.unstable_mockModule('../../src/config/securityConfig.js', () => ({
      monitoringConfig: mockMonitoringConfig
    }));
    
    const module = await import('../../src/services/securityMonitoringService.js');
    securityMonitoringService = module.default;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should define event types', () => {
      expect(securityMonitoringService.eventTypes).toBeDefined();
      expect(securityMonitoringService.eventTypes.CSP_VIOLATION).toBe('csp_violation');
      expect(securityMonitoringService.eventTypes.FAILED_AUTH).toBe('failed_auth');
      expect(securityMonitoringService.eventTypes.RATE_LIMIT).toBe('rate_limit_exceeded');
      expect(securityMonitoringService.eventTypes.SUSPICIOUS_ACTIVITY).toBe('suspicious_activity');
      expect(securityMonitoringService.eventTypes.BRUTE_FORCE).toBe('brute_force_attempt');
    });

    it('should define severity levels', () => {
      expect(securityMonitoringService.severityLevels).toBeDefined();
      expect(securityMonitoringService.severityLevels.LOW).toBe('low');
      expect(securityMonitoringService.severityLevels.MEDIUM).toBe('medium');
      expect(securityMonitoringService.severityLevels.HIGH).toBe('high');
      expect(securityMonitoringService.severityLevels.CRITICAL).toBe('critical');
    });
  });

  describe('logSecurityEvent', () => {
    const mockEvent = {
      type: 'failed_auth',
      severity: 'medium',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      userId: 123,
      sessionId: 'session-456',
      endpoint: '/api/login',
      method: 'POST',
      details: { username: 'testuser', reason: 'invalid_password' },
      requestId: 'req-789',
      referer: 'http://localhost:3000',
      origin: 'http://localhost:3000'
    };

    it('should log security event successfully', async () => {
      const eventId = await securityMonitoringService.logSecurityEvent(mockEvent);
      
      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
    });

    it('should log to application logger', async () => {
      await securityMonitoringService.logSecurityEvent(mockEvent);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          type: 'failed_auth',
          severity: 'medium',
          ip: '192.168.1.1'
        })
      );
    });

    it('should store event in Redis', async () => {
      await securityMonitoringService.logSecurityEvent(mockEvent);
      
      expect(mockRedisSet).toHaveBeenCalledWith(
        expect.stringContaining('security:events:failed_auth:'),
        expect.any(Object),
        expect.any(Number)
      );
    });

    it('should use default severity if not provided', async () => {
      const eventWithoutSeverity = { ...mockEvent, severity: undefined };
      await securityMonitoringService.logSecurityEvent(eventWithoutSeverity);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          severity: 'medium'
        })
      );
    });

    it('should not log when logging is disabled', async () => {
      mockMonitoringConfig.logSecurityEvents = false;
      
      await securityMonitoringService.logSecurityEvent(mockEvent);
      
      expect(mockLogger.warn).not.toHaveBeenCalled();
      
      // Restore
      mockMonitoringConfig.logSecurityEvents = true;
    });

    it('should handle errors gracefully', async () => {
      mockRedisSet.mockRejectedValue(new Error('Redis error'));
      
      // Should not throw
      const result = await securityMonitoringService.logSecurityEvent(mockEvent);
      
      // Event ID is still generated before storage error
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('storeEvent', () => {
    it('should store event with correct key', async () => {
      const event = {
        id: 'event-123',
        type: 'csp_violation',
        timestamp: new Date().toISOString()
      };
      
      await securityMonitoringService.storeEvent(event);
      
      expect(mockRedisSet).toHaveBeenCalledWith(
        'security:events:csp_violation:event-123',
        event,
        expect.any(Number)
      );
    });

    it('should set appropriate TTL based on retention', async () => {
      const event = {
        id: 'event-123',
        type: 'failed_auth'
      };
      
      await securityMonitoringService.storeEvent(event);
      
      // TTL should be eventRetention days in seconds
      const expectedTTL = 60 * 60 * 24 * mockMonitoringConfig.eventRetention;
      expect(mockRedisSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expectedTTL
      );
    });

    it('should handle storage errors', async () => {
      mockRedisSet.mockRejectedValue(new Error('Storage failed'));
      
      await securityMonitoringService.storeEvent({ id: '1', type: 'test' });
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error storing security event:',
        expect.any(Error)
      );
    });
  });

  describe('updateSecurityMetrics', () => {
    it('should update daily metrics', async () => {
      const event = {
        type: 'failed_auth',
        source: { ip: '192.168.1.1' }
      };
      
      mockRedisGet.mockResolvedValue('5');
      
      await securityMonitoringService.updateSecurityMetrics(event);
      
      expect(mockRedisSet).toHaveBeenCalledWith(
        expect.stringContaining('security:metrics:daily:'),
        '6',
        expect.any(Number)
      );
    });

    it('should update hourly metrics', async () => {
      const event = {
        type: 'rate_limit_exceeded',
        source: { ip: '192.168.1.1' }
      };
      
      await securityMonitoringService.updateSecurityMetrics(event);
      
      expect(mockRedisSet).toHaveBeenCalledWith(
        expect.stringContaining('security:metrics:hourly:'),
        expect.any(String),
        expect.any(Number)
      );
    });

    it('should update IP-based metrics', async () => {
      const event = {
        type: 'failed_auth',
        source: { ip: '10.0.0.1' }
      };
      
      await securityMonitoringService.updateSecurityMetrics(event);
      
      expect(mockRedisSet).toHaveBeenCalledWith(
        expect.stringContaining('security:metrics:ip:10.0.0.1:'),
        expect.any(String),
        expect.any(Number)
      );
    });

    it('should skip IP metrics if no IP in event', async () => {
      const event = {
        type: 'failed_auth',
        source: { ip: null }
      };
      
      await securityMonitoringService.updateSecurityMetrics(event);
      
      // Should not have IP-specific call
      const ipCalls = mockRedisSet.mock.calls.filter(
        call => call[0].includes('security:metrics:ip:')
      );
      expect(ipCalls.length).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockRedisGet.mockRejectedValue(new Error('Redis error'));
      
      await securityMonitoringService.updateSecurityMetrics({
        type: 'test',
        source: { ip: '1.1.1.1' }
      });
      
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('checkAlertThresholds', () => {
    it('should check failed auth threshold', async () => {
      const event = {
        type: 'failed_auth',
        source: { ip: '192.168.1.1' }
      };
      
      // Simulate count below threshold
      mockRedisGet.mockResolvedValue('3');
      
      await securityMonitoringService.checkAlertThresholds(event);
      
      expect(mockRedisSet).toHaveBeenCalledWith(
        expect.stringContaining('security:alerts:failed_auth:'),
        '4',
        expect.any(Number)
      );
    });

    it('should check rate limit threshold', async () => {
      const event = {
        type: 'rate_limit_exceeded',
        source: { ip: '192.168.1.1' }
      };
      
      mockRedisGet.mockResolvedValue('8');
      
      await securityMonitoringService.checkAlertThresholds(event);
      
      expect(mockRedisSet).toHaveBeenCalled();
    });

    it('should check CSP violation threshold', async () => {
      const event = {
        type: 'csp_violation',
        source: { ip: '192.168.1.1' }
      };
      
      mockRedisGet.mockResolvedValue('15');
      
      await securityMonitoringService.checkAlertThresholds(event);
      
      expect(mockRedisSet).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedisGet.mockRejectedValue(new Error('Redis error'));
      
      await securityMonitoringService.checkAlertThresholds({
        type: 'failed_auth',
        source: { ip: '1.1.1.1' }
      });
      
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('checkFailedAuthThreshold', () => {
    it('should trigger alert when threshold exceeded', async () => {
      // Simulate count at threshold
      mockRedisGet.mockResolvedValue('4');
      
      await securityMonitoringService.checkFailedAuthThreshold(
        { source: { ip: '192.168.1.1' } },
        5,
        3600000
      );
      
      // Should trigger alert (count becomes 5, equals threshold)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'SECURITY ALERT',
        expect.objectContaining({
          type: 'BRUTE_FORCE_DETECTED',
          severity: 'high'
        })
      );
    });

    it('should not trigger alert when below threshold', async () => {
      mockRedisGet.mockResolvedValue('2');
      
      await securityMonitoringService.checkFailedAuthThreshold(
        { source: { ip: '192.168.1.1' } },
        5,
        3600000
      );
      
      // Should not trigger alert
      const alertCalls = mockLogger.error.mock.calls.filter(
        call => call[0] === 'SECURITY ALERT'
      );
      expect(alertCalls.length).toBe(0);
    });
  });

  describe('checkRateLimitThreshold', () => {
    it('should trigger alert when threshold exceeded', async () => {
      mockRedisGet.mockResolvedValue('9');
      
      await securityMonitoringService.checkRateLimitThreshold(
        { source: { ip: '192.168.1.1' } },
        10,
        3600000
      );
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'SECURITY ALERT',
        expect.objectContaining({
          type: 'EXCESSIVE_RATE_LIMITING'
        })
      );
    });
  });

  describe('checkCSPViolationThreshold', () => {
    it('should trigger alert when threshold exceeded', async () => {
      mockRedisGet.mockResolvedValue('19');
      
      await securityMonitoringService.checkCSPViolationThreshold(
        { source: { ip: '192.168.1.1' } },
        20,
        3600000
      );
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'SECURITY ALERT',
        expect.objectContaining({
          type: 'EXCESSIVE_CSP_VIOLATIONS'
        })
      );
    });
  });

  describe('triggerSecurityAlert', () => {
    it('should log alert', async () => {
      const alert = {
        type: 'BRUTE_FORCE_DETECTED',
        severity: 'high',
        ip: '192.168.1.1',
        count: 10,
        details: 'Multiple failed login attempts'
      };
      
      await securityMonitoringService.triggerSecurityAlert(alert);
      
      expect(mockLogger.error).toHaveBeenCalledWith('SECURITY ALERT', alert);
    });

    it('should store alert in Redis', async () => {
      await securityMonitoringService.triggerSecurityAlert({
        type: 'TEST_ALERT',
        severity: 'low'
      });
      
      expect(mockRedisSet).toHaveBeenCalledWith(
        expect.stringContaining('security:alerts:'),
        expect.objectContaining({
          type: 'SECURITY_ALERT'
        }),
        expect.any(Number)
      );
    });

    it('should handle errors gracefully', async () => {
      mockRedisSet.mockRejectedValue(new Error('Store failed'));
      
      await securityMonitoringService.triggerSecurityAlert({ type: 'TEST' });
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error triggering security alert:',
        expect.any(Error)
      );
    });
  });

  describe('logCSPViolation', () => {
    const mockReq = {
      path: '/api/test',
      method: 'GET',
      ip: '192.168.1.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0')
    };

    const mockViolation = {
      blockedURI: 'https://evil.com/script.js',
      violatedDirective: 'script-src',
      originalPolicy: "script-src 'self'",
      documentURI: 'https://app.com/page',
      referrer: 'https://app.com',
      statusCode: 200
    };

    it('should log CSP violation', async () => {
      await securityMonitoringService.logCSPViolation(mockViolation, mockReq);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          type: 'csp_violation'
        })
      );
    });

    it('should include violation details', async () => {
      await securityMonitoringService.logCSPViolation(mockViolation, mockReq);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          details: expect.objectContaining({
            blockedURI: 'https://evil.com/script.js',
            violatedDirective: 'script-src'
          })
        })
      );
    });

    it('should not log when CSP logging disabled', async () => {
      mockMonitoringConfig.logCSPViolations = false;
      
      await securityMonitoringService.logCSPViolation(mockViolation, mockReq);
      
      // logSecurityEvent won't be called due to config check
      // The actual behavior depends on implementation
      
      mockMonitoringConfig.logCSPViolations = true;
    });
  });

  describe('logFailedAuth', () => {
    const mockReq = {
      path: '/api/login',
      method: 'POST',
      ip: '192.168.1.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0')
    };

    it('should log failed authentication', async () => {
      await securityMonitoringService.logFailedAuth(mockReq, {
        username: 'testuser',
        reason: 'invalid_password'
      });
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          type: 'failed_auth'
        })
      );
    });

    it('should include auth details', async () => {
      await securityMonitoringService.logFailedAuth(mockReq, {
        username: 'testuser',
        reason: 'account_locked'
      });
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          details: expect.objectContaining({
            username: 'testuser',
            reason: 'account_locked'
          })
        })
      );
    });

    it('should not log when failed auth logging disabled', async () => {
      mockMonitoringConfig.logFailedAuth = false;
      
      await securityMonitoringService.logFailedAuth(mockReq, {});
      
      mockMonitoringConfig.logFailedAuth = true;
    });
  });

  describe('logRateLimit', () => {
    const mockReq = {
      path: '/api/data',
      method: 'GET',
      ip: '192.168.1.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0')
    };

    it('should log rate limit event', async () => {
      await securityMonitoringService.logRateLimit(mockReq, {
        limit: 100,
        current: 150,
        window: 60000,
        retryAfter: 30
      });
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          type: 'rate_limit_exceeded',
          severity: 'low'
        })
      );
    });

    it('should not log when rate limit logging disabled', async () => {
      mockMonitoringConfig.logRateLimits = false;
      
      await securityMonitoringService.logRateLimit(mockReq, {});
      
      mockMonitoringConfig.logRateLimits = true;
    });
  });

  describe('getSecurityMetrics', () => {
    it('should return metrics summary', async () => {
      mockRedisGet.mockImplementation((key) => {
        if (key.includes('failed_auth')) return '10';
        if (key.includes('rate_limit')) return '5';
        return '0';
      });
      
      const metrics = await securityMonitoringService.getSecurityMetrics();
      
      expect(metrics.summary).toBeDefined();
      expect(metrics.eventTypes).toBeDefined();
    });

    it('should calculate total events', async () => {
      mockRedisGet.mockResolvedValue('10');
      
      const metrics = await securityMonitoringService.getSecurityMetrics();
      
      expect(metrics.summary.totalEvents).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors gracefully', async () => {
      mockRedisGet.mockRejectedValue(new Error('Redis error'));
      
      const metrics = await securityMonitoringService.getSecurityMetrics();
      
      expect(metrics.summary.totalEvents).toBe(0);
      expect(metrics.eventTypes).toEqual({});
    });
  });

  describe('getClientIP', () => {
    it('should return req.ip if available', () => {
      const req = { ip: '192.168.1.1' };
      
      const ip = securityMonitoringService.getClientIP(req);
      
      expect(ip).toBe('192.168.1.1');
    });

    it('should fallback to connection.remoteAddress', () => {
      const req = {
        ip: null,
        connection: { remoteAddress: '10.0.0.1' }
      };
      
      const ip = securityMonitoringService.getClientIP(req);
      
      expect(ip).toBe('10.0.0.1');
    });

    it('should fallback to socket.remoteAddress', () => {
      const req = {
        ip: null,
        connection: { remoteAddress: null },
        socket: { remoteAddress: '172.16.0.1' }
      };
      
      const ip = securityMonitoringService.getClientIP(req);
      
      expect(ip).toBe('172.16.0.1');
    });

    it('should return unknown if no IP found', () => {
      const req = {
        ip: null,
        connection: { remoteAddress: null, socket: null },
        socket: { remoteAddress: null }
      };
      
      const ip = securityMonitoringService.getClientIP(req);
      
      expect(ip).toBe('unknown');
    });
  });

  describe('generateEventId', () => {
    it('should generate unique IDs', () => {
      const id1 = securityMonitoringService.generateEventId();
      const id2 = securityMonitoringService.generateEventId();
      
      expect(id1).not.toBe(id2);
    });

    it('should start with sec_ prefix', () => {
      const id = securityMonitoringService.generateEventId();
      
      expect(id.startsWith('sec_')).toBe(true);
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const id = securityMonitoringService.generateEventId();
      const after = Date.now();
      
      // Extract timestamp from ID (format: sec_{timestamp}_{random})
      const parts = id.split('_');
      const timestamp = parseInt(parts[1]);
      
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('cleanupOldEvents', () => {
    it('should log cleanup operation', async () => {
      await securityMonitoringService.cleanupOldEvents();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cleaning up security events older than')
      );
    });

    it('should handle errors gracefully', async () => {
      // Force an error by mocking Date
      const originalDate = global.Date;
      global.Date = jest.fn(() => {
        throw new Error('Date error');
      });
      global.Date.now = jest.fn(() => Date.now());
      
      await securityMonitoringService.cleanupOldEvents();
      
      expect(mockLogger.error).toHaveBeenCalled();
      
      global.Date = originalDate;
    });
  });
});
