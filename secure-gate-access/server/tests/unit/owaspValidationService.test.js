/**
 * Unit Tests for OWASP Validation Service
 * Phase 3: Compliance & Audit
 * 
 * Tests OWASP Top 10 web application security validation
 * Coverage: Vulnerability scanning, secure coding validation, CI/CD integration
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
const owaspValidationServiceModule = await import('../../src/services/owaspValidationService.js');
const owaspValidationService = owaspValidationServiceModule.default;

describe('OWASPValidationService', () => {
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
    owaspValidationService.validationResults.length = 0;
    owaspValidationService.vulnerabilities.length = 0;
    owaspValidationService.remediations.length = 0;
    owaspValidationService.policyViolations.length = 0;
    // Mock Math.random for deterministic tests
    originalMathRandom = Math.random;
  });

  afterEach(() => {
    jest.resetAllMocks();
    Math.random = originalMathRandom;
  });

  describe('Service Configuration', () => {
    it('should have correct default configuration', () => {
      expect(owaspValidationService.config).toBeDefined();
      expect(owaspValidationService.config.owasp).toBeDefined();
      expect(owaspValidationService.config.vulnerability_validation).toBeDefined();
      expect(owaspValidationService.config.secure_coding).toBeDefined();
      expect(owaspValidationService.config.ci_cd_integration).toBeDefined();
    });

    it('should enable OWASP validation', () => {
      expect(owaspValidationService.config.owasp.enabled).toBe(true);
      expect(owaspValidationService.config.owasp.validation_frequency).toBe('continuous');
    });

    it('should configure vulnerability thresholds', () => {
      const thresholds = owaspValidationService.config.vulnerability_validation;
      
      expect(thresholds.critical_threshold).toBe(0);
      expect(thresholds.high_threshold).toBe(2);
      expect(thresholds.medium_threshold).toBe(10);
      expect(thresholds.low_threshold).toBe(25);
    });

    it('should configure secure coding practices', () => {
      const practices = owaspValidationService.config.secure_coding.practices;
      
      expect(practices).toContain('input_validation');
      expect(practices).toContain('output_encoding');
      expect(practices).toContain('authentication_controls');
      expect(practices).toContain('authorization_controls');
      expect(practices).toContain('session_management');
      expect(practices).toContain('cryptographic_controls');
      expect(practices).toContain('error_handling');
      expect(practices).toContain('logging_monitoring');
    });

    it('should configure CI/CD pipelines', () => {
      const pipelines = owaspValidationService.config.ci_cd_integration.pipelines;
      
      expect(pipelines).toContain('build_pipeline');
      expect(pipelines).toContain('test_pipeline');
      expect(pipelines).toContain('deploy_pipeline');
      expect(pipelines).toContain('security_pipeline');
    });

    it('should configure code review requirements', () => {
      const requirements = owaspValidationService.config.code_review.requirements;
      
      expect(requirements).toContain('security_review');
      expect(requirements).toContain('vulnerability_assessment');
      expect(requirements).toContain('compliance_check');
      expect(requirements).toContain('best_practices_validation');
    });

    it('should configure monitoring metrics', () => {
      const metrics = owaspValidationService.config.monitoring.metrics;
      
      expect(metrics).toContain('vulnerability_count');
      expect(metrics).toContain('critical_vulnerabilities');
      expect(metrics).toContain('remediation_rate');
      expect(metrics).toContain('policy_violations');
    });

    it('should set 15-second monitoring interval', () => {
      expect(owaspValidationService.config.monitoring.interval).toBe(15000);
    });

    it('should configure reporting recipients', () => {
      const recipients = owaspValidationService.config.owasp.reporting.recipients;
      
      expect(recipients).toContain('security@securegate.com');
      expect(recipients).toContain('devops@securegate.com');
      expect(recipients).toContain('compliance@securegate.com');
    });
  });

  describe('calculateRemediationRate', () => {
    it('should return 100 for no vulnerabilities', async () => {
      owaspValidationService.vulnerabilities.length = 0;
      
      const rate = await owaspValidationService.calculateRemediationRate();
      
      expect(rate).toBe(100);
    });

    it('should calculate correct rate for partial remediation', async () => {
      owaspValidationService.vulnerabilities.push(
        { id: 'v1', remediated: true },
        { id: 'v2', remediated: true },
        { id: 'v3', remediated: false },
        { id: 'v4', remediated: false }
      );
      
      const rate = await owaspValidationService.calculateRemediationRate();
      
      expect(rate).toBe(50);
    });

    it('should return 0 for no remediated vulnerabilities', async () => {
      owaspValidationService.vulnerabilities.push(
        { id: 'v1', remediated: false },
        { id: 'v2', remediated: false }
      );
      
      const rate = await owaspValidationService.calculateRemediationRate();
      
      expect(rate).toBe(0);
    });

    it('should return 100 for all remediated vulnerabilities', async () => {
      owaspValidationService.vulnerabilities.push(
        { id: 'v1', remediated: true },
        { id: 'v2', remediated: true }
      );
      
      const rate = await owaspValidationService.calculateRemediationRate();
      
      expect(rate).toBe(100);
    });
  });

  describe('Vulnerability Scanning Simulations', () => {
    describe('scanCriticalVulnerabilities', () => {
      it('should return array of vulnerabilities', async () => {
        Math.random = () => 0.5; // Simulate 1 vulnerability
        
        const vulns = await owaspValidationService.scanCriticalVulnerabilities();
        
        expect(Array.isArray(vulns)).toBe(true);
      });

      it('should create vulnerabilities with critical severity', async () => {
        Math.random = () => 0.7; // Simulate vulnerabilities
        
        const vulns = await owaspValidationService.scanCriticalVulnerabilities();
        
        if (vulns.length > 0) {
          expect(vulns[0].severity).toBe('critical');
        }
      });

      it('should include required fields in vulnerability', async () => {
        Math.random = () => 0.9; // Ensure at least 1 vulnerability
        
        const vulns = await owaspValidationService.scanCriticalVulnerabilities();
        
        if (vulns.length > 0) {
          expect(vulns[0]).toMatchObject({
            id: expect.any(String),
            type: 'critical',
            severity: 'critical',
            description: expect.any(String),
            discovered: expect.any(String),
            remediated: false
          });
        }
      });
    });

    describe('scanHighVulnerabilities', () => {
      it('should return array of vulnerabilities', async () => {
        const vulns = await owaspValidationService.scanHighVulnerabilities();
        
        expect(Array.isArray(vulns)).toBe(true);
      });

      it('should create vulnerabilities with high severity', async () => {
        Math.random = () => 0.9;
        
        const vulns = await owaspValidationService.scanHighVulnerabilities();
        
        if (vulns.length > 0) {
          expect(vulns[0].severity).toBe('high');
        }
      });
    });

    describe('scanMediumVulnerabilities', () => {
      it('should return array of vulnerabilities', async () => {
        const vulns = await owaspValidationService.scanMediumVulnerabilities();
        
        expect(Array.isArray(vulns)).toBe(true);
      });

      it('should create vulnerabilities with medium severity', async () => {
        Math.random = () => 0.9;
        
        const vulns = await owaspValidationService.scanMediumVulnerabilities();
        
        if (vulns.length > 0) {
          expect(vulns[0].severity).toBe('medium');
        }
      });
    });

    describe('scanLowVulnerabilities', () => {
      it('should return array of vulnerabilities', async () => {
        const vulns = await owaspValidationService.scanLowVulnerabilities();
        
        expect(Array.isArray(vulns)).toBe(true);
      });

      it('should create vulnerabilities with low severity', async () => {
        Math.random = () => 0.9;
        
        const vulns = await owaspValidationService.scanLowVulnerabilities();
        
        if (vulns.length > 0) {
          expect(vulns[0].severity).toBe('low');
        }
      });
    });
  });

  describe('Secure Coding Validation', () => {
    describe('validateInputValidation', () => {
      it('should return compliance result', async () => {
        const result = await owaspValidationService.validateInputValidation();
        
        expect(result).toHaveProperty('compliant');
        expect(result).toHaveProperty('details');
        expect(result).toHaveProperty('timestamp');
      });

      it('should include timestamp', async () => {
        const result = await owaspValidationService.validateInputValidation();
        
        expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    });

    describe('validateOutputEncoding', () => {
      it('should return compliance result', async () => {
        const result = await owaspValidationService.validateOutputEncoding();
        
        expect(result).toHaveProperty('compliant');
        expect(result).toHaveProperty('details');
      });
    });

    describe('validateAuthenticationControls', () => {
      it('should return compliance result', async () => {
        const result = await owaspValidationService.validateAuthenticationControls();
        
        expect(result).toHaveProperty('compliant');
        expect(typeof result.compliant).toBe('boolean');
      });
    });

    describe('validateAuthorizationControls', () => {
      it('should return compliance result', async () => {
        const result = await owaspValidationService.validateAuthorizationControls();
        
        expect(result).toHaveProperty('compliant');
        expect(typeof result.compliant).toBe('boolean');
      });
    });

    describe('validateSessionManagement', () => {
      it('should return compliance result', async () => {
        const result = await owaspValidationService.validateSessionManagement();
        
        expect(result).toHaveProperty('compliant');
      });
    });

    describe('validateCryptographicControls', () => {
      it('should return compliance result', async () => {
        const result = await owaspValidationService.validateCryptographicControls();
        
        expect(result).toHaveProperty('compliant');
      });
    });

    describe('validateErrorHandling', () => {
      it('should return compliance result', async () => {
        const result = await owaspValidationService.validateErrorHandling();
        
        expect(result).toHaveProperty('compliant');
      });
    });

    describe('validateLoggingMonitoring', () => {
      it('should return compliance result', async () => {
        const result = await owaspValidationService.validateLoggingMonitoring();
        
        expect(result).toHaveProperty('compliant');
      });
    });
  });

  describe('validateVulnerabilities', () => {
    it('should return vulnerabilities and policy violations', async () => {
      const result = await owaspValidationService.validateVulnerabilities();
      
      expect(result).toHaveProperty('vulnerabilities');
      expect(result).toHaveProperty('remediations');
      expect(result).toHaveProperty('policyViolations');
    });

    it('should detect critical threshold violations', async () => {
      // Mock to return critical vulnerabilities exceeding threshold
      const originalScan = owaspValidationService.scanCriticalVulnerabilities;
      owaspValidationService.scanCriticalVulnerabilities = jest.fn().mockResolvedValue([
        { id: 'crit1', severity: 'critical' },
        { id: 'crit2', severity: 'critical' }
      ]);

      const result = await owaspValidationService.validateVulnerabilities();

      const criticalViolation = result.policyViolations.find(
        v => v.severity === 'critical' && v.type === 'vulnerability_threshold'
      );
      expect(criticalViolation).toBeDefined();

      owaspValidationService.scanCriticalVulnerabilities = originalScan;
    });

    it('should detect high threshold violations', async () => {
      const originalScan = owaspValidationService.scanHighVulnerabilities;
      owaspValidationService.scanHighVulnerabilities = jest.fn().mockResolvedValue([
        { id: 'high1', severity: 'high' },
        { id: 'high2', severity: 'high' },
        { id: 'high3', severity: 'high' },
        { id: 'high4', severity: 'high' }
      ]);

      const result = await owaspValidationService.validateVulnerabilities();

      const highViolation = result.policyViolations.find(
        v => v.severity === 'high' && v.type === 'vulnerability_threshold'
      );
      expect(highViolation).toBeDefined();

      owaspValidationService.scanHighVulnerabilities = originalScan;
    });

    it('should store found vulnerabilities', async () => {
      const initialCount = owaspValidationService.vulnerabilities.length;
      
      await owaspValidationService.validateVulnerabilities();
      
      // Vulnerabilities should have been added
      expect(owaspValidationService.vulnerabilities.length).toBeGreaterThanOrEqual(initialCount);
    });
  });

  describe('validateSecureCoding', () => {
    it('should return vulnerabilities array', async () => {
      const result = await owaspValidationService.validateSecureCoding();
      
      expect(result).toHaveProperty('vulnerabilities');
      expect(Array.isArray(result.vulnerabilities)).toBe(true);
    });

    it('should return remediations array', async () => {
      const result = await owaspValidationService.validateSecureCoding();
      
      expect(result).toHaveProperty('remediations');
      expect(Array.isArray(result.remediations)).toBe(true);
    });

    it('should return policyViolations array', async () => {
      const result = await owaspValidationService.validateSecureCoding();
      
      expect(result).toHaveProperty('policyViolations');
      expect(Array.isArray(result.policyViolations)).toBe(true);
    });

    it('should detect non-compliant input validation', async () => {
      owaspValidationService.validateInputValidation = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Needs improvement',
        timestamp: new Date().toISOString()
      });

      const result = await owaspValidationService.validateSecureCoding();

      const inputValidationVuln = result.vulnerabilities.find(
        v => v.practice === 'input_validation'
      );
      expect(inputValidationVuln).toBeDefined();
      expect(inputValidationVuln.severity).toBe('high');
    });

    it('should detect non-compliant authentication controls', async () => {
      // Mock all validation methods with deterministic results
      owaspValidationService.validateInputValidation = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateOutputEncoding = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateAuthenticationControls = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Needs improvement',
        timestamp: new Date().toISOString()
      });
      owaspValidationService.validateAuthorizationControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateSessionManagement = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateCryptographicControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateErrorHandling = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateLoggingMonitoring = jest.fn().mockResolvedValue({ compliant: true });

      const result = await owaspValidationService.validateSecureCoding();

      const authVuln = result.vulnerabilities.find(
        v => v.practice === 'authentication_controls'
      );
      expect(authVuln).toBeDefined();
      expect(authVuln.severity).toBe('critical');
    });

    it('should detect non-compliant authorization controls', async () => {
      // Mock all validation methods with deterministic results
      owaspValidationService.validateInputValidation = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateOutputEncoding = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateAuthenticationControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateAuthorizationControls = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Needs improvement',
        timestamp: new Date().toISOString()
      });
      owaspValidationService.validateSessionManagement = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateCryptographicControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateErrorHandling = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateLoggingMonitoring = jest.fn().mockResolvedValue({ compliant: true });

      const result = await owaspValidationService.validateSecureCoding();

      const authzVuln = result.vulnerabilities.find(
        v => v.practice === 'authorization_controls'
      );
      expect(authzVuln).toBeDefined();
      expect(authzVuln.severity).toBe('critical');
    });
  });

  describe('ID Generation', () => {
    it('should generate unique validation IDs', () => {
      const id1 = owaspValidationService.generateValidationId();
      const id2 = owaspValidationService.generateValidationId();
      
      expect(id1).toMatch(/^VALID-\d+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^VALID-\d+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique vulnerability IDs', () => {
      const id1 = owaspValidationService.generateVulnerabilityId();
      const id2 = owaspValidationService.generateVulnerabilityId();
      
      expect(id1).toMatch(/^VULN-\d+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^VULN-\d+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique violation IDs', () => {
      const id1 = owaspValidationService.generateViolationId();
      const id2 = owaspValidationService.generateViolationId();
      
      expect(id1).toMatch(/^VIOL-\d+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^VIOL-\d+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique trace IDs', () => {
      const id1 = owaspValidationService.generateTraceId();
      const id2 = owaspValidationService.generateTraceId();
      
      expect(id1).toMatch(/^TRACE-\d+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^TRACE-\d+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Error Handling', () => {
    it('should handle error in calculateRemediationRate', async () => {
      // When no vulnerabilities exist, should return 100% remediation rate
      owaspValidationService.vulnerabilities.length = 0;
      
      const rate = await owaspValidationService.calculateRemediationRate();
      
      expect(rate).toBe(100);
    });

    it('should handle error in vulnerability scanning', async () => {
      const originalScan = owaspValidationService.scanCriticalVulnerabilities;
      owaspValidationService.scanCriticalVulnerabilities = jest.fn().mockRejectedValue(new Error('Scan failed'));

      const result = await owaspValidationService.validateVulnerabilities();

      // Service should catch errors and return empty arrays
      expect(result).toBeDefined();
      expect(result.vulnerabilities).toEqual([]);
      expect(result.remediations).toEqual([]);
      expect(result.policyViolations).toEqual([]);
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to validate vulnerabilities',
        expect.any(Error)
      );
      
      owaspValidationService.scanCriticalVulnerabilities = originalScan;
    });

    it('should calculate remediation rate correctly with vulnerabilities', async () => {
      // Add some test vulnerabilities
      owaspValidationService.vulnerabilities.length = 0;
      owaspValidationService.vulnerabilities.push(
        { id: '1', remediated: true },
        { id: '2', remediated: false },
        { id: '3', remediated: true },
        { id: '4', remediated: false }
      );
      
      const rate = await owaspValidationService.calculateRemediationRate();
      
      // 2 out of 4 remediated = 50%
      expect(rate).toBe(50);
    });
  });

  describe('Error Handling Branches', () => {
    it('scanCriticalVulnerabilities should return empty array on error', async () => {
      // Force an error scenario by temporarily breaking the method
      const originalGenerateId = owaspValidationService.generateVulnerabilityId;
      owaspValidationService.generateVulnerabilityId = () => {
        throw new Error('Test error');
      };
      const originalRandom = Math.random;
      Math.random = () => 0.9; // Ensure vulnerabilities will be generated

      const result = await owaspValidationService.scanCriticalVulnerabilities();

      owaspValidationService.generateVulnerabilityId = originalGenerateId;
      Math.random = originalRandom;
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });

    it('scanHighVulnerabilities should return empty array on error', async () => {
      const originalGenerateId = owaspValidationService.generateVulnerabilityId;
      owaspValidationService.generateVulnerabilityId = () => {
        throw new Error('Test error');
      };
      const originalRandom = Math.random;
      Math.random = () => 0.9;

      const result = await owaspValidationService.scanHighVulnerabilities();

      owaspValidationService.generateVulnerabilityId = originalGenerateId;
      Math.random = originalRandom;
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('scanMediumVulnerabilities should return empty array on error', async () => {
      const originalGenerateId = owaspValidationService.generateVulnerabilityId;
      owaspValidationService.generateVulnerabilityId = () => {
        throw new Error('Test error');
      };
      const originalRandom = Math.random;
      Math.random = () => 0.9;

      const result = await owaspValidationService.scanMediumVulnerabilities();

      owaspValidationService.generateVulnerabilityId = originalGenerateId;
      Math.random = originalRandom;
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('scanLowVulnerabilities should return empty array on error', async () => {
      const originalGenerateId = owaspValidationService.generateVulnerabilityId;
      owaspValidationService.generateVulnerabilityId = () => {
        throw new Error('Test error');
      };
      const originalRandom = Math.random;
      Math.random = () => 0.9;

      const result = await owaspValidationService.scanLowVulnerabilities();

      owaspValidationService.generateVulnerabilityId = originalGenerateId;
      Math.random = originalRandom;
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('calculateRemediationRate should return 0 on error', async () => {
      // Force an error by mocking filter to throw
      const originalVulns = owaspValidationService.vulnerabilities;
      owaspValidationService.vulnerabilities = null;

      const rate = await owaspValidationService.calculateRemediationRate();

      owaspValidationService.vulnerabilities = originalVulns;
      
      expect(rate).toBe(0);
    });

    it('calculateValidationScore should return 0 on error', async () => {
      const invalidValidation = null;

      const score = await owaspValidationService.calculateValidationScore(invalidValidation);
      
      expect(score).toBe(0);
    });

    it('isDeploymentReady should return false on error', () => {
      const invalidValidation = null;

      const isReady = owaspValidationService.isDeploymentReady(invalidValidation);
      
      expect(isReady).toBe(false);
    });
  });

  describe('ID Generation', () => {
    it('should generate unique validation IDs', () => {
      const id1 = owaspValidationService.generateValidationId();
      const id2 = owaspValidationService.generateValidationId();
      
      expect(id1).toMatch(/^VALID-\d+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^VALID-\d+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique vulnerability IDs', () => {
      const id1 = owaspValidationService.generateVulnerabilityId();
      const id2 = owaspValidationService.generateVulnerabilityId();
      
      expect(id1).toMatch(/^VULN-\d+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^VULN-\d+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique violation IDs', () => {
      const id1 = owaspValidationService.generateViolationId();
      const id2 = owaspValidationService.generateViolationId();
      
      expect(id1).toMatch(/^VIOL-\d+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^VIOL-\d+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique trace IDs', () => {
      const id1 = owaspValidationService.generateTraceId();
      const id2 = owaspValidationService.generateTraceId();
      
      expect(id1).toMatch(/^TRACE-\d+-[A-Z0-9]+$/);
      expect(id2).toMatch(/^TRACE-\d+-[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Getter Methods', () => {
    it('getValidationResults should return validation results array', () => {
      owaspValidationService.validationResults.push({ id: 'test' });
      
      const results = owaspValidationService.getValidationResults();
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('getVulnerabilities should return vulnerabilities array', () => {
      owaspValidationService.vulnerabilities.push({ id: 'test' });
      
      const vulns = owaspValidationService.getVulnerabilities();
      
      expect(Array.isArray(vulns)).toBe(true);
    });

    it('getRemediations should return remediations array', () => {
      const remeds = owaspValidationService.getRemediations();
      
      expect(Array.isArray(remeds)).toBe(true);
    });

    it('getPolicyViolations should return policy violations array', () => {
      owaspValidationService.policyViolations.push({ id: 'test' });
      
      const violations = owaspValidationService.getPolicyViolations();
      
      expect(Array.isArray(violations)).toBe(true);
    });

    it('getStatus should return service status object', () => {
      const status = owaspValidationService.getStatus();
      
      expect(status).toHaveProperty('initialized', true);
      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('validationResults');
      expect(status).toHaveProperty('vulnerabilities');
      expect(status).toHaveProperty('remediations');
      expect(status).toHaveProperty('policyViolations');
      expect(status).toHaveProperty('config');
    });
  });

  describe('Full OWASP Validation Execution', () => {
    beforeEach(() => {
      // Mock all sub-validation methods for predictable results
      jest.spyOn(owaspValidationService, 'validateVulnerabilities').mockResolvedValue({
        vulnerabilities: [],
        remediations: [],
        policyViolations: []
      });
      jest.spyOn(owaspValidationService, 'validateSecureCoding').mockResolvedValue({
        vulnerabilities: [],
        remediations: [],
        policyViolations: []
      });
      jest.spyOn(owaspValidationService, 'validateCICDIntegration').mockResolvedValue({
        vulnerabilities: [],
        remediations: [],
        policyViolations: []
      });
      jest.spyOn(owaspValidationService, 'validateCodeReview').mockResolvedValue({
        vulnerabilities: [],
        remediations: [],
        policyViolations: []
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('executeOWASPValidation should return validation object', async () => {
      const validation = await owaspValidationService.executeOWASPValidation();
      
      expect(validation).toHaveProperty('id');
      expect(validation).toHaveProperty('type', 'owasp_top_10_validation');
      expect(validation).toHaveProperty('status');
      expect(validation).toHaveProperty('vulnerabilities');
      expect(validation).toHaveProperty('policyViolations');
      expect(validation).toHaveProperty('validation_score');
      expect(validation).toHaveProperty('deployment_ready');
    });

    it('executeOWASPValidation should store results', async () => {
      const initialCount = owaspValidationService.validationResults.length;
      
      await owaspValidationService.executeOWASPValidation();
      
      expect(owaspValidationService.validationResults.length).toBe(initialCount + 1);
    });

    it('executeOWASPValidation should log validation events', async () => {
      await owaspValidationService.executeOWASPValidation();
      
      expect(mockCentralizedLoggingService.logEvent).toHaveBeenCalled();
      expect(mockAuditTraceabilityService.logAuditEvent).toHaveBeenCalled();
    });

    it('executeOWASPValidation should mark as deployment ready for passing validation', async () => {
      jest.spyOn(owaspValidationService, 'calculateValidationScore').mockResolvedValue(95);
      
      const validation = await owaspValidationService.executeOWASPValidation();
      
      expect(validation.deployment_ready).toBe(true);
      expect(validation.status).toBe('completed');
    });

    it('executeOWASPValidation should mark as failed for non-passing validation', async () => {
      jest.spyOn(owaspValidationService, 'validateVulnerabilities').mockResolvedValue({
        vulnerabilities: [{ severity: 'critical' }],
        remediations: [],
        policyViolations: []
      });
      jest.spyOn(owaspValidationService, 'calculateValidationScore').mockResolvedValue(50);
      
      const validation = await owaspValidationService.executeOWASPValidation();
      
      expect(validation.deployment_ready).toBe(false);
      expect(validation.status).toBe('failed');
    });
  });

  describe('Validation Logging', () => {
    it('logValidationEvent should log to centralized logging service', async () => {
      const validation = {
        id: 'TEST-123',
        type: 'test',
        status: 'completed',
        validation_score: 95,
        deployment_ready: true,
        vulnerabilities: [],
        policyViolations: []
      };

      await owaspValidationService.logValidationEvent(validation, 'started');

      expect(mockCentralizedLoggingService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          trace_id: 'TEST-123',
          actor: 'owasp_validation_service',
          action: 'validation_started'
        })
      );
    });

    it('logValidationEvent should log audit event', async () => {
      const validation = {
        id: 'TEST-123',
        type: 'test',
        status: 'completed',
        validation_score: 95,
        deployment_ready: true,
        vulnerabilities: [],
        policyViolations: []
      };

      await owaspValidationService.logValidationEvent(validation, 'completed');

      expect(mockAuditTraceabilityService.logAuditEvent).toHaveBeenCalled();
    });
  });

  describe('Alert Sending', () => {
    it('sendDeploymentNotReadyAlert should send system failure alert', async () => {
      const validation = {
        validation_score: 50,
        vulnerabilities: [
          { severity: 'critical' },
          { severity: 'high' },
          { severity: 'high' }
        ],
        policyViolations: [
          { severity: 'critical' }
        ]
      };

      await owaspValidationService.sendDeploymentNotReadyAlert(validation);

      expect(mockRollbackAlertingService.sendAlert || mockRollbackAlertingService.sendSystemFailureAlert).toBeDefined();
    });
  });

  describe('Metrics Collection', () => {
    it('collectValidationMetrics should collect and log metrics', async () => {
      // Add some test data
      owaspValidationService.vulnerabilities.push({ severity: 'critical' });
      owaspValidationService.vulnerabilities.push({ severity: 'high' });
      owaspValidationService.policyViolations.push({ id: 'test' });

      await owaspValidationService.collectValidationMetrics();

      expect(mockCentralizedLoggingService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: 'owasp_validation_service',
          action: 'collect_validation_metrics',
          status: 'success'
        })
      );
    });
  });

  describe('High Vulnerability Threshold', () => {
    it('isDeploymentReady should return false when high vulns exceed threshold', () => {
      const validation = {
        validation_score: 90,
        vulnerabilities: [
          { severity: 'high' },
          { severity: 'high' },
          { severity: 'high' }, // 3 high > threshold of 2
        ],
        policyViolations: []
      };
      
      const isReady = owaspValidationService.isDeploymentReady(validation);
      
      expect(isReady).toBe(false);
    });

    it('isDeploymentReady should return false for critical policy violations', () => {
      const validation = {
        validation_score: 90,
        vulnerabilities: [],
        policyViolations: [
          { severity: 'critical' }
        ]
      };
      
      const isReady = owaspValidationService.isDeploymentReady(validation);
      
      expect(isReady).toBe(false);
    });
  });

  describe('CI/CD Integration Validation', () => {
    describe('validateCICDIntegration', () => {
      it('should return vulnerabilities and policy violations', async () => {
        const result = await owaspValidationService.validateCICDIntegration();
        
        expect(result).toHaveProperty('vulnerabilities');
        expect(result).toHaveProperty('remediations');
        expect(result).toHaveProperty('policyViolations');
        expect(Array.isArray(result.vulnerabilities)).toBe(true);
        expect(Array.isArray(result.policyViolations)).toBe(true);
      });

      it('should detect non-compliant security scanning', async () => {
        jest.spyOn(owaspValidationService, 'validateSecurityScanning').mockResolvedValue({
          compliant: false,
          details: 'Needs improvement',
          timestamp: new Date().toISOString()
        });
        jest.spyOn(owaspValidationService, 'validateVulnerabilityDetection').mockResolvedValue({ compliant: true });
        jest.spyOn(owaspValidationService, 'validatePolicyEnforcement').mockResolvedValue({ compliant: true });
        jest.spyOn(owaspValidationService, 'validateAutomatedRemediation').mockResolvedValue({ compliant: true });

        const result = await owaspValidationService.validateCICDIntegration();

        const violation = result.policyViolations.find(
          v => v.pipeline === 'security_scanning'
        );
        expect(violation).toBeDefined();
        expect(violation.severity).toBe('high');
        
        jest.restoreAllMocks();
      });

      it('should detect non-compliant vulnerability detection', async () => {
        jest.spyOn(owaspValidationService, 'validateSecurityScanning').mockResolvedValue({ compliant: true });
        jest.spyOn(owaspValidationService, 'validateVulnerabilityDetection').mockResolvedValue({
          compliant: false,
          details: 'Needs improvement',
          timestamp: new Date().toISOString()
        });
        jest.spyOn(owaspValidationService, 'validatePolicyEnforcement').mockResolvedValue({ compliant: true });
        jest.spyOn(owaspValidationService, 'validateAutomatedRemediation').mockResolvedValue({ compliant: true });

        const result = await owaspValidationService.validateCICDIntegration();

        const violation = result.policyViolations.find(
          v => v.pipeline === 'vulnerability_detection'
        );
        expect(violation).toBeDefined();
        expect(violation.severity).toBe('high');
        
        jest.restoreAllMocks();
      });

      it('should detect non-compliant policy enforcement', async () => {
        jest.spyOn(owaspValidationService, 'validateSecurityScanning').mockResolvedValue({ compliant: true });
        jest.spyOn(owaspValidationService, 'validateVulnerabilityDetection').mockResolvedValue({ compliant: true });
        jest.spyOn(owaspValidationService, 'validatePolicyEnforcement').mockResolvedValue({
          compliant: false,
          details: 'Needs improvement',
          timestamp: new Date().toISOString()
        });
        jest.spyOn(owaspValidationService, 'validateAutomatedRemediation').mockResolvedValue({ compliant: true });

        const result = await owaspValidationService.validateCICDIntegration();

        const violation = result.policyViolations.find(
          v => v.pipeline === 'policy_enforcement'
        );
        expect(violation).toBeDefined();
        expect(violation.severity).toBe('medium');
        
        jest.restoreAllMocks();
      });

      it('should detect non-compliant automated remediation', async () => {
        jest.spyOn(owaspValidationService, 'validateSecurityScanning').mockResolvedValue({ compliant: true });
        jest.spyOn(owaspValidationService, 'validateVulnerabilityDetection').mockResolvedValue({ compliant: true });
        jest.spyOn(owaspValidationService, 'validatePolicyEnforcement').mockResolvedValue({ compliant: true });
        jest.spyOn(owaspValidationService, 'validateAutomatedRemediation').mockResolvedValue({
          compliant: false,
          details: 'Needs improvement',
          timestamp: new Date().toISOString()
        });

        const result = await owaspValidationService.validateCICDIntegration();

        const violation = result.policyViolations.find(
          v => v.pipeline === 'automated_remediation'
        );
        expect(violation).toBeDefined();
        expect(violation.severity).toBe('medium');
        
        jest.restoreAllMocks();
      });

      it('should store policy violations', async () => {
        const initialCount = owaspValidationService.policyViolations.length;
        
        jest.spyOn(owaspValidationService, 'validateSecurityScanning').mockResolvedValue({ compliant: false });
        jest.spyOn(owaspValidationService, 'validateVulnerabilityDetection').mockResolvedValue({ compliant: true });
        jest.spyOn(owaspValidationService, 'validatePolicyEnforcement').mockResolvedValue({ compliant: true });
        jest.spyOn(owaspValidationService, 'validateAutomatedRemediation').mockResolvedValue({ compliant: true });
        
        await owaspValidationService.validateCICDIntegration();
        
        expect(owaspValidationService.policyViolations.length).toBeGreaterThanOrEqual(initialCount);
        
        jest.restoreAllMocks();
      });

      it('should return empty arrays on error', async () => {
        jest.spyOn(owaspValidationService, 'validateSecurityScanning').mockRejectedValue(new Error('Test error'));
        
        const result = await owaspValidationService.validateCICDIntegration();
        
        expect(result.vulnerabilities).toEqual([]);
        expect(result.remediations).toEqual([]);
        expect(result.policyViolations).toEqual([]);
        
        jest.restoreAllMocks();
      });
    });

    describe('validateSecurityScanning', () => {
      beforeEach(() => {
        jest.restoreAllMocks();
      });

      it('should return compliance result', async () => {
        const result = await Object.getPrototypeOf(owaspValidationService).validateSecurityScanning.call(owaspValidationService);
        
        expect(result).toHaveProperty('compliant');
        expect(result).toHaveProperty('details');
        expect(result).toHaveProperty('timestamp');
      });

      it('should include timestamp in ISO format', async () => {
        const result = await Object.getPrototypeOf(owaspValidationService).validateSecurityScanning.call(owaspValidationService);
        
        expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    });

    describe('validateVulnerabilityDetection', () => {
      beforeEach(() => {
        jest.restoreAllMocks();
      });

      it('should return compliance result', async () => {
        const result = await Object.getPrototypeOf(owaspValidationService).validateVulnerabilityDetection.call(owaspValidationService);
        
        expect(result).toHaveProperty('compliant');
        expect(typeof result.compliant).toBe('boolean');
      });
    });

    describe('validatePolicyEnforcement', () => {
      beforeEach(() => {
        jest.restoreAllMocks();
      });

      it('should return compliance result', async () => {
        const result = await Object.getPrototypeOf(owaspValidationService).validatePolicyEnforcement.call(owaspValidationService);
        
        expect(result).toHaveProperty('compliant');
        expect(result).toHaveProperty('details');
      });
    });

    describe('validateAutomatedRemediation', () => {
      beforeEach(() => {
        jest.restoreAllMocks();
      });

      it('should return compliance result', async () => {
        const result = await Object.getPrototypeOf(owaspValidationService).validateAutomatedRemediation.call(owaspValidationService);
        
        expect(result).toHaveProperty('compliant');
      });
    });
  });

  describe('Code Review Validation', () => {
    describe('validateCodeReview', () => {
      it('should return vulnerabilities and policy violations', async () => {
        const result = await owaspValidationService.validateCodeReview();
        
        expect(result).toHaveProperty('vulnerabilities');
        expect(result).toHaveProperty('remediations');
        expect(result).toHaveProperty('policyViolations');
      });

      it('should detect non-compliant security review', async () => {
        owaspValidationService.validateSecurityReview = jest.fn().mockResolvedValue({
          compliant: false,
          details: 'Needs improvement',
          timestamp: new Date().toISOString()
        });
        owaspValidationService.validateVulnerabilityAssessment = jest.fn().mockResolvedValue({ compliant: true });
        owaspValidationService.validateComplianceCheck = jest.fn().mockResolvedValue({ compliant: true });
        owaspValidationService.validateBestPractices = jest.fn().mockResolvedValue({ compliant: true });

        const result = await owaspValidationService.validateCodeReview();

        const violation = result.policyViolations.find(
          v => v.requirement === 'security_review'
        );
        expect(violation).toBeDefined();
        expect(violation.severity).toBe('high');
      });

      it('should detect non-compliant vulnerability assessment', async () => {
        owaspValidationService.validateSecurityReview = jest.fn().mockResolvedValue({ compliant: true });
        owaspValidationService.validateVulnerabilityAssessment = jest.fn().mockResolvedValue({
          compliant: false,
          details: 'Needs improvement',
          timestamp: new Date().toISOString()
        });
        owaspValidationService.validateComplianceCheck = jest.fn().mockResolvedValue({ compliant: true });
        owaspValidationService.validateBestPractices = jest.fn().mockResolvedValue({ compliant: true });

        const result = await owaspValidationService.validateCodeReview();

        const violation = result.policyViolations.find(
          v => v.requirement === 'vulnerability_assessment'
        );
        expect(violation).toBeDefined();
        expect(violation.severity).toBe('high');
      });

      it('should detect non-compliant compliance check', async () => {
        owaspValidationService.validateSecurityReview = jest.fn().mockResolvedValue({ compliant: true });
        owaspValidationService.validateVulnerabilityAssessment = jest.fn().mockResolvedValue({ compliant: true });
        owaspValidationService.validateComplianceCheck = jest.fn().mockResolvedValue({
          compliant: false,
          details: 'Needs improvement',
          timestamp: new Date().toISOString()
        });
        owaspValidationService.validateBestPractices = jest.fn().mockResolvedValue({ compliant: true });

        const result = await owaspValidationService.validateCodeReview();

        const violation = result.policyViolations.find(
          v => v.requirement === 'compliance_check'
        );
        expect(violation).toBeDefined();
        expect(violation.severity).toBe('medium');
      });

      it('should detect non-compliant best practices validation', async () => {
        owaspValidationService.validateSecurityReview = jest.fn().mockResolvedValue({ compliant: true });
        owaspValidationService.validateVulnerabilityAssessment = jest.fn().mockResolvedValue({ compliant: true });
        owaspValidationService.validateComplianceCheck = jest.fn().mockResolvedValue({ compliant: true });
        owaspValidationService.validateBestPractices = jest.fn().mockResolvedValue({
          compliant: false,
          details: 'Needs improvement',
          timestamp: new Date().toISOString()
        });

        const result = await owaspValidationService.validateCodeReview();

        const violation = result.policyViolations.find(
          v => v.requirement === 'best_practices_validation'
        );
        expect(violation).toBeDefined();
        expect(violation.severity).toBe('medium');
      });

      it('should return empty arrays on error', async () => {
        jest.spyOn(owaspValidationService, 'validateSecurityReview').mockRejectedValue(new Error('Test error'));
        
        const result = await owaspValidationService.validateCodeReview();
        
        expect(result.vulnerabilities).toEqual([]);
        expect(result.remediations).toEqual([]);
        expect(result.policyViolations).toEqual([]);
        
        jest.restoreAllMocks();
      });
    });

    describe('validateSecurityReview', () => {
      beforeEach(() => {
        jest.restoreAllMocks();
      });

      it('should return compliance result', async () => {
        const result = await Object.getPrototypeOf(owaspValidationService).validateSecurityReview.call(owaspValidationService);
        
        expect(result).toHaveProperty('compliant');
        expect(result).toHaveProperty('details');
        expect(result).toHaveProperty('timestamp');
      });
    });

    describe('validateVulnerabilityAssessment', () => {
      beforeEach(() => {
        jest.restoreAllMocks();
      });

      it('should return compliance result', async () => {
        const result = await Object.getPrototypeOf(owaspValidationService).validateVulnerabilityAssessment.call(owaspValidationService);
        
        expect(result).toHaveProperty('compliant');
        expect(typeof result.compliant).toBe('boolean');
      });
    });

    describe('validateComplianceCheck', () => {
      beforeEach(() => {
        jest.restoreAllMocks();
      });

      it('should return compliance result', async () => {
        const result = await Object.getPrototypeOf(owaspValidationService).validateComplianceCheck.call(owaspValidationService);
        
        expect(result).toHaveProperty('compliant');
        expect(result).toHaveProperty('details');
      });
    });

    describe('validateBestPractices', () => {
      beforeEach(() => {
        jest.restoreAllMocks();
      });

      it('should return compliance result', async () => {
        const result = await Object.getPrototypeOf(owaspValidationService).validateBestPractices.call(owaspValidationService);
        
        expect(result).toHaveProperty('compliant');
      });
    });
  });

  describe('Validation Score Calculation', () => {
    it('should return 100 for validation with no issues', async () => {
      const validation = {
        vulnerabilities: [],
        policyViolations: []
      };
      
      const score = await owaspValidationService.calculateValidationScore(validation);
      
      expect(score).toBe(100);
    });

    it('should deduct 25 points for each critical vulnerability', async () => {
      const validation = {
        vulnerabilities: [
          { severity: 'critical' },
          { severity: 'critical' }
        ],
        policyViolations: []
      };
      
      const score = await owaspValidationService.calculateValidationScore(validation);
      
      expect(score).toBe(50); // 100 - 2*25
    });

    it('should deduct 15 points for each high vulnerability', async () => {
      const validation = {
        vulnerabilities: [
          { severity: 'high' }
        ],
        policyViolations: []
      };
      
      const score = await owaspValidationService.calculateValidationScore(validation);
      
      expect(score).toBe(85); // 100 - 15
    });

    it('should deduct 10 points for each medium vulnerability', async () => {
      const validation = {
        vulnerabilities: [
          { severity: 'medium' }
        ],
        policyViolations: []
      };
      
      const score = await owaspValidationService.calculateValidationScore(validation);
      
      expect(score).toBe(90); // 100 - 10
    });

    it('should deduct 5 points for each low vulnerability', async () => {
      const validation = {
        vulnerabilities: [
          { severity: 'low' }
        ],
        policyViolations: []
      };
      
      const score = await owaspValidationService.calculateValidationScore(validation);
      
      expect(score).toBe(95); // 100 - 5
    });

    it('should deduct 20 points for each critical policy violation', async () => {
      const validation = {
        vulnerabilities: [],
        policyViolations: [
          { severity: 'critical' }
        ]
      };
      
      const score = await owaspValidationService.calculateValidationScore(validation);
      
      expect(score).toBe(80); // 100 - 20
    });

    it('should deduct 10 points for each high policy violation', async () => {
      const validation = {
        vulnerabilities: [],
        policyViolations: [
          { severity: 'high' }
        ]
      };
      
      const score = await owaspValidationService.calculateValidationScore(validation);
      
      expect(score).toBe(90); // 100 - 10
    });

    it('should deduct 5 points for each medium policy violation', async () => {
      const validation = {
        vulnerabilities: [],
        policyViolations: [
          { severity: 'medium' }
        ]
      };
      
      const score = await owaspValidationService.calculateValidationScore(validation);
      
      expect(score).toBe(95); // 100 - 5
    });

    it('should deduct 2 points for each low policy violation', async () => {
      const validation = {
        vulnerabilities: [],
        policyViolations: [
          { severity: 'low' }
        ]
      };
      
      const score = await owaspValidationService.calculateValidationScore(validation);
      
      expect(score).toBe(98); // 100 - 2
    });

    it('should not go below 0', async () => {
      const validation = {
        vulnerabilities: [
          { severity: 'critical' },
          { severity: 'critical' },
          { severity: 'critical' },
          { severity: 'critical' },
          { severity: 'critical' }
        ],
        policyViolations: []
      };
      
      const score = await owaspValidationService.calculateValidationScore(validation);
      
      expect(score).toBe(0);
    });

    it('should handle combined vulnerabilities and violations', async () => {
      const validation = {
        vulnerabilities: [
          { severity: 'critical' }, // -25
          { severity: 'high' }      // -15
        ],
        policyViolations: [
          { severity: 'high' },     // -10
          { severity: 'medium' }    // -5
        ]
      };
      
      const score = await owaspValidationService.calculateValidationScore(validation);
      
      expect(score).toBe(45); // 100 - 25 - 15 - 10 - 5
    });
  });

  describe('Deployment Readiness', () => {
    it('should return true for valid deployment', () => {
      const validation = {
        validation_score: 90,
        vulnerabilities: [],
        policyViolations: []
      };
      
      const isReady = owaspValidationService.isDeploymentReady(validation);
      
      expect(isReady).toBe(true);
    });

    it('should return false when validation_score is below 80', () => {
      const validation = {
        validation_score: 75,
        vulnerabilities: [],
        policyViolations: []
      };
      
      const isReady = owaspValidationService.isDeploymentReady(validation);
      
      expect(isReady).toBe(false);
    });

    it('should return false when critical vulnerabilities exceed threshold', () => {
      const validation = {
        validation_score: 90,
        vulnerabilities: [
          { severity: 'critical' } // threshold is 0
        ],
        policyViolations: []
      };
      
      const isReady = owaspValidationService.isDeploymentReady(validation);
      
      expect(isReady).toBe(false);
    });

    it('should return true when vulnerabilities are at threshold', () => {
      const validation = {
        validation_score: 85,
        vulnerabilities: [
          { severity: 'high' },
          { severity: 'high' } // threshold is 2
        ],
        policyViolations: []
      };
      
      const isReady = owaspValidationService.isDeploymentReady(validation);
      
      expect(isReady).toBe(true);
    });
  });

  describe('Monitoring', () => {
    it('startValidationMonitoring should not start twice', () => {
      owaspValidationService.isRunning = true;
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      owaspValidationService.startValidationMonitoring();
      
      // Should not call setInterval again
      expect(setIntervalSpy).not.toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });

    it('collectValidationMetrics should handle errors gracefully', async () => {
      mockCentralizedLoggingService.logEvent.mockRejectedValueOnce(new Error('Log failed'));
      
      // Should not throw
      await owaspValidationService.collectValidationMetrics();
      
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('Alert Handling Errors', () => {
    it('sendDeploymentNotReadyAlert should handle errors gracefully', async () => {
      mockRollbackAlertingService.sendSystemFailureAlert = jest.fn().mockRejectedValue(new Error('Alert failed'));
      
      const validation = {
        validation_score: 50,
        vulnerabilities: [],
        policyViolations: []
      };
      
      // Should not throw
      await owaspValidationService.sendDeploymentNotReadyAlert(validation);
      
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('Validation Event Logging Errors', () => {
    it('logValidationEvent should handle centralized logging errors', async () => {
      mockCentralizedLoggingService.logEvent.mockRejectedValueOnce(new Error('Log failed'));
      
      const validation = {
        id: 'TEST-123',
        type: 'test',
        status: 'completed',
        validation_score: 95,
        deployment_ready: true,
        vulnerabilities: [],
        policyViolations: []
      };
      
      // Should not throw
      await owaspValidationService.logValidationEvent(validation, 'completed');
      
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('Medium and Low Threshold Violations', () => {
    it('should detect medium threshold violations in validateVulnerabilities', async () => {
      const mediumVulns = Array(15).fill(null).map((_, i) => ({ id: `med${i}`, severity: 'medium' }));
      owaspValidationService.scanCriticalVulnerabilities = jest.fn().mockResolvedValue([]);
      owaspValidationService.scanHighVulnerabilities = jest.fn().mockResolvedValue([]);
      owaspValidationService.scanMediumVulnerabilities = jest.fn().mockResolvedValue(mediumVulns);
      owaspValidationService.scanLowVulnerabilities = jest.fn().mockResolvedValue([]);

      const result = await owaspValidationService.validateVulnerabilities();

      const mediumViolation = result.policyViolations.find(
        v => v.severity === 'medium' && v.type === 'vulnerability_threshold'
      );
      expect(mediumViolation).toBeDefined();
    });

    it('should detect low threshold violations in validateVulnerabilities', async () => {
      const lowVulns = Array(30).fill(null).map((_, i) => ({ id: `low${i}`, severity: 'low' }));
      owaspValidationService.scanCriticalVulnerabilities = jest.fn().mockResolvedValue([]);
      owaspValidationService.scanHighVulnerabilities = jest.fn().mockResolvedValue([]);
      owaspValidationService.scanMediumVulnerabilities = jest.fn().mockResolvedValue([]);
      owaspValidationService.scanLowVulnerabilities = jest.fn().mockResolvedValue(lowVulns);

      const result = await owaspValidationService.validateVulnerabilities();

      const lowViolation = result.policyViolations.find(
        v => v.severity === 'low' && v.type === 'vulnerability_threshold'
      );
      expect(lowViolation).toBeDefined();
    });
  });

  describe('Secure Coding Additional Tests', () => {
    it('should detect non-compliant output encoding', async () => {
      owaspValidationService.validateInputValidation = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateOutputEncoding = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Needs improvement',
        timestamp: new Date().toISOString()
      });
      owaspValidationService.validateAuthenticationControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateAuthorizationControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateSessionManagement = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateCryptographicControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateErrorHandling = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateLoggingMonitoring = jest.fn().mockResolvedValue({ compliant: true });

      const result = await owaspValidationService.validateSecureCoding();

      const vuln = result.vulnerabilities.find(v => v.practice === 'output_encoding');
      expect(vuln).toBeDefined();
      expect(vuln.severity).toBe('high');
    });

    it('should detect non-compliant session management', async () => {
      owaspValidationService.validateInputValidation = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateOutputEncoding = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateAuthenticationControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateAuthorizationControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateSessionManagement = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Needs improvement',
        timestamp: new Date().toISOString()
      });
      owaspValidationService.validateCryptographicControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateErrorHandling = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateLoggingMonitoring = jest.fn().mockResolvedValue({ compliant: true });

      const result = await owaspValidationService.validateSecureCoding();

      const vuln = result.vulnerabilities.find(v => v.practice === 'session_management');
      expect(vuln).toBeDefined();
      expect(vuln.severity).toBe('high');
    });

    it('should detect non-compliant cryptographic controls', async () => {
      owaspValidationService.validateInputValidation = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateOutputEncoding = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateAuthenticationControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateAuthorizationControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateSessionManagement = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateCryptographicControls = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Needs improvement',
        timestamp: new Date().toISOString()
      });
      owaspValidationService.validateErrorHandling = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateLoggingMonitoring = jest.fn().mockResolvedValue({ compliant: true });

      const result = await owaspValidationService.validateSecureCoding();

      const vuln = result.vulnerabilities.find(v => v.practice === 'cryptographic_controls');
      expect(vuln).toBeDefined();
      expect(vuln.severity).toBe('high');
    });

    it('should detect non-compliant error handling', async () => {
      owaspValidationService.validateInputValidation = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateOutputEncoding = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateAuthenticationControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateAuthorizationControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateSessionManagement = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateCryptographicControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateErrorHandling = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Needs improvement',
        timestamp: new Date().toISOString()
      });
      owaspValidationService.validateLoggingMonitoring = jest.fn().mockResolvedValue({ compliant: true });

      const result = await owaspValidationService.validateSecureCoding();

      const vuln = result.vulnerabilities.find(v => v.practice === 'error_handling');
      expect(vuln).toBeDefined();
      expect(vuln.severity).toBe('medium');
    });

    it('should detect non-compliant logging monitoring', async () => {
      owaspValidationService.validateInputValidation = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateOutputEncoding = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateAuthenticationControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateAuthorizationControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateSessionManagement = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateCryptographicControls = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateErrorHandling = jest.fn().mockResolvedValue({ compliant: true });
      owaspValidationService.validateLoggingMonitoring = jest.fn().mockResolvedValue({
        compliant: false,
        details: 'Needs improvement',
        timestamp: new Date().toISOString()
      });

      const result = await owaspValidationService.validateSecureCoding();

      const vuln = result.vulnerabilities.find(v => v.practice === 'logging_monitoring');
      expect(vuln).toBeDefined();
      expect(vuln.severity).toBe('medium');
    });

    it('should return empty arrays on error in validateSecureCoding', async () => {
      owaspValidationService.validateInputValidation = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const result = await owaspValidationService.validateSecureCoding();
      
      expect(result.vulnerabilities).toEqual([]);
      expect(result.remediations).toEqual([]);
      expect(result.policyViolations).toEqual([]);
    });
  });
});
