/**
 * Privacy and Audit Documentation Validator Test Suite
 * 
 * Comprehensive test coverage for privacy policy accuracy, audit documentation
 * completeness, compliance evidence availability, and regulatory reporting capabilities.
 * 
 * Requirements Tested:
 * - 10.5: Privacy policy accuracy and accessibility
 * - 10.7: Audit documentation completeness
 * - 10.8: Compliance evidence availability and regulatory reporting
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { PrivacyAuditDocumentationValidator } from './privacy-audit-documentation-validator.js';

// Mock fs module for testing
jest.mock('fs/promises');

describe('PrivacyAuditDocumentationValidator', () => {
  let validator;
  let mockFs;

  beforeEach(() => {
    validator = new PrivacyAuditDocumentationValidator();
    mockFs = fs;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Privacy Policy Validation', () => {
    test('should validate complete privacy policy successfully', async () => {
      const mockPrivacyPolicy = `
        Privacy Policy
        
        Data Collection: We collect personal information when you register.
        Data Processing: We process your data for service provision.
        User Rights: You have the right to access, modify, and delete your data.
        Data Retention: We retain data for 7 years as required by law.
        Security Measures: We implement industry-standard security measures.
        Third Party: We may share data with trusted third parties.
        Contact Information: Contact us at privacy@secure-gate.app.
        Cookies: We use cookies to enhance user experience.
        Updates: We will notify you of policy updates.
        Legal Basis: We process data based on legitimate interests and consent.
        GDPR: This policy complies with GDPR requirements.
        Data Protection: We are committed to protecting your privacy.
        Privacy Rights: You have comprehensive privacy rights.
        Consent: We obtain explicit consent for data processing.
      `;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockPrivacyPolicy);

      await validator.validatePrivacyPolicy();

      expect(validator.validationResults.privacyPolicy.accuracy).toBeGreaterThan(80);
      expect(validator.validationResults.privacyPolicy.completeness).toBeGreaterThan(80);
      expect(validator.validationResults.privacyPolicy.issues.length).toBeLessThan(5);
    });

    test('should detect missing privacy policy document', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      await validator.validatePrivacyPolicy();

      expect(validator.validationResults.privacyPolicy.issues).toContainEqual(
        expect.objectContaining({
          severity: 'critical',
          category: 'missing_document',
          message: 'Privacy policy document not found'
        })
      );
    });

    test('should validate privacy policy accuracy with missing sections', async () => {
      const incompletePolicy = `
        Privacy Policy
        We collect some data and use it for our service.
      `;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(incompletePolicy);

      await validator.validatePrivacyPolicy();

      expect(validator.validationResults.privacyPolicy.accuracy).toBeLessThan(50);
      expect(validator.validationResults.privacyPolicy.issues).toContainEqual(
        expect.objectContaining({
          severity: 'high',
          category: 'missing_section'
        })
      );
    });

    test('should validate privacy policy accessibility', async () => {
      const policy = 'Basic privacy policy content';
      
      // Test HTML format (good accessibility)
      const htmlPath = 'privacy-policy.html';
      expect(validator.validatePrivacyPolicyAccessibility(policy, htmlPath)).toBeGreaterThan(70);
      
      // Test PDF format (lower accessibility)
      const pdfPath = 'privacy-policy.pdf';
      expect(validator.validatePrivacyPolicyAccessibility(policy, pdfPath)).toBeLessThan(90);
    });

    test('should validate privacy policy completeness', async () => {
      const completePolicy = `
        Data collection purposes: We collect data for service provision.
        Data types collected: Personal and usage information.
        Legal basis processing: Legitimate interests and consent.
        Data retention periods: 7 years maximum.
        User rights explanation: Access, rectification, erasure rights.
        Contact information: privacy@secure-gate.app
        Third party sharing: Limited sharing with processors.
        Security measures: Encryption and access controls.
        Cookie policy: Essential and analytics cookies.
        Updates notification: Email notifications for changes.
      `;

      const score = validator.validatePrivacyPolicyCompleteness(completePolicy);
      expect(score).toBeGreaterThan(90);
    });
  });

  describe('Audit Documentation Validation', () => {
    test('should validate comprehensive audit documentation', async () => {
      const mockAuditFiles = [
        { name: 'security-audit-2024.pdf', isFile: () => true },
        { name: 'compliance-audit-report.pdf', isFile: () => true },
        { name: 'performance-audit-2024.md', isFile: () => true },
        { name: 'accessibility-audit-results.html', isFile: () => true },
        { name: 'code-quality-audit.pdf', isFile: () => true },
        { name: 'penetration-test-report-2024.pdf', isFile: () => true },
        { name: 'vulnerability-assessment-2024.json', isFile: () => true },
        { name: 'business-continuity-test-results.md', isFile: () => true }
      ];

      mockFs.readdir.mockResolvedValue(mockAuditFiles);

      await validator.validateAuditDocumentation();

      expect(validator.validationResults.auditDocumentation.completeness).toBe(100);
      expect(validator.validationResults.auditDocumentation.coverage).toBeGreaterThan(70);
    });

    test('should detect missing audit categories', async () => {
      const limitedAuditFiles = [
        { name: 'security-audit-2024.pdf', isFile: () => true },
        { name: 'performance-test.md', isFile: () => true }
      ];

      mockFs.readdir.mockResolvedValue(limitedAuditFiles);

      await validator.validateAuditDocumentation();

      expect(validator.validationResults.auditDocumentation.completeness).toBeLessThan(50);
      expect(validator.validationResults.auditDocumentation.issues).toContainEqual(
        expect.objectContaining({
          severity: 'high',
          category: 'missing_audit_category'
        })
      );
    });

    test('should categorize audit documents correctly', () => {
      expect(validator.categorizeAuditDocument('security-audit-2024.pdf')).toBe('security_audits');
      expect(validator.categorizeAuditDocument('compliance-report.md')).toBe('compliance_audits');
      expect(validator.categorizeAuditDocument('performance-test-results.json')).toBe('performance_audits');
      expect(validator.categorizeAuditDocument('a11y-audit.html')).toBe('accessibility_audits');
      expect(validator.categorizeAuditDocument('code-quality-report.pdf')).toBe('code_quality_audits');
      expect(validator.categorizeAuditDocument('pentest-results.pdf')).toBe('penetration_testing');
      expect(validator.categorizeAuditDocument('vuln-scan-2024.json')).toBe('vulnerability_assessments');
      expect(validator.categorizeAuditDocument('disaster-recovery-test.md')).toBe('business_continuity_testing');
    });

    test('should validate audit coverage with recent audits', () => {
      const recentAudits = [
        { name: 'security-audit-2024.pdf', category: 'security_audits' },
        { name: 'comprehensive-system-audit-2024.md', category: 'compliance_audits' },
        { name: 'full-performance-audit-2024.json', category: 'performance_audits' }
      ];

      const score = validator.validateAuditCoverage(recentAudits);
      expect(score).toBeGreaterThan(80);
    });

    test('should detect outdated audit documentation', () => {
      const outdatedAudits = [
        { name: 'security-audit-2020.pdf', category: 'security_audits' },
        { name: 'old-compliance-report.md', category: 'compliance_audits' }
      ];

      const score = validator.validateAuditCoverage(outdatedAudits);
      expect(score).toBeLessThan(80);
    });
  });

  describe('Compliance Evidence Validation', () => {
    test('should validate comprehensive compliance evidence', async () => {
      const mockComplianceFiles = [
        { name: 'gdpr-compliance-certificate-2024.pdf', isFile: () => true },
        { name: 'kdpa-compliance-report-2024.md', isFile: () => true },
        { name: 'security-certification-iso27001.pdf', isFile: () => true },
        { name: 'audit-report-comprehensive-2024.pdf', isFile: () => true },
        { name: 'penetration-test-report-2024.json', isFile: () => true },
        { name: 'vulnerability-scan-results-2024.html', isFile: () => true },
        { name: 'incident-response-records-2024.md', isFile: () => true },
        { name: 'security-training-records-2024.pdf', isFile: () => true }
      ];

      mockFs.readdir.mockResolvedValue(mockComplianceFiles);

      await validator.validateComplianceEvidence();

      expect(validator.validationResults.complianceEvidence.availability).toBe(100);
      expect(validator.validationResults.complianceEvidence.currency).toBeGreaterThan(70);
    });

    test('should detect missing compliance evidence types', async () => {
      const limitedComplianceFiles = [
        { name: 'gdpr-report.pdf', isFile: () => true },
        { name: 'security-cert.pdf', isFile: () => true }
      ];

      mockFs.readdir.mockResolvedValue(limitedComplianceFiles);

      await validator.validateComplianceEvidence();

      expect(validator.validationResults.complianceEvidence.availability).toBeLessThan(50);
      expect(validator.validationResults.complianceEvidence.issues).toContainEqual(
        expect.objectContaining({
          severity: 'high',
          category: 'missing_evidence_type'
        })
      );
    });

    test('should categorize compliance evidence correctly', () => {
      expect(validator.categorizeComplianceEvidence('gdpr-compliance-2024.pdf')).toBe('gdpr_compliance_records');
      expect(validator.categorizeComplianceEvidence('kdpa-report.md')).toBe('kdpa_compliance_records');
      expect(validator.categorizeComplianceEvidence('security-cert-iso.pdf')).toBe('security_certifications');
      expect(validator.categorizeComplianceEvidence('audit-report-2024.pdf')).toBe('audit_reports');
      expect(validator.categorizeComplianceEvidence('pentest-results.json')).toBe('penetration_test_reports');
      expect(validator.categorizeComplianceEvidence('vuln-scan.html')).toBe('vulnerability_scan_reports');
      expect(validator.categorizeComplianceEvidence('incident-log.md')).toBe('incident_response_records');
      expect(validator.categorizeComplianceEvidence('training-completion.pdf')).toBe('training_records');
    });

    test('should validate compliance evidence organization', () => {
      const organizedEvidence = [
        { path: 'compliance/gdpr/gdpr-report-2024.pdf', name: 'gdpr-report-2024.pdf' },
        { path: 'security/audits/security-audit-2024.pdf', name: 'security-audit-2024.pdf' },
        { path: 'compliance/kdpa/kdpa-compliance-2024.md', name: 'kdpa-compliance-2024.md' }
      ];

      const score = validator.validateComplianceEvidenceOrganization(organizedEvidence);
      expect(score).toBeGreaterThan(80);
    });

    test('should detect poor compliance evidence organization', () => {
      const poorlyOrganizedEvidence = [
        { path: 'random/gdpr-report.pdf', name: 'gdpr-report.pdf' },
        { path: 'files/security-stuff.pdf', name: 'security-stuff.pdf' },
        { path: 'documents/compliance.md', name: 'compliance.md' }
      ];

      const score = validator.validateComplianceEvidenceOrganization(poorlyOrganizedEvidence);
      expect(score).toBeLessThan(80);
    });
  });

  describe('Regulatory Reporting Validation', () => {
    test('should validate comprehensive regulatory reporting implementation', async () => {
      const mockReportingCode = `
        class RegulatoryReportingService {
          async generateDataBreachNotification(incident) {
            try {
              const report = await this.validateIncidentData(incident);
              return this.scheduleAutomaticSubmission(report);
            } catch (error) {
              this.logError(error);
              throw error;
            }
          }
          
          async generateComplianceStatusReport() {
            const auditTrail = await this.generateAuditTrail();
            return this.validateReportAccuracy(auditTrail);
          }
          
          async exportUserData(userId) {
            const userData = await this.collectUserData(userId);
            return this.sanitizeAndVerifyData(userData);
          }
          
          async confirmDataDeletion(userId) {
            const deletionRecord = await this.trackDataDeletion(userId);
            return this.generateDeletionConfirmation(deletionRecord);
          }
          
          async generateConsentManagementReport() {
            const consentRecords = await this.auditConsentRecords();
            return this.validateConsentCompliance(consentRecords);
          }
          
          async logCrossBorderTransfer(transfer) {
            const transferRecord = await this.validateTransferLegality(transfer);
            return this.scheduleRegulatoryNotification(transferRecord);
          }
          
          async respondToRegulatoryInquiry(inquiry) {
            const response = await this.generateInquiryResponse(inquiry);
            return this.validateResponseAccuracy(response);
          }
        }
      `;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockReportingCode);

      await validator.validateRegulatoryReporting();

      expect(validator.validationResults.regulatoryReporting.capabilities).toBeGreaterThan(80);
      expect(validator.validationResults.regulatoryReporting.automation).toBeGreaterThan(70);
      expect(validator.validationResults.regulatoryReporting.accuracy).toBeGreaterThan(80);
    });

    test('should detect missing regulatory reporting implementation', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      await validator.validateRegulatoryReporting();

      expect(validator.validationResults.regulatoryReporting.capabilities).toBe(0);
      expect(validator.validationResults.regulatoryReporting.issues).toContainEqual(
        expect.objectContaining({
          severity: 'critical',
          category: 'no_implementation'
        })
      );
    });

    test('should extract reporting capabilities from code', () => {
      const codeWithCapabilities = `
        function generateBreachNotification() {}
        function createComplianceReport() {}
        function exportUserData() {}
        function confirmDeletion() {}
        function manageConsent() {}
        function logTransfer() {}
        function generateAuditTrail() {}
        function respondToInquiry() {}
      `;

      const capabilities = validator.extractReportingCapabilities(codeWithCapabilities);
      expect(capabilities).toContain('data_breach_notification');
      expect(capabilities).toContain('compliance_status_reporting');
      expect(capabilities).toContain('user_data_export');
      expect(capabilities).toContain('data_deletion_confirmation');
      expect(capabilities).toContain('consent_management_reporting');
      expect(capabilities).toContain('audit_trail_generation');
    });

    test('should validate reporting automation', () => {
      const automatedCode = `
        const cron = require('node-cron');
        
        cron.schedule('0 0 * * *', async () => {
          try {
            await generateAutomaticReport();
          } catch (error) {
            handleReportingError(error);
          }
        });
        
        class ReportQueue {
          async batchProcess() {
            // Batch processing logic
          }
        }
      `;

      const implementations = [{ content: automatedCode, capabilities: [] }];
      const score = validator.validateReportingAutomation(implementations);
      expect(score).toBeGreaterThan(80);
    });

    test('should detect manual reporting without automation', () => {
      const manualCode = `
        function generateReport() {
          // Manual report generation
          return createReportManually();
        }
      `;

      const implementations = [{ content: manualCode, capabilities: [] }];
      const score = validator.validateReportingAutomation(implementations);
      expect(score).toBeLessThan(70);
    });

    test('should validate reporting accuracy with data validation', () => {
      const accurateCode = `
        function generateReport(data) {
          const validatedData = validateReportData(data);
          const sanitizedData = sanitizeInput(validatedData);
          const verifiedData = verifyDataIntegrity(sanitizedData);
          
          auditLog('report_generated', { data: verifiedData });
          
          return createAccurateReport(verifiedData);
        }
      `;

      const implementations = [{ content: accurateCode, capabilities: [] }];
      const score = validator.validateReportingAccuracy(implementations);
      expect(score).toBe(100);
    });
  });

  describe('Overall Validation', () => {
    test('should calculate overall score correctly', async () => {
      // Mock successful validation results
      validator.validationResults = {
        privacyPolicy: { accuracy: 90, accessibility: 85, completeness: 95, issues: [] },
        auditDocumentation: { completeness: 88, coverage: 82, traceability: 90, issues: [] },
        complianceEvidence: { availability: 92, organization: 85, currency: 88, issues: [] },
        regulatoryReporting: { capabilities: 85, automation: 80, accuracy: 90, issues: [] }
      };

      validator.calculateOverallScore();

      expect(validator.validationResults.overallScore).toBeGreaterThan(85);
      expect(validator.validationResults.overallScore).toBeLessThan(95);
    });

    test('should identify critical issues', () => {
      validator.validationResults = {
        privacyPolicy: { 
          issues: [
            { severity: 'critical', message: 'Critical privacy issue' },
            { severity: 'high', message: 'High privacy issue' }
          ] 
        },
        auditDocumentation: { 
          issues: [
            { severity: 'critical', message: 'Critical audit issue' }
          ] 
        },
        complianceEvidence: { issues: [] },
        regulatoryReporting: { issues: [] }
      };

      validator.identifyCriticalIssues();

      expect(validator.validationResults.criticalIssues).toHaveLength(2);
      expect(validator.validationResults.criticalIssues.every(issue => 
        issue.severity === 'critical'
      )).toBe(true);
    });

    test('should generate appropriate recommendations', () => {
      validator.validationResults = {
        privacyPolicy: { accuracy: 70, accessibility: 80, completeness: 75 },
        auditDocumentation: { completeness: 60, coverage: 65, traceability: 70 },
        complianceEvidence: { availability: 70, organization: 80, currency: 75 },
        regulatoryReporting: { capabilities: 50, automation: 60, accuracy: 55 }
      };

      validator.generateRecommendations();

      expect(validator.validationResults.recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'high',
          category: 'audit_documentation'
        })
      );
      expect(validator.validationResults.recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'critical',
          category: 'regulatory_reporting'
        })
      );
    });

    test('should complete full validation successfully', async () => {
      // Mock all file operations
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('Mock content with all required elements');
      mockFs.readdir.mockResolvedValue([
        { name: 'comprehensive-file.pdf', isFile: () => true }
      ]);

      const result = await validator.validateComplete();

      expect(result.success).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.results).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('should handle validation errors gracefully', async () => {
      // Mock file operation failure
      mockFs.access.mockRejectedValue(new Error('System error'));
      mockFs.readFile.mockRejectedValue(new Error('Read error'));
      mockFs.readdir.mockRejectedValue(new Error('Directory error'));

      const result = await validator.validateComplete();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.results).toBeDefined();
    });

    test('should generate detailed report', () => {
      validator.validationResults = {
        overallScore: 87.5,
        privacyPolicy: { accuracy: 90, accessibility: 85, completeness: 88, issues: [] },
        auditDocumentation: { completeness: 85, coverage: 80, traceability: 90, issues: [] },
        complianceEvidence: { availability: 88, organization: 85, currency: 90, issues: [] },
        regulatoryReporting: { capabilities: 85, automation: 80, accuracy: 88, issues: [] },
        criticalIssues: [],
        recommendations: []
      };

      const report = validator.generateDetailedReport();

      expect(report.summary.overallScore).toBe(87.5);
      expect(report.summary.readyForProduction).toBe(true);
      expect(report.privacyPolicy).toBeDefined();
      expect(report.auditDocumentation).toBeDefined();
      expect(report.complianceEvidence).toBeDefined();
      expect(report.regulatoryReporting).toBeDefined();
      expect(report.timestamp).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty privacy policy content', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('');

      await validator.validatePrivacyPolicy();

      expect(validator.validationResults.privacyPolicy.accuracy).toBe(0);
      expect(validator.validationResults.privacyPolicy.completeness).toBe(0);
    });

    test('should handle empty audit documentation directory', async () => {
      mockFs.readdir.mockResolvedValue([]);

      await validator.validateAuditDocumentation();

      expect(validator.validationResults.auditDocumentation.completeness).toBe(0);
      expect(validator.validationResults.auditDocumentation.coverage).toBeLessThan(50);
    });

    test('should handle missing compliance evidence directories', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

      await validator.validateComplianceEvidence();

      expect(validator.validationResults.complianceEvidence.availability).toBe(0);
    });

    test('should handle malformed regulatory reporting code', async () => {
      const malformedCode = 'invalid javascript code {{{';

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(malformedCode);

      await validator.validateRegulatoryReporting();

      expect(validator.validationResults.regulatoryReporting.capabilities).toBe(0);
    });

    test('should validate with minimum viable privacy policy', async () => {
      const minimalPolicy = `
        Privacy Policy
        We collect data for service provision.
        We process data based on consent.
        You have rights to access your data.
        We retain data as required by law.
        We protect data with security measures.
        Contact us at privacy@example.com.
      `;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(minimalPolicy);

      await validator.validatePrivacyPolicy();

      expect(validator.validationResults.privacyPolicy.accuracy).toBeGreaterThan(40);
      expect(validator.validationResults.privacyPolicy.completeness).toBeGreaterThan(30);
    });
  });
});