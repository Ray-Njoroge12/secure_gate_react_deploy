/**
 * Unit Tests for complianceService.js
 * Tests GDPR, Kenya DPA, and data protection compliance functionality
 * 
 * Coverage:
 * - GDPR compliance
 * - Kenya DPA compliance
 * - Data subject access requests (DSAR)
 * - Data deletion requests
 * - Consent management
 * - Compliance event logging
 * - Configuration validation
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn()
};

// Mock modules
jest.unstable_mockModule('../../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

describe('complianceService', () => {
  let complianceService;
  let ComplianceService;
  let originalEnv;

  beforeAll(async () => {
    // Save original env
    originalEnv = { ...process.env };

    // Set test environment variables
    process.env.GDPR_ENABLED = 'true';
    process.env.KENYA_DPA_ENABLED = 'true';
    process.env.COOKIE_CONSENT_REQUIRED = 'true';
    process.env.DATA_RETENTION_DAYS = '365';

    // Import service after mocks are set up
    const module = await import('../../../src/services/complianceService.js');
    complianceService = module.default;
    ComplianceService = module.ComplianceService;
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with environment configuration', () => {
      const status = complianceService.getComplianceStatus();

      expect(status.gdpr.enabled).toBe(true);
      expect(status.kenyaDpa.enabled).toBe(true);
      expect(status.cookieConsent.required).toBe(true);
      expect(status.gdpr.dataRetentionDays).toBe(365);
    });

    it('should use default data retention days when not specified', async () => {
      delete process.env.DATA_RETENTION_DAYS;

      // Create new instance to test default
      jest.resetModules();
      const module = await import('../../../src/services/complianceService.js');
      const service = module.default;

      const status = service.getComplianceStatus();
      expect(status.gdpr.dataRetentionDays).toBe(2555);

      // Restore
      process.env.DATA_RETENTION_DAYS = '365';
    });

    it('should handle disabled GDPR', async () => {
      process.env.GDPR_ENABLED = 'false';

      jest.resetModules();
      const module = await import('../../../src/services/complianceService.js');
      const service = module.default;

      const status = service.getComplianceStatus();
      expect(status.gdpr.enabled).toBe(false);

      process.env.GDPR_ENABLED = 'true';
    });

    it('should handle disabled Kenya DPA', async () => {
      process.env.KENYA_DPA_ENABLED = 'false';

      jest.resetModules();
      const module = await import('../../../src/services/complianceService.js');
      const service = module.default;

      const status = service.getComplianceStatus();
      expect(status.kenyaDpa.enabled).toBe(false);

      process.env.KENYA_DPA_ENABLED = 'true';
    });
  });

  describe('logComplianceEvent', () => {
    it('should log compliance event successfully', () => {
      const event = 'user_consent_given';
      const details = {
        userId: 'user123',
        ip: '192.168.1.1',
        consentType: 'cookies'
      };

      complianceService.logComplianceEvent(event, details);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          event: 'user_consent_given',
          details: expect.objectContaining({
            userId: 'user123',
            ip: '192.168.1.1'
          }),
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle missing IP address', () => {
      const event = 'data_access_request';
      const details = { userId: 'user456' };

      complianceService.logComplianceEvent(event, details);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          ip: 'unknown'
        })
      );
    });

    it('should handle missing userId', () => {
      const event = 'anonymous_access';
      const details = { ip: '10.0.0.1' };

      complianceService.logComplianceEvent(event, details);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          userId: null
        })
      );
    });

    it('should include timestamp in compliance log', () => {
      const event = 'test_event';
      const details = { userId: 'user789' };

      complianceService.logComplianceEvent(event, details);

      const logCall = mockLoggingService.logInfo.mock.calls[0][1];
      expect(logCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('handleDataSubjectAccessRequest', () => {
    it('should handle DSAR for data access successfully', async () => {
      const userId = 'user123';
      const requestType = 'access';

      const result = await complianceService.handleDataSubjectAccessRequest(
        userId,
        requestType
      );

      expect(result.success).toBe(true);
      expect(result.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(result.timestamp).toBeDefined();
      expect(result.retentionPeriod).toBe(365);
      
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          event: 'dsar_request',
          details: expect.objectContaining({
            userId: 'user123',
            requestType: 'access'
          })
        })
      );
    });

    it('should handle DSAR for data portability', async () => {
      const userId = 'user456';
      const requestType = 'portability';

      const result = await complianceService.handleDataSubjectAccessRequest(
        userId,
        requestType
      );

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          details: expect.objectContaining({
            requestType: 'portability'
          })
        })
      );
    });

    it('should use default request type when not specified', async () => {
      const userId = 'user789';

      const result = await complianceService.handleDataSubjectAccessRequest(userId);

      expect(result.success).toBe(true);
      
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          details: expect.objectContaining({
            requestType: 'access'
          })
        })
      );
    });

    it('should generate unique request IDs', async () => {
      const result1 = await complianceService.handleDataSubjectAccessRequest('user1');
      const result2 = await complianceService.handleDataSubjectAccessRequest('user2');

      expect(result1.requestId).not.toBe(result2.requestId);
    });

    it('should handle errors gracefully', async () => {
      mockLoggingService.logInfo.mockImplementationOnce(() => {
        throw new Error('Logging failed');
      });

      await expect(
        complianceService.handleDataSubjectAccessRequest('user123')
      ).rejects.toThrow('Logging failed');

      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'DSAR Request Failed',
        expect.any(Error)
      );
    });

    it('should include timestamp in DSAR response', async () => {
      const result = await complianceService.handleDataSubjectAccessRequest('user123');

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('handleDataDeletionRequest', () => {
    it('should handle data deletion request successfully', async () => {
      const userId = 'user123';
      const reason = 'user_request';

      const result = await complianceService.handleDataDeletionRequest(
        userId,
        reason
      );

      expect(result.success).toBe(true);
      expect(result.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(result.status).toBe('anonymized');
      expect(result.timestamp).toBeDefined();
      
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          event: 'data_deletion_request',
          details: expect.objectContaining({
            userId: 'user123',
            reason: 'user_request'
          })
        })
      );
    });

    it('should use default reason when not specified', async () => {
      const userId = 'user456';

      const result = await complianceService.handleDataDeletionRequest(userId);

      expect(result.success).toBe(true);
      
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          details: expect.objectContaining({
            reason: 'user_request'
          })
        })
      );
    });

    it('should handle different deletion reasons', async () => {
      const reasons = [
        'gdpr_right_to_be_forgotten',
        'account_closure',
        'data_breach',
        'legal_requirement'
      ];

      for (const reason of reasons) {
        mockLoggingService.logInfo.mockClear();

        const result = await complianceService.handleDataDeletionRequest(
          'user123',
          reason
        );

        expect(result.success).toBe(true);
        expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
          'Compliance Event',
          expect.objectContaining({
            details: expect.objectContaining({ reason })
          })
        );
      }
    });

    it('should generate unique request IDs for deletions', async () => {
      const result1 = await complianceService.handleDataDeletionRequest('user1');
      const result2 = await complianceService.handleDataDeletionRequest('user2');

      expect(result1.requestId).not.toBe(result2.requestId);
    });

    it('should handle errors gracefully', async () => {
      mockLoggingService.logInfo.mockImplementationOnce(() => {
        throw new Error('Logging failed');
      });

      await expect(
        complianceService.handleDataDeletionRequest('user123')
      ).rejects.toThrow('Logging failed');

      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Data Deletion Request Failed',
        expect.any(Error)
      );
    });

    it('should return anonymized status', async () => {
      const result = await complianceService.handleDataDeletionRequest('user123');

      expect(result.status).toBe('anonymized');
    });
  });

  describe('handleConsentManagement', () => {
    it('should handle consent management successfully', async () => {
      const userId = 'user123';
      const consentData = {
        cookies: true,
        analytics: false,
        marketing: false
      };

      const result = await complianceService.handleConsentManagement(
        userId,
        consentData
      );

      expect(result.success).toBe(true);
      expect(result.consentId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(result.timestamp).toBeDefined();
      
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          event: 'consent_management',
          details: expect.objectContaining({
            userId: 'user123',
            consentData: consentData
          })
        })
      );
    });

    it('should handle full consent', async () => {
      const userId = 'user456';
      const consentData = {
        cookies: true,
        analytics: true,
        marketing: true,
        thirdParty: true
      };

      const result = await complianceService.handleConsentManagement(
        userId,
        consentData
      );

      expect(result.success).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          details: expect.objectContaining({
            consentData: expect.objectContaining({
              cookies: true,
              analytics: true,
              marketing: true,
              thirdParty: true
            })
          })
        })
      );
    });

    it('should handle withdrawal of consent', async () => {
      const userId = 'user789';
      const consentData = {
        cookies: false,
        analytics: false,
        marketing: false
      };

      const result = await complianceService.handleConsentManagement(
        userId,
        consentData
      );

      expect(result.success).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          details: expect.objectContaining({
            consentData: expect.objectContaining({
              cookies: false,
              analytics: false,
              marketing: false
            })
          })
        })
      );
    });

    it('should generate unique consent IDs', async () => {
      const result1 = await complianceService.handleConsentManagement(
        'user1',
        { cookies: true }
      );
      const result2 = await complianceService.handleConsentManagement(
        'user2',
        { cookies: true }
      );

      expect(result1.consentId).not.toBe(result2.consentId);
    });

    it('should handle errors gracefully', async () => {
      mockLoggingService.logInfo.mockImplementationOnce(() => {
        throw new Error('Logging failed');
      });

      await expect(
        complianceService.handleConsentManagement('user123', { cookies: true })
      ).rejects.toThrow('Logging failed');

      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Consent Management Failed',
        expect.any(Error)
      );
    });

    it('should include timestamp in consent response', async () => {
      const result = await complianceService.handleConsentManagement(
        'user123',
        { cookies: true }
      );

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = complianceService.generateRequestId();
      const id2 = complianceService.generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should include timestamp in request ID', () => {
      const beforeTimestamp = Date.now();
      const requestId = complianceService.generateRequestId();
      const afterTimestamp = Date.now();

      const timestampPart = requestId.split('_')[1];
      const timestamp = parseInt(timestampPart);

      expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(timestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it('should include random component in request ID', () => {
      const id = complianceService.generateRequestId();
      const parts = id.split('_');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('req');
      expect(parts[1]).toMatch(/^\d+$/);
      expect(parts[2]).toMatch(/^[a-z0-9]+$/);
      expect(parts[2].length).toBeGreaterThan(0);
    });
  });

  describe('getComplianceStatus', () => {
    it('should return complete compliance status', () => {
      const status = complianceService.getComplianceStatus();

      expect(status).toEqual({
        gdpr: {
          enabled: true,
          dataRetentionDays: 365
        },
        kenyaDpa: {
          enabled: true,
          dataRetentionDays: 365
        },
        cookieConsent: {
          required: true
        }
      });
    });

    it('should reflect current configuration', async () => {
      process.env.GDPR_ENABLED = 'false';
      process.env.COOKIE_CONSENT_REQUIRED = 'false';
      process.env.DATA_RETENTION_DAYS = '730';

      jest.resetModules();
      const module = await import('../../../src/services/complianceService.js');
      const service = module.default;

      const status = service.getComplianceStatus();

      expect(status.gdpr.enabled).toBe(false);
      expect(status.cookieConsent.required).toBe(false);
      expect(status.gdpr.dataRetentionDays).toBe(730);

      // Restore
      process.env.GDPR_ENABLED = 'true';
      process.env.COOKIE_CONSENT_REQUIRED = 'true';
      process.env.DATA_RETENTION_DAYS = '365';
    });
  });

  describe('Module exports', () => {
    it('should export default compliance service instance', () => {
      expect(complianceService).toBeDefined();
      expect(complianceService.logComplianceEvent).toBeDefined();
      expect(complianceService.handleDataSubjectAccessRequest).toBeDefined();
      expect(complianceService.handleDataDeletionRequest).toBeDefined();
      expect(complianceService.handleConsentManagement).toBeDefined();
      expect(complianceService.getComplianceStatus).toBeDefined();
    });

    it('should be a singleton instance', () => {
      expect(complianceService.constructor.name).toBe('ComplianceService');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty consent data', async () => {
      const result = await complianceService.handleConsentManagement(
        'user123',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          details: expect.objectContaining({
            consentData: {}
          })
        })
      );
    });

    it('should handle null userId gracefully', async () => {
      const result = await complianceService.handleDataSubjectAccessRequest(null);

      expect(result.success).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          details: expect.objectContaining({
            userId: null
          })
        })
      );
    });

    it('should handle undefined reason in deletion', async () => {
      const result = await complianceService.handleDataDeletionRequest(
        'user123',
        undefined
      );

      expect(result.success).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Compliance Event',
        expect.objectContaining({
          details: expect.objectContaining({
            reason: 'user_request'
          })
        })
      );
    });

    it('should handle very long data retention periods', async () => {
      process.env.DATA_RETENTION_DAYS = '99999';

      jest.resetModules();
      const module = await import('../../../src/services/complianceService.js');
      const service = module.default;

      const status = service.getComplianceStatus();
      expect(status.gdpr.dataRetentionDays).toBe(99999);

      process.env.DATA_RETENTION_DAYS = '365';
    });

    it('should handle invalid data retention days', async () => {
      process.env.DATA_RETENTION_DAYS = 'invalid';

      jest.resetModules();
      const module = await import('../../../src/services/complianceService.js');
      const service = module.default;

      const status = service.getComplianceStatus();
      expect(status.gdpr.dataRetentionDays).toBe(NaN);

      process.env.DATA_RETENTION_DAYS = '365';
    });
  });

  describe('Compliance scenarios', () => {
    it('should handle GDPR Article 15 (right of access)', async () => {
      const result = await complianceService.handleDataSubjectAccessRequest(
        'user123',
        'access'
      );

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
    });

    it('should handle GDPR Article 17 (right to erasure)', async () => {
      const result = await complianceService.handleDataDeletionRequest(
        'user123',
        'gdpr_right_to_be_forgotten'
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('anonymized');
    });

    it('should handle GDPR Article 20 (right to data portability)', async () => {
      const result = await complianceService.handleDataSubjectAccessRequest(
        'user123',
        'portability'
      );

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
    });

    it('should log all compliance actions for audit trail', async () => {
      mockLoggingService.logInfo.mockClear();

      await complianceService.handleDataSubjectAccessRequest('user1', 'access');
      await complianceService.handleDataDeletionRequest('user2', 'user_request');
      await complianceService.handleConsentManagement('user3', { cookies: true });

      expect(mockLoggingService.logInfo).toHaveBeenCalledTimes(3);
      expect(mockLoggingService.logInfo).toHaveBeenNthCalledWith(
        1,
        'Compliance Event',
        expect.objectContaining({ event: 'dsar_request' })
      );
      expect(mockLoggingService.logInfo).toHaveBeenNthCalledWith(
        2,
        'Compliance Event',
        expect.objectContaining({ event: 'data_deletion_request' })
      );
      expect(mockLoggingService.logInfo).toHaveBeenNthCalledWith(
        3,
        'Compliance Event',
        expect.objectContaining({ event: 'consent_management' })
      );
    });
  });
});
