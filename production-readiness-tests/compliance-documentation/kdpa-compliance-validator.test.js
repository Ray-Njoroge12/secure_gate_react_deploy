/**
 * KDPA Compliance Validator Tests
 * 
 * Tests for the KDPA (Kenya Data Protection Act) compliance validation system
 */

const KDPAComplianceValidator = require('./kdpa-compliance-validator');
const fs = require('fs').promises;
const path = require('path');

describe('KDPA Compliance Validator', () => {
  let validator;

  beforeEach(() => {
    validator = new KDPAComplianceValidator();
  });

  describe('Data Protection Requirements Validation', () => {
    test('should validate lawful basis implementation', async () => {
      const result = await validator.validateLawfulBasis();
      expect(typeof result).toBe('boolean');
    });

    test('should validate data minimization practices', async () => {
      const result = await validator.validateDataMinimization();
      expect(typeof result).toBe('boolean');
    });

    test('should validate purpose limitation enforcement', async () => {
      const result = await validator.validatePurposeLimitation();
      expect(typeof result).toBe('boolean');
    });

    test('should validate data accuracy requirements', async () => {
      const result = await validator.validateDataAccuracy();
      expect(typeof result).toBe('boolean');
    });

    test('should validate storage limitation', async () => {
      const result = await validator.validateStorageLimitation();
      expect(typeof result).toBe('boolean');
    });

    test('should validate integrity and confidentiality', async () => {
      const result = await validator.validateIntegrityConfidentiality();
      expect(typeof result).toBe('boolean');
    });

    test('should complete data protection requirements validation', async () => {
      const result = await validator.validateDataProtectionRequirements();
      
      expect(result).toHaveProperty('lawfulBasisImplemented');
      expect(result).toHaveProperty('dataMinimizationCompliant');
      expect(result).toHaveProperty('purposeLimitationEnforced');
      expect(result).toHaveProperty('accuracyMaintained');
      expect(result).toHaveProperty('storageLimitationApplied');
      expect(result).toHaveProperty('integrityConfidentialityEnsured');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('violations');
      
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });

  describe('Local Data Handling Validation', () => {
    test('should validate data controller registration', async () => {
      const result = await validator.validateDataControllerRegistration();
      expect(typeof result).toBe('boolean');
    });

    test('should validate privacy notice provision', async () => {
      const result = await validator.validatePrivacyNotice();
      expect(typeof result).toBe('boolean');
    });

    test('should validate consent management', async () => {
      const result = await validator.validateConsentManagement();
      expect(typeof result).toBe('boolean');
    });

    test('should validate data subject rights support', async () => {
      const result = await validator.validateDataSubjectRights();
      expect(typeof result).toBe('boolean');
    });

    test('should validate DPO appointment', async () => {
      const result = await validator.validateDPOAppointment();
      expect(typeof result).toBe('boolean');
    });

    test('should validate local data residency', async () => {
      const result = await validator.validateLocalDataResidency();
      expect(typeof result).toBe('boolean');
    });

    test('should complete local data handling validation', async () => {
      const result = await validator.validateLocalDataHandling();
      
      expect(result).toHaveProperty('dataControllerRegistered');
      expect(result).toHaveProperty('privacyNoticeProvided');
      expect(result).toHaveProperty('consentManagementImplemented');
      expect(result).toHaveProperty('dataSubjectRightsSupported');
      expect(result).toHaveProperty('dataProtectionOfficerAppointed');
      expect(result).toHaveProperty('localDataResidency');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('violations');
      
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });

  describe('Breach Notification Procedures Validation', () => {
    test('should validate authority notification process', async () => {
      const result = await validator.validateAuthorityNotificationProcess();
      expect(typeof result).toBe('boolean');
    });

    test('should validate data subject notification process', async () => {
      const result = await validator.validateDataSubjectNotificationProcess();
      expect(typeof result).toBe('boolean');
    });

    test('should validate breach register maintenance', async () => {
      const result = await validator.validateBreachRegister();
      expect(typeof result).toBe('boolean');
    });

    test('should validate risk assessment procedure', async () => {
      const result = await validator.validateRiskAssessmentProcedure();
      expect(typeof result).toBe('boolean');
    });

    test('should validate notification timing compliance', async () => {
      const result = await validator.validateNotificationTiming();
      expect(typeof result).toBe('boolean');
    });

    test('should validate incident response plan', async () => {
      const result = await validator.validateIncidentResponsePlan();
      expect(typeof result).toBe('boolean');
    });

    test('should complete breach notification procedures validation', async () => {
      const result = await validator.validateBreachNotificationProcedures();
      
      expect(result).toHaveProperty('authorityNotificationProcess');
      expect(result).toHaveProperty('dataSubjectNotificationProcess');
      expect(result).toHaveProperty('breachRegisterMaintained');
      expect(result).toHaveProperty('riskAssessmentProcedure');
      expect(result).toHaveProperty('notificationTimingCompliant');
      expect(result).toHaveProperty('incidentResponsePlan');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('violations');
      
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });

  describe('Cross-Border Transfer Controls Validation', () => {
    test('should validate transfer safeguards', async () => {
      const result = await validator.validateTransferSafeguards();
      expect(typeof result).toBe('boolean');
    });

    test('should validate adequacy decisions', async () => {
      const result = await validator.validateAdequacyDecisions();
      expect(typeof result).toBe('boolean');
    });

    test('should validate derogations documentation', async () => {
      const result = await validator.validateDerogationsDocumentation();
      expect(typeof result).toBe('boolean');
    });

    test('should validate transfer impact assessment', async () => {
      const result = await validator.validateTransferImpactAssessment();
      expect(typeof result).toBe('boolean');
    });

    test('should validate data localization', async () => {
      const result = await validator.validateDataLocalization();
      expect(typeof result).toBe('boolean');
    });

    test('should validate transfer agreements', async () => {
      const result = await validator.validateTransferAgreements();
      expect(typeof result).toBe('boolean');
    });

    test('should complete cross-border transfer controls validation', async () => {
      const result = await validator.validateCrossBorderTransferControls();
      
      expect(result).toHaveProperty('transferSafeguardsImplemented');
      expect(result).toHaveProperty('adequacyDecisionChecked');
      expect(result).toHaveProperty('derogationsDocumented');
      expect(result).toHaveProperty('transferImpactAssessmentConducted');
      expect(result).toHaveProperty('dataLocalizationCompliant');
      expect(result).toHaveProperty('transferAgreementsInPlace');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('violations');
      
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    test('should check file existence correctly', async () => {
      // Test with a file that should exist
      const existsResult = await validator.checkFileExists('package.json');
      expect(typeof existsResult).toBe('boolean');
      
      // Test with a file that shouldn't exist
      const notExistsResult = await validator.checkFileExists('non-existent-file.txt');
      expect(notExistsResult).toBe(false);
    });

    test('should search for code patterns', async () => {
      const result = await validator.checkCodePattern('test', ['js', 'jsx']);
      expect(typeof result).toBe('boolean');
    });

    test('should get files recursively', async () => {
      const files = await validator.getFilesRecursively('.', ['js']);
      expect(Array.isArray(files)).toBe(true);
    });

    test('should search in directory', async () => {
      const regex = /test/i;
      const result = await validator.searchInDirectory('.', regex, ['js']);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Recommendations Generation', () => {
    test('should generate compliance recommendations', () => {
      // Set up some test results
      validator.complianceResults = {
        dataProtectionRequirements: { score: 60 },
        localDataHandling: { score: 70 },
        breachNotification: { score: 50 },
        crossBorderTransfer: { score: 80 }
      };
      
      const recommendations = validator.generateRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('category');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('recommendation');
        expect(rec).toHaveProperty('action');
        
        expect(typeof rec.category).toBe('string');
        expect(typeof rec.priority).toBe('string');
        expect(typeof rec.recommendation).toBe('string');
        expect(typeof rec.action).toBe('string');
      });
    });
  });

  describe('Compliance Summary Generation', () => {
    test('should generate compliance summary', () => {
      // Set up test results
      validator.complianceResults = {
        dataProtectionRequirements: { score: 85, violations: [] },
        localDataHandling: { score: 75, violations: ['test violation'] },
        breachNotification: { score: 90, violations: [] },
        crossBorderTransfer: { score: 80, violations: [] },
        violations: ['test violation'],
        recommendations: [{ category: 'test' }],
        overallCompliance: true
      };
      
      const summary = validator.generateComplianceSummary();
      
      expect(summary).toHaveProperty('dataProtection');
      expect(summary).toHaveProperty('localHandling');
      expect(summary).toHaveProperty('breachNotification');
      expect(summary).toHaveProperty('crossBorderTransfer');
      expect(summary).toHaveProperty('totalViolations');
      expect(summary).toHaveProperty('recommendationsCount');
      expect(summary).toHaveProperty('overallCompliance');
      
      expect(summary.dataProtection).toHaveProperty('score');
      expect(summary.dataProtection).toHaveProperty('status');
      expect(summary.dataProtection).toHaveProperty('criticalIssues');
      
      expect(typeof summary.totalViolations).toBe('number');
      expect(typeof summary.recommendationsCount).toBe('number');
      expect(typeof summary.overallCompliance).toBe('boolean');
    });
  });

  describe('Complete Validation', () => {
    test('should run complete KDPA compliance validation', async () => {
      const result = await validator.runCompleteValidation();
      
      expect(result).toHaveProperty('compliant');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
      
      expect(typeof result.compliant).toBe('boolean');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      
      expect(result.results).toHaveProperty('dataProtectionRequirements');
      expect(result.results).toHaveProperty('localDataHandling');
      expect(result.results).toHaveProperty('breachNotification');
      expect(result.results).toHaveProperty('crossBorderTransfer');
      expect(result.results).toHaveProperty('overallCompliance');
      expect(result.results).toHaveProperty('violations');
      expect(result.results).toHaveProperty('recommendations');
      
      expect(Array.isArray(result.results.violations)).toBe(true);
      expect(Array.isArray(result.results.recommendations)).toBe(true);
    }, 30000); // Increase timeout for complete validation
  });

  describe('KDPA Requirements Structure', () => {
    test('should have correct KDPA requirements structure', () => {
      expect(validator.kdpaRequirements).toHaveProperty('dataProtection');
      expect(validator.kdpaRequirements).toHaveProperty('localHandling');
      expect(validator.kdpaRequirements).toHaveProperty('breachNotification');
      expect(validator.kdpaRequirements).toHaveProperty('crossBorderTransfer');
      
      // Check data protection requirements
      expect(validator.kdpaRequirements.dataProtection).toHaveProperty('lawfulBasis');
      expect(Array.isArray(validator.kdpaRequirements.dataProtection.lawfulBasis)).toBe(true);
      expect(validator.kdpaRequirements.dataProtection.lawfulBasis).toContain('consent');
      expect(validator.kdpaRequirements.dataProtection.lawfulBasis).toContain('contract');
      
      // Check local handling requirements
      expect(validator.kdpaRequirements.localHandling).toHaveProperty('dataSubjectRights');
      expect(Array.isArray(validator.kdpaRequirements.localHandling.dataSubjectRights)).toBe(true);
      expect(validator.kdpaRequirements.localHandling.dataSubjectRights).toContain('access');
      expect(validator.kdpaRequirements.localHandling.dataSubjectRights).toContain('erasure');
      
      // Check breach notification requirements
      expect(validator.kdpaRequirements.breachNotification).toHaveProperty('authorityNotificationTime');
      expect(validator.kdpaRequirements.breachNotification.authorityNotificationTime).toBe(72);
      
      // Check cross-border transfer requirements
      expect(validator.kdpaRequirements.crossBorderTransfer).toHaveProperty('derogationsAllowed');
      expect(Array.isArray(validator.kdpaRequirements.crossBorderTransfer.derogationsAllowed)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors gracefully', async () => {
      // Mock a method to throw an error
      const originalMethod = validator.validateLawfulBasis;
      validator.validateLawfulBasis = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const result = await validator.validateDataProtectionRequirements();
      
      expect(result).toHaveProperty('violations');
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('Validation error');
      
      // Restore original method
      validator.validateLawfulBasis = originalMethod;
    });

    test('should handle file system errors gracefully', async () => {
      const result = await validator.checkFileExists('/non/existent/path/file.txt');
      expect(result).toBe(false);
    });

    test('should handle directory search errors gracefully', async () => {
      const result = await validator.searchInDirectory('/non/existent/path', /test/, ['js']);
      expect(result).toBe(false);
    });
  });

  describe('Integration with KDPA Specific Requirements', () => {
    test('should validate Kenya-specific data protection requirements', async () => {
      const result = await validator.validateDataProtectionRequirements();
      
      // KDPA requires specific lawful bases
      expect(result).toHaveProperty('lawfulBasisImplemented');
      
      // KDPA emphasizes data minimization
      expect(result).toHaveProperty('dataMinimizationCompliant');
      
      // KDPA requires purpose limitation
      expect(result).toHaveProperty('purposeLimitationEnforced');
    });

    test('should validate Kenya-specific local handling requirements', async () => {
      const result = await validator.validateLocalDataHandling();
      
      // KDPA requires data controller registration
      expect(result).toHaveProperty('dataControllerRegistered');
      
      // KDPA requires DPO appointment for certain organizations
      expect(result).toHaveProperty('dataProtectionOfficerAppointed');
      
      // KDPA has local data residency considerations
      expect(result).toHaveProperty('localDataResidency');
    });

    test('should validate Kenya-specific breach notification requirements', async () => {
      const result = await validator.validateBreachNotificationProcedures();
      
      // KDPA requires 72-hour notification to authority
      expect(result).toHaveProperty('notificationTimingCompliant');
      
      // KDPA requires data subject notification in certain cases
      expect(result).toHaveProperty('dataSubjectNotificationProcess');
      
      // KDPA requires breach register maintenance
      expect(result).toHaveProperty('breachRegisterMaintained');
    });

    test('should validate Kenya-specific cross-border transfer requirements', async () => {
      const result = await validator.validateCrossBorderTransferControls();
      
      // KDPA requires safeguards for international transfers
      expect(result).toHaveProperty('transferSafeguardsImplemented');
      
      // KDPA allows certain derogations
      expect(result).toHaveProperty('derogationsDocumented');
      
      // KDPA requires transfer impact assessments
      expect(result).toHaveProperty('transferImpactAssessmentConducted');
    });
  });
});