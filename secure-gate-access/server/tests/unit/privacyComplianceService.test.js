/**
 * Unit Tests for Privacy Compliance Service
 * 
 * Tests privacy controls, data retention policies, GDPR/KDPA compliance,
 * and consent management functionality.
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockDbManager = {
  query: jest.fn(),
  pool: {
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn()
    }))
  }
};

const mockLoggingService = {
  logSecurity: jest.fn(),
  logInfo: jest.fn(),
  logError: jest.fn()
};

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

const { privacyComplianceService } = await import('../../src/services/privacyComplianceService.js');

describe('Privacy Compliance Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Privacy Settings Management', () => {
    test('should get user privacy settings with defaults', async () => {
      const userId = 123;
      const estateId = 1;

      // Mock no existing settings (first call in getUserPrivacySettings)
      mockDbManager.query.mockResolvedValueOnce({
        rows: []
      });

      // Mock the createDefaultPrivacySettings flow which calls updatePrivacySettings
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockDbManager.pool.connect.mockResolvedValue(mockClient);

      // Mock the updatePrivacySettings transaction flow
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      
      // Mock current settings query (empty for new user)
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      // Mock the main INSERT/UPDATE query that returns the settings
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'settings-123',
          user_id: userId,
          estate_id: estateId,
          data_sharing_consent: false,
          marketing_consent: false,
          analytics_consent: false,
          third_party_consent: false,
          location_tracking_consent: false,
          biometric_consent: false,
          automated_decisions_consent: false,
          data_retention_period: '2_years',
          communication_preferences: '{"email":true,"sms":false,"push":true,"inApp":true}',
          visibility_settings: '{"profileVisibility":"estate_only","activityVisibility":"private","contactVisibility":"estate_admins_only"}',
          updated_at: new Date(),
          updated_by: 'system'
        }]
      });

      // Mock additional transaction steps
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // logPrivacyChanges
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // applyPrivacySettingsImmediately
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await privacyComplianceService.getUserPrivacySettings(userId, estateId);

      expect(result.data_sharing_consent).toBe(false);
      expect(result.marketing_consent).toBe(false);
      expect(result.analytics_consent).toBe(false);
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId, estateId]
      );
    });

    test('should update privacy settings with immediate application', async () => {
      const userId = 123;
      const estateId = 1;
      const settings = {
        dataSharingConsent: true,
        marketingConsent: false,
        analyticsConsent: true,
        thirdPartyConsent: false,
        locationTrackingConsent: false,
        biometricConsent: false,
        automatedDecisionsConsent: false,
        dataRetentionPeriod: '2_years',
        communicationPreferences: {},
        visibilitySettings: {}
      };
      const updatedBy = 'user@test.com';

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockDbManager.pool.connect.mockResolvedValue(mockClient);

      // Mock transaction flow
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      
      // Mock current settings
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          data_sharing_consent: false,
          marketing_consent: false,
          analytics_consent: false,
          third_party_consent: false,
          location_tracking_consent: false,
          biometric_consent: false,
          automated_decisions_consent: false
        }]
      });

      // Mock settings update - this is the main INSERT/UPDATE query
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'settings-123',
          user_id: userId,
          estate_id: estateId,
          data_sharing_consent: true,
          analytics_consent: true
        }]
      });

      // Mock additional transaction steps
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // logPrivacyChanges
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // applyPrivacySettingsImmediately
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await privacyComplianceService.updatePrivacySettings(userId, estateId, settings, updatedBy);

      expect(result.id).toBe('settings-123');
      expect(result.data_sharing_consent).toBe(true);
      expect(result.analytics_consent).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should handle privacy settings update errors', async () => {
      const userId = 123;
      const estateId = 1;
      const settings = { dataSharingConsent: true };
      const updatedBy = 'user@test.com';

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockDbManager.pool.connect.mockResolvedValue(mockClient);

      // Mock database error
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(privacyComplianceService.updatePrivacySettings(userId, estateId, settings, updatedBy))
        .rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('Data Retention Policies', () => {
    test('should get data retention policies for estate', async () => {
      const estateId = 1;

      mockDbManager.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'policy-1',
            data_category: 'visitor_records',
            retention_period_days: 365,
            auto_delete_enabled: true,
            archive_enabled: true,
            auto_delete_count: 5,
            archive_count: 3,
            created_at: new Date()
          },
          {
            id: 'policy-2',
            data_category: 'audit_logs',
            retention_period_days: 2555, // 7 years
            auto_delete_enabled: false,
            archive_enabled: true,
            auto_delete_count: 0,
            archive_count: 1,
            created_at: new Date()
          }
        ]
      });

      const result = await privacyComplianceService.getDataRetentionPolicies(estateId);

      expect(result).toHaveLength(2);
      expect(result[0].data_category).toBe('visitor_records');
      expect(result[0].retention_period_days).toBe(365);
      expect(result[1].data_category).toBe('audit_logs');
      expect(result[1].retention_period_days).toBe(2555);
      expect(result[0].description).toBeDefined();
      expect(result[0].nextExecutionDate).toBeDefined();
    });

    test('should execute data retention policies', async () => {
      const estateId = 1;
      const dryRun = false;

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockDbManager.pool.connect.mockResolvedValue(mockClient);

      // Mock policies query
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{
          id: 'policy-1',
          data_category: 'visitor_records',
          retention_period_days: 365,
          auto_delete_enabled: true,
          archive_enabled: true,
          created_at: new Date()
        }]
      });

      // Mock audit log insert
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'audit-123' }]
      });

      const result = await privacyComplianceService.executeDataRetention(estateId, dryRun);

      expect(result.executionId).toBeDefined();
      expect(result.archived).toBeGreaterThanOrEqual(0);
      expect(result.deleted).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeInstanceOf(Array);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should handle dry run execution', async () => {
      const estateId = 1;
      const dryRun = true;

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockDbManager.pool.connect.mockResolvedValue(mockClient);

      // Mock policies query
      mockDbManager.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await privacyComplianceService.executeDataRetention(estateId, dryRun);

      expect(result.executionId).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Compliance Reporting', () => {
    test('should generate GDPR/KDPA compliance report', async () => {
      const estateId = 1;
      const reportType = 'full';

      // Mock compliance data queries for each section
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [{ count: 150 }] }) // Data processing activities
        .mockResolvedValueOnce({ rows: [{ count: 89 }] })  // Consent management
        .mockResolvedValueOnce({ rows: [{ count: 12 }] })  // Data subject rights
        .mockResolvedValueOnce({ rows: [{ count: 3 }] })   // Security incidents
        .mockResolvedValueOnce({ rows: [{ count: 25 }] })  // Data retention
        .mockResolvedValueOnce({ rows: [{ count: 8 }] })   // Third-party sharing
        .mockResolvedValueOnce({ rows: [{ id: 'report-123' }] }); // Store report

      const result = await privacyComplianceService.generateComplianceReport(estateId, reportType);

      expect(result.reportId).toBeDefined();
      expect(result.estateId).toBe(estateId);
      expect(result.reportType).toBe(reportType);
      expect(result.sections).toHaveProperty('dataProcessing');
      expect(result.sections).toHaveProperty('consentManagement');
      expect(result.sections).toHaveProperty('dataSubjectRights');
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    test('should handle compliance report generation errors', async () => {
      const estateId = 1;
      const reportType = 'full';

      // Mock database error
      mockDbManager.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(privacyComplianceService.generateComplianceReport(estateId, reportType))
        .rejects.toThrow('Database error');

      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('Consent Management', () => {
    test('should manage user consent with clear withdrawal options', async () => {
      const userId = 123;
      const estateId = 1;
      const consentType = 'data_processing';
      const granted = true;
      const metadata = { method: 'web_interface' };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockDbManager.pool.connect.mockResolvedValue(mockClient);

      // Mock consent record creation
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'consent-456' }]
      });

      // Mock current consent update
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'current-consent-789' }]
      });

      // Mock audit log
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'audit-123' }]
      });

      const result = await privacyComplianceService.manageUserConsent(userId, estateId, consentType, granted, metadata);

      expect(result.consentId).toBeDefined();
      expect(result.granted).toBe(granted);
      expect(result.recordedAt).toBeInstanceOf(Date);
      expect(result.effectiveImmediately).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should reject invalid consent types', async () => {
      const userId = 123;
      const estateId = 1;
      const consentType = 'invalid_consent_type';
      const granted = true;

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockDbManager.pool.connect.mockResolvedValue(mockClient);

      await expect(privacyComplianceService.manageUserConsent(userId, estateId, consentType, granted))
        .rejects.toThrow('Invalid consent type: invalid_consent_type');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should get user consent status for all types', async () => {
      const userId = 123;
      const estateId = 1;

      mockDbManager.query.mockResolvedValueOnce({
        rows: [
          {
            consent_type: 'data_processing',
            granted: true,
            last_updated_at: new Date(),
            granted_at: new Date(),
            expires_at: null,
            consent_method: 'web_interface',
            metadata: {}
          },
          {
            consent_type: 'marketing_communications',
            granted: false,
            last_updated_at: new Date(),
            granted_at: null,
            expires_at: null,
            consent_method: 'web_interface',
            metadata: {}
          }
        ]
      });

      const result = await privacyComplianceService.getUserConsentStatus(userId, estateId);

      expect(result.data_processing.granted).toBe(true);
      expect(result.marketing_communications.granted).toBe(false);
      expect(result.analytics_tracking.granted).toBe(false); // Default for missing consent
      expect(result.data_processing.description).toBeDefined();
      expect(result.data_processing.canWithdraw).toBe(true);
    });
  });

  describe('Data Subject Rights', () => {
    test('should process data subject rights requests', async () => {
      const userId = 123;
      const estateId = 1;
      const requestType = 'data_access';
      const requestDetails = {
        dataTypes: ['personal_info', 'visit_history'],
        format: 'json'
      };
      const requestedBy = 'user@test.com';

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockDbManager.pool.connect.mockResolvedValue(mockClient);

      // Mock request creation
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'request-789' }]
      });

      // Mock request update
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'request-789' }]
      });

      // Mock audit log
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'audit-456' }]
      });

      const result = await privacyComplianceService.processDataSubjectRequest(
        userId, estateId, requestType, requestDetails, requestedBy
      );

      expect(result.requestId).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.processingResult).toBeDefined();
      expect(result.dueDate).toBeInstanceOf(Date);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should reject invalid request types', async () => {
      const userId = 123;
      const estateId = 1;
      const requestType = 'invalid_request_type';
      const requestDetails = {};
      const requestedBy = 'user@test.com';

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockDbManager.pool.connect.mockResolvedValue(mockClient);

      await expect(privacyComplianceService.processDataSubjectRequest(
        userId, estateId, requestType, requestDetails, requestedBy
      )).rejects.toThrow('Invalid data subject request type: invalid_request_type');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Helper Methods', () => {
    test('should provide consent descriptions', () => {
      const consentType = 'data_processing';
      
      const description = privacyComplianceService.getConsentDescription(consentType);

      expect(description).toBe('Consent for processing personal data for service provision');
    });

    test('should provide privacy settings descriptions', () => {
      const settings = {
        data_sharing_consent: true,
        marketing_consent: false,
        analytics_consent: true
      };

      const descriptions = privacyComplianceService.getPrivacySettingsDescriptions(settings);

      expect(descriptions.dataSharingConsent).toHaveProperty('title');
      expect(descriptions.dataSharingConsent).toHaveProperty('description');
      expect(descriptions.dataSharingConsent).toHaveProperty('impact');
      expect(descriptions.dataSharingConsent).toHaveProperty('category');
      expect(descriptions.dataSharingConsent.value).toBe(true);
    });

    test('should detect privacy setting changes', () => {
      const currentSettings = {
        data_sharing_consent: false,
        marketing_consent: false,
        analytics_consent: true
      };

      const newSettings = {
        dataSharingConsent: true,
        marketingConsent: false,
        analyticsConsent: false
      };

      const changes = privacyComplianceService.detectPrivacyChanges(currentSettings, newSettings);

      expect(changes).toHaveLength(2); // data_sharing_consent and analytics_consent changed
      expect(changes[0].field).toBe('data_sharing_consent');
      expect(changes[0].oldValue).toBe(false);
      expect(changes[0].newValue).toBe(true);
      expect(changes[1].field).toBe('analytics_consent');
      expect(changes[1].oldValue).toBe(true);
      expect(changes[1].newValue).toBe(false);
    });

    test('should log privacy access events', async () => {
      const userId = 123;
      const estateId = 1;
      const action = 'privacy_settings_updated';

      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ id: 'log-123' }]
      });

      await privacyComplianceService.logPrivacyAccess(userId, estateId, action);

      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO privacy_access_logs'),
        expect.arrayContaining([userId, estateId, action])
      );
    });
  });
});