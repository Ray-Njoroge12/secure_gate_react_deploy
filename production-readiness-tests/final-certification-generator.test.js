/**
 * Final Certification Generator Tests
 * 
 * Comprehensive unit tests for the final certification and sign-off system.
 */

import { jest } from '@jest/globals';
import FinalCertificationGenerator from './final-certification-generator.js';
import fs from 'fs/promises';
import crypto from 'crypto';

// Mock fs operations
jest.mock('fs/promises');

describe('FinalCertificationGenerator', () => {
  let generator;
  let mockValidationResults;

  beforeEach(() => {
    generator = new FinalCertificationGenerator({
      outputDir: '/test/output',
      certificationId: 'TEST-CERT-001',
      validityPeriod: 30
    });

    mockValidationResults = {
      user_functionality: {
        passed: 95,
        failed: 5,
        details: ['All user roles tested'],
        critical_issues: []
      },
      vulnerability_scan: {
        vulnerabilities: [],
        critical_vulnerabilities: [],
        remediation_status: 'complete'
      },
      load_testing: {
        metrics: { response_time: 150 },
        benchmarks: { max_response_time: 200 },
        threshold_violations: []
      },
      gdpr_compliance: {
        requirements_met: 25,
        total_requirements: 25,
        non_compliance_issues: []
      },
      guard_mobile_app: {
        platforms_tested: ['iOS', 'Android'],
        devices_tested: ['iPhone', 'Samsung'],
        compatibility_issues: []
      },
      deployment_readiness: {
        checks_passed: 20,
        total_checks: 20,
        failed_checks: []
      }
    };

    // Mock fs operations
    fs.mkdir.mockResolvedValue();
    fs.writeFile.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with default options', () => {
      const defaultGenerator = new FinalCertificationGenerator();
      
      expect(defaultGenerator.options.validityPeriod).toBe(90);
      expect(defaultGenerator.options.certificationId).toBeDefined();
      expect(defaultGenerator.thresholds.overallReadiness).toBe(95);
    });

    test('should initialize with custom options', () => {
      const customGenerator = new FinalCertificationGenerator({
        validityPeriod: 60,
        certificationId: 'CUSTOM-001'
      });
      
      expect(customGenerator.options.validityPeriod).toBe(60);
      expect(customGenerator.options.certificationId).toBe('CUSTOM-001');
    });

    test('should initialize certification categories', () => {
      expect(generator.certificationCategories).toHaveLength(6);
      expect(generator.certificationCategories).toContain('technical_readiness');
      expect(generator.certificationCategories).toContain('security_clearance');
    });
  });

  describe('generateFinalCertification', () => {
    test('should generate complete final certification', async () => {
      const result = await generator.generateFinalCertification(mockValidationResults);
      
      expect(result).toHaveProperty('certificationId');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('certifications');
      expect(result).toHaveProperty('executiveSummary');
      expect(result).toHaveProperty('deploymentAuthorization');
      expect(result).toHaveProperty('auditTrail');
    });

    test('should log audit events during certification', async () => {
      await generator.generateFinalCertification(mockValidationResults);
      
      expect(generator.auditTrail).toHaveLength(2); // start and complete events
      expect(generator.auditTrail[0].event_type).toBe('certification_started');
      expect(generator.auditTrail[1].event_type).toBe('certification_completed');
    });

    test('should handle certification failure', async () => {
      const invalidResults = { invalid: 'data' };
      
      await expect(generator.generateFinalCertification(invalidResults))
        .rejects.toThrow();
      
      const failureEvent = generator.auditTrail.find(e => e.event_type === 'certification_failed');
      expect(failureEvent).toBeDefined();
    });

    test('should save certification documents to files', async () => {
      await generator.generateFinalCertification(mockValidationResults);
      
      expect(fs.mkdir).toHaveBeenCalledWith('/test/output', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledTimes(6); // Main + 5 individual documents
    });
  });

  describe('processValidationResults', () => {
    test('should process all validation categories', async () => {
      const processed = await generator.processValidationResults(mockValidationResults);
      
      expect(processed).toHaveProperty('technical_readiness');
      expect(processed).toHaveProperty('security_clearance');
      expect(processed).toHaveProperty('performance_compliance');
      expect(processed).toHaveProperty('regulatory_compliance');
      expect(processed).toHaveProperty('mobile_validation');
      expect(processed).toHaveProperty('infrastructure_readiness');
    });

    test('should store results in certification results map', async () => {
      await generator.processValidationResults(mockValidationResults);
      
      expect(generator.certificationResults.size).toBe(6);
      expect(generator.certificationResults.has('technical_readiness')).toBe(true);
    });
  });

  describe('processTechnicalReadiness', () => {
    test('should process technical readiness with passing results', () => {
      const result = generator.processTechnicalReadiness(mockValidationResults);
      
      expect(result.category).toBe('Technical Readiness');
      expect(result.score).toBeGreaterThan(90);
      expect(result.passed).toBe(true);
      expect(result.critical_issues).toHaveLength(0);
    });

    test('should handle failing technical readiness', () => {
      const failingResults = {
        user_functionality: {
          passed: 50,
          failed: 50,
          critical_issues: ['Critical authentication bug']
        }
      };
      
      const result = generator.processTechnicalReadiness(failingResults);
      
      expect(result.passed).toBe(false);
      expect(result.critical_issues).toHaveLength(1);
    });

    test('should generate technical recommendations', () => {
      const result = generator.processTechnicalReadiness(mockValidationResults);
      
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('processSecurityClearance', () => {
    test('should process security clearance with no vulnerabilities', () => {
      const result = generator.processSecurityClearance(mockValidationResults);
      
      expect(result.category).toBe('Security Clearance');
      expect(result.passed).toBe(true);
      expect(result.critical_vulnerabilities).toHaveLength(0);
    });

    test('should fail security clearance with critical vulnerabilities', () => {
      const vulnerableResults = {
        vulnerability_scan: {
          vulnerabilities: ['SQL Injection'],
          critical_vulnerabilities: ['Remote Code Execution'],
          remediation_status: 'pending'
        }
      };
      
      const result = generator.processSecurityClearance(vulnerableResults);
      
      expect(result.passed).toBe(false);
      expect(result.critical_vulnerabilities).toHaveLength(1);
    });

    test('should verify security controls', () => {
      const result = generator.processSecurityClearance(mockValidationResults);
      
      expect(result.security_controls_verified).toBeDefined();
      expect(result.security_controls_verified.authentication).toBe(true);
    });
  });

  describe('processPerformanceCompliance', () => {
    test('should process performance compliance with passing metrics', () => {
      const result = generator.processPerformanceCompliance(mockValidationResults);
      
      expect(result.category).toBe('Performance Compliance');
      expect(result.passed).toBe(true);
      expect(result.threshold_violations).toHaveLength(0);
    });

    test('should handle performance threshold violations', () => {
      const slowResults = {
        load_testing: {
          metrics: { response_time: 300 },
          benchmarks: { max_response_time: 200 },
          threshold_violations: ['Response time exceeded']
        }
      };
      
      const result = generator.processPerformanceCompliance(slowResults);
      
      expect(result.threshold_violations).toHaveLength(1);
    });

    test('should generate performance summary', () => {
      const result = generator.processPerformanceCompliance(mockValidationResults);
      
      expect(result.performance_summary).toBeDefined();
      expect(result.performance_summary.load_testing).toBe('Passed');
    });
  });

  describe('processRegulatoryCompliance', () => {
    test('should process regulatory compliance with full compliance', () => {
      const result = generator.processRegulatoryCompliance(mockValidationResults);
      
      expect(result.category).toBe('Regulatory Compliance');
      expect(result.passed).toBe(true);
      expect(result.non_compliance_issues).toHaveLength(0);
    });

    test('should handle non-compliance issues', () => {
      const nonCompliantResults = {
        gdpr_compliance: {
          requirements_met: 20,
          total_requirements: 25,
          non_compliance_issues: ['Missing data retention policy']
        }
      };
      
      const result = generator.processRegulatoryCompliance(nonCompliantResults);
      
      expect(result.passed).toBe(false);
      expect(result.non_compliance_issues).toHaveLength(1);
    });

    test('should generate compliance attestation', () => {
      const result = generator.processRegulatoryCompliance(mockValidationResults);
      
      expect(result.compliance_attestation).toBeDefined();
      expect(result.compliance_attestation.gdpr_compliant).toBe(true);
    });
  });

  describe('processMobileValidation', () => {
    test('should process mobile validation with platform coverage', () => {
      const result = generator.processMobileValidation(mockValidationResults);
      
      expect(result.category).toBe('Mobile Validation');
      expect(result.passed).toBe(true);
      expect(result.compatibility_issues).toHaveLength(0);
    });

    test('should calculate platform coverage', () => {
      const result = generator.processMobileValidation(mockValidationResults);
      
      expect(result.platform_coverage).toBeDefined();
      expect(result.platform_coverage.platforms_covered).toContain('iOS');
      expect(result.platform_coverage.platforms_covered).toContain('Android');
    });

    test('should handle compatibility issues', () => {
      const incompatibleResults = {
        guard_mobile_app: {
          platforms_tested: ['iOS'],
          compatibility_issues: ['Android layout issues']
        }
      };
      
      const result = generator.processMobileValidation(incompatibleResults);
      
      expect(result.compatibility_issues).toHaveLength(1);
    });
  });

  describe('processInfrastructureReadiness', () => {
    test('should process infrastructure readiness with all checks passed', () => {
      const result = generator.processInfrastructureReadiness(mockValidationResults);
      
      expect(result.category).toBe('Infrastructure Readiness');
      expect(result.passed).toBe(true);
      expect(result.failed_checks).toHaveLength(0);
    });

    test('should handle failed infrastructure checks', () => {
      const failedResults = {
        deployment_readiness: {
          checks_passed: 18,
          total_checks: 20,
          failed_checks: ['SSL certificate expired', 'Database connection failed']
        }
      };
      
      const result = generator.processInfrastructureReadiness(failedResults);
      
      expect(result.passed).toBe(false);
      expect(result.failed_checks).toHaveLength(2);
    });

    test('should generate infrastructure status', () => {
      const result = generator.processInfrastructureReadiness(mockValidationResults);
      
      expect(result.infrastructure_status).toBeDefined();
      expect(result.infrastructure_status.deployment_ready).toBe(true);
    });
  });

  describe('generateIndividualCertifications', () => {
    test('should generate certificates for all categories', async () => {
      const processedResults = await generator.processValidationResults(mockValidationResults);
      const certifications = await generator.generateIndividualCertifications(processedResults);
      
      expect(Object.keys(certifications)).toHaveLength(6);
      
      Object.values(certifications).forEach(cert => {
        expect(cert).toHaveProperty('certificate_id');
        expect(cert).toHaveProperty('status');
        expect(cert).toHaveProperty('digital_signature');
        expect(cert).toHaveProperty('valid_until');
      });
    });

    test('should mark failed categories as NOT_CERTIFIED', async () => {
      const failingResults = {
        vulnerability_scan: {
          critical_vulnerabilities: ['Critical bug'],
          vulnerabilities: [],
          remediation_status: 'pending'
        }
      };
      
      const processedResults = await generator.processValidationResults(failingResults);
      const certifications = await generator.generateIndividualCertifications(processedResults);
      
      expect(certifications.security_clearance.status).toBe('NOT_CERTIFIED');
    });
  });

  describe('calculateOverallReadinessScore', () => {
    test('should calculate weighted overall score', async () => {
      const processedResults = await generator.processValidationResults(mockValidationResults);
      const score = generator.calculateOverallReadinessScore(processedResults);
      
      expect(score).toBeGreaterThan(90);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should handle mixed results', async () => {
      const mixedResults = {
        ...mockValidationResults,
        vulnerability_scan: {
          vulnerabilities: ['Medium severity bug'],
          critical_vulnerabilities: [],
          remediation_status: 'pending'
        }
      };
      
      const processedResults = await generator.processValidationResults(mixedResults);
      const score = generator.calculateOverallReadinessScore(processedResults);
      
      expect(score).toBeLessThan(100);
    });
  });

  describe('generateExecutiveSummary', () => {
    test('should generate executive summary with readiness status', async () => {
      const processedResults = await generator.processValidationResults(mockValidationResults);
      const overallScore = generator.calculateOverallReadinessScore(processedResults);
      const summary = generator.generateExecutiveSummary(processedResults, overallScore);
      
      expect(summary).toHaveProperty('readiness_status');
      expect(summary).toHaveProperty('overall_score');
      expect(summary).toHaveProperty('categories_passed');
      expect(summary).toHaveProperty('recommendation');
      expect(summary).toHaveProperty('risk_assessment');
    });

    test('should identify key achievements', async () => {
      const processedResults = await generator.processValidationResults(mockValidationResults);
      const overallScore = generator.calculateOverallReadinessScore(processedResults);
      const summary = generator.generateExecutiveSummary(processedResults, overallScore);
      
      expect(summary.key_achievements).toBeDefined();
      expect(Array.isArray(summary.key_achievements)).toBe(true);
    });

    test('should identify areas for improvement', async () => {
      const failingResults = {
        vulnerability_scan: {
          critical_vulnerabilities: ['Critical issue'],
          vulnerabilities: [],
          remediation_status: 'pending'
        }
      };
      
      const processedResults = await generator.processValidationResults(failingResults);
      const overallScore = generator.calculateOverallReadinessScore(processedResults);
      const summary = generator.generateExecutiveSummary(processedResults, overallScore);
      
      expect(summary.areas_for_improvement).toBeDefined();
      expect(summary.areas_for_improvement.length).toBeGreaterThan(0);
    });
  });

  describe('generateDeploymentAuthorization', () => {
    test('should authorize deployment for passing results', async () => {
      const processedResults = await generator.processValidationResults(mockValidationResults);
      const certifications = await generator.generateIndividualCertifications(processedResults);
      const overallScore = generator.calculateOverallReadinessScore(processedResults);
      
      const authorization = await generator.generateDeploymentAuthorization(overallScore, certifications);
      
      expect(authorization.status).toBe('AUTHORIZED');
      expect(authorization).toHaveProperty('deployment_window');
      expect(authorization).toHaveProperty('digital_signature');
    });

    test('should not authorize deployment for failing results', async () => {
      const failingResults = {
        vulnerability_scan: {
          critical_vulnerabilities: ['Critical security flaw'],
          vulnerabilities: [],
          remediation_status: 'pending'
        }
      };
      
      const processedResults = await generator.processValidationResults(failingResults);
      const certifications = await generator.generateIndividualCertifications(processedResults);
      const overallScore = generator.calculateOverallReadinessScore(processedResults);
      
      const authorization = await generator.generateDeploymentAuthorization(overallScore, certifications);
      
      expect(authorization.status).toBe('NOT_AUTHORIZED');
      expect(authorization.deployment_window).toBeNull();
    });

    test('should include rollback procedures', async () => {
      const processedResults = await generator.processValidationResults(mockValidationResults);
      const certifications = await generator.generateIndividualCertifications(processedResults);
      const overallScore = generator.calculateOverallReadinessScore(processedResults);
      
      const authorization = await generator.generateDeploymentAuthorization(overallScore, certifications);
      
      expect(authorization.rollback_procedures).toBeDefined();
      expect(Array.isArray(authorization.rollback_procedures)).toBe(true);
    });
  });

  describe('generateDigitalSignatures', () => {
    test('should generate signatures for all documents', async () => {
      const mockDocuments = {
        technical_cert: { data: 'test' },
        security_cert: { data: 'test' }
      };
      
      await generator.generateDigitalSignatures(mockDocuments);
      
      expect(generator.digitalSignatures.size).toBe(2);
      expect(generator.digitalSignatures.has('technical_cert')).toBe(true);
      expect(generator.digitalSignatures.has('security_cert')).toBe(true);
    });

    test('should create valid digital signatures', async () => {
      const document = { test: 'data' };
      const signature = await generator.createDigitalSignature(document, 'test_doc');
      
      expect(signature).toHaveProperty('algorithm');
      expect(signature).toHaveProperty('signature');
      expect(signature).toHaveProperty('document_hash');
      expect(signature).toHaveProperty('signed_at');
      expect(signature.algorithm).toBe('HMAC-SHA256');
    });
  });

  describe('generateAuditTrail', () => {
    test('should generate audit trail with integrity hash', () => {
      generator.logAuditEvent('test_event', { data: 'test' });
      generator.logAuditEvent('another_event', { data: 'test2' });
      
      const auditTrail = generator.generateAuditTrail();
      
      expect(auditTrail).toHaveProperty('trail_id');
      expect(auditTrail).toHaveProperty('events');
      expect(auditTrail).toHaveProperty('integrity_hash');
      expect(auditTrail.events).toHaveLength(2);
      expect(auditTrail.immutable).toBe(true);
    });

    test('should hash individual events', () => {
      generator.logAuditEvent('test_event', { data: 'test' });
      
      const auditTrail = generator.generateAuditTrail();
      
      auditTrail.events.forEach(event => {
        expect(event).toHaveProperty('hash');
        expect(typeof event.hash).toBe('string');
        expect(event.hash).toHaveLength(64); // SHA256 hex length
      });
    });
  });

  describe('Score Calculation Methods', () => {
    test('calculateTestScore should handle various scenarios', () => {
      expect(generator.calculateTestScore({ passed: 90, failed: 10 })).toBe(90);
      expect(generator.calculateTestScore({ passed: 0, failed: 0 })).toBe(0);
      expect(generator.calculateTestScore({ passed: 100, failed: 0 })).toBe(100);
    });

    test('calculateSecurityScore should penalize vulnerabilities', () => {
      expect(generator.calculateSecurityScore({ 
        vulnerabilities: [], 
        critical_vulnerabilities: [] 
      })).toBe(100);
      
      expect(generator.calculateSecurityScore({ 
        vulnerabilities: ['medium'], 
        critical_vulnerabilities: [] 
      })).toBe(95);
      
      expect(generator.calculateSecurityScore({ 
        vulnerabilities: [], 
        critical_vulnerabilities: ['critical'] 
      })).toBe(0);
    });

    test('calculatePerformanceScore should handle threshold violations', () => {
      expect(generator.calculatePerformanceScore({ 
        threshold_violations: [] 
      })).toBe(100);
      
      expect(generator.calculatePerformanceScore({ 
        threshold_violations: ['violation1', 'violation2'] 
      })).toBe(80);
    });

    test('calculateComplianceScore should calculate percentage', () => {
      expect(generator.calculateComplianceScore({ 
        requirements_met: 25, 
        total_requirements: 25 
      })).toBe(100);
      
      expect(generator.calculateComplianceScore({ 
        requirements_met: 20, 
        total_requirements: 25 
      })).toBe(80);
      
      expect(generator.calculateComplianceScore({ 
        requirements_met: 0, 
        total_requirements: 0 
      })).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    test('should generate unique IDs', () => {
      const id1 = generator.generateCertificationId();
      const id2 = generator.generateCertificationId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^CERT-\d+-[A-F0-9]+$/);
    });

    test('should calculate validity date', () => {
      const validityDate = generator.calculateValidityDate();
      const futureDate = new Date(validityDate);
      const now = new Date();
      
      expect(futureDate.getTime()).toBeGreaterThan(now.getTime());
    });

    test('should calculate deployment window', () => {
      const window = generator.calculateDeploymentWindow();
      
      expect(window).toHaveProperty('start');
      expect(window).toHaveProperty('end');
      expect(window).toHaveProperty('timezone');
      expect(window.timezone).toBe('UTC');
    });

    test('should hash events consistently', () => {
      const event = { type: 'test', data: 'test' };
      const hash1 = generator.hashEvent(event);
      const hash2 = generator.hashEvent(event);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });
  });

  describe('Document Creation', () => {
    test('should create technical readiness certificate', async () => {
      const certificationData = {
        processedResults: {
          technical_readiness: {
            category: 'Technical Readiness',
            score: 95,
            passed: true
          }
        }
      };
      
      const certificate = await generator.createTechnicalReadinessCertificate(certificationData);
      
      expect(certificate.document_type).toBe('Technical Readiness Certificate');
      expect(certificate.certification_id).toBe('TEST-CERT-001');
      expect(certificate).toHaveProperty('created_at');
    });

    test('should create security clearance document', async () => {
      const certificationData = {
        processedResults: {
          security_clearance: {
            category: 'Security Clearance',
            score: 100,
            passed: true
          }
        }
      };
      
      const document = await generator.createSecurityClearanceDocument(certificationData);
      
      expect(document.document_type).toBe('Security Clearance Document');
      expect(document.certification_id).toBe('TEST-CERT-001');
    });
  });

  describe('Recommendation Generation', () => {
    test('should generate technical recommendations for low scores', () => {
      const results = [
        { category: 'api_testing', score: 85 },
        { category: 'ui_testing', score: 95 }
      ];
      
      const recommendations = generator.generateTechnicalRecommendations(results);
      
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]).toContain('api_testing');
    });

    test('should generate security recommendations for vulnerabilities', () => {
      const results = [
        { category: 'auth', critical_vulnerabilities: ['SQL injection'] },
        { category: 'encryption', critical_vulnerabilities: [] }
      ];
      
      const recommendations = generator.generateSecurityRecommendations(results);
      
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]).toContain('auth');
    });
  });

  describe('Risk Assessment', () => {
    test('should assess low risk for passing results', async () => {
      const processedResults = await generator.processValidationResults(mockValidationResults);
      const criticalIssues = [];
      
      const riskAssessment = generator.generateRiskAssessment(processedResults, criticalIssues);
      
      expect(riskAssessment.risk_level).toBe('LOW');
      expect(riskAssessment.mitigation_required).toBe(false);
    });

    test('should assess high risk for critical issues', async () => {
      const failingResults = {
        vulnerability_scan: {
          critical_vulnerabilities: ['Critical security flaw'],
          vulnerabilities: [],
          remediation_status: 'pending'
        }
      };
      
      const processedResults = await generator.processValidationResults(failingResults);
      const criticalIssues = ['Critical security flaw'];
      
      const riskAssessment = generator.generateRiskAssessment(processedResults, criticalIssues);
      
      expect(riskAssessment.risk_level).toBe('HIGH');
      expect(riskAssessment.mitigation_required).toBe(true);
      expect(riskAssessment.critical_issues_count).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing validation results gracefully', async () => {
      const emptyResults = {};
      
      const result = await generator.generateFinalCertification(emptyResults);
      
      expect(result).toHaveProperty('certificationId');
      expect(result.overallScore).toBe(0);
    });

    test('should log audit events for errors', async () => {
      const invalidResults = null;
      
      try {
        await generator.generateFinalCertification(invalidResults);
      } catch (error) {
        // Expected to throw
      }
      
      const errorEvent = generator.auditTrail.find(e => e.event_type === 'certification_failed');
      expect(errorEvent).toBeDefined();
    });
  });
});