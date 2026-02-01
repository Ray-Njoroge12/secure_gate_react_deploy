/**
 * Unit Tests for Enhanced Security Service
 * 
 * Tests the enhanced security features including MFA, access logging,
 * incident detection, and forensic data collection.
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockDbManager = {
  query: jest.fn(),
  pool: {
    connect: jest.fn()
  }
};

const mockLoggingService = {
  logSecurity: jest.fn(),
  logInfo: jest.fn(),
  logError: jest.fn()
};

const mockEmailService = {
  sendSecurityAlert: jest.fn()
};

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: mockEmailService
}));

const { enhancedSecurityService } = await import('../../src/services/enhancedSecurityService.js');

describe('Enhanced Security Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Multi-Factor Authentication', () => {
    test('should require additional authentication for sensitive operations', async () => {
      const userId = 123;
      const operation = 'user_deletion';
      
      // Mock user data
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{
          id: userId,
          email: 'admin@test.com',
          role: 'admin'
        }]
      });

      // Mock security event logging
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ id: 'evt_123' }]
      });

      const result = await enhancedSecurityService.requireAdditionalAuth(userId, operation);

      expect(result.required).toBe(true);
      expect(result.factors).toContain('password_confirmation');
      expect(result.factors).toContain('totp');
      expect(result.sessionId).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    test('should handle authentication errors gracefully', async () => {
      const userId = 123;
      const operation = 'user_deletion';
      
      // Mock database error
      mockDbManager.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(enhancedSecurityService.requireAdditionalAuth(userId, operation))
        .rejects.toThrow('Database connection failed');

      // The service catches the error and logs it before re-throwing
      // So we need to check that the error was handled properly
    });
  });

  describe('Security Event Logging', () => {
    test('should log comprehensive security events', async () => {
      const event = {
        type: 'login_attempt',
        userId: 123,
        operation: 'user_login',
        severity: 'medium',
        timestamp: new Date()
      };

      // Mock database insert for security audit log
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ id: 'evt_123' }]
      });

      const result = await enhancedSecurityService.logSecurityEvent(event);

      expect(result.eventId).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_audit_logs'),
        expect.any(Array)
      );
      expect(mockLoggingService.logSecurity).toHaveBeenCalled();
    });

    test('should enrich security events with forensic data', async () => {
      const event = {
        type: 'login_failure',
        userId: 123,
        ipAddress: '192.168.1.100',
        severity: 'medium'
      };

      // Mock database queries for forensic collection
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{
          id: 123,
          username: 'testuser',
          email: 'test@example.com',
          role: 'resident'
        }]
      });

      mockDbManager.query.mockResolvedValueOnce({
        rows: []
      });

      const enrichedEvent = await enhancedSecurityService.enrichSecurityEvent(event);

      expect(enrichedEvent.forensicData).toBeDefined();
      expect(enrichedEvent.riskScore).toBeGreaterThanOrEqual(0);
      expect(enrichedEvent.riskScore).toBeLessThanOrEqual(1);
      expect(enrichedEvent.eventId).toBeDefined();
      expect(enrichedEvent.correlationId).toBeDefined();
    });

    test('should handle logging errors gracefully', async () => {
      const event = {
        type: 'login_attempt',
        userId: 123,
        severity: 'low'
      };

      // Mock database error for the main insert (this is the INSERT INTO security_audit_logs)
      // The first call is for collectUserContext, second is for collectBehaviorAnalysis, third is the main insert
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [{ id: 123, username: 'test', email: 'test@test.com', role: 'resident' }] }) // collectUserContext
        .mockResolvedValueOnce({ rows: [] }) // collectBehaviorAnalysis
        .mockRejectedValueOnce(new Error('Database error')); // main insert

      await expect(enhancedSecurityService.logSecurityEvent(event))
        .rejects.toThrow('Database error');

      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('Security Incident Detection', () => {
    test('should detect brute force attacks', async () => {
      const userId = 123;
      
      // Mock recent failed login events with proper structure
      mockDbManager.query.mockResolvedValueOnce({
        rows: Array(6).fill().map((_, i) => ({
          id: i + 1,
          event_type: 'login_failure',
          user_id: userId,
          timestamp: new Date(Date.now() - i * 60000), // 1 minute apart
          type: 'login_failure' // Add the type field that the pattern detection expects
        }))
      });

      // Mock incident processing
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ id: 'inc_123' }]
      });

      // Mock security event logging
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ id: 'evt_456' }]
      });

      const incidents = await enhancedSecurityService.detectSecurityIncident(userId, 'login_failure');

      expect(incidents).toHaveLength(1);
      expect(incidents[0].type).toBe('brute_force_attack');
      expect(incidents[0].severity).toBe('high');
    });

    test('should process security incidents with automated response', async () => {
      const incident = {
        type: 'brute_force_attack',
        severity: 'high',
        description: 'Multiple failed login attempts detected',
        evidence: []
      };
      const userId = 123;

      // Mock incident processing
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ id: 'inc_456' }]
      });

      // Mock security event logging
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ id: 'evt_789' }]
      });

      const result = await enhancedSecurityService.processSecurityIncident(incident, userId);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string'); // Returns incident ID
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_incidents'),
        expect.any(Array)
      );
    });

    test('should handle incident detection errors', async () => {
      const userId = 123;
      
      // Mock database error
      mockDbManager.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(enhancedSecurityService.detectSecurityIncident(userId, 'login_failure'))
        .rejects.toThrow('Database error');

      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('Forensic Information Collection', () => {
    test('should collect comprehensive forensic data', async () => {
      const event = {
        type: 'unauthorized_access_attempt',
        userId: 123,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...'
      };

      // Mock user context query
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{
          id: 123,
          username: 'testuser',
          email: 'test@example.com',
          role: 'resident'
        }]
      });

      // Mock behavior analysis query
      mockDbManager.query.mockResolvedValueOnce({
        rows: []
      });

      const forensicData = await enhancedSecurityService.collectForensicInformation(event);

      expect(forensicData.timestamp).toBeInstanceOf(Date);
      expect(forensicData.systemInfo).toBeDefined();
      expect(forensicData.networkInfo).toBeDefined();
      expect(forensicData.suspiciousPatterns).toBeInstanceOf(Array);
      expect(forensicData.userContext).toBeDefined();
    });

    test('should calculate risk scores based on event context', async () => {
      const event = {
        type: 'privilege_escalation',
        userId: 123
      };

      const forensicData = {
        userContext: { role: 'admin' },
        suspiciousPatterns: ['unusual_access_time'],
        behaviorAnalysis: { anomalyScore: 0.8 }
      };

      const riskScore = await enhancedSecurityService.calculateRiskScore(event, forensicData);

      expect(riskScore).toBeGreaterThan(0.5); // High risk due to admin role and suspicious patterns
      expect(riskScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Pattern Detection Methods', () => {
    test('should detect brute force patterns', () => {
      const events = Array(6).fill().map((_, i) => ({
        type: 'login_failure',
        timestamp: new Date(Date.now() - i * 30000) // 30 seconds apart
      }));

      const isBruteForce = enhancedSecurityService.detectBruteForcePattern(events);

      expect(isBruteForce).toBe(true);
    });

    test('should detect privilege escalation attempts', () => {
      const events = [
        { type: 'privilege_change_attempt', severity: 'high' },
        { type: 'admin_access_attempt', severity: 'medium' }
      ];

      const isPrivilegeEscalation = enhancedSecurityService.detectPrivilegeEscalation(events);

      expect(isPrivilegeEscalation).toBe(true);
    });

    test('should detect unusual access patterns', () => {
      const events = Array(5).fill().map((_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000), // 1 hour apart
        ipAddress: `192.168.1.${100 + i}` // Different IPs
      }));

      const isUnusual = enhancedSecurityService.detectUnusualAccessPattern(events, 123);

      expect(typeof isUnusual).toBe('boolean');
      expect(isUnusual).toBe(true); // Should detect multiple IPs as unusual
    });
  });

  describe('Helper Methods', () => {
    test('should get user by ID', async () => {
      const userId = 123;
      
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{
          id: userId,
          username: 'testuser',
          email: 'test@example.com',
          role: 'resident'
        }]
      });

      const user = await enhancedSecurityService.getUserById(userId);

      expect(user.id).toBe(userId);
      expect(user.username).toBe('testuser');
      expect(mockDbManager.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
    });

    test('should get required auth factors for operations', async () => {
      const operation = 'user_deletion';
      const user = { role: 'admin' };

      const factors = await enhancedSecurityService.getRequiredAuthFactors(operation, user);

      expect(factors).toContain('password_confirmation');
      expect(factors).toContain('totp');
    });

    test('should generate secure session IDs', () => {
      const sessionId = enhancedSecurityService.generateSecureSessionId();

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBe(64); // 32 bytes as hex = 64 characters
    });

    test('should generate event IDs', () => {
      const eventId = enhancedSecurityService.generateEventId();

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
      expect(eventId).toMatch(/^evt_\d+_[a-f0-9]{16}$/);
    });

    test('should generate incident IDs', () => {
      const incidentId = enhancedSecurityService.generateIncidentId();

      expect(incidentId).toBeDefined();
      expect(typeof incidentId).toBe('string');
      expect(incidentId).toMatch(/^inc_\d+_[a-f0-9]{16}$/);
    });
  });
});