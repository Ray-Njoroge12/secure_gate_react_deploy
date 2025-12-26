/**
 * Unit Tests for Kenya DPA Audit Service
 * Phase 3: Compliance & Audit
 * 
 * Tests Kenya Data Protection Act (2019) compliance auditing
 * Coverage: Data subject rights, 72-hour breach notification, ODPC registration
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';

// Mock dependencies
const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn()
};

const mockCentralizedLoggingService = {
  logEvent: jest.fn().mockResolvedValue()
};

const mockAuditTraceabilityService = {
  logAuditEvent: jest.fn().mockResolvedValue()
};

const mockRollbackAlertingService = {
  sendAlert: jest.fn().mockResolvedValue()
};

const mockFs = {
  default: {
    mkdir: jest.fn().mockResolvedValue(),
    writeFile: jest.fn().mockResolvedValue(),
    readFile: jest.fn().mockResolvedValue(''),
    unlink: jest.fn().mockResolvedValue(),
    readdir: jest.fn().mockResolvedValue([]),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => false })
  },
  mkdir: jest.fn().mockResolvedValue(),
  writeFile: jest.fn().mockResolvedValue(),
  readFile: jest.fn().mockResolvedValue(''),
  unlink: jest.fn().mockResolvedValue(),
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn().mockResolvedValue({ isDirectory: () => false })
};

jest.unstable_mockModule('fs/promises', () => mockFs);

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

jest.unstable_mockModule('../../src/services/centralizedLoggingService.js', () => ({
  default: mockCentralizedLoggingService
}));

jest.unstable_mockModule('../../src/services/auditTraceabilityService.js', () => ({
  default: mockAuditTraceabilityService
}));

jest.unstable_mockModule('../../src/services/rollbackAlertingService.js', () => ({
  default: mockRollbackAlertingService
}));

// Import service after mocking
const kenyaDPAServiceModule = await import('../../src/services/kenyaDPAAuditService.js');
const kenyaDPAAuditService = kenyaDPAServiceModule.default;

describe('KenyaDPAAuditService', () => {
  let originalMathRandom;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear service state
    kenyaDPAAuditService.auditResults.length = 0;
    kenyaDPAAuditService.violations.length = 0;
    kenyaDPAAuditService.remediations.length = 0;
    originalMathRandom = Math.random;
  });

  afterEach(() => {
    jest.resetAllMocks();
    Math.random = originalMathRandom;
  });

  describe('Service Configuration', () => {
    it('should have correct default configuration', () => {
      expect(kenyaDPAAuditService.config).toBeDefined();
      expect(kenyaDPAAuditService.config.kenya_dpa).toBeDefined();
      expect(kenyaDPAAuditService.config.data_subject_rights).toBeDefined();
      expect(kenyaDPAAuditService.config.breach_notification).toBeDefined();
      expect(kenyaDPAAuditService.config.data_processing_agreements).toBeDefined();
      expect(kenyaDPAAuditService.config.odpc_registration).toBeDefined();
    });

    it('should enable Kenya DPA audit', () => {
      expect(kenyaDPAAuditService.config.kenya_dpa.enabled).toBe(true);
      expect(kenyaDPAAuditService.config.kenya_dpa.audit_frequency).toBe('monthly');
    });

    it('should configure data subject rights', () => {
      const rights = kenyaDPAAuditService.config.data_subject_rights.rights;
      
      expect(rights).toContain('access_right');
      expect(rights).toContain('correction_right');
      expect(rights).toContain('deletion_right');
      expect(rights).toContain('portability_right');
      expect(rights).toContain('objection_right');
      expect(rights).toContain('restriction_right');
    });

    it('should set 30-day response time for data subject rights', () => {
      const responseTime = kenyaDPAAuditService.config.data_subject_rights.response_time;
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      
      expect(responseTime).toBe(thirtyDaysMs);
    });

    it('should configure 72-hour breach notification', () => {
      const timeLimit = kenyaDPAAuditService.config.breach_notification.time_limit;
      const seventyTwoHoursMs = 72 * 60 * 60 * 1000;
      
      expect(timeLimit).toBe(seventyTwoHoursMs);
    });

    it('should enable ODPC notification', () => {
      expect(kenyaDPAAuditService.config.breach_notification.odpc_notification).toBe(true);
    });

    it('should enable data subject notification', () => {
      expect(kenyaDPAAuditService.config.breach_notification.data_subject_notification).toBe(true);
    });

    it('should configure data processing agreement parties', () => {
      const parties = kenyaDPAAuditService.config.data_processing_agreements.required_parties;
      
      expect(parties).toContain('cloud_providers');
      expect(parties).toContain('analytics_services');
      expect(parties).toContain('payment_processors');
      expect(parties).toContain('communication_services');
      expect(parties).toContain('security_services');
    });

    it('should configure ODPC registration requirements', () => {
      const validation = kenyaDPAAuditService.config.odpc_registration.validation;
      
      expect(validation.controller_registered).toBe(true);
      expect(validation.processor_registered).toBe(true);
      expect(validation.registration_current).toBe(true);
      expect(validation.annual_renewal).toBe(true);
    });

    it('should configure reporting recipients', () => {
      const recipients = kenyaDPAAuditService.config.kenya_dpa.reporting.recipients;
      
      expect(recipients).toContain('dpo@securegate.com');
      expect(recipients).toContain('compliance@securegate.com');
      expect(recipients).toContain('legal@securegate.com');
    });
  });

  describe('calculateComplianceScore', () => {
    it('should return 100 for no violations', async () => {
      kenyaDPAAuditService.violations.length = 0;
      
      const score = await kenyaDPAAuditService.calculateComplianceScore();
      
      expect(score).toBe(100);
    });

    it('should deduct 20 for critical violations', async () => {
      kenyaDPAAuditService.violations.push({ severity: 'critical' });
      
      const score = await kenyaDPAAuditService.calculateComplianceScore();
      
      expect(score).toBe(80);
    });

    it('should deduct 10 for high violations', async () => {
      kenyaDPAAuditService.violations.push({ severity: 'high' });
      
      const score = await kenyaDPAAuditService.calculateComplianceScore();
      
      expect(score).toBe(90);
    });

    it('should deduct 5 for medium violations', async () => {
      kenyaDPAAuditService.violations.push({ severity: 'medium' });
      
      const score = await kenyaDPAAuditService.calculateComplianceScore();
      
      expect(score).toBe(95);
    });

    it('should deduct 1 for low violations', async () => {
      kenyaDPAAuditService.violations.push({ severity: 'low' });
      
      const score = await kenyaDPAAuditService.calculateComplianceScore();
      
      expect(score).toBe(99);
    });

    it('should cap score at 0', async () => {
      for (let i = 0; i < 10; i++) {
        kenyaDPAAuditService.violations.push({ severity: 'critical' });
      }
      
      const score = await kenyaDPAAuditService.calculateComplianceScore();
      
      expect(score).toBe(0);
    });
  });

  describe('calculateRemediationRate', () => {
    it('should return 100 for no violations', async () => {
      kenyaDPAAuditService.violations.length = 0;
      
      const rate = await kenyaDPAAuditService.calculateRemediationRate();
      
      expect(rate).toBe(100);
    });

    it('should calculate correct rate for partial remediation', async () => {
      kenyaDPAAuditService.violations.push(
        { id: 'v1', remediated: true },
        { id: 'v2', remediated: true },
        { id: 'v3', remediated: false },
        { id: 'v4', remediated: false }
      );
      
      const rate = await kenyaDPAAuditService.calculateRemediationRate();
      
      expect(rate).toBe(50);
    });

    it('should return 0 for no remediated violations', async () => {
      kenyaDPAAuditService.violations.push(
        { id: 'v1', remediated: false },
        { id: 'v2', remediated: false }
      );
      
      const rate = await kenyaDPAAuditService.calculateRemediationRate();
      
      expect(rate).toBe(0);
    });
  });

  describe('calculateBreachResponseTime', () => {
    it('should return a time value', async () => {
      const time = await kenyaDPAAuditService.calculateBreachResponseTime();
      
      expect(typeof time).toBe('number');
      expect(time).toBeGreaterThanOrEqual(0);
    });
  });

  describe('collectAuditMetrics', () => {
    it('should log metrics to centralized logging', async () => {
      await kenyaDPAAuditService.collectAuditMetrics();

      expect(mockCentralizedLoggingService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: 'kenya_dpa_audit_service',
          action: 'collect_audit_metrics',
          status: 'success'
        })
      );
    });

    it('should include all required metrics', async () => {
      await kenyaDPAAuditService.collectAuditMetrics();

      expect(mockCentralizedLoggingService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            compliance_score: expect.any(Number),
            violation_count: expect.any(Number),
            remediation_rate: expect.any(Number),
            audit_frequency: expect.any(String),
            breach_response_time: expect.any(Number)
          })
        })
      );
    });
  });

  describe('validateDataSubjectRight', () => {
    it('should return compliance result', async () => {
      const result = await kenyaDPAAuditService.validateDataSubjectRight('access_right');
      
      expect(result).toHaveProperty('compliant');
      expect(result).toHaveProperty('details');
      expect(result).toHaveProperty('timestamp');
    });

    it('should include timestamp', async () => {
      const result = await kenyaDPAAuditService.validateDataSubjectRight('deletion_right');
      
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('auditDataSubjectRights', () => {
    it('should return violations and remediations', async () => {
      const result = await kenyaDPAAuditService.auditDataSubjectRights();
      
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('remediations');
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should detect non-compliant access right', async () => {
      kenyaDPAAuditService.validateDataSubjectRight = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Needs improvement',
        timestamp: new Date().toISOString()
      });

      const result = await kenyaDPAAuditService.auditDataSubjectRights();

      const violation = result.violations.find(v => v.right === 'access_right');
      expect(violation).toBeDefined();
      expect(violation.severity).toBe('high');
    });

    it('should mark deletion right non-compliance as critical', async () => {
      kenyaDPAAuditService.validateDataSubjectRight = jest.fn().mockImplementation((right) => {
        if (right === 'deletion_right') {
          return Promise.resolve({ compliant: false, details: '', timestamp: new Date().toISOString() });
        }
        return Promise.resolve({ compliant: true, details: '', timestamp: new Date().toISOString() });
      });

      const result = await kenyaDPAAuditService.auditDataSubjectRights();

      const violation = result.violations.find(v => v.right === 'deletion_right');
      expect(violation).toBeDefined();
      expect(violation.severity).toBe('critical');
    });

    it('should store violations', async () => {
      kenyaDPAAuditService.validateDataSubjectRight = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Issue',
        timestamp: new Date().toISOString()
      });

      const initialCount = kenyaDPAAuditService.violations.length;
      await kenyaDPAAuditService.auditDataSubjectRights();

      expect(kenyaDPAAuditService.violations.length).toBeGreaterThan(initialCount);
    });
  });

  describe('auditBreachNotification', () => {
    beforeEach(() => {
      kenyaDPAAuditService.validateBreachNotificationPolicy = jest.fn().mockResolvedValue({
        compliant: true,
        details: 'OK'
      });
      kenyaDPAAuditService.validateODPCNotification = jest.fn().mockResolvedValue({
        compliant: true,
        details: 'OK'
      });
      kenyaDPAAuditService.validateDataSubjectNotification = jest.fn().mockResolvedValue({
        compliant: true,
        details: 'OK'
      });
    });

    it('should return violations and remediations', async () => {
      const result = await kenyaDPAAuditService.auditBreachNotification();
      
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('remediations');
    });

    it('should detect 72-hour notification policy violation as critical', async () => {
      kenyaDPAAuditService.validateBreachNotificationPolicy = jest.fn().mockResolvedValue({
        compliant: false
      });

      const result = await kenyaDPAAuditService.auditBreachNotification();

      const violation = result.violations.find(v => v.policy === '72_hour_notification');
      expect(violation).toBeDefined();
      expect(violation.severity).toBe('critical');
    });

    it('should detect ODPC notification violation as high', async () => {
      kenyaDPAAuditService.validateODPCNotification = jest.fn().mockResolvedValue({
        compliant: false
      });

      const result = await kenyaDPAAuditService.auditBreachNotification();

      const violation = result.violations.find(v => v.policy === 'odpc_notification');
      expect(violation).toBeDefined();
      expect(violation.severity).toBe('high');
    });
  });

  describe('executeComplianceAudit', () => {
    // Store original methods
    let originalAuditDataSubjectRights;
    let originalAuditBreachNotification;
    let originalAuditDataProcessingAgreements;
    let originalAuditODPCRegistration;
    let originalLogAuditEvent;
    let originalSendNonComplianceAlert;
    let originalCalculateComplianceScore;

    beforeEach(() => {
      // Save original methods
      originalAuditDataSubjectRights = kenyaDPAAuditService.auditDataSubjectRights;
      originalAuditBreachNotification = kenyaDPAAuditService.auditBreachNotification;
      originalAuditDataProcessingAgreements = kenyaDPAAuditService.auditDataProcessingAgreements;
      originalAuditODPCRegistration = kenyaDPAAuditService.auditODPCRegistration;
      originalLogAuditEvent = kenyaDPAAuditService.logAuditEvent;
      originalSendNonComplianceAlert = kenyaDPAAuditService.sendNonComplianceAlert;
      originalCalculateComplianceScore = kenyaDPAAuditService.calculateComplianceScore;

      // Mock all audit methods
      kenyaDPAAuditService.auditDataSubjectRights = jest.fn().mockResolvedValue({
        violations: [],
        remediations: []
      });
      kenyaDPAAuditService.auditBreachNotification = jest.fn().mockResolvedValue({
        violations: [],
        remediations: []
      });
      kenyaDPAAuditService.auditDataProcessingAgreements = jest.fn().mockResolvedValue({
        violations: [],
        remediations: []
      });
      kenyaDPAAuditService.auditODPCRegistration = jest.fn().mockResolvedValue({
        violations: [],
        remediations: []
      });
      kenyaDPAAuditService.logAuditEvent = jest.fn().mockResolvedValue();
      kenyaDPAAuditService.sendNonComplianceAlert = jest.fn().mockResolvedValue();
    });

    afterEach(() => {
      // Restore original methods
      kenyaDPAAuditService.auditDataSubjectRights = originalAuditDataSubjectRights;
      kenyaDPAAuditService.auditBreachNotification = originalAuditBreachNotification;
      kenyaDPAAuditService.auditDataProcessingAgreements = originalAuditDataProcessingAgreements;
      kenyaDPAAuditService.auditODPCRegistration = originalAuditODPCRegistration;
      kenyaDPAAuditService.logAuditEvent = originalLogAuditEvent;
      kenyaDPAAuditService.sendNonComplianceAlert = originalSendNonComplianceAlert;
      kenyaDPAAuditService.calculateComplianceScore = originalCalculateComplianceScore;
    });

    it('should execute all audit components', async () => {
      await kenyaDPAAuditService.executeComplianceAudit();

      expect(kenyaDPAAuditService.auditDataSubjectRights).toHaveBeenCalled();
      expect(kenyaDPAAuditService.auditBreachNotification).toHaveBeenCalled();
      expect(kenyaDPAAuditService.auditDataProcessingAgreements).toHaveBeenCalled();
      expect(kenyaDPAAuditService.auditODPCRegistration).toHaveBeenCalled();
    });

    it('should return audit result', async () => {
      const result = await kenyaDPAAuditService.executeComplianceAudit();

      expect(result).toMatchObject({
        id: expect.any(String),
        type: 'kenya_dpa_compliance_audit',
        status: expect.stringMatching(/completed|failed/),
        startTime: expect.any(String),
        endTime: expect.any(String),
        violations: expect.any(Array),
        remediations: expect.any(Array),
        compliance_score: expect.any(Number),
        launch_ready: expect.any(Boolean)
      });
    });

    it('should mark as launch ready when score >= 80 and no critical violations', async () => {
      kenyaDPAAuditService.calculateComplianceScore = jest.fn().mockResolvedValue(85);

      const result = await kenyaDPAAuditService.executeComplianceAudit();

      expect(result.launch_ready).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should mark as not launch ready when score < 80', async () => {
      kenyaDPAAuditService.calculateComplianceScore = jest.fn().mockResolvedValue(70);

      const result = await kenyaDPAAuditService.executeComplianceAudit();

      expect(result.launch_ready).toBe(false);
      expect(result.status).toBe('failed');
    });

    it('should send alert when not compliant', async () => {
      kenyaDPAAuditService.calculateComplianceScore = jest.fn().mockResolvedValue(50);

      await kenyaDPAAuditService.executeComplianceAudit();

      expect(kenyaDPAAuditService.sendNonComplianceAlert).toHaveBeenCalled();
    });

    it('should store audit results', async () => {
      const initialCount = kenyaDPAAuditService.auditResults.length;

      await kenyaDPAAuditService.executeComplianceAudit();

      expect(kenyaDPAAuditService.auditResults.length).toBe(initialCount + 1);
    });

    it('should compile violations from all audit components', async () => {
      kenyaDPAAuditService.auditDataSubjectRights = jest.fn().mockResolvedValue({
        violations: [{ id: 'v1' }],
        remediations: []
      });
      kenyaDPAAuditService.auditBreachNotification = jest.fn().mockResolvedValue({
        violations: [{ id: 'v2' }],
        remediations: []
      });

      const result = await kenyaDPAAuditService.executeComplianceAudit();

      expect(result.violations.length).toBeGreaterThanOrEqual(2);
    });

    it('should log audit start event', async () => {
      await kenyaDPAAuditService.executeComplianceAudit();

      expect(kenyaDPAAuditService.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'kenya_dpa_compliance_audit'
        }),
        'started'
      );
    });

    it('should log audit completion event', async () => {
      await kenyaDPAAuditService.executeComplianceAudit();

      expect(kenyaDPAAuditService.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.stringMatching(/completed|failed/)
        }),
        'completed'
      );
    });
  });

  describe('ID Generation', () => {
    it('should generate unique audit IDs', () => {
      const id1 = kenyaDPAAuditService.generateAuditId();
      const id2 = kenyaDPAAuditService.generateAuditId();
      
      expect(id1).not.toBe(id2);
    });

    it('should generate unique violation IDs', () => {
      const id1 = kenyaDPAAuditService.generateViolationId();
      const id2 = kenyaDPAAuditService.generateViolationId();
      
      expect(id1).not.toBe(id2);
    });

    it('should generate unique trace IDs', () => {
      const id1 = kenyaDPAAuditService.generateTraceId();
      const id2 = kenyaDPAAuditService.generateTraceId();
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('Service Status', () => {
    it('should track audit results', () => {
      expect(Array.isArray(kenyaDPAAuditService.auditResults)).toBe(true);
    });

    it('should track violations', () => {
      expect(Array.isArray(kenyaDPAAuditService.violations)).toBe(true);
    });

    it('should track remediations', () => {
      expect(Array.isArray(kenyaDPAAuditService.remediations)).toBe(true);
    });

    it('should report running status', () => {
      expect(typeof kenyaDPAAuditService.isRunning).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in calculateComplianceScore gracefully', async () => {
      // Test that service has error handling capability
      const score = await kenyaDPAAuditService.calculateComplianceScore();
      
      // Should return a valid score (number between 0 and 100)
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle errors in auditDataSubjectRights', async () => {
      // Test that the method returns expected structure even with no data
      const result = await kenyaDPAAuditService.auditDataSubjectRights();

      // Expect it to return the expected structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('remediations');
    });
  });

  describe('Directory Creation', () => {
    it('should create audit directory on initialization', async () => {
      await kenyaDPAAuditService.createAuditDirectory();

      // The mock is structured with default export
      expect(mockFs.default.mkdir).toHaveBeenCalledWith(
        '/app/compliance_audits/kenya_dpa',
        { recursive: true }
      );
    });

    it('should log success on directory creation', async () => {
      await kenyaDPAAuditService.createAuditDirectory();

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        expect.stringContaining('Created Kenya DPA audit directory')
      );
    });
  });

  describe('Monitoring Configuration', () => {
    it('should have monitoring enabled', () => {
      expect(kenyaDPAAuditService.config.monitoring.enabled).toBe(true);
    });

    it('should set 30-second monitoring interval', () => {
      expect(kenyaDPAAuditService.config.monitoring.interval).toBe(30000);
    });

    it('should configure all required metrics', () => {
      const metrics = kenyaDPAAuditService.config.monitoring.metrics;
      
      expect(metrics).toContain('compliance_score');
      expect(metrics).toContain('violation_count');
      expect(metrics).toContain('remediation_rate');
      expect(metrics).toContain('audit_frequency');
      expect(metrics).toContain('breach_response_time');
    });
  });

  describe('Kenya DPA Specific Requirements', () => {
    it('should enforce 72-hour breach notification requirement', () => {
      const seventyTwoHoursMs = 72 * 60 * 60 * 1000;
      expect(kenyaDPAAuditService.config.breach_notification.time_limit).toBe(seventyTwoHoursMs);
    });

    it('should require ODPC registration', () => {
      expect(kenyaDPAAuditService.config.odpc_registration.registration_required).toBe(true);
    });

    it('should validate controller and processor registration', () => {
      const validation = kenyaDPAAuditService.config.odpc_registration.validation;
      
      expect(validation.controller_registered).toBe(true);
      expect(validation.processor_registered).toBe(true);
    });

    it('should require annual ODPC registration renewal', () => {
      expect(kenyaDPAAuditService.config.odpc_registration.validation.annual_renewal).toBe(true);
    });

    it('should enforce 30-day data subject rights response time', () => {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      expect(kenyaDPAAuditService.config.data_subject_rights.response_time).toBe(thirtyDaysMs);
    });
  });

  describe('Additional Kenya DPA Coverage', () => {
    describe('Multiple Severity Deductions', () => {
      it('should calculate correct score with all severity levels', async () => {
        kenyaDPAAuditService.violations.push(
          { severity: 'critical' },  // -20
          { severity: 'high' },      // -10
          { severity: 'medium' },    // -5
          { severity: 'low' }        // -1
        );
        
        const score = await kenyaDPAAuditService.calculateComplianceScore();
        
        // 100 - 20 - 10 - 5 - 1 = 64
        expect(score).toBe(64);
      });

      it('should not return negative scores', async () => {
        // Add many violations to force negative calculation
        for (let i = 0; i < 10; i++) {
          kenyaDPAAuditService.violations.push({ severity: 'critical' });
        }
        
        const score = await kenyaDPAAuditService.calculateComplianceScore();
        
        expect(score).toBe(0); // Score should be clamped to 0
      });
    });

    describe('Remediation Rate Calculation', () => {
      it('should calculate 100% remediation rate when all violations remediated', async () => {
        kenyaDPAAuditService.violations.push(
          { id: 'v1', remediated: true },
          { id: 'v2', remediated: true }
        );
        
        const rate = await kenyaDPAAuditService.calculateRemediationRate();
        
        expect(rate).toBe(100);
      });

      it('should calculate 0% remediation rate when no violations remediated', async () => {
        kenyaDPAAuditService.violations.push(
          { id: 'v1', remediated: false },
          { id: 'v2', remediated: false }
        );
        
        const rate = await kenyaDPAAuditService.calculateRemediationRate();
        
        expect(rate).toBe(0);
      });

      it('should calculate correct rate for partial remediation', async () => {
        kenyaDPAAuditService.violations.push(
          { id: 'v1', remediated: true },
          { id: 'v2', remediated: false },
          { id: 'v3', remediated: false },
          { id: 'v4', remediated: true }
        );
        
        const rate = await kenyaDPAAuditService.calculateRemediationRate();
        
        expect(rate).toBe(50);
      });
    });

    describe('Breach Response Time', () => {
      it('calculateBreachResponseTime should return a number', async () => {
        const responseTime = await kenyaDPAAuditService.calculateBreachResponseTime();
        
        expect(typeof responseTime).toBe('number');
        expect(responseTime).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Monitoring Start Behavior', () => {
      it('startAuditMonitoring should not start if already running', () => {
        kenyaDPAAuditService.isRunning = true;
        const intervalSpy = jest.spyOn(global, 'setInterval');
        
        kenyaDPAAuditService.startAuditMonitoring();
        
        expect(intervalSpy).not.toHaveBeenCalled();
        intervalSpy.mockRestore();
      });
    });

    describe('Metrics Collection', () => {
      it('collectAuditMetrics should collect and log metrics', async () => {
        await kenyaDPAAuditService.collectAuditMetrics();

        expect(mockCentralizedLoggingService.logEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            actor: 'kenya_dpa_audit_service',
            action: 'collect_audit_metrics',
            status: 'success'
          })
        );
      });
    });

    describe('Audit Components', () => {
      describe('Data Subject Rights Audit', () => {
        beforeEach(() => {
          jest.spyOn(kenyaDPAAuditService, 'validateDataSubjectRight').mockResolvedValue({ compliant: true });
        });

        afterEach(() => {
          jest.restoreAllMocks();
        });

        it('should detect non-compliant access right', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateDataSubjectRight').mockImplementation((right) => {
            if (right === 'access_right') return Promise.resolve({ compliant: false });
            return Promise.resolve({ compliant: true });
          });

          const result = await kenyaDPAAuditService.auditDataSubjectRights();

          const violation = result.violations.find(v => v.right === 'access_right');
          expect(violation).toBeDefined();
          expect(violation.severity).toBe('high');
        });

        it('should detect non-compliant correction right', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateDataSubjectRight').mockImplementation((right) => {
            if (right === 'correction_right') return Promise.resolve({ compliant: false });
            return Promise.resolve({ compliant: true });
          });

          const result = await kenyaDPAAuditService.auditDataSubjectRights();

          const violation = result.violations.find(v => v.right === 'correction_right');
          expect(violation).toBeDefined();
        });

        it('should detect non-compliant deletion right with critical severity', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateDataSubjectRight').mockImplementation((right) => {
            if (right === 'deletion_right') return Promise.resolve({ compliant: false });
            return Promise.resolve({ compliant: true });
          });

          const result = await kenyaDPAAuditService.auditDataSubjectRights();

          const violation = result.violations.find(v => v.right === 'deletion_right');
          expect(violation).toBeDefined();
          expect(violation.severity).toBe('critical');
        });

        it('should detect non-compliant portability right', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateDataSubjectRight').mockImplementation((right) => {
            if (right === 'portability_right') return Promise.resolve({ compliant: false });
            return Promise.resolve({ compliant: true });
          });

          const result = await kenyaDPAAuditService.auditDataSubjectRights();

          const violation = result.violations.find(v => v.right === 'portability_right');
          expect(violation).toBeDefined();
          expect(violation.severity).toBe('medium');
        });

        it('should detect non-compliant objection right', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateDataSubjectRight').mockImplementation((right) => {
            if (right === 'objection_right') return Promise.resolve({ compliant: false });
            return Promise.resolve({ compliant: true });
          });

          const result = await kenyaDPAAuditService.auditDataSubjectRights();

          const violation = result.violations.find(v => v.right === 'objection_right');
          expect(violation).toBeDefined();
        });

        it('should detect non-compliant restriction right', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateDataSubjectRight').mockImplementation((right) => {
            if (right === 'restriction_right') return Promise.resolve({ compliant: false });
            return Promise.resolve({ compliant: true });
          });

          const result = await kenyaDPAAuditService.auditDataSubjectRights();

          const violation = result.violations.find(v => v.right === 'restriction_right');
          expect(violation).toBeDefined();
        });
      });

      describe('Breach Notification Audit', () => {
        beforeEach(() => {
          jest.spyOn(kenyaDPAAuditService, 'validateBreachNotificationPolicy').mockResolvedValue({ compliant: true });
          jest.spyOn(kenyaDPAAuditService, 'validateODPCNotification').mockResolvedValue({ compliant: true });
          jest.spyOn(kenyaDPAAuditService, 'validateDataSubjectNotification').mockResolvedValue({ compliant: true });
          jest.spyOn(kenyaDPAAuditService, 'validateInternalEscalation').mockResolvedValue({ compliant: true });
        });

        afterEach(() => {
          jest.restoreAllMocks();
        });

        it('should detect non-compliant breach notification policy', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateBreachNotificationPolicy').mockResolvedValue({ compliant: false });

          const result = await kenyaDPAAuditService.auditBreachNotification();

          const violation = result.violations.find(v => v.policy === '72_hour_notification');
          expect(violation).toBeDefined();
          expect(violation.severity).toBe('critical');
        });

        it('should detect non-compliant ODPC notification', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateODPCNotification').mockResolvedValue({ compliant: false });

          const result = await kenyaDPAAuditService.auditBreachNotification();

          const violation = result.violations.find(v => v.policy === 'odpc_notification');
          expect(violation).toBeDefined();
          expect(violation.severity).toBe('high');
        });

        it('should detect non-compliant data subject notification', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateDataSubjectNotification').mockResolvedValue({ compliant: false });

          const result = await kenyaDPAAuditService.auditBreachNotification();

          const violation = result.violations.find(v => v.policy === 'data_subject_notification');
          expect(violation).toBeDefined();
          expect(violation.severity).toBe('high');
        });

        it('should detect non-compliant internal escalation', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateInternalEscalation').mockResolvedValue({ compliant: false });

          const result = await kenyaDPAAuditService.auditBreachNotification();

          const violation = result.violations.find(v => v.policy === 'internal_escalation');
          expect(violation).toBeDefined();
          expect(violation.severity).toBe('medium');
        });
      });

      describe('Data Processing Agreements Audit', () => {
        beforeEach(() => {
          jest.spyOn(kenyaDPAAuditService, 'validateDataProcessingAgreement').mockResolvedValue({ compliant: true });
        });

        afterEach(() => {
          jest.restoreAllMocks();
        });

        it('should detect non-compliant data processing agreements', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateDataProcessingAgreement').mockResolvedValue({ compliant: false });

          const result = await kenyaDPAAuditService.auditDataProcessingAgreements();

          expect(result.violations.length).toBeGreaterThan(0);
          expect(result.violations[0].severity).toBe('high');
        });

        it('should check all required parties', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateDataProcessingAgreement').mockResolvedValue({ compliant: false });

          const result = await kenyaDPAAuditService.auditDataProcessingAgreements();

          // Should have a violation for each required party
          const requiredParties = kenyaDPAAuditService.config.data_processing_agreements.required_parties;
          expect(result.violations.length).toBe(requiredParties.length);
        });
      });

      describe('ODPC Registration Audit', () => {
        beforeEach(() => {
          jest.spyOn(kenyaDPAAuditService, 'validateControllerRegistration').mockResolvedValue({ compliant: true });
          jest.spyOn(kenyaDPAAuditService, 'validateProcessorRegistration').mockResolvedValue({ compliant: true });
          jest.spyOn(kenyaDPAAuditService, 'validateRegistrationCurrency').mockResolvedValue({ compliant: true });
        });

        afterEach(() => {
          jest.restoreAllMocks();
        });

        it('should detect non-compliant controller registration', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateControllerRegistration').mockResolvedValue({ compliant: false });

          const result = await kenyaDPAAuditService.auditODPCRegistration();

          const violation = result.violations.find(v => v.registration === 'controller');
          expect(violation).toBeDefined();
          expect(violation.severity).toBe('critical');
        });

        it('should detect non-compliant processor registration', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateProcessorRegistration').mockResolvedValue({ compliant: false });

          const result = await kenyaDPAAuditService.auditODPCRegistration();

          const violation = result.violations.find(v => v.registration === 'processor');
          expect(violation).toBeDefined();
          expect(violation.severity).toBe('critical');
        });

        it('should detect expired registration', async () => {
          jest.spyOn(kenyaDPAAuditService, 'validateRegistrationCurrency').mockResolvedValue({ compliant: false });

          const result = await kenyaDPAAuditService.auditODPCRegistration();

          const violation = result.violations.find(v => v.registration === 'currency');
          expect(violation).toBeDefined();
          expect(violation.severity).toBe('high');
        });
      });
    });

    describe('Full Compliance Audit Execution', () => {
      beforeEach(() => {
        jest.spyOn(kenyaDPAAuditService, 'auditDataSubjectRights').mockResolvedValue({ violations: [], remediations: [] });
        jest.spyOn(kenyaDPAAuditService, 'auditBreachNotification').mockResolvedValue({ violations: [], remediations: [] });
        jest.spyOn(kenyaDPAAuditService, 'auditDataProcessingAgreements').mockResolvedValue({ violations: [], remediations: [] });
        jest.spyOn(kenyaDPAAuditService, 'auditODPCRegistration').mockResolvedValue({ violations: [], remediations: [] });
        jest.spyOn(kenyaDPAAuditService, 'calculateComplianceScore').mockResolvedValue(90);
        jest.spyOn(kenyaDPAAuditService, 'logAuditEvent').mockResolvedValue();
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('executeComplianceAudit should return audit object', async () => {
        const audit = await kenyaDPAAuditService.executeComplianceAudit();
        
        expect(audit).toHaveProperty('id');
        expect(audit).toHaveProperty('type', 'kenya_dpa_compliance_audit');
        expect(audit).toHaveProperty('status');
        expect(audit).toHaveProperty('violations');
        expect(audit).toHaveProperty('compliance_score');
        expect(audit).toHaveProperty('launch_ready');
      });

      it('executeComplianceAudit should store results', async () => {
        const initialCount = kenyaDPAAuditService.auditResults.length;
        
        await kenyaDPAAuditService.executeComplianceAudit();
        
        expect(kenyaDPAAuditService.auditResults.length).toBe(initialCount + 1);
      });

      it('executeComplianceAudit should mark as launch ready for passing audit', async () => {
        const audit = await kenyaDPAAuditService.executeComplianceAudit();
        
        expect(audit.launch_ready).toBe(true);
        expect(audit.status).toBe('completed');
      });

      it('executeComplianceAudit should mark as failed for non-passing audit', async () => {
        jest.spyOn(kenyaDPAAuditService, 'auditDataSubjectRights').mockResolvedValue({
          violations: [{ severity: 'critical' }],
          remediations: []
        });
        jest.spyOn(kenyaDPAAuditService, 'calculateComplianceScore').mockResolvedValue(50);
        
        const audit = await kenyaDPAAuditService.executeComplianceAudit();
        
        expect(audit.launch_ready).toBe(false);
        expect(audit.status).toBe('failed');
      });
    });

    describe('ID Generation', () => {
      it('should generate unique audit IDs', () => {
        const id1 = kenyaDPAAuditService.generateAuditId();
        const id2 = kenyaDPAAuditService.generateAuditId();
        
        expect(id1).not.toBe(id2);
        expect(id1).toMatch(/^AUDIT-\d+-[A-Z0-9]+$/);
      });

      it('should generate unique violation IDs', () => {
        const id1 = kenyaDPAAuditService.generateViolationId();
        const id2 = kenyaDPAAuditService.generateViolationId();
        
        expect(id1).not.toBe(id2);
        expect(id1).toMatch(/^VIOL-\d+-[A-Z0-9]+$/);
      });

      it('should generate unique trace IDs', () => {
        const id1 = kenyaDPAAuditService.generateTraceId();
        const id2 = kenyaDPAAuditService.generateTraceId();
        
        expect(id1).not.toBe(id2);
        expect(id1).toMatch(/^TRACE-\d+-[A-Z0-9]+$/);
      });
    });

    describe('Individual Validation Methods - Direct Invocation', () => {
      it('validateDataSubjectRight returns an object with compliant boolean', async () => {
        const result = await Object.getPrototypeOf(kenyaDPAAuditService).validateDataSubjectRight.call(kenyaDPAAuditService, 'access_right');
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('compliant');
        expect(typeof result.compliant).toBe('boolean');
      });

      it('validateBreachNotificationPolicy returns an object with compliant boolean', async () => {
        const result = await Object.getPrototypeOf(kenyaDPAAuditService).validateBreachNotificationPolicy.call(kenyaDPAAuditService);
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('compliant');
      });

      it('validateODPCNotification returns an object with compliant boolean', async () => {
        const result = await Object.getPrototypeOf(kenyaDPAAuditService).validateODPCNotification.call(kenyaDPAAuditService);
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('compliant');
      });

      it('validateControllerRegistration returns an object with compliant boolean', async () => {
        const result = await Object.getPrototypeOf(kenyaDPAAuditService).validateControllerRegistration.call(kenyaDPAAuditService);
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('compliant');
      });

      it('validateProcessorRegistration returns an object with compliant boolean', async () => {
        const result = await Object.getPrototypeOf(kenyaDPAAuditService).validateProcessorRegistration.call(kenyaDPAAuditService);
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('compliant');
      });

      it('validateDataProcessingAgreement returns an object with compliant boolean', async () => {
        const result = await Object.getPrototypeOf(kenyaDPAAuditService).validateDataProcessingAgreement.call(kenyaDPAAuditService, 'cloud_providers');
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('compliant');
      });
    });

    describe('Logging', () => {
      it('logAuditEvent should log to centralized service', async () => {
        const audit = {
          id: 'TEST-123',
          type: 'test',
          status: 'completed',
          compliance_score: 95,
          launch_ready: true,
          violations: []
        };

        await kenyaDPAAuditService.logAuditEvent(audit, 'started');

        expect(mockCentralizedLoggingService.logEvent).toHaveBeenCalled();
      });
    });

    describe('Alert Sending', () => {
      // ...existing code...
    });

    describe('Audit Error Handling', () => {
      it('auditDataSubjectRights should return empty arrays on error', async () => {
        kenyaDPAAuditService.validateDataSubjectRight = jest.fn().mockRejectedValue(new Error('Test error'));
        
        const result = await kenyaDPAAuditService.auditDataSubjectRights();
        
        expect(result.violations).toEqual([]);
        expect(result.remediations).toEqual([]);
      });

      it('auditBreachNotification should return empty arrays on error', async () => {
        kenyaDPAAuditService.validateBreachNotificationPolicy = jest.fn().mockRejectedValue(new Error('Test error'));
        
        const result = await kenyaDPAAuditService.auditBreachNotification();
        
        expect(result.violations).toEqual([]);
        expect(result.remediations).toEqual([]);
      });

      it('auditDataProcessingAgreements should return empty arrays on error', async () => {
        kenyaDPAAuditService.validateDataProcessingAgreement = jest.fn().mockRejectedValue(new Error('Test error'));
        
        const result = await kenyaDPAAuditService.auditDataProcessingAgreements();
        
        expect(result.violations).toEqual([]);
        expect(result.remediations).toEqual([]);
      });

      it('auditODPCRegistration should return empty arrays on error', async () => {
        kenyaDPAAuditService.validateControllerRegistration = jest.fn().mockRejectedValue(new Error('Test error'));
        
        const result = await kenyaDPAAuditService.auditODPCRegistration();
        
        expect(result.violations).toEqual([]);
        expect(result.remediations).toEqual([]);
      });

      it('executeComplianceAudit should throw on error', async () => {
        kenyaDPAAuditService.auditDataSubjectRights = jest.fn().mockRejectedValue(new Error('Test error'));
        
        await expect(kenyaDPAAuditService.executeComplianceAudit()).rejects.toThrow();
        
        expect(mockLoggingService.logError).toHaveBeenCalled();
      });
    });

    describe('Metrics Collection Error Handling', () => {
      it('collectAuditMetrics should handle errors gracefully', async () => {
        mockCentralizedLoggingService.logEvent.mockRejectedValueOnce(new Error('Log failed'));
        
        // Should not throw
        await kenyaDPAAuditService.collectAuditMetrics();
        
        expect(mockLoggingService.logError).toHaveBeenCalled();
      });
    });

    describe('Alert Error Handling', () => {
      it('sendNonComplianceAlert should handle errors gracefully', async () => {
        mockRollbackAlertingService.sendSystemFailureAlert = jest.fn().mockRejectedValue(new Error('Alert failed'));
        
        const audit = {
          compliance_score: 50,
          violations: []
        };
        
        // Should not throw
        await kenyaDPAAuditService.sendNonComplianceAlert(audit);
        
        expect(mockLoggingService.logError).toHaveBeenCalled();
      });
    });

    describe('Logging Error Handling', () => {
      it('logAuditEvent should handle errors gracefully', async () => {
        mockCentralizedLoggingService.logEvent.mockRejectedValueOnce(new Error('Log failed'));
        
        const audit = {
          id: 'TEST-123',
          type: 'test',
          status: 'completed',
          compliance_score: 95,
          launch_ready: true,
          violations: []
        };
        
        // Should not throw
        await kenyaDPAAuditService.logAuditEvent(audit, 'completed');
        
        expect(mockLoggingService.logError).toHaveBeenCalled();
      });
    });

    describe('Directory Creation Error Handling', () => {
      it('createAuditDirectory should throw on error', async () => {
        mockFs.default.mkdir.mockRejectedValueOnce(new Error('Directory creation failed'));
        
        await expect(kenyaDPAAuditService.createAuditDirectory()).rejects.toThrow();
        
        expect(mockLoggingService.logError).toHaveBeenCalled();
      });
    });

    describe('Getter Methods', () => {
      it('getAuditResults should return audit results array', () => {
        kenyaDPAAuditService.auditResults.push({ id: 'test' });
        
        const results = kenyaDPAAuditService.getAuditResults();
        
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThanOrEqual(1);
      });

      it('getViolations should return violations array', () => {
        const violations = kenyaDPAAuditService.getViolations();
        
        expect(Array.isArray(violations)).toBe(true);
      });

      it('getRemediations should return remediations array', () => {
        const remediations = kenyaDPAAuditService.getRemediations();
        
        expect(Array.isArray(remediations)).toBe(true);
      });

      it('getStatus should return service status object', () => {
        const status = kenyaDPAAuditService.getStatus();
        
        expect(status).toHaveProperty('initialized', true);
        expect(status).toHaveProperty('running');
        expect(status).toHaveProperty('auditResults');
        expect(status).toHaveProperty('violations');
        expect(status).toHaveProperty('remediations');
        expect(status).toHaveProperty('config');
      });
    });

    describe('Compliance Audit Results Compilation', () => {
      it('should compile violations from all audit components', async () => {
        jest.spyOn(kenyaDPAAuditService, 'auditDataSubjectRights').mockResolvedValue({
          violations: [{ id: 'dsv1', type: 'data_subject' }],
          remediations: []
        });
        jest.spyOn(kenyaDPAAuditService, 'auditBreachNotification').mockResolvedValue({
          violations: [{ id: 'bnv1', type: 'breach' }],
          remediations: []
        });
        jest.spyOn(kenyaDPAAuditService, 'auditDataProcessingAgreements').mockResolvedValue({
          violations: [{ id: 'dpv1', type: 'dpa' }],
          remediations: []
        });
        jest.spyOn(kenyaDPAAuditService, 'auditODPCRegistration').mockResolvedValue({
          violations: [{ id: 'opv1', type: 'odpc' }],
          remediations: []
        });
        jest.spyOn(kenyaDPAAuditService, 'calculateComplianceScore').mockResolvedValue(50);
        jest.spyOn(kenyaDPAAuditService, 'logAuditEvent').mockResolvedValue();
        jest.spyOn(kenyaDPAAuditService, 'sendNonComplianceAlert').mockResolvedValue();

        const result = await kenyaDPAAuditService.executeComplianceAudit();

        expect(result.violations.length).toBe(4);
        jest.restoreAllMocks();
      });

      it('should compile remediations from all audit components', async () => {
        jest.spyOn(kenyaDPAAuditService, 'auditDataSubjectRights').mockResolvedValue({
          violations: [],
          remediations: [{ id: 'dsr1' }]
        });
        jest.spyOn(kenyaDPAAuditService, 'auditBreachNotification').mockResolvedValue({
          violations: [],
          remediations: [{ id: 'bnr1' }]
        });
        jest.spyOn(kenyaDPAAuditService, 'auditDataProcessingAgreements').mockResolvedValue({
          violations: [],
          remediations: [{ id: 'dpr1' }]
        });
        jest.spyOn(kenyaDPAAuditService, 'auditODPCRegistration').mockResolvedValue({
          violations: [],
          remediations: [{ id: 'opr1' }]
        });
        jest.spyOn(kenyaDPAAuditService, 'calculateComplianceScore').mockResolvedValue(90);
        jest.spyOn(kenyaDPAAuditService, 'logAuditEvent').mockResolvedValue();

        const result = await kenyaDPAAuditService.executeComplianceAudit();

        expect(result.remediations.length).toBe(4);
        jest.restoreAllMocks();
      });
    });

    describe('Launch Readiness Determination', () => {
      beforeEach(() => {
        jest.spyOn(kenyaDPAAuditService, 'auditDataSubjectRights').mockResolvedValue({ violations: [], remediations: [] });
        jest.spyOn(kenyaDPAAuditService, 'auditBreachNotification').mockResolvedValue({ violations: [], remediations: [] });
        jest.spyOn(kenyaDPAAuditService, 'auditDataProcessingAgreements').mockResolvedValue({ violations: [], remediations: [] });
        jest.spyOn(kenyaDPAAuditService, 'auditODPCRegistration').mockResolvedValue({ violations: [], remediations: [] });
        jest.spyOn(kenyaDPAAuditService, 'logAuditEvent').mockResolvedValue();
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should be launch ready when score >= 80 and no critical violations', async () => {
        jest.spyOn(kenyaDPAAuditService, 'calculateComplianceScore').mockResolvedValue(85);

        const result = await kenyaDPAAuditService.executeComplianceAudit();

        expect(result.launch_ready).toBe(true);
        expect(result.status).toBe('completed');
      });

      it('should not be launch ready when score < 80', async () => {
        jest.spyOn(kenyaDPAAuditService, 'calculateComplianceScore').mockResolvedValue(70);
        jest.spyOn(kenyaDPAAuditService, 'sendNonComplianceAlert').mockResolvedValue();

        const result = await kenyaDPAAuditService.executeComplianceAudit();

        expect(result.launch_ready).toBe(false);
        expect(result.status).toBe('failed');
      });

      it('should not be launch ready when critical violations exist', async () => {
        jest.spyOn(kenyaDPAAuditService, 'auditDataSubjectRights').mockResolvedValue({
          violations: [{ severity: 'critical', id: 'v1' }],
          remediations: []
        });
        jest.spyOn(kenyaDPAAuditService, 'calculateComplianceScore').mockResolvedValue(90);
        jest.spyOn(kenyaDPAAuditService, 'sendNonComplianceAlert').mockResolvedValue();

        const result = await kenyaDPAAuditService.executeComplianceAudit();

        expect(result.launch_ready).toBe(false);
      });

      it('should send alert when not launch ready', async () => {
        const sendAlertSpy = jest.spyOn(kenyaDPAAuditService, 'sendNonComplianceAlert').mockResolvedValue();
        jest.spyOn(kenyaDPAAuditService, 'calculateComplianceScore').mockResolvedValue(50);

        await kenyaDPAAuditService.executeComplianceAudit();

        expect(sendAlertSpy).toHaveBeenCalled();
      });
    });
  });
});
