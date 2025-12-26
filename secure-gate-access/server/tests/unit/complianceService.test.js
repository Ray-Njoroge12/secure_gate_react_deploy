/**
 * Unit Tests for Compliance Service
 * Phase 3: Compliance & Audit
 * 
 * Tests GDPR, Kenya DPA, and Data Protection compliance functionality
 * Coverage: Data subject access requests, data deletion, consent management
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock loggingService
const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn()
};

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

// Import service after mocking
const complianceServiceModule = await import('../../src/services/complianceService.js');
const complianceService = complianceServiceModule.default;

describe('ComplianceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.GDPR_ENABLED = 'true';
    process.env.KENYA_DPA_ENABLED = 'true';
    process.env.COOKIE_CONSENT_REQUIRED = 'true';
    process.env.DATA_RETENTION_DAYS = '2555';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct default configuration', () => {
      const status = complianceService.getComplianceStatus();
      expect(status).toBeDefined();
      expect(status).toHaveProperty('gdpr');
      expect(status).toHaveProperty('kenyaDpa');
      expect(status).toHaveProperty('cookieConsent');
    });

    it('should read GDPR enabled setting from environment', () => {
      const status = complianceService.getComplianceStatus();
      expect(status.gdpr).toHaveProperty('enabled');
      expect(status.gdpr).toHaveProperty('dataRetentionDays');
    });

    it('should read Kenya DPA enabled setting from environment', () => {
      const status = complianceService.getComplianceStatus();
      expect(status.kenyaDpa).toHaveProperty('enabled');
      expect(status.kenyaDpa).toHaveProperty('dataRetentionDays');
    });

    it('should read cookie consent setting from environment', () => {
      const status = complianceService.getComplianceStatus();
      expect(status.cookieConsent).toHaveProperty('required');
    });
  });

  describe('logComplianceEvent', () => {
    it('should log compliance event with all required fields', () => {
      const event = 'test_event';
      const details = {
        userId: 'user-123',
        ip: '192.168.1.1',
        action: 'test_action'
      };

      complianceService.logComplianceEvent(event, details);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          event,
          details,
          ip: details.ip,
          userId: details.userId,
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle missing IP in details', () => {
      const event = 'test_event';
      const details = {
        userId: 'user-123'
      };

      complianceService.logComplianceEvent(event, details);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          ip: 'unknown'
        })
      );
    });

    it('should handle missing userId in details', () => {
      const event = 'test_event';
      const details = {
        ip: '192.168.1.1'
      };

      complianceService.logComplianceEvent(event, details);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          userId: null
        })
      );
    });

    it('should include timestamp in log', () => {
      const event = 'test_event';
      const details = {};

      complianceService.logComplianceEvent(event, details);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
        })
      );
    });
  });

  describe('handleDataSubjectAccessRequest', () => {
    it('should handle access request successfully', async () => {
      const userId = 'user-123';
      const requestType = 'access';

      const result = await complianceService.handleDataSubjectAccessRequest(userId, requestType);

      expect(result).toEqual({
        success: true,
        requestId: expect.stringMatching(/^req_\d+_\w+$/),
        timestamp: expect.any(String),
        retentionPeriod: expect.any(Number)
      });
    });

    it('should use default request type if not provided', async () => {
      const userId = 'user-123';

      const result = await complianceService.handleDataSubjectAccessRequest(userId);

      expect(result.success).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          event: 'dsar_request',
          details: expect.objectContaining({
            requestType: 'access'
          })
        })
      );
    });

    it('should log DSAR request event', async () => {
      const userId = 'user-123';
      const requestType = 'rectification';

      await complianceService.handleDataSubjectAccessRequest(userId, requestType);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          event: 'dsar_request',
          details: expect.objectContaining({
            userId,
            requestType,
            timestamp: expect.any(String)
          })
        })
      );
    });

    it('should include retention period in response', async () => {
      const userId = 'user-123';

      const result = await complianceService.handleDataSubjectAccessRequest(userId);

      expect(result.retentionPeriod).toBe(2555);
    });

    it('should generate unique request ID', async () => {
      const userId = 'user-123';

      const result1 = await complianceService.handleDataSubjectAccessRequest(userId);
      const result2 = await complianceService.handleDataSubjectAccessRequest(userId);

      expect(result1.requestId).not.toBe(result2.requestId);
    });

    it('should handle portability request type', async () => {
      const userId = 'user-123';
      const requestType = 'portability';

      const result = await complianceService.handleDataSubjectAccessRequest(userId, requestType);

      expect(result.success).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          details: expect.objectContaining({
            requestType: 'portability'
          })
        })
      );
    });
  });

  describe('handleDataDeletionRequest', () => {
    it('should handle deletion request successfully', async () => {
      const userId = 'user-123';
      const reason = 'user_request';

      const result = await complianceService.handleDataDeletionRequest(userId, reason);

      expect(result).toEqual({
        success: true,
        requestId: expect.stringMatching(/^req_\d+_\w+$/),
        timestamp: expect.any(String),
        status: 'anonymized'
      });
    });

    it('should use default reason if not provided', async () => {
      const userId = 'user-123';

      const result = await complianceService.handleDataDeletionRequest(userId);

      expect(result.success).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          event: 'data_deletion_request',
          details: expect.objectContaining({
            reason: 'user_request'
          })
        })
      );
    });

    it('should log data deletion request event', async () => {
      const userId = 'user-123';
      const reason = 'gdpr_right_to_be_forgotten';

      await complianceService.handleDataDeletionRequest(userId, reason);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          event: 'data_deletion_request',
          details: expect.objectContaining({
            userId,
            reason,
            timestamp: expect.any(String)
          })
        })
      );
    });

    it('should return anonymized status', async () => {
      const userId = 'user-123';

      const result = await complianceService.handleDataDeletionRequest(userId);

      expect(result.status).toBe('anonymized');
    });

    it('should handle regulatory deletion reason', async () => {
      const userId = 'user-123';
      const reason = 'regulatory_requirement';

      const result = await complianceService.handleDataDeletionRequest(userId, reason);

      expect(result.success).toBe(true);
    });
  });

  describe('handleConsentManagement', () => {
    it('should handle consent update successfully', async () => {
      const userId = 'user-123';
      const consentData = {
        marketing: true,
        analytics: false,
        functional: true
      };

      const result = await complianceService.handleConsentManagement(userId, consentData);

      expect(result).toEqual({
        success: true,
        consentId: expect.stringMatching(/^req_\d+_\w+$/),
        timestamp: expect.any(String)
      });
    });

    it('should log consent management event', async () => {
      const userId = 'user-123';
      const consentData = {
        marketing: true,
        thirdParty: false
      };

      await complianceService.handleConsentManagement(userId, consentData);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          event: 'consent_management',
          details: expect.objectContaining({
            userId,
            consentData,
            timestamp: expect.any(String)
          })
        })
      );
    });

    it('should handle empty consent data', async () => {
      const userId = 'user-123';
      const consentData = {};

      const result = await complianceService.handleConsentManagement(userId, consentData);

      expect(result.success).toBe(true);
    });

    it('should handle consent withdrawal', async () => {
      const userId = 'user-123';
      const consentData = {
        marketing: false,
        analytics: false,
        functional: false
      };

      const result = await complianceService.handleConsentManagement(userId, consentData);

      expect(result.success).toBe(true);
    });

    it('should generate unique consent ID', async () => {
      const userId = 'user-123';
      const consentData = { marketing: true };

      const result1 = await complianceService.handleConsentManagement(userId, consentData);
      const result2 = await complianceService.handleConsentManagement(userId, consentData);

      expect(result1.consentId).not.toBe(result2.consentId);
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = complianceService.generateRequestId();
      const id2 = complianceService.generateRequestId();

      expect(id1).not.toBe(id2);
    });

    it('should follow expected format', () => {
      const id = complianceService.generateRequestId();

      expect(id).toMatch(/^req_\d+_\w+$/);
    });

    it('should include timestamp component', () => {
      const beforeTimestamp = Date.now();
      const id = complianceService.generateRequestId();
      const afterTimestamp = Date.now();

      const match = id.match(/^req_(\d+)_\w+$/);
      expect(match).not.toBeNull();

      const idTimestamp = parseInt(match[1]);
      expect(idTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(idTimestamp).toBeLessThanOrEqual(afterTimestamp);
    });
  });

  describe('getComplianceStatus', () => {
    it('should return complete compliance status', () => {
      const status = complianceService.getComplianceStatus();

      expect(status).toEqual({
        gdpr: {
          enabled: expect.any(Boolean),
          dataRetentionDays: expect.any(Number)
        },
        kenyaDpa: {
          enabled: expect.any(Boolean),
          dataRetentionDays: expect.any(Number)
        },
        cookieConsent: {
          required: expect.any(Boolean)
        }
      });
    });

    it('should reflect data retention days setting', () => {
      const status = complianceService.getComplianceStatus();

      expect(status.gdpr.dataRetentionDays).toBe(2555);
      expect(status.kenyaDpa.dataRetentionDays).toBe(2555);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null userId in DSAR', async () => {
      const result = await complianceService.handleDataSubjectAccessRequest(null);

      expect(result.success).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalled();
    });

    it('should handle undefined userId in deletion request', async () => {
      const result = await complianceService.handleDataDeletionRequest(undefined);

      expect(result.success).toBe(true);
    });

    it('should handle complex consent data', async () => {
      const userId = 'user-123';
      const consentData = {
        essential: true,
        functional: true,
        analytics: false,
        marketing: false,
        thirdParty: false,
        preferences: {
          language: 'en',
          timezone: 'UTC'
        },
        timestamp: new Date().toISOString()
      };

      const result = await complianceService.handleConsentManagement(userId, consentData);

      expect(result.success).toBe(true);
    });
  });

  describe('GDPR Specific Scenarios', () => {
    it('should handle right to access request', async () => {
      const result = await complianceService.handleDataSubjectAccessRequest('user-123', 'access');
      expect(result.success).toBe(true);
    });

    it('should handle right to rectification request', async () => {
      const result = await complianceService.handleDataSubjectAccessRequest('user-123', 'rectification');
      expect(result.success).toBe(true);
    });

    it('should handle right to erasure request', async () => {
      const result = await complianceService.handleDataDeletionRequest('user-123', 'erasure');
      expect(result.success).toBe(true);
    });

    it('should handle data portability request', async () => {
      const result = await complianceService.handleDataSubjectAccessRequest('user-123', 'portability');
      expect(result.success).toBe(true);
    });
  });

  describe('Kenya DPA Specific Scenarios', () => {
    it('should handle data subject access request', async () => {
      const result = await complianceService.handleDataSubjectAccessRequest('user-123', 'access');
      expect(result.success).toBe(true);
      expect(result.retentionPeriod).toBe(2555);
    });

    it('should handle data correction request', async () => {
      const result = await complianceService.handleDataSubjectAccessRequest('user-123', 'correction');
      expect(result.success).toBe(true);
    });

    it('should handle data deletion for Kenya DPA', async () => {
      const result = await complianceService.handleDataDeletionRequest('user-123', 'kenya_dpa_requirement');
      expect(result.success).toBe(true);
      expect(result.status).toBe('anonymized');
    });
  });

  describe('Audit Trail Verification', () => {
    it('should log all DSAR requests for audit trail', async () => {
      const userId = 'user-audit-123';
      const requestType = 'access';

      await complianceService.handleDataSubjectAccessRequest(userId, requestType);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          event: 'dsar_request',
          details: expect.objectContaining({
            userId,
            requestType
          })
        })
      );
    });

    it('should log all deletion requests for audit trail', async () => {
      const userId = 'user-audit-456';
      const reason = 'regulatory_audit';

      await complianceService.handleDataDeletionRequest(userId, reason);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          event: 'data_deletion_request',
          details: expect.objectContaining({
            userId,
            reason
          })
        })
      );
    });

    it('should log all consent changes for audit trail', async () => {
      const userId = 'user-consent-789';
      const consentData = { marketing: false };

      await complianceService.handleConsentManagement(userId, consentData);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          event: 'consent_management',
          details: expect.objectContaining({
            userId,
            consentData
          })
        })
      );
    });
  });
});
