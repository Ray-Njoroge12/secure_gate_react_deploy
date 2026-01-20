/**
 * Unit Tests for Audit Traceability Service
 * Phase 3: Compliance & Audit
 * 
 * Tests comprehensive audit traceability and compliance reporting
 * Coverage: Trace ID management, compliance checking, integrity verification,
 * report generation, Kenya DPA/GDPR/ISO 27001 compliance
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import * as crypto from 'crypto';

// Mock dependencies
const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn()
};

const mockCentralizedLoggingService = {
  logEvent: jest.fn().mockResolvedValue()
};

const mockNotificationService = {
  sendSystemNotification: jest.fn().mockResolvedValue(),
  sendEmail: jest.fn().mockResolvedValue()
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

jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  default: mockNotificationService
}));

// Import service after mocking
const auditTraceabilityServiceModule = await import('../../src/services/auditTraceabilityService.js');
const auditTraceabilityService = auditTraceabilityServiceModule.default;

describe('AuditTraceabilityService', () => {
  // Store original timer functions
  let originalSetInterval;
  
  beforeAll(() => {
    // Store and mock setInterval to prevent actual intervals from running
    originalSetInterval = global.setInterval;
    global.setInterval = jest.fn();
  });

  afterAll(() => {
    // Restore original setInterval
    global.setInterval = originalSetInterval;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear service state for clean tests
    auditTraceabilityService.auditTrail.clear();
    auditTraceabilityService.complianceViolations.length = 0;
    auditTraceabilityService.rollbackEvents.length = 0;
    auditTraceabilityService.traceCorrelations.clear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Service Configuration', () => {
    it('should have correct default configuration', () => {
      const status = auditTraceabilityService.getStatus();
      
      expect(status.config).toBeDefined();
      expect(status.config.traceability).toBeDefined();
      expect(status.config.compliance).toBeDefined();
      expect(status.config.audit).toBeDefined();
      expect(status.config.dashboard).toBeDefined();
    });

    it('should enable traceability features', () => {
      const status = auditTraceabilityService.getStatus();
      
      expect(status.config.traceability.enabled).toBe(true);
      expect(status.config.traceability.traceIdUsage).toBe(true);
      expect(status.config.traceability.rollbackEventsLogged).toBe(true);
      expect(status.config.traceability.complianceDashboard).toBe(true);
    });

    it('should configure Kenya DPA compliance', () => {
      const status = auditTraceabilityService.getStatus();
      
      expect(status.config.compliance.kenya_dpa.enabled).toBe(true);
      expect(status.config.compliance.kenya_dpa.requirements).toContain('audit_trail_maintenance');
      expect(status.config.compliance.kenya_dpa.requirements).toContain('data_processing_logs');
      expect(status.config.compliance.kenya_dpa.requirements).toContain('consent_management_logs');
    });

    it('should configure GDPR compliance', () => {
      const status = auditTraceabilityService.getStatus();
      
      expect(status.config.compliance.gdpr.enabled).toBe(true);
      expect(status.config.compliance.gdpr.requirements).toContain('data_subject_rights_logs');
      expect(status.config.compliance.gdpr.requirements).toContain('security_breach_logs');
    });

    it('should configure ISO 27001 compliance', () => {
      const status = auditTraceabilityService.getStatus();
      
      expect(status.config.compliance.iso27001.enabled).toBe(true);
      expect(status.config.compliance.iso27001.requirements).toContain('security_event_logging');
      expect(status.config.compliance.iso27001.requirements).toContain('access_control_logs');
    });

    it('should set 7-year audit retention period', () => {
      const status = auditTraceabilityService.getStatus();
      const sevenYearsMs = 7 * 365 * 24 * 60 * 60 * 1000;
      
      expect(status.config.audit.retention.default).toBe(sevenYearsMs);
      expect(status.config.audit.retention.security_events).toBe(sevenYearsMs);
      expect(status.config.audit.retention.compliance_logs).toBe(sevenYearsMs);
    });

    it('should configure audit encryption with AES-256-GCM', () => {
      const status = auditTraceabilityService.getStatus();
      
      expect(status.config.audit.encryption.enabled).toBe(true);
      expect(status.config.audit.encryption.algorithm).toBe('aes-256-gcm');
    });

    it('should configure integrity verification with SHA256', () => {
      const status = auditTraceabilityService.getStatus();
      
      expect(status.config.audit.integrity.enabled).toBe(true);
      expect(status.config.audit.integrity.algorithm).toBe('sha256');
    });
  });

  describe('ID Generation', () => {
    describe('generateAuditEventId', () => {
      it('should generate unique audit event IDs', () => {
        const id1 = auditTraceabilityService.generateAuditEventId();
        const id2 = auditTraceabilityService.generateAuditEventId();
        
        expect(id1).not.toBe(id2);
      });

      it('should follow AUDIT-timestamp-random format', () => {
        const id = auditTraceabilityService.generateAuditEventId();
        
        expect(id).toMatch(/^AUDIT-\d+-[A-Z0-9]+$/);
      });
    });

    describe('generateTraceId', () => {
      it('should generate unique trace IDs', () => {
        const id1 = auditTraceabilityService.generateTraceId();
        const id2 = auditTraceabilityService.generateTraceId();
        
        expect(id1).not.toBe(id2);
      });

      it('should follow TRACE-timestamp-random format', () => {
        const id = auditTraceabilityService.generateTraceId();
        
        expect(id).toMatch(/^TRACE-\d+-[A-Z0-9]+$/);
      });
    });

    describe('generateCorrelationId', () => {
      it('should generate unique correlation IDs', () => {
        const id1 = auditTraceabilityService.generateCorrelationId();
        const id2 = auditTraceabilityService.generateCorrelationId();
        
        expect(id1).not.toBe(id2);
      });

      it('should follow CORR-timestamp-random format', () => {
        const id = auditTraceabilityService.generateCorrelationId();
        
        expect(id).toMatch(/^CORR-\d+-[A-Z0-9]+$/);
      });
    });

    describe('generateSpanId', () => {
      it('should generate unique span IDs', () => {
        const id1 = auditTraceabilityService.generateSpanId();
        const id2 = auditTraceabilityService.generateSpanId();
        
        expect(id1).not.toBe(id2);
      });

      it('should follow SPAN-timestamp-random format', () => {
        const id = auditTraceabilityService.generateSpanId();
        
        expect(id).toMatch(/^SPAN-\d+-[A-Z0-9]+$/);
      });
    });
  });

  describe('mapComplianceRequirements', () => {
    it('should include Kenya DPA requirements', () => {
      const requirements = auditTraceabilityService.mapComplianceRequirements({});
      
      expect(requirements).toContain('audit_trail_maintenance');
      expect(requirements).toContain('data_processing_logs');
      expect(requirements).toContain('consent_management_logs');
    });

    it('should include GDPR requirements', () => {
      const requirements = auditTraceabilityService.mapComplianceRequirements({});
      
      expect(requirements).toContain('data_subject_rights_logs');
      expect(requirements).toContain('security_breach_logs');
      expect(requirements).toContain('data_retention_logs');
    });

    it('should include ISO 27001 requirements', () => {
      const requirements = auditTraceabilityService.mapComplianceRequirements({});
      
      expect(requirements).toContain('security_event_logging');
      expect(requirements).toContain('access_control_logs');
      expect(requirements).toContain('incident_management_logs');
    });
  });

  describe('determineRetentionPolicy', () => {
    it('should return security events retention for security actions', () => {
      const event = { action: 'security_alert', actor: 'system' };
      const retention = auditTraceabilityService.determineRetentionPolicy(event);
      
      expect(retention).toBe(auditTraceabilityService.config.audit.retention.security_events);
    });

    it('should return security events retention for auth actions', () => {
      const event = { action: 'user_auth_login', actor: 'user' };
      const retention = auditTraceabilityService.determineRetentionPolicy(event);
      
      expect(retention).toBe(auditTraceabilityService.config.audit.retention.security_events);
    });

    it('should return compliance logs retention for compliance actions', () => {
      const event = { action: 'compliance_check', actor: 'system' };
      const retention = auditTraceabilityService.determineRetentionPolicy(event);
      
      expect(retention).toBe(auditTraceabilityService.config.audit.retention.compliance_logs);
    });

    it('should return audit trails retention for audit actions', () => {
      const event = { action: 'audit_log_created', actor: 'system' };
      const retention = auditTraceabilityService.determineRetentionPolicy(event);
      
      expect(retention).toBe(auditTraceabilityService.config.audit.retention.audit_trails);
    });

    it('should return default retention for unclassified actions', () => {
      const event = { action: 'general_action', actor: 'user' };
      const retention = auditTraceabilityService.determineRetentionPolicy(event);
      
      expect(retention).toBe(auditTraceabilityService.config.audit.retention.default);
    });

    it('should handle empty action', () => {
      const event = { actor: 'user' };
      const retention = auditTraceabilityService.determineRetentionPolicy(event);
      
      expect(retention).toBe(auditTraceabilityService.config.audit.retention.default);
    });
  });

  describe('checkKenyaDPACompliance', () => {
    it('should detect data processing without consent', async () => {
      const auditEvent = {
        id: 'event-123',
        action: 'data_processing',
        metadata: { consent: false },
        timestamp: new Date().toISOString()
      };

      const violations = await auditTraceabilityService.checkKenyaDPACompliance(auditEvent);

      expect(violations).toHaveLength(1);
      expect(violations[0].framework).toBe('kenya_dpa');
      expect(violations[0].requirement).toBe('consent_management_logs');
      expect(violations[0].severity).toBe('high');
    });

    it('should detect unauthorized data access', async () => {
      const auditEvent = {
        id: 'event-456',
        action: 'data_access',
        status: 'unauthorized',
        metadata: {},
        timestamp: new Date().toISOString()
      };

      const violations = await auditTraceabilityService.checkKenyaDPACompliance(auditEvent);

      expect(violations).toHaveLength(1);
      expect(violations[0].framework).toBe('kenya_dpa');
      expect(violations[0].violation).toBe('Unauthorized data access');
      expect(violations[0].severity).toBe('critical');
    });

    it('should not flag compliant events', async () => {
      const auditEvent = {
        id: 'event-789',
        action: 'data_processing',
        metadata: { consent: true },
        status: 'authorized',
        timestamp: new Date().toISOString()
      };

      const violations = await auditTraceabilityService.checkKenyaDPACompliance(auditEvent);

      expect(violations).toHaveLength(0);
    });
  });

  describe('checkGDPRCompliance', () => {
    it('should detect data subject rights denied', async () => {
      const auditEvent = {
        id: 'event-123',
        action: 'data_subject_rights',
        status: 'denied',
        metadata: {},
        timestamp: new Date().toISOString()
      };

      const violations = await auditTraceabilityService.checkGDPRCompliance(auditEvent);

      expect(violations).toHaveLength(1);
      expect(violations[0].framework).toBe('gdpr');
      expect(violations[0].requirement).toBe('data_subject_rights_logs');
      expect(violations[0].severity).toBe('high');
    });

    it('should detect data retention period exceeded', async () => {
      const auditEvent = {
        id: 'event-456',
        action: 'data_retention',
        status: 'warning',
        metadata: { retention_exceeded: true },
        timestamp: new Date().toISOString()
      };

      const violations = await auditTraceabilityService.checkGDPRCompliance(auditEvent);

      expect(violations).toHaveLength(1);
      expect(violations[0].framework).toBe('gdpr');
      expect(violations[0].requirement).toBe('data_retention_logs');
      expect(violations[0].severity).toBe('medium');
    });

    it('should not flag compliant events', async () => {
      const auditEvent = {
        id: 'event-789',
        action: 'data_subject_rights',
        status: 'fulfilled',
        metadata: { retention_exceeded: false },
        timestamp: new Date().toISOString()
      };

      const violations = await auditTraceabilityService.checkGDPRCompliance(auditEvent);

      expect(violations).toHaveLength(0);
    });
  });

  describe('checkISO27001Compliance', () => {
    it('should detect security events not logged', async () => {
      const auditEvent = {
        id: 'event-123',
        action: 'security_event',
        status: 'occurred',
        metadata: { logged: false },
        timestamp: new Date().toISOString()
      };

      const violations = await auditTraceabilityService.checkISO27001Compliance(auditEvent);

      expect(violations).toHaveLength(1);
      expect(violations[0].framework).toBe('iso27001');
      expect(violations[0].requirement).toBe('security_event_logging');
      expect(violations[0].severity).toBe('high');
    });

    it('should detect unresolved incidents', async () => {
      const auditEvent = {
        id: 'event-456',
        action: 'incident',
        status: 'unresolved',
        metadata: {},
        timestamp: new Date().toISOString()
      };

      const violations = await auditTraceabilityService.checkISO27001Compliance(auditEvent);

      expect(violations).toHaveLength(1);
      expect(violations[0].framework).toBe('iso27001');
      expect(violations[0].requirement).toBe('incident_management_logs');
      expect(violations[0].severity).toBe('medium');
    });

    it('should not flag compliant events', async () => {
      const auditEvent = {
        id: 'event-789',
        action: 'security_event',
        status: 'logged',
        metadata: { logged: true },
        timestamp: new Date().toISOString()
      };

      const violations = await auditTraceabilityService.checkISO27001Compliance(auditEvent);

      expect(violations).toHaveLength(0);
    });
  });

  describe('calculateIntegrityHash', () => {
    it('should calculate SHA256 hash', async () => {
      const event = {
        id: 'event-123',
        timestamp: '2025-01-01T00:00:00.000Z',
        trace_id: 'trace-123',
        actor: 'user',
        action: 'test',
        status: 'success',
        metadata: {}
      };

      const hash = await auditTraceabilityService.calculateIntegrityHash(event);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA256 produces 64 hex characters
    });

    it('should produce consistent hash for same data', async () => {
      const event = {
        id: 'event-123',
        timestamp: '2025-01-01T00:00:00.000Z',
        trace_id: 'trace-123',
        actor: 'user',
        action: 'test',
        status: 'success',
        metadata: { key: 'value' }
      };

      const hash1 = await auditTraceabilityService.calculateIntegrityHash(event);
      const hash2 = await auditTraceabilityService.calculateIntegrityHash(event);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different data', async () => {
      const event1 = {
        id: 'event-123',
        timestamp: '2025-01-01T00:00:00.000Z',
        trace_id: 'trace-123',
        actor: 'user',
        action: 'test',
        status: 'success',
        metadata: {}
      };

      const event2 = {
        ...event1,
        action: 'different'
      };

      const hash1 = await auditTraceabilityService.calculateIntegrityHash(event1);
      const hash2 = await auditTraceabilityService.calculateIntegrityHash(event2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getEventsByAction', () => {
    beforeEach(async () => {
      // Add test events to audit trail
      auditTraceabilityService.auditTrail.set('1', { action: 'data_processing', id: '1' });
      auditTraceabilityService.auditTrail.set('2', { action: 'data_processing', id: '2' });
      auditTraceabilityService.auditTrail.set('3', { action: 'security_event', id: '3' });
      auditTraceabilityService.auditTrail.set('4', { action: 'data_access', id: '4' });
    });

    it('should filter events by action', () => {
      const events = auditTraceabilityService.getEventsByAction('data_processing');
      
      expect(events).toHaveLength(2);
      expect(events[0].action).toContain('data_processing');
    });

    it('should return empty array for non-matching action', () => {
      const events = auditTraceabilityService.getEventsByAction('non_existent');
      
      expect(events).toHaveLength(0);
    });

    it('should handle partial action matching', () => {
      const events = auditTraceabilityService.getEventsByAction('data');
      
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('getReportingPeriod', () => {
    it('should return start and end dates', () => {
      const period = auditTraceabilityService.getReportingPeriod();
      
      expect(period).toHaveProperty('start');
      expect(period).toHaveProperty('end');
    });

    it('should return ISO formatted dates', () => {
      const period = auditTraceabilityService.getReportingPeriod();
      
      expect(period.start).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(period.end).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should return current month period', () => {
      const period = auditTraceabilityService.getReportingPeriod();
      const now = new Date();
      
      const startDate = new Date(period.start);
      const endDate = new Date(period.end);
      
      expect(startDate.getMonth()).toBe(now.getMonth());
      expect(endDate.getMonth()).toBe(now.getMonth());
    });
  });

  describe('Recommendation Generation', () => {
    describe('generateKenyaDPARecommendations', () => {
      it('should recommend consent management for consent violations', () => {
        auditTraceabilityService.complianceViolations.push({
          framework: 'kenya_dpa',
          requirement: 'consent_management_logs'
        });

        const recommendations = auditTraceabilityService.generateKenyaDPARecommendations();

        expect(recommendations).toContain('Implement automated consent management system');
      });

      it('should recommend data subject rights processing for rights violations', () => {
        auditTraceabilityService.complianceViolations.push({
          framework: 'kenya_dpa',
          requirement: 'data_subject_rights_logs'
        });

        const recommendations = auditTraceabilityService.generateKenyaDPARecommendations();

        expect(recommendations).toContain('Enhance data subject rights processing workflow');
      });

      it('should return empty recommendations for no violations', () => {
        const recommendations = auditTraceabilityService.generateKenyaDPARecommendations();

        expect(recommendations).toHaveLength(0);
      });
    });

    describe('generateGDPRRecommendations', () => {
      it('should recommend data subject rights automation', () => {
        auditTraceabilityService.complianceViolations.push({
          framework: 'gdpr',
          requirement: 'data_subject_rights_logs'
        });

        const recommendations = auditTraceabilityService.generateGDPRRecommendations();

        expect(recommendations).toContain('Implement automated data subject rights processing');
      });

      it('should recommend data retention management', () => {
        auditTraceabilityService.complianceViolations.push({
          framework: 'gdpr',
          requirement: 'data_retention_logs'
        });

        const recommendations = auditTraceabilityService.generateGDPRRecommendations();

        expect(recommendations).toContain('Implement automated data retention management');
      });
    });

    describe('generateISO27001Recommendations', () => {
      it('should recommend security event logging', () => {
        auditTraceabilityService.complianceViolations.push({
          framework: 'iso27001',
          requirement: 'security_event_logging'
        });

        const recommendations = auditTraceabilityService.generateISO27001Recommendations();

        expect(recommendations).toContain('Enhance security event logging and monitoring');
      });

      it('should recommend incident management', () => {
        auditTraceabilityService.complianceViolations.push({
          framework: 'iso27001',
          requirement: 'incident_management_logs'
        });

        const recommendations = auditTraceabilityService.generateISO27001Recommendations();

        expect(recommendations).toContain('Improve incident management and response procedures');
      });
    });
  });

  describe('Data Retrieval Methods', () => {
    beforeEach(() => {
      // Populate test data
      auditTraceabilityService.auditTrail.set('1', { id: '1', action: 'test' });
      auditTraceabilityService.auditTrail.set('2', { id: '2', action: 'test2' });
      auditTraceabilityService.complianceViolations.push({ id: 'v1' });
      auditTraceabilityService.rollbackEvents.push({ id: 'r1' });
      auditTraceabilityService.traceCorrelations.set('t1', { trace_id: 't1' });
    });

    it('should get audit trail as array', () => {
      const trail = auditTraceabilityService.getAuditTrail();
      
      expect(Array.isArray(trail)).toBe(true);
      expect(trail).toHaveLength(2);
    });

    it('should get compliance violations', () => {
      const violations = auditTraceabilityService.getComplianceViolations();
      
      expect(Array.isArray(violations)).toBe(true);
      expect(violations).toHaveLength(1);
    });

    it('should get rollback events', () => {
      const events = auditTraceabilityService.getRollbackEvents();
      
      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(1);
    });

    it('should get trace correlations as array', () => {
      const correlations = auditTraceabilityService.getTraceCorrelations();
      
      expect(Array.isArray(correlations)).toBe(true);
      expect(correlations).toHaveLength(1);
    });
  });

  describe('getStatus', () => {
    it('should return comprehensive status', () => {
      auditTraceabilityService.auditTrail.set('1', { id: '1' });
      auditTraceabilityService.complianceViolations.push({ id: 'v1' });

      const status = auditTraceabilityService.getStatus();

      expect(status).toEqual({
        initialized: true,
        running: expect.any(Boolean),
        auditTrail: 1,
        complianceViolations: 1,
        rollbackEvents: 0,
        traceCorrelations: 0,
        config: expect.any(Object)
      });
    });

    it('should reflect correct counts', () => {
      auditTraceabilityService.auditTrail.set('1', { id: '1' });
      auditTraceabilityService.auditTrail.set('2', { id: '2' });
      auditTraceabilityService.complianceViolations.push({ id: 'v1' });
      auditTraceabilityService.complianceViolations.push({ id: 'v2' });
      auditTraceabilityService.rollbackEvents.push({ id: 'r1' });
      auditTraceabilityService.traceCorrelations.set('t1', { trace_id: 't1' });

      const status = auditTraceabilityService.getStatus();

      expect(status.auditTrail).toBe(2);
      expect(status.complianceViolations).toBe(2);
      expect(status.rollbackEvents).toBe(1);
      expect(status.traceCorrelations).toBe(1);
    });
  });

  describe('createAuditEvent', () => {
    it('should create event with all required fields', async () => {
      const inputEvent = {
        actor: 'user-123',
        action: 'test_action',
        status: 'success',
        message: 'Test message',
        metadata: { key: 'value' }
      };

      const event = await auditTraceabilityService.createAuditEvent(inputEvent);

      expect(event).toMatchObject({
        id: expect.stringMatching(/^AUDIT-/),
        timestamp: expect.any(String),
        trace_id: expect.stringMatching(/^TRACE-/),
        actor: 'user-123',
        action: 'test_action',
        status: 'success',
        message: 'Test message',
        metadata: { key: 'value' },
        compliance: expect.any(Array),
        retention: expect.any(Number),
        correlation_id: expect.stringMatching(/^CORR-/),
        span_id: expect.stringMatching(/^SPAN-/),
        integrity_hash: expect.any(String)
      });
    });

    it('should use default values for missing fields', async () => {
      const inputEvent = {};

      const event = await auditTraceabilityService.createAuditEvent(inputEvent);

      expect(event.actor).toBe('system');
      expect(event.action).toBe('unknown');
      expect(event.status).toBe('info');
      expect(event.rollback_status).toBe('none');
      expect(event.level).toBe('info');
      expect(event.message).toBe('');
      expect(event.metadata).toEqual({});
    });

    it('should preserve provided trace_id', async () => {
      const inputEvent = {
        trace_id: 'custom-trace-123',
        action: 'test'
      };

      const event = await auditTraceabilityService.createAuditEvent(inputEvent);

      expect(event.trace_id).toBe('custom-trace-123');
    });

    it('should calculate integrity hash', async () => {
      const inputEvent = {
        action: 'test',
        actor: 'user'
      };

      const event = await auditTraceabilityService.createAuditEvent(inputEvent);

      expect(event.integrity_hash).toBeDefined();
      expect(event.integrity_hash.length).toBe(64);
    });
  });

  describe('logAuditEvent', () => {
    it('should store event in audit trail', async () => {
      const inputEvent = {
        actor: 'user-123',
        action: 'test_action',
        status: 'success'
      };

      const result = await auditTraceabilityService.logAuditEvent(inputEvent);

      expect(auditTraceabilityService.auditTrail.has(result.id)).toBe(true);
    });

    it('should log to centralized logging service', async () => {
      const inputEvent = {
        actor: 'user-123',
        action: 'test_action'
      };

      await auditTraceabilityService.logAuditEvent(inputEvent);

      expect(mockCentralizedLoggingService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'audit_event'
        })
      );
    });

    it('should log info message', async () => {
      const inputEvent = {
        actor: 'user-123',
        action: 'test_action'
      };

      await auditTraceabilityService.logAuditEvent(inputEvent);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Audit event logged',
        expect.objectContaining({
          action: 'test_action',
          actor: 'user-123'
        })
      );
    });

    it('should return created audit event', async () => {
      const inputEvent = {
        actor: 'user-123',
        action: 'test_action'
      };

      const result = await auditTraceabilityService.logAuditEvent(inputEvent);

      expect(result).toBeDefined();
      expect(result.actor).toBe('user-123');
      expect(result.action).toBe('test_action');
    });
  });

  describe('updateTraceCorrelations', () => {
    it('should create new trace correlation for new trace_id', async () => {
      const auditEvent = {
        trace_id: 'new-trace-123',
        timestamp: new Date().toISOString(),
        status: 'started'
      };

      await auditTraceabilityService.updateTraceCorrelations(auditEvent);

      expect(auditTraceabilityService.traceCorrelations.has('new-trace-123')).toBe(true);
    });

    it('should add event to existing trace correlation', async () => {
      const trace_id = 'existing-trace-456';
      
      const event1 = { trace_id, timestamp: new Date().toISOString(), status: 'started' };
      const event2 = { trace_id, timestamp: new Date().toISOString(), status: 'in_progress' };

      await auditTraceabilityService.updateTraceCorrelations(event1);
      await auditTraceabilityService.updateTraceCorrelations(event2);

      const correlation = auditTraceabilityService.traceCorrelations.get(trace_id);
      expect(correlation.events).toHaveLength(2);
    });

    it('should update status to completed', async () => {
      const trace_id = 'trace-complete';
      
      const event = { trace_id, timestamp: new Date().toISOString(), status: 'completed' };

      await auditTraceabilityService.updateTraceCorrelations(event);

      const correlation = auditTraceabilityService.traceCorrelations.get(trace_id);
      expect(correlation.status).toBe('completed');
    });

    it('should update status to failed on error', async () => {
      const trace_id = 'trace-failed';
      
      const event = { trace_id, timestamp: new Date().toISOString(), status: 'error' };

      await auditTraceabilityService.updateTraceCorrelations(event);

      const correlation = auditTraceabilityService.traceCorrelations.get(trace_id);
      expect(correlation.status).toBe('failed');
    });
  });

  describe('saveComplianceReport', () => {
    it('should create reports directory', async () => {
      const report = {
        framework: 'gdpr',
        period: { start: '2025-01-01', end: '2025-01-31' }
      };

      await auditTraceabilityService.saveComplianceReport(report);

      // Use default export mock
      expect(mockFs.default.mkdir).toHaveBeenCalledWith('/app/compliance_reports', { recursive: true });
    });

    it('should write report file', async () => {
      const report = {
        framework: 'kenya_dpa',
        period: { start: '2025-01-01', end: '2025-01-31' },
        summary: { violations: 0 }
      };

      await auditTraceabilityService.saveComplianceReport(report);

      // Use default export mock
      expect(mockFs.default.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('kenya_dpa_report_'),
        expect.any(String)
      );
    });

    it('should log success message', async () => {
      const report = {
        framework: 'iso27001',
        period: { start: '2025-01-01', end: '2025-01-31' }
      };

      await auditTraceabilityService.saveComplianceReport(report);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        expect.stringContaining('Compliance report saved:')
      );
    });
  });

  describe('sendComplianceReport', () => {
    it('should send notification to all recipients', async () => {
      const report = {
        framework: 'gdpr',
        period: { start: '2025-01-01', end: '2025-01-31' },
        summary: { compliance_violations: 0 },
        recommendations: []
      };
      const recipients = ['user1@example.com', 'user2@example.com'];

      await auditTraceabilityService.sendComplianceReport(report, recipients);

      expect(mockNotificationService.sendSystemNotification).toHaveBeenCalledTimes(2);
    });

    it('should include report data in notification', async () => {
      const report = {
        framework: 'kenya_dpa',
        period: { start: '2025-01-01', end: '2025-01-31' },
        summary: { compliance_violations: 5 },
        recommendations: ['Fix issue']
      };
      const recipients = ['compliance@example.com'];

      await auditTraceabilityService.sendComplianceReport(report, recipients);

      expect(mockNotificationService.sendSystemNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'compliance_report',
          title: expect.stringContaining('KENYA_DPA'),
          data: expect.objectContaining({
            framework: 'kenya_dpa',
            violations: 5
          })
        })
      );
    });
  });

  describe('sendComplianceViolationAlerts', () => {
    it('should send alert for each violation', async () => {
      const violations = [
        {
          framework: 'gdpr',
          requirement: 'data_retention',
          violation: 'Retention exceeded',
          severity: 'high',
          event_id: 'e1',
          timestamp: new Date().toISOString()
        },
        {
          framework: 'kenya_dpa',
          requirement: 'consent',
          violation: 'Missing consent',
          severity: 'critical',
          event_id: 'e2',
          timestamp: new Date().toISOString()
        }
      ];

      await auditTraceabilityService.sendComplianceViolationAlerts(violations);

      expect(mockNotificationService.sendSystemNotification).toHaveBeenCalledTimes(2);
    });

    it('should include violation severity', async () => {
      const violations = [
        {
          framework: 'iso27001',
          requirement: 'security_event_logging',
          violation: 'Event not logged',
          severity: 'critical',
          event_id: 'e1',
          timestamp: new Date().toISOString()
        }
      ];

      await auditTraceabilityService.sendComplianceViolationAlerts(violations);

      expect(mockNotificationService.sendSystemNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'compliance_violation',
          severity: 'critical'
        })
      );
    });
  });
});
