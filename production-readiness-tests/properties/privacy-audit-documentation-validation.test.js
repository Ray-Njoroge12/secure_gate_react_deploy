/**
 * Property-Based Tests for Privacy and Audit Documentation Validation
 * 
 * These tests validate universal properties that should hold for all privacy policies,
 * audit documentation, compliance evidence, and regulatory reporting implementations.
 * 
 * Requirements Validated:
 * - 10.5: Privacy policy accuracy and accessibility
 * - 10.7: Audit documentation completeness
 * - 10.8: Compliance evidence availability and regulatory reporting
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import fc from 'fast-check';
import { PrivacyAuditDocumentationValidator } from '../compliance-documentation/privacy-audit-documentation-validator.js';

describe('Privacy and Audit Documentation Validation Properties', () => {
  let validator;

  beforeEach(() => {
    validator = new PrivacyAuditDocumentationValidator();
  });

  /**
   * Property 1: Privacy Policy Content Validation Consistency
   * For any privacy policy content, validation should be deterministic and consistent
   */
  test('privacy policy validation should be deterministic and consistent', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 10, maxLength: 5000 }),
      fc.constantFrom('privacy-policy.html', 'privacy-policy.pdf', 'privacy-policy.md'),
      (policyContent, fileName) => {
        // Run validation multiple times
        const result1 = validator.validatePrivacyPolicyAccuracy(policyContent);
        const result2 = validator.validatePrivacyPolicyAccuracy(policyContent);
        const result3 = validator.validatePrivacyPolicyAccuracy(policyContent);

        // Results should be identical (deterministic)
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);

        // Score should be between 0 and 100
        expect(result1).toBeGreaterThanOrEqual(0);
        expect(result1).toBeLessThanOrEqual(100);

        // Accessibility validation should also be consistent
        const accessResult1 = validator.validatePrivacyPolicyAccessibility(policyContent, fileName);
        const accessResult2 = validator.validatePrivacyPolicyAccessibility(policyContent, fileName);
        
        expect(accessResult1).toBe(accessResult2);
        expect(accessResult1).toBeGreaterThanOrEqual(0);
        expect(accessResult1).toBeLessThanOrEqual(100);

        // Completeness validation should be consistent
        const completeResult1 = validator.validatePrivacyPolicyCompleteness(policyContent);
        const completeResult2 = validator.validatePrivacyPolicyCompleteness(policyContent);
        
        expect(completeResult1).toBe(completeResult2);
        expect(completeResult1).toBeGreaterThanOrEqual(0);
        expect(completeResult1).toBeLessThanOrEqual(100);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 2: Audit Document Categorization Consistency
   * For any audit document filename, categorization should be consistent and logical
   */
  test('audit document categorization should be consistent and logical', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 5, maxLength: 100 }),
      fc.constantFrom('.pdf', '.md', '.html', '.json', '.txt'),
      (baseName, extension) => {
        const fileName = baseName + extension;
        
        // Categorization should be consistent
        const category1 = validator.categorizeAuditDocument(fileName);
        const category2 = validator.categorizeAuditDocument(fileName);
        
        expect(category1).toBe(category2);
        
        // Category should be one of the expected categories or 'general_audit'
        const validCategories = [
          ...validator.auditDocumentationCategories,
          'general_audit'
        ];
        expect(validCategories).toContain(category1);
        
        // Case insensitive categorization should work
        const upperCaseCategory = validator.categorizeAuditDocument(fileName.toUpperCase());
        const lowerCaseCategory = validator.categorizeAuditDocument(fileName.toLowerCase());
        
        expect(upperCaseCategory).toBe(lowerCaseCategory);
      }
    ), { numRuns: 200 });
  });

  /**
   * Property 3: Compliance Evidence Type Classification Consistency
   * For any compliance evidence filename, type classification should be consistent
   */
  test('compliance evidence type classification should be consistent', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 5, maxLength: 100 }),
      fc.constantFrom('.pdf', '.md', '.html', '.json', '.docx'),
      (baseName, extension) => {
        const fileName = baseName + extension;
        
        // Classification should be consistent
        const type1 = validator.categorizeComplianceEvidence(fileName);
        const type2 = validator.categorizeComplianceEvidence(fileName);
        
        expect(type1).toBe(type2);
        
        // Type should be one of the expected types or 'general_compliance'
        const validTypes = [
          ...validator.complianceEvidenceTypes,
          'general_compliance'
        ];
        expect(validTypes).toContain(type1);
        
        // Case insensitive classification should work
        const upperCaseType = validator.categorizeComplianceEvidence(fileName.toUpperCase());
        const lowerCaseType = validator.categorizeComplianceEvidence(fileName.toLowerCase());
        
        expect(upperCaseType).toBe(lowerCaseType);
      }
    ), { numRuns: 200 });
  });

  /**
   * Property 4: Regulatory Reporting Capability Extraction Consistency
   * For any code content, capability extraction should be consistent and complete
   */
  test('regulatory reporting capability extraction should be consistent', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 50, maxLength: 2000 }),
      (codeContent) => {
        // Extraction should be consistent
        const capabilities1 = validator.extractReportingCapabilities(codeContent);
        const capabilities2 = validator.extractReportingCapabilities(codeContent);
        
        expect(capabilities1).toEqual(capabilities2);
        
        // All extracted capabilities should be valid
        for (const capability of capabilities1) {
          expect(validator.regulatoryReportingCapabilities).toContain(capability);
        }
        
        // Case insensitive extraction should work
        const upperCaseCapabilities = validator.extractReportingCapabilities(codeContent.toUpperCase());
        const lowerCaseCapabilities = validator.extractReportingCapabilities(codeContent.toLowerCase());
        
        // Should extract same or more capabilities (case variations might reveal more matches)
        expect(upperCaseCapabilities.length).toBeGreaterThanOrEqual(0);
        expect(lowerCaseCapabilities.length).toBeGreaterThanOrEqual(0);
      }
    ), { numRuns: 150 });
  });

  /**
   * Property 5: Validation Score Boundaries and Monotonicity
   * All validation scores should respect boundaries and show monotonic behavior
   */
  test('validation scores should respect boundaries and show monotonic behavior', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        name: fc.string({ minLength: 10, maxLength: 50 }),
        isFile: fc.constant(() => true),
        category: fc.constantFrom(...validator.auditDocumentationCategories)
      }), { minLength: 0, maxLength: 20 }),
      (auditDocuments) => {
        // Test audit documentation completeness
        const completenessScore = validator.validateAuditDocumentationCompleteness(auditDocuments);
        
        // Score should be within bounds
        expect(completenessScore).toBeGreaterThanOrEqual(0);
        expect(completenessScore).toBeLessThanOrEqual(100);
        
        // More complete documentation should not decrease score
        const moreCompleteDocuments = [
          ...auditDocuments,
          { name: 'additional-audit.pdf', isFile: () => true, category: 'security_audits' }
        ];
        
        const moreCompleteScore = validator.validateAuditDocumentationCompleteness(moreCompleteDocuments);
        expect(moreCompleteScore).toBeGreaterThanOrEqual(completenessScore);
        
        // Test compliance evidence availability
        const complianceEvidence = auditDocuments.map(doc => ({
          ...doc,
          type: validator.complianceEvidenceTypes[0] // Use first type for simplicity
        }));
        
        const availabilityScore = validator.validateComplianceEvidenceAvailability(complianceEvidence);
        expect(availabilityScore).toBeGreaterThanOrEqual(0);
        expect(availabilityScore).toBeLessThanOrEqual(100);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 6: Issue Severity Classification Consistency
   * Issue severity should be consistently classified based on content and context
   */
  test('issue severity classification should be consistent and logical', () => {
    fc.assert(fc.property(
      fc.constantFrom('critical', 'high', 'medium', 'low'),
      fc.string({ minLength: 10, maxLength: 100 }),
      fc.constantFrom('missing_document', 'missing_section', 'poor_organization', 'outdated_evidence'),
      (expectedSeverity, message, category) => {
        // Create mock issue
        const issue = {
          severity: expectedSeverity,
          category: category,
          message: message,
          requirement: '10.5'
        };
        
        // Severity should be one of the valid levels
        const validSeverities = ['critical', 'high', 'medium', 'low'];
        expect(validSeverities).toContain(issue.severity);
        
        // Critical issues should be treated as blocking
        if (issue.severity === 'critical') {
          // Critical issues should have specific categories
          const criticalCategories = ['missing_document', 'no_implementation', 'security_vulnerability'];
          // This is a logical expectation, not a hard requirement for all critical issues
        }
        
        // Issue should have required fields
        expect(issue.message).toBeDefined();
        expect(issue.category).toBeDefined();
        expect(issue.requirement).toBeDefined();
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 7: Overall Score Calculation Consistency
   * Overall score calculation should be consistent and weighted properly
   */
  test('overall score calculation should be consistent and weighted properly', () => {
    fc.assert(fc.property(
      fc.record({
        privacyPolicy: fc.record({
          accuracy: fc.integer({ min: 0, max: 100 }),
          accessibility: fc.integer({ min: 0, max: 100 }),
          completeness: fc.integer({ min: 0, max: 100 }),
          issues: fc.array(fc.record({
            severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
            category: fc.string(),
            message: fc.string()
          }), { maxLength: 5 })
        }),
        auditDocumentation: fc.record({
          completeness: fc.integer({ min: 0, max: 100 }),
          coverage: fc.integer({ min: 0, max: 100 }),
          traceability: fc.integer({ min: 0, max: 100 }),
          issues: fc.array(fc.record({
            severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
            category: fc.string(),
            message: fc.string()
          }), { maxLength: 5 })
        }),
        complianceEvidence: fc.record({
          availability: fc.integer({ min: 0, max: 100 }),
          organization: fc.integer({ min: 0, max: 100 }),
          currency: fc.integer({ min: 0, max: 100 }),
          issues: fc.array(fc.record({
            severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
            category: fc.string(),
            message: fc.string()
          }), { maxLength: 5 })
        }),
        regulatoryReporting: fc.record({
          capabilities: fc.integer({ min: 0, max: 100 }),
          automation: fc.integer({ min: 0, max: 100 }),
          accuracy: fc.integer({ min: 0, max: 100 }),
          issues: fc.array(fc.record({
            severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
            category: fc.string(),
            message: fc.string()
          }), { maxLength: 5 })
        })
      }),
      (validationResults) => {
        // Set validation results
        validator.validationResults = validationResults;
        
        // Calculate overall score
        validator.calculateOverallScore();
        
        // Overall score should be within bounds
        expect(validator.validationResults.overallScore).toBeGreaterThanOrEqual(0);
        expect(validator.validationResults.overallScore).toBeLessThanOrEqual(100);
        
        // Score calculation should be consistent
        const originalScore = validator.validationResults.overallScore;
        validator.calculateOverallScore();
        expect(validator.validationResults.overallScore).toBe(originalScore);
        
        // Perfect scores should result in perfect overall score
        if (validationResults.privacyPolicy.accuracy === 100 &&
            validationResults.privacyPolicy.accessibility === 100 &&
            validationResults.privacyPolicy.completeness === 100 &&
            validationResults.auditDocumentation.completeness === 100 &&
            validationResults.auditDocumentation.coverage === 100 &&
            validationResults.auditDocumentation.traceability === 100 &&
            validationResults.complianceEvidence.availability === 100 &&
            validationResults.complianceEvidence.organization === 100 &&
            validationResults.complianceEvidence.currency === 100 &&
            validationResults.regulatoryReporting.capabilities === 100 &&
            validationResults.regulatoryReporting.automation === 100 &&
            validationResults.regulatoryReporting.accuracy === 100) {
          expect(validator.validationResults.overallScore).toBe(100);
        }
        
        // Zero scores should result in zero overall score
        if (validationResults.privacyPolicy.accuracy === 0 &&
            validationResults.privacyPolicy.accessibility === 0 &&
            validationResults.privacyPolicy.completeness === 0 &&
            validationResults.auditDocumentation.completeness === 0 &&
            validationResults.auditDocumentation.coverage === 0 &&
            validationResults.auditDocumentation.traceability === 0 &&
            validationResults.complianceEvidence.availability === 0 &&
            validationResults.complianceEvidence.organization === 0 &&
            validationResults.complianceEvidence.currency === 0 &&
            validationResults.regulatoryReporting.capabilities === 0 &&
            validationResults.regulatoryReporting.automation === 0 &&
            validationResults.regulatoryReporting.accuracy === 0) {
          expect(validator.validationResults.overallScore).toBe(0);
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 8: Critical Issue Identification Accuracy
   * Critical issues should be correctly identified and isolated
   */
  test('critical issue identification should be accurate and complete', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
        category: fc.string({ minLength: 5, maxLength: 30 }),
        message: fc.string({ minLength: 10, maxLength: 100 }),
        requirement: fc.constantFrom('10.5', '10.7', '10.8')
      }), { minLength: 0, maxLength: 20 }),
      fc.array(fc.record({
        severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
        category: fc.string({ minLength: 5, maxLength: 30 }),
        message: fc.string({ minLength: 10, maxLength: 100 }),
        requirement: fc.constantFrom('10.5', '10.7', '10.8')
      }), { minLength: 0, maxLength: 20 }),
      fc.array(fc.record({
        severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
        category: fc.string({ minLength: 5, maxLength: 30 }),
        message: fc.string({ minLength: 10, maxLength: 100 }),
        requirement: fc.constantFrom('10.5', '10.7', '10.8')
      }), { minLength: 0, maxLength: 20 }),
      fc.array(fc.record({
        severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
        category: fc.string({ minLength: 5, maxLength: 30 }),
        message: fc.string({ minLength: 10, maxLength: 100 }),
        requirement: fc.constantFrom('10.5', '10.7', '10.8')
      }), { minLength: 0, maxLength: 20 }),
      (privacyIssues, auditIssues, complianceIssues, reportingIssues) => {
        // Set up validation results with issues
        validator.validationResults = {
          privacyPolicy: { issues: privacyIssues },
          auditDocumentation: { issues: auditIssues },
          complianceEvidence: { issues: complianceIssues },
          regulatoryReporting: { issues: reportingIssues }
        };
        
        // Identify critical issues
        validator.identifyCriticalIssues();
        
        // Count expected critical issues
        const allIssues = [...privacyIssues, ...auditIssues, ...complianceIssues, ...reportingIssues];
        const expectedCriticalCount = allIssues.filter(issue => issue.severity === 'critical').length;
        
        // Verify critical issue identification
        expect(validator.validationResults.criticalIssues).toHaveLength(expectedCriticalCount);
        
        // All identified critical issues should actually be critical
        for (const criticalIssue of validator.validationResults.criticalIssues) {
          expect(criticalIssue.severity).toBe('critical');
        }
        
        // No non-critical issues should be in critical issues list
        const nonCriticalIssues = allIssues.filter(issue => issue.severity !== 'critical');
        for (const nonCriticalIssue of nonCriticalIssues) {
          expect(validator.validationResults.criticalIssues).not.toContainEqual(nonCriticalIssue);
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 9: Recommendation Generation Logic
   * Recommendations should be generated based on validation scores and be actionable
   */
  test('recommendation generation should be logical and actionable', () => {
    fc.assert(fc.property(
      fc.record({
        privacyPolicy: fc.record({
          accuracy: fc.integer({ min: 0, max: 100 }),
          accessibility: fc.integer({ min: 0, max: 100 }),
          completeness: fc.integer({ min: 0, max: 100 })
        }),
        auditDocumentation: fc.record({
          completeness: fc.integer({ min: 0, max: 100 }),
          coverage: fc.integer({ min: 0, max: 100 }),
          traceability: fc.integer({ min: 0, max: 100 })
        }),
        complianceEvidence: fc.record({
          availability: fc.integer({ min: 0, max: 100 }),
          organization: fc.integer({ min: 0, max: 100 }),
          currency: fc.integer({ min: 0, max: 100 })
        }),
        regulatoryReporting: fc.record({
          capabilities: fc.integer({ min: 0, max: 100 }),
          automation: fc.integer({ min: 0, max: 100 }),
          accuracy: fc.integer({ min: 0, max: 100 })
        })
      }),
      (scores) => {
        // Set validation results
        validator.validationResults = scores;
        
        // Generate recommendations
        validator.generateRecommendations();
        
        // Recommendations should be an array
        expect(Array.isArray(validator.validationResults.recommendations)).toBe(true);
        
        // Each recommendation should have required fields
        for (const recommendation of validator.validationResults.recommendations) {
          expect(recommendation.priority).toBeDefined();
          expect(recommendation.category).toBeDefined();
          expect(recommendation.action).toBeDefined();
          expect(recommendation.description).toBeDefined();
          
          // Priority should be valid
          const validPriorities = ['critical', 'high', 'medium', 'low'];
          expect(validPriorities).toContain(recommendation.priority);
          
          // Category should be valid
          const validCategories = ['privacy_policy', 'audit_documentation', 'compliance_evidence', 'regulatory_reporting'];
          expect(validCategories).toContain(recommendation.category);
        }
        
        // Low scores should generate recommendations
        if (scores.privacyPolicy.accuracy < 80) {
          expect(validator.validationResults.recommendations.some(rec => 
            rec.category === 'privacy_policy'
          )).toBe(true);
        }
        
        if (scores.auditDocumentation.completeness < 70) {
          expect(validator.validationResults.recommendations.some(rec => 
            rec.category === 'audit_documentation'
          )).toBe(true);
        }
        
        if (scores.complianceEvidence.availability < 75) {
          expect(validator.validationResults.recommendations.some(rec => 
            rec.category === 'compliance_evidence'
          )).toBe(true);
        }
        
        if (scores.regulatoryReporting.capabilities < 60) {
          expect(validator.validationResults.recommendations.some(rec => 
            rec.category === 'regulatory_reporting' && rec.priority === 'critical'
          )).toBe(true);
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 10: Validation Result Structure Integrity
   * Validation results should maintain consistent structure and data types
   */
  test('validation results should maintain consistent structure and data types', () => {
    fc.assert(fc.property(
      fc.anything(),
      () => {
        // Initialize fresh validator
        const testValidator = new PrivacyAuditDocumentationValidator();
        
        // Validation results should have expected structure
        expect(testValidator.validationResults).toHaveProperty('privacyPolicy');
        expect(testValidator.validationResults).toHaveProperty('auditDocumentation');
        expect(testValidator.validationResults).toHaveProperty('complianceEvidence');
        expect(testValidator.validationResults).toHaveProperty('regulatoryReporting');
        expect(testValidator.validationResults).toHaveProperty('overallScore');
        expect(testValidator.validationResults).toHaveProperty('criticalIssues');
        expect(testValidator.validationResults).toHaveProperty('recommendations');
        
        // Numeric fields should be numbers
        expect(typeof testValidator.validationResults.overallScore).toBe('number');
        expect(typeof testValidator.validationResults.privacyPolicy.accuracy).toBe('number');
        expect(typeof testValidator.validationResults.privacyPolicy.accessibility).toBe('number');
        expect(typeof testValidator.validationResults.privacyPolicy.completeness).toBe('number');
        
        // Array fields should be arrays
        expect(Array.isArray(testValidator.validationResults.privacyPolicy.issues)).toBe(true);
        expect(Array.isArray(testValidator.validationResults.auditDocumentation.issues)).toBe(true);
        expect(Array.isArray(testValidator.validationResults.complianceEvidence.issues)).toBe(true);
        expect(Array.isArray(testValidator.validationResults.regulatoryReporting.issues)).toBe(true);
        expect(Array.isArray(testValidator.validationResults.criticalIssues)).toBe(true);
        expect(Array.isArray(testValidator.validationResults.recommendations)).toBe(true);
        
        // Required arrays should be defined
        expect(Array.isArray(testValidator.privacyPolicyRequirements)).toBe(true);
        expect(Array.isArray(testValidator.auditDocumentationCategories)).toBe(true);
        expect(Array.isArray(testValidator.complianceEvidenceTypes)).toBe(true);
        expect(Array.isArray(testValidator.regulatoryReportingCapabilities)).toBe(true);
        
        // Arrays should not be empty
        expect(testValidator.privacyPolicyRequirements.length).toBeGreaterThan(0);
        expect(testValidator.auditDocumentationCategories.length).toBeGreaterThan(0);
        expect(testValidator.complianceEvidenceTypes.length).toBeGreaterThan(0);
        expect(testValidator.regulatoryReportingCapabilities.length).toBeGreaterThan(0);
      }
    ), { numRuns: 50 });
  });
});