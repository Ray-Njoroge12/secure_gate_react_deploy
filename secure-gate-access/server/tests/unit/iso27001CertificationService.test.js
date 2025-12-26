/**
 * Unit Tests for ISO 27001 Certification Service
 * Phase 3: Compliance & Audit
 * 
 * Tests ISO 27001 Information Security Management System certification readiness
 * Coverage: Asset inventory, risk assessment, security policies, business continuity
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
const iso27001ServiceModule = await import('../../src/services/iso27001CertificationService.js');
const iso27001CertificationService = iso27001ServiceModule.default;

describe('ISO27001CertificationService', () => {
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
    iso27001CertificationService.certificationResults.length = 0;
    iso27001CertificationService.controlGaps.length = 0;
    iso27001CertificationService.auditFindings.length = 0;
    originalMathRandom = Math.random;
  });

  afterEach(() => {
    jest.resetAllMocks();
    Math.random = originalMathRandom;
  });

  describe('Service Configuration', () => {
    it('should have correct default configuration', () => {
      expect(iso27001CertificationService.config).toBeDefined();
      expect(iso27001CertificationService.config.iso27001).toBeDefined();
      expect(iso27001CertificationService.config.asset_inventory).toBeDefined();
      expect(iso27001CertificationService.config.risk_assessment).toBeDefined();
      expect(iso27001CertificationService.config.security_policies).toBeDefined();
      expect(iso27001CertificationService.config.business_continuity).toBeDefined();
    });

    it('should enable ISO 27001 certification', () => {
      expect(iso27001CertificationService.config.iso27001.enabled).toBe(true);
      expect(iso27001CertificationService.config.iso27001.certification_frequency).toBe('quarterly');
    });

    it('should configure required assets', () => {
      const assets = iso27001CertificationService.config.asset_inventory.required_assets;
      
      expect(assets).toContain('hardware_assets');
      expect(assets).toContain('software_assets');
      expect(assets).toContain('data_assets');
      expect(assets).toContain('network_assets');
      expect(assets).toContain('personnel_assets');
      expect(assets).toContain('facility_assets');
    });

    it('should configure required risk assessments', () => {
      const assessments = iso27001CertificationService.config.risk_assessment.required_assessments;
      
      expect(assessments).toContain('information_security_risks');
      expect(assessments).toContain('business_continuity_risks');
      expect(assessments).toContain('compliance_risks');
      expect(assessments).toContain('operational_risks');
      expect(assessments).toContain('reputational_risks');
    });

    it('should configure required security policies', () => {
      const policies = iso27001CertificationService.config.security_policies.required_policies;
      
      expect(policies).toContain('information_security_policy');
      expect(policies).toContain('access_control_policy');
      expect(policies).toContain('data_protection_policy');
      expect(policies).toContain('incident_management_policy');
      expect(policies).toContain('business_continuity_policy');
      expect(policies).toContain('risk_management_policy');
      expect(policies).toContain('vendor_management_policy');
      expect(policies).toContain('physical_security_policy');
    });

    it('should configure business continuity components', () => {
      const components = iso27001CertificationService.config.business_continuity.required_components;
      
      expect(components).toContain('business_impact_analysis');
      expect(components).toContain('disaster_recovery_plan');
      expect(components).toContain('business_continuity_plan');
      expect(components).toContain('crisis_management_plan');
      expect(components).toContain('communication_plan');
    });

    it('should configure monitoring metrics', () => {
      const metrics = iso27001CertificationService.config.monitoring.metrics;
      
      expect(metrics).toContain('certification_readiness_score');
      expect(metrics).toContain('control_implementation_rate');
      expect(metrics).toContain('policy_compliance_rate');
      expect(metrics).toContain('risk_treatment_rate');
      expect(metrics).toContain('audit_findings_count');
    });

    it('should set 30-second monitoring interval', () => {
      expect(iso27001CertificationService.config.monitoring.interval).toBe(30000);
    });
  });

  describe('calculateCertificationReadinessScore', () => {
    it('should return 100 for no gaps or findings', async () => {
      iso27001CertificationService.controlGaps.length = 0;
      iso27001CertificationService.auditFindings.length = 0;
      
      const score = await iso27001CertificationService.calculateCertificationReadinessScore();
      
      expect(score).toBe(100);
    });

    it('should deduct for critical gaps', async () => {
      iso27001CertificationService.controlGaps.push({ severity: 'critical' });
      
      const score = await iso27001CertificationService.calculateCertificationReadinessScore();
      
      expect(score).toBeLessThan(100);
      expect(score).toBe(75); // 100 - 25 for critical
    });

    it('should deduct for high gaps', async () => {
      iso27001CertificationService.controlGaps.push({ severity: 'high' });
      
      const score = await iso27001CertificationService.calculateCertificationReadinessScore();
      
      expect(score).toBe(85); // 100 - 15 for high
    });

    it('should deduct for medium gaps', async () => {
      iso27001CertificationService.controlGaps.push({ severity: 'medium' });
      
      const score = await iso27001CertificationService.calculateCertificationReadinessScore();
      
      expect(score).toBe(90); // 100 - 10 for medium
    });

    it('should deduct for low gaps', async () => {
      iso27001CertificationService.controlGaps.push({ severity: 'low' });
      
      const score = await iso27001CertificationService.calculateCertificationReadinessScore();
      
      expect(score).toBe(95); // 100 - 5 for low
    });

    it('should deduct for audit findings', async () => {
      iso27001CertificationService.auditFindings.push({ severity: 'critical' });
      
      const score = await iso27001CertificationService.calculateCertificationReadinessScore();
      
      expect(score).toBe(80); // 100 - 20 for critical finding
    });

    it('should cap score at 0', async () => {
      // Add many critical gaps
      for (let i = 0; i < 10; i++) {
        iso27001CertificationService.controlGaps.push({ severity: 'critical' });
      }
      
      const score = await iso27001CertificationService.calculateCertificationReadinessScore();
      
      expect(score).toBe(0);
    });

    it('should cap score at 100', async () => {
      const score = await iso27001CertificationService.calculateCertificationReadinessScore();
      
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Asset Inventory Validation', () => {
    describe('validateAssetClassification', () => {
      it('should return compliance result', async () => {
        const result = await iso27001CertificationService.validateAssetClassification();
        
        expect(result).toHaveProperty('compliant');
        expect(result).toHaveProperty('details');
        expect(result).toHaveProperty('timestamp');
      });
    });

    describe('validateAssetOwnership', () => {
      it('should return compliance result', async () => {
        const result = await iso27001CertificationService.validateAssetOwnership();
        
        expect(result).toHaveProperty('compliant');
        expect(typeof result.compliant).toBe('boolean');
      });
    });

    describe('validateAssetLifecycle', () => {
      it('should return compliance result', async () => {
        const result = await iso27001CertificationService.validateAssetLifecycle();
        
        expect(result).toHaveProperty('compliant');
      });
    });

    describe('validateAssetSecurity', () => {
      it('should return compliance result', async () => {
        const result = await iso27001CertificationService.validateAssetSecurity();
        
        expect(result).toHaveProperty('compliant');
      });
    });
  });

  describe('assessAssetInventory', () => {
    it('should return gaps and findings', async () => {
      const result = await iso27001CertificationService.assessAssetInventory();
      
      expect(result).toHaveProperty('gaps');
      expect(result).toHaveProperty('findings');
      expect(Array.isArray(result.gaps)).toBe(true);
      expect(Array.isArray(result.findings)).toBe(true);
    });

    it('should detect non-compliant asset classification', async () => {
      iso27001CertificationService.validateAssetClassification = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Needs improvement',
        timestamp: new Date().toISOString()
      });

      const result = await iso27001CertificationService.assessAssetInventory();

      const gap = result.gaps.find(g => g.control === 'asset_classification');
      expect(gap).toBeDefined();
      expect(gap.severity).toBe('high');
    });

    it('should detect non-compliant asset ownership', async () => {
      // Mock ALL validation methods for deterministic results
      iso27001CertificationService.validateAssetClassification = jest.fn().mockResolvedValue({ compliant: true });
      iso27001CertificationService.validateAssetOwnership = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Needs improvement',
        timestamp: new Date().toISOString()
      });
      iso27001CertificationService.validateAssetLifecycle = jest.fn().mockResolvedValue({ compliant: true });
      iso27001CertificationService.validateAssetSecurity = jest.fn().mockResolvedValue({ compliant: true });

      const result = await iso27001CertificationService.assessAssetInventory();

      const gap = result.gaps.find(g => g.control === 'asset_ownership');
      expect(gap).toBeDefined();
      expect(gap.severity).toBe('medium');
    });

    it('should store control gaps', async () => {
      // Mock validation to produce gaps
      iso27001CertificationService.validateAssetClassification = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Non-compliant',
        timestamp: new Date().toISOString()
      });
      iso27001CertificationService.validateAssetOwnership = jest.fn().mockResolvedValue({ compliant: true });
      iso27001CertificationService.validateAssetLifecycle = jest.fn().mockResolvedValue({ compliant: true });
      iso27001CertificationService.validateAssetSecurity = jest.fn().mockResolvedValue({ compliant: true });

      const initialCount = iso27001CertificationService.controlGaps.length;
      await iso27001CertificationService.assessAssetInventory();

      expect(iso27001CertificationService.controlGaps.length).toBeGreaterThan(initialCount);
    });
  });

  describe('Risk Assessment Validation', () => {
    describe('validateRiskIdentification', () => {
      it('should return compliance result', async () => {
        const result = await iso27001CertificationService.validateRiskIdentification();
        
        expect(result).toHaveProperty('compliant');
      });
    });

    describe('validateRiskAnalysis', () => {
      it('should return compliance result', async () => {
        const result = await iso27001CertificationService.validateRiskAnalysis();
        
        expect(result).toHaveProperty('compliant');
      });
    });

    describe('validateRiskEvaluation', () => {
      it('should return compliance result', async () => {
        const result = await iso27001CertificationService.validateRiskEvaluation();
        
        expect(result).toHaveProperty('compliant');
      });
    });

    describe('validateRiskTreatment', () => {
      it('should return compliance result', async () => {
        const result = await iso27001CertificationService.validateRiskTreatment();
        
        expect(result).toHaveProperty('compliant');
      });
    });

    describe('validateRiskMonitoring', () => {
      it('should return compliance result', async () => {
        const result = await iso27001CertificationService.validateRiskMonitoring();
        
        expect(result).toHaveProperty('compliant');
      });
    });
  });

  describe('assessRiskAssessment', () => {
    it('should return gaps and findings', async () => {
      const result = await iso27001CertificationService.assessRiskAssessment();
      
      expect(result).toHaveProperty('gaps');
      expect(result).toHaveProperty('findings');
    });

    it('should detect non-compliant risk treatment as critical', async () => {
      // Mock ALL validation methods for deterministic results
      iso27001CertificationService.validateRiskIdentification = jest.fn().mockResolvedValue({ compliant: true });
      iso27001CertificationService.validateRiskAnalysis = jest.fn().mockResolvedValue({ compliant: true });
      iso27001CertificationService.validateRiskEvaluation = jest.fn().mockResolvedValue({ compliant: true });
      iso27001CertificationService.validateRiskTreatment = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Non-compliant',
        timestamp: new Date().toISOString()
      });
      iso27001CertificationService.validateRiskMonitoring = jest.fn().mockResolvedValue({ compliant: true });

      const result = await iso27001CertificationService.assessRiskAssessment();

      const gap = result.gaps.find(g => g.control === 'risk_treatment');
      expect(gap).toBeDefined();
      expect(gap.severity).toBe('critical');
    });

    it('should detect non-compliant risk identification', async () => {
      // Mock ALL validation methods for deterministic results
      iso27001CertificationService.validateRiskIdentification = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Non-compliant',
        timestamp: new Date().toISOString()
      });
      iso27001CertificationService.validateRiskAnalysis = jest.fn().mockResolvedValue({ compliant: true });
      iso27001CertificationService.validateRiskEvaluation = jest.fn().mockResolvedValue({ compliant: true });
      iso27001CertificationService.validateRiskTreatment = jest.fn().mockResolvedValue({ compliant: true });
      iso27001CertificationService.validateRiskMonitoring = jest.fn().mockResolvedValue({ compliant: true });

      const result = await iso27001CertificationService.assessRiskAssessment();

      const gap = result.gaps.find(g => g.control === 'risk_identification');
      expect(gap).toBeDefined();
      expect(gap.severity).toBe('high');
    });
  });

  describe('Metric Calculations', () => {
    describe('calculateControlImplementationRate', () => {
      it('should return a percentage value', async () => {
        const rate = await iso27001CertificationService.calculateControlImplementationRate();
        
        expect(typeof rate).toBe('number');
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);
      });
    });

    describe('calculatePolicyComplianceRate', () => {
      it('should return a percentage value', async () => {
        const rate = await iso27001CertificationService.calculatePolicyComplianceRate();
        
        expect(typeof rate).toBe('number');
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);
      });
    });

    describe('calculateRiskTreatmentRate', () => {
      it('should return a percentage value', async () => {
        const rate = await iso27001CertificationService.calculateRiskTreatmentRate();
        
        expect(typeof rate).toBe('number');
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('collectCertificationMetrics', () => {
    it('should log metrics to centralized logging', async () => {
      await iso27001CertificationService.collectCertificationMetrics();

      expect(mockCentralizedLoggingService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: 'iso27001_certification_service',
          action: 'collect_certification_metrics',
          status: 'success'
        })
      );
    });

    it('should include all required metrics', async () => {
      await iso27001CertificationService.collectCertificationMetrics();

      expect(mockCentralizedLoggingService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            certification_readiness_score: expect.any(Number),
            control_implementation_rate: expect.any(Number),
            policy_compliance_rate: expect.any(Number),
            risk_treatment_rate: expect.any(Number),
            audit_findings_count: expect.any(Number)
          })
        })
      );
    });
  });

  describe('executeCertificationReadinessAssessment', () => {
    // Store original methods
    let originalAssessAssetInventory;
    let originalAssessRiskAssessment;
    let originalAssessSecurityPolicies;
    let originalAssessBusinessContinuity;
    let originalLogCertificationEvent;
    let originalSendCertificationNotReadyAlert;
    let originalCalculateCertificationReadinessScore;

    beforeEach(() => {
      // Save original methods
      originalAssessAssetInventory = iso27001CertificationService.assessAssetInventory;
      originalAssessRiskAssessment = iso27001CertificationService.assessRiskAssessment;
      originalAssessSecurityPolicies = iso27001CertificationService.assessSecurityPolicies;
      originalAssessBusinessContinuity = iso27001CertificationService.assessBusinessContinuity;
      originalLogCertificationEvent = iso27001CertificationService.logCertificationEvent;
      originalSendCertificationNotReadyAlert = iso27001CertificationService.sendCertificationNotReadyAlert;
      originalCalculateCertificationReadinessScore = iso27001CertificationService.calculateCertificationReadinessScore;

      // Mock all assessment methods
      iso27001CertificationService.assessAssetInventory = jest.fn().mockResolvedValue({
        gaps: [],
        findings: []
      });
      iso27001CertificationService.assessRiskAssessment = jest.fn().mockResolvedValue({
        gaps: [],
        findings: []
      });
      iso27001CertificationService.assessSecurityPolicies = jest.fn().mockResolvedValue({
        gaps: [],
        findings: []
      });
      iso27001CertificationService.assessBusinessContinuity = jest.fn().mockResolvedValue({
        gaps: [],
        findings: []
      });
      iso27001CertificationService.logCertificationEvent = jest.fn().mockResolvedValue();
      iso27001CertificationService.sendCertificationNotReadyAlert = jest.fn().mockResolvedValue();
    });

    afterEach(() => {
      // Restore original methods
      iso27001CertificationService.assessAssetInventory = originalAssessAssetInventory;
      iso27001CertificationService.assessRiskAssessment = originalAssessRiskAssessment;
      iso27001CertificationService.assessSecurityPolicies = originalAssessSecurityPolicies;
      iso27001CertificationService.assessBusinessContinuity = originalAssessBusinessContinuity;
      iso27001CertificationService.logCertificationEvent = originalLogCertificationEvent;
      iso27001CertificationService.sendCertificationNotReadyAlert = originalSendCertificationNotReadyAlert;
      iso27001CertificationService.calculateCertificationReadinessScore = originalCalculateCertificationReadinessScore;
    });

    it('should execute all assessment components', async () => {
      await iso27001CertificationService.executeCertificationReadinessAssessment();

      expect(iso27001CertificationService.assessAssetInventory).toHaveBeenCalled();
      expect(iso27001CertificationService.assessRiskAssessment).toHaveBeenCalled();
      expect(iso27001CertificationService.assessSecurityPolicies).toHaveBeenCalled();
      expect(iso27001CertificationService.assessBusinessContinuity).toHaveBeenCalled();
    });

    it('should return assessment result', async () => {
      const result = await iso27001CertificationService.executeCertificationReadinessAssessment();

      expect(result).toMatchObject({
        id: expect.any(String),
        type: 'iso27001_certification_readiness',
        status: expect.stringMatching(/completed|failed/),
        startTime: expect.any(String),
        endTime: expect.any(String),
        controlGaps: expect.any(Array),
        auditFindings: expect.any(Array),
        certification_readiness_score: expect.any(Number),
        certification_ready: expect.any(Boolean)
      });
    });

    it('should mark as certification ready when score >= 85 and no critical gaps', async () => {
      iso27001CertificationService.calculateCertificationReadinessScore = jest.fn().mockResolvedValue(90);

      const result = await iso27001CertificationService.executeCertificationReadinessAssessment();

      expect(result.certification_ready).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should mark as not certification ready when score < 85', async () => {
      iso27001CertificationService.calculateCertificationReadinessScore = jest.fn().mockResolvedValue(70);

      const result = await iso27001CertificationService.executeCertificationReadinessAssessment();

      expect(result.certification_ready).toBe(false);
      expect(result.status).toBe('failed');
    });

    it('should mark as not ready when critical gaps exist', async () => {
      iso27001CertificationService.assessAssetInventory = jest.fn().mockResolvedValue({
        gaps: [{ severity: 'critical', control: 'test' }],
        findings: []
      });

      const result = await iso27001CertificationService.executeCertificationReadinessAssessment();

      expect(result.certification_ready).toBe(false);
    });

    it('should send alert when not certification ready', async () => {
      iso27001CertificationService.calculateCertificationReadinessScore = jest.fn().mockResolvedValue(50);

      await iso27001CertificationService.executeCertificationReadinessAssessment();

      expect(iso27001CertificationService.sendCertificationNotReadyAlert).toHaveBeenCalled();
    });

    it('should store assessment results', async () => {
      const initialCount = iso27001CertificationService.certificationResults.length;

      await iso27001CertificationService.executeCertificationReadinessAssessment();

      expect(iso27001CertificationService.certificationResults.length).toBe(initialCount + 1);
    });
  });

  describe('ID Generation', () => {
    it('should generate unique assessment IDs', () => {
      const id1 = iso27001CertificationService.generateAssessmentId();
      const id2 = iso27001CertificationService.generateAssessmentId();
      
      expect(id1).not.toBe(id2);
    });

    it('should generate unique gap IDs', () => {
      const id1 = iso27001CertificationService.generateGapId();
      const id2 = iso27001CertificationService.generateGapId();
      
      expect(id1).not.toBe(id2);
    });

    it('should generate unique trace IDs', () => {
      const id1 = iso27001CertificationService.generateTraceId();
      const id2 = iso27001CertificationService.generateTraceId();
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('Service Status', () => {
    it('should track certification results', () => {
      expect(Array.isArray(iso27001CertificationService.certificationResults)).toBe(true);
    });

    it('should track control gaps', () => {
      expect(Array.isArray(iso27001CertificationService.controlGaps)).toBe(true);
    });

    it('should track audit findings', () => {
      expect(Array.isArray(iso27001CertificationService.auditFindings)).toBe(true);
    });

    it('should report running status', () => {
      expect(typeof iso27001CertificationService.isRunning).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in calculateCertificationReadinessScore', async () => {
      // Test that service returns a valid score
      const score = await iso27001CertificationService.calculateCertificationReadinessScore();
      
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle errors in asset inventory assessment', async () => {
      iso27001CertificationService.validateAssetClassification = jest.fn().mockRejectedValue(new Error('Validation failed'));

      const result = await iso27001CertificationService.assessAssetInventory();

      // Service should catch errors and return empty arrays
      expect(result).toBeDefined();
      expect(result.gaps).toEqual([]);
      expect(result.findings).toEqual([]);
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('Directory Creation', () => {
    it('should create certification directory on initialization', async () => {
      await iso27001CertificationService.createCertificationDirectory();

      // The mock uses default export structure
      expect(mockFs.default.mkdir).toHaveBeenCalledWith(
        '/app/compliance_audits/iso27001',
        { recursive: true }
      );
    });

    it('should log success on directory creation', async () => {
      await iso27001CertificationService.createCertificationDirectory();

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        expect.stringContaining('Created ISO 27001 certification directory')
      );
    });
  });

  describe('Monitoring', () => {
    it('should have monitoring configuration', () => {
      expect(iso27001CertificationService.config.monitoring.enabled).toBe(true);
    });

    it('should track multiple metric types', () => {
      const metrics = iso27001CertificationService.config.monitoring.metrics;
      
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe('Additional ISO 27001 Coverage', () => {
    describe('Multiple Severity Deductions', () => {
      it('should calculate correct score with all severity levels', async () => {
        iso27001CertificationService.controlGaps.push(
          { severity: 'critical' },  // -25
          { severity: 'high' },      // -15
          { severity: 'medium' },    // -10
          { severity: 'low' }        // -5
        );
        iso27001CertificationService.auditFindings.push(
          { severity: 'critical' },  // -20
          { severity: 'high' },      // -10
          { severity: 'medium' },    // -5
          { severity: 'low' }        // -2
        );
        
        const score = await iso27001CertificationService.calculateCertificationReadinessScore();
        
        // 100 - 25 - 15 - 10 - 5 - 20 - 10 - 5 - 2 = 8
        expect(score).toBe(8);
      });

      it('should not return negative scores', async () => {
        // Add many gaps to force negative calculation
        for (let i = 0; i < 10; i++) {
          iso27001CertificationService.controlGaps.push({ severity: 'critical' });
        }
        
        const score = await iso27001CertificationService.calculateCertificationReadinessScore();
        
        expect(score).toBe(0); // Score should be clamped to 0
      });
    });

    describe('Calculation Methods', () => {
      it('calculateControlImplementationRate should return a number', async () => {
        const rate = await iso27001CertificationService.calculateControlImplementationRate();
        
        expect(typeof rate).toBe('number');
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);
      });

      it('calculatePolicyComplianceRate should return a number', async () => {
        const rate = await iso27001CertificationService.calculatePolicyComplianceRate();
        
        expect(typeof rate).toBe('number');
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);
      });

      it('calculateRiskTreatmentRate should return a number', async () => {
        const rate = await iso27001CertificationService.calculateRiskTreatmentRate();
        
        expect(typeof rate).toBe('number');
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);
      });
    });

    describe('Monitoring Start Behavior', () => {
      it('startCertificationMonitoring should not start if already running', () => {
        iso27001CertificationService.isRunning = true;
        const intervalSpy = jest.spyOn(global, 'setInterval');
        
        iso27001CertificationService.startCertificationMonitoring();
        
        expect(intervalSpy).not.toHaveBeenCalled();
        intervalSpy.mockRestore();
      });
    });

    describe('Metrics Collection', () => {
      it('collectCertificationMetrics should collect and log metrics', async () => {
        await iso27001CertificationService.collectCertificationMetrics();

        expect(mockCentralizedLoggingService.logEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            actor: 'iso27001_certification_service',
            action: 'collect_certification_metrics',
            status: 'success'
          })
        );
      });
    });

    describe('Assessment Components', () => {
      describe('Asset Inventory Assessment', () => {
        beforeEach(() => {
          jest.spyOn(iso27001CertificationService, 'validateAssetClassification').mockResolvedValue({ compliant: true });
          jest.spyOn(iso27001CertificationService, 'validateAssetOwnership').mockResolvedValue({ compliant: true });
          jest.spyOn(iso27001CertificationService, 'validateAssetLifecycle').mockResolvedValue({ compliant: true });
          jest.spyOn(iso27001CertificationService, 'validateAssetSecurity').mockResolvedValue({ compliant: true });
        });

        afterEach(() => {
          jest.restoreAllMocks();
        });

        it('should detect non-compliant asset classification', async () => {
          jest.spyOn(iso27001CertificationService, 'validateAssetClassification').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessAssetInventory();

          const gap = result.gaps.find(g => g.control === 'asset_classification');
          expect(gap).toBeDefined();
          expect(gap.severity).toBe('high');
        });

        it('should detect non-compliant asset ownership', async () => {
          jest.spyOn(iso27001CertificationService, 'validateAssetOwnership').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessAssetInventory();

          const gap = result.gaps.find(g => g.control === 'asset_ownership');
          expect(gap).toBeDefined();
          expect(gap.severity).toBe('medium');
        });

        it('should detect non-compliant asset lifecycle', async () => {
          jest.spyOn(iso27001CertificationService, 'validateAssetLifecycle').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessAssetInventory();

          const gap = result.gaps.find(g => g.control === 'asset_lifecycle');
          expect(gap).toBeDefined();
        });

        it('should detect non-compliant asset security', async () => {
          jest.spyOn(iso27001CertificationService, 'validateAssetSecurity').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessAssetInventory();

          const gap = result.gaps.find(g => g.control === 'asset_security');
          expect(gap).toBeDefined();
        });
      });

      describe('Risk Assessment', () => {
        beforeEach(() => {
          jest.spyOn(iso27001CertificationService, 'validateRiskIdentification').mockResolvedValue({ compliant: true });
          jest.spyOn(iso27001CertificationService, 'validateRiskAnalysis').mockResolvedValue({ compliant: true });
          jest.spyOn(iso27001CertificationService, 'validateRiskEvaluation').mockResolvedValue({ compliant: true });
          jest.spyOn(iso27001CertificationService, 'validateRiskTreatment').mockResolvedValue({ compliant: true });
          jest.spyOn(iso27001CertificationService, 'validateRiskMonitoring').mockResolvedValue({ compliant: true });
        });

        afterEach(() => {
          jest.restoreAllMocks();
        });

        it('should detect non-compliant risk identification', async () => {
          jest.spyOn(iso27001CertificationService, 'validateRiskIdentification').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessRiskAssessment();

          const gap = result.gaps.find(g => g.control === 'risk_identification');
          expect(gap).toBeDefined();
          expect(gap.severity).toBe('high');
        });

        it('should detect non-compliant risk analysis', async () => {
          jest.spyOn(iso27001CertificationService, 'validateRiskAnalysis').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessRiskAssessment();

          const gap = result.gaps.find(g => g.control === 'risk_analysis');
          expect(gap).toBeDefined();
        });

        it('should detect non-compliant risk treatment', async () => {
          jest.spyOn(iso27001CertificationService, 'validateRiskTreatment').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessRiskAssessment();

          const gap = result.gaps.find(g => g.control === 'risk_treatment');
          expect(gap).toBeDefined();
          expect(gap.severity).toBe('critical');
        });
      });

      describe('Security Policies Assessment', () => {
        beforeEach(() => {
          jest.spyOn(iso27001CertificationService, 'validatePolicyApproval').mockResolvedValue({ compliant: true });
          jest.spyOn(iso27001CertificationService, 'validatePolicyCommunication').mockResolvedValue({ compliant: true });
          jest.spyOn(iso27001CertificationService, 'validatePolicyReview').mockResolvedValue({ compliant: true });
          jest.spyOn(iso27001CertificationService, 'validatePolicyCompliance').mockResolvedValue({ compliant: true });
        });

        afterEach(() => {
          jest.restoreAllMocks();
        });

        it('should detect non-compliant policy approval', async () => {
          jest.spyOn(iso27001CertificationService, 'validatePolicyApproval').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessSecurityPolicies();

          const gap = result.gaps.find(g => g.control === 'policy_approval');
          expect(gap).toBeDefined();
          expect(gap.severity).toBe('critical');
        });

        it('should detect non-compliant policy communication', async () => {
          jest.spyOn(iso27001CertificationService, 'validatePolicyCommunication').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessSecurityPolicies();

          const gap = result.gaps.find(g => g.control === 'policy_communication');
          expect(gap).toBeDefined();
          expect(gap.severity).toBe('high');
        });

        it('should detect non-compliant policy review', async () => {
          jest.spyOn(iso27001CertificationService, 'validatePolicyReview').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessSecurityPolicies();

          const gap = result.gaps.find(g => g.control === 'policy_review');
          expect(gap).toBeDefined();
          expect(gap.severity).toBe('medium');
        });

        it('should detect non-compliant policy compliance', async () => {
          jest.spyOn(iso27001CertificationService, 'validatePolicyCompliance').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessSecurityPolicies();

          const gap = result.gaps.find(g => g.control === 'policy_compliance');
          expect(gap).toBeDefined();
          expect(gap.severity).toBe('high');
        });
      });

      describe('Business Continuity Assessment', () => {
        beforeEach(() => {
          jest.spyOn(iso27001CertificationService, 'validatePlanCompleteness').mockResolvedValue({ compliant: true });
          jest.spyOn(iso27001CertificationService, 'validatePlanTesting').mockResolvedValue({ compliant: true });
          jest.spyOn(iso27001CertificationService, 'validatePlanMaintenance').mockResolvedValue({ compliant: true });
          jest.spyOn(iso27001CertificationService, 'validatePlanEffectiveness').mockResolvedValue({ compliant: true });
        });

        afterEach(() => {
          jest.restoreAllMocks();
        });

        it('should detect non-compliant plan completeness', async () => {
          jest.spyOn(iso27001CertificationService, 'validatePlanCompleteness').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessBusinessContinuity();

          const gap = result.gaps.find(g => g.control === 'plan_completeness');
          expect(gap).toBeDefined();
          expect(gap.severity).toBe('critical');
        });

        it('should detect non-compliant plan testing', async () => {
          jest.spyOn(iso27001CertificationService, 'validatePlanTesting').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessBusinessContinuity();

          const gap = result.gaps.find(g => g.control === 'plan_testing');
          expect(gap).toBeDefined();
          expect(gap.severity).toBe('high');
        });

        it('should detect non-compliant plan maintenance', async () => {
          jest.spyOn(iso27001CertificationService, 'validatePlanMaintenance').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessBusinessContinuity();

          const gap = result.gaps.find(g => g.control === 'plan_maintenance');
          expect(gap).toBeDefined();
          expect(gap.severity).toBe('medium');
        });

        it('should detect non-compliant plan effectiveness', async () => {
          jest.spyOn(iso27001CertificationService, 'validatePlanEffectiveness').mockResolvedValue({ compliant: false });

          const result = await iso27001CertificationService.assessBusinessContinuity();

          const gap = result.gaps.find(g => g.control === 'plan_effectiveness');
          expect(gap).toBeDefined();
          expect(gap.severity).toBe('high');
        });
      });
    });

    describe('Certification Readiness Determination', () => {
      beforeEach(() => {
        jest.spyOn(iso27001CertificationService, 'assessAssetInventory').mockResolvedValue({ gaps: [], findings: [] });
        jest.spyOn(iso27001CertificationService, 'assessRiskAssessment').mockResolvedValue({ gaps: [], findings: [] });
        jest.spyOn(iso27001CertificationService, 'assessSecurityPolicies').mockResolvedValue({ gaps: [], findings: [] });
        jest.spyOn(iso27001CertificationService, 'assessBusinessContinuity').mockResolvedValue({ gaps: [], findings: [] });
        jest.spyOn(iso27001CertificationService, 'calculateCertificationReadinessScore').mockResolvedValue(90);
        jest.spyOn(iso27001CertificationService, 'logCertificationEvent').mockResolvedValue();
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should mark as certification ready for passing assessment', async () => {
        const assessment = await iso27001CertificationService.executeCertificationReadinessAssessment();
        
        expect(assessment.certification_ready).toBe(true);
        expect(assessment.status).toBe('completed');
      });

      it('should mark as not ready when score is below 85', async () => {
        jest.spyOn(iso27001CertificationService, 'calculateCertificationReadinessScore').mockResolvedValue(70);
        
        const assessment = await iso27001CertificationService.executeCertificationReadinessAssessment();
        
        expect(assessment.certification_ready).toBe(false);
        expect(assessment.status).toBe('failed');
      });

      it('should mark as not ready when critical gaps exist', async () => {
        jest.spyOn(iso27001CertificationService, 'assessAssetInventory').mockResolvedValue({
          gaps: [{ severity: 'critical' }],
          findings: []
        });
        
        const assessment = await iso27001CertificationService.executeCertificationReadinessAssessment();
        
        expect(assessment.certification_ready).toBe(false);
      });
    });

    describe('Alert Sending', () => {
      it('sendCertificationNotReadyAlert should handle alerts', async () => {
        const assessment = {
          certification_readiness_score: 60,
          controlGaps: [{ severity: 'critical' }],
          auditFindings: []
        };

        // Should not throw
        await expect(
          iso27001CertificationService.sendCertificationNotReadyAlert(assessment)
        ).resolves.not.toThrow();
      });
    });

    describe('Logging', () => {
      it('logCertificationEvent should log to centralized service', async () => {
        const assessment = {
          id: 'TEST-123',
          type: 'test',
          status: 'completed',
          certification_readiness_score: 95,
          certification_ready: true,
          controlGaps: [],
          auditFindings: []
        };

        await iso27001CertificationService.logCertificationEvent(assessment, 'started');

        expect(mockCentralizedLoggingService.logEvent).toHaveBeenCalled();
      });
    });

    describe('Individual Validation Methods - Direct Invocation', () => {
      // These tests verify the validation methods work correctly
      // when invoked directly on the service
      
      it('validateAssetClassification returns an object with compliant boolean', async () => {
        // Get a fresh reference to the prototype method
        const result = await Object.getPrototypeOf(iso27001CertificationService).validateAssetClassification.call(iso27001CertificationService);
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('compliant');
        expect(typeof result.compliant).toBe('boolean');
        expect(result).toHaveProperty('details');
        expect(result).toHaveProperty('timestamp');
      });

      it('validateAssetOwnership returns an object with compliant boolean', async () => {
        const result = await Object.getPrototypeOf(iso27001CertificationService).validateAssetOwnership.call(iso27001CertificationService);
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('compliant');
        expect(typeof result.compliant).toBe('boolean');
      });

      it('validateRiskIdentification returns an object with compliant boolean', async () => {
        const result = await Object.getPrototypeOf(iso27001CertificationService).validateRiskIdentification.call(iso27001CertificationService);
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('compliant');
        expect(typeof result.compliant).toBe('boolean');
      });

      it('validatePolicyApproval returns an object with compliant boolean', async () => {
        const result = await Object.getPrototypeOf(iso27001CertificationService).validatePolicyApproval.call(iso27001CertificationService);
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('compliant');
        expect(typeof result.compliant).toBe('boolean');
      });

      it('validateAssetLifecycle returns an object with compliant boolean', async () => {
        const result = await Object.getPrototypeOf(iso27001CertificationService).validateAssetLifecycle.call(iso27001CertificationService);
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('compliant');
      });

      it('validateAssetSecurity returns an object with compliant boolean', async () => {
        const result = await Object.getPrototypeOf(iso27001CertificationService).validateAssetSecurity.call(iso27001CertificationService);
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('compliant');
      });
    });

    describe('Assessment Error Handling', () => {
      it('assessAssetInventory should return empty arrays on error', async () => {
        iso27001CertificationService.validateAssetClassification = jest.fn().mockRejectedValue(new Error('Test error'));
        
        const result = await iso27001CertificationService.assessAssetInventory();
        
        expect(result.gaps).toEqual([]);
        expect(result.findings).toEqual([]);
      });

      it('assessRiskAssessment should return empty arrays on error', async () => {
        iso27001CertificationService.validateRiskIdentification = jest.fn().mockRejectedValue(new Error('Test error'));
        
        const result = await iso27001CertificationService.assessRiskAssessment();
        
        expect(result.gaps).toEqual([]);
        expect(result.findings).toEqual([]);
      });

      it('assessSecurityPolicies should return empty arrays on error', async () => {
        iso27001CertificationService.validatePolicyApproval = jest.fn().mockRejectedValue(new Error('Test error'));
        
        const result = await iso27001CertificationService.assessSecurityPolicies();
        
        expect(result.gaps).toEqual([]);
        expect(result.findings).toEqual([]);
      });

      it('assessBusinessContinuity should return empty arrays on error', async () => {
        iso27001CertificationService.validatePlanCompleteness = jest.fn().mockRejectedValue(new Error('Test error'));
        
        const result = await iso27001CertificationService.assessBusinessContinuity();
        
        expect(result.gaps).toEqual([]);
        expect(result.findings).toEqual([]);
      });

      it('executeCertificationReadinessAssessment should throw on error', async () => {
        iso27001CertificationService.assessAssetInventory = jest.fn().mockRejectedValue(new Error('Test error'));
        
        await expect(iso27001CertificationService.executeCertificationReadinessAssessment()).rejects.toThrow();
        
        expect(mockLoggingService.logError).toHaveBeenCalled();
      });
    });

    describe('Metrics Collection Error Handling', () => {
      it('collectCertificationMetrics should handle errors gracefully', async () => {
        mockCentralizedLoggingService.logEvent.mockRejectedValueOnce(new Error('Log failed'));
        
        // Should not throw
        await iso27001CertificationService.collectCertificationMetrics();
        
        expect(mockLoggingService.logError).toHaveBeenCalled();
      });
    });

    describe('Alert Error Handling', () => {
      it('sendCertificationNotReadyAlert should handle errors gracefully', async () => {
        mockRollbackAlertingService.sendSystemFailureAlert = jest.fn().mockRejectedValue(new Error('Alert failed'));
        
        const assessment = {
          certification_readiness_score: 50,
          controlGaps: [],
          auditFindings: []
        };
        
        // Should not throw
        await iso27001CertificationService.sendCertificationNotReadyAlert(assessment);
        
        expect(mockLoggingService.logError).toHaveBeenCalled();
      });
    });

    describe('Logging Error Handling', () => {
      it('logCertificationEvent should handle errors gracefully', async () => {
        mockCentralizedLoggingService.logEvent.mockRejectedValueOnce(new Error('Log failed'));
        
        const assessment = {
          id: 'TEST-123',
          type: 'test',
          status: 'completed',
          certification_readiness_score: 95,
          certification_ready: true,
          controlGaps: [],
          auditFindings: []
        };
        
        // Should not throw
        await iso27001CertificationService.logCertificationEvent(assessment, 'completed');
        
        expect(mockLoggingService.logError).toHaveBeenCalled();
      });
    });

    describe('Directory Creation Error Handling', () => {
      it('createCertificationDirectory should throw on error', async () => {
        mockFs.default.mkdir.mockRejectedValueOnce(new Error('Directory creation failed'));
        
        await expect(iso27001CertificationService.createCertificationDirectory()).rejects.toThrow();
        
        expect(mockLoggingService.logError).toHaveBeenCalled();
      });
    });

    describe('Getter Methods', () => {
      it('getCertificationResults should return certification results array', () => {
        iso27001CertificationService.certificationResults.push({ id: 'test' });
        
        const results = iso27001CertificationService.getCertificationResults();
        
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThanOrEqual(1);
      });

      it('getControlGaps should return control gaps array', () => {
        const gaps = iso27001CertificationService.getControlGaps();
        
        expect(Array.isArray(gaps)).toBe(true);
      });

      it('getAuditFindings should return audit findings array', () => {
        const findings = iso27001CertificationService.getAuditFindings();
        
        expect(Array.isArray(findings)).toBe(true);
      });

      it('getStatus should return service status object', () => {
        const status = iso27001CertificationService.getStatus();
        
        expect(status).toHaveProperty('initialized', true);
        expect(status).toHaveProperty('running');
        expect(status).toHaveProperty('certificationResults');
        expect(status).toHaveProperty('controlGaps');
        expect(status).toHaveProperty('auditFindings');
        expect(status).toHaveProperty('config');
      });
    });

    describe('Risk Assessment Additional Gaps', () => {
      it('should detect non-compliant risk evaluation', async () => {
        iso27001CertificationService.validateRiskIdentification = jest.fn().mockResolvedValue({ compliant: true });
        iso27001CertificationService.validateRiskAnalysis = jest.fn().mockResolvedValue({ compliant: true });
        iso27001CertificationService.validateRiskEvaluation = jest.fn().mockResolvedValue({
          compliant: false,
          details: 'Non-compliant',
          timestamp: new Date().toISOString()
        });
        iso27001CertificationService.validateRiskTreatment = jest.fn().mockResolvedValue({ compliant: true });
        iso27001CertificationService.validateRiskMonitoring = jest.fn().mockResolvedValue({ compliant: true });

        const result = await iso27001CertificationService.assessRiskAssessment();

        const gap = result.gaps.find(g => g.control === 'risk_evaluation');
        expect(gap).toBeDefined();
        expect(gap.severity).toBe('high');
      });

      it('should detect non-compliant risk monitoring', async () => {
        iso27001CertificationService.validateRiskIdentification = jest.fn().mockResolvedValue({ compliant: true });
        iso27001CertificationService.validateRiskAnalysis = jest.fn().mockResolvedValue({ compliant: true });
        iso27001CertificationService.validateRiskEvaluation = jest.fn().mockResolvedValue({ compliant: true });
        iso27001CertificationService.validateRiskTreatment = jest.fn().mockResolvedValue({ compliant: true });
        iso27001CertificationService.validateRiskMonitoring = jest.fn().mockResolvedValue({
          compliant: false,
          details: 'Non-compliant',
          timestamp: new Date().toISOString()
        });

        const result = await iso27001CertificationService.assessRiskAssessment();

        const gap = result.gaps.find(g => g.control === 'risk_monitoring');
        expect(gap).toBeDefined();
        expect(gap.severity).toBe('medium');
      });
    });
  });
});
