/**
 * KDPA (Kenya Data Protection Act) Compliance Validator
 * 
 * Validates compliance with Kenya's Data Protection Act requirements including:
 * - Data protection requirements specific to Kenya
 * - Local data handling practices validation
 * - Breach notification procedure testing
 * - Cross-border data transfer controls validation
 */

const fs = require('fs').promises;
const path = require('path');

class KDPAComplianceValidator {
  constructor() {
    this.complianceResults = {
      dataProtectionRequirements: {},
      localDataHandling: {},
      breachNotification: {},
      crossBorderTransfer: {},
      overallCompliance: false,
      violations: [],
      recommendations: []
    };
    
    this.kdpaRequirements = {
      dataProtection: {
        lawfulBasis: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'],
        dataMinimization: true,
        purposeLimitation: true,
        accuracyRequirement: true,
        storageLimit: true,
        integrityConfidentiality: true
      },
      localHandling: {
        dataControllerRegistration: true,
        privacyNoticeRequirement: true,
        consentManagement: true,
        dataSubjectRights: ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'],
        dataProtectionOfficer: true
      },
      breachNotification: {
        authorityNotificationTime: 72, // hours
        dataSubjectNotificationRequired: true,
        breachRegisterRequired: true,
        riskAssessmentRequired: true
      },
      crossBorderTransfer: {
        adequacyDecisionRequired: false, // Kenya to other countries
        safeguardsRequired: true,
        derogationsAllowed: ['consent', 'contract', 'public_interest', 'legal_claims', 'vital_interests'],
        transferImpactAssessment: true
      }
    };
  }

  /**
   * Validate KDPA data protection requirements
   */
  async validateDataProtectionRequirements() {
    console.log('🔍 Validating KDPA data protection requirements...');
    
    const results = {
      lawfulBasisImplemented: false,
      dataMinimizationCompliant: false,
      purposeLimitationEnforced: false,
      accuracyMaintained: false,
      storageLimitationApplied: false,
      integrityConfidentialityEnsured: false,
      violations: [],
      score: 0
    };

    try {
      // Check lawful basis implementation
      results.lawfulBasisImplemented = await this.validateLawfulBasis();
      
      // Check data minimization
      results.dataMinimizationCompliant = await this.validateDataMinimization();
      
      // Check purpose limitation
      results.purposeLimitationEnforced = await this.validatePurposeLimitation();
      
      // Check accuracy requirements
      results.accuracyMaintained = await this.validateDataAccuracy();
      
      // Check storage limitation
      results.storageLimitationApplied = await this.validateStorageLimitation();
      
      // Check integrity and confidentiality
      results.integrityConfidentialityEnsured = await this.validateIntegrityConfidentiality();
      
      // Calculate compliance score
      const checks = [
        results.lawfulBasisImplemented,
        results.dataMinimizationCompliant,
        results.purposeLimitationEnforced,
        results.accuracyMaintained,
        results.storageLimitationApplied,
        results.integrityConfidentialityEnsured
      ];
      
      results.score = (checks.filter(Boolean).length / checks.length) * 100;
      
      this.complianceResults.dataProtectionRequirements = results;
      
      console.log(`✅ Data protection requirements validation completed. Score: ${results.score}%`);
      
    } catch (error) {
      console.error('❌ Error validating data protection requirements:', error);
      results.violations.push(`Validation error: ${error.message}`);
    }

    return results;
  }

  /**
   * Validate local data handling practices
   */
  async validateLocalDataHandling() {
    console.log('🔍 Validating local data handling practices...');
    
    const results = {
      dataControllerRegistered: false,
      privacyNoticeProvided: false,
      consentManagementImplemented: false,
      dataSubjectRightsSupported: false,
      dataProtectionOfficerAppointed: false,
      localDataResidency: false,
      violations: [],
      score: 0
    };

    try {
      // Check data controller registration
      results.dataControllerRegistered = await this.validateDataControllerRegistration();
      
      // Check privacy notice
      results.privacyNoticeProvided = await this.validatePrivacyNotice();
      
      // Check consent management
      results.consentManagementImplemented = await this.validateConsentManagement();
      
      // Check data subject rights
      results.dataSubjectRightsSupported = await this.validateDataSubjectRights();
      
      // Check DPO appointment
      results.dataProtectionOfficerAppointed = await this.validateDPOAppointment();
      
      // Check local data residency requirements
      results.localDataResidency = await this.validateLocalDataResidency();
      
      // Calculate compliance score
      const checks = [
        results.dataControllerRegistered,
        results.privacyNoticeProvided,
        results.consentManagementImplemented,
        results.dataSubjectRightsSupported,
        results.dataProtectionOfficerAppointed,
        results.localDataResidency
      ];
      
      results.score = (checks.filter(Boolean).length / checks.length) * 100;
      
      this.complianceResults.localDataHandling = results;
      
      console.log(`✅ Local data handling validation completed. Score: ${results.score}%`);
      
    } catch (error) {
      console.error('❌ Error validating local data handling:', error);
      results.violations.push(`Validation error: ${error.message}`);
    }

    return results;
  }

  /**
   * Validate breach notification procedures
   */
  async validateBreachNotificationProcedures() {
    console.log('🔍 Validating breach notification procedures...');
    
    const results = {
      authorityNotificationProcess: false,
      dataSubjectNotificationProcess: false,
      breachRegisterMaintained: false,
      riskAssessmentProcedure: false,
      notificationTimingCompliant: false,
      incidentResponsePlan: false,
      violations: [],
      score: 0
    };

    try {
      // Check authority notification process
      results.authorityNotificationProcess = await this.validateAuthorityNotificationProcess();
      
      // Check data subject notification process
      results.dataSubjectNotificationProcess = await this.validateDataSubjectNotificationProcess();
      
      // Check breach register
      results.breachRegisterMaintained = await this.validateBreachRegister();
      
      // Check risk assessment procedure
      results.riskAssessmentProcedure = await this.validateRiskAssessmentProcedure();
      
      // Check notification timing compliance
      results.notificationTimingCompliant = await this.validateNotificationTiming();
      
      // Check incident response plan
      results.incidentResponsePlan = await this.validateIncidentResponsePlan();
      
      // Calculate compliance score
      const checks = [
        results.authorityNotificationProcess,
        results.dataSubjectNotificationProcess,
        results.breachRegisterMaintained,
        results.riskAssessmentProcedure,
        results.notificationTimingCompliant,
        results.incidentResponsePlan
      ];
      
      results.score = (checks.filter(Boolean).length / checks.length) * 100;
      
      this.complianceResults.breachNotification = results;
      
      console.log(`✅ Breach notification validation completed. Score: ${results.score}%`);
      
    } catch (error) {
      console.error('❌ Error validating breach notification procedures:', error);
      results.violations.push(`Validation error: ${error.message}`);
    }

    return results;
  }

  /**
   * Validate cross-border data transfer controls
   */
  async validateCrossBorderTransferControls() {
    console.log('🔍 Validating cross-border data transfer controls...');
    
    const results = {
      transferSafeguardsImplemented: false,
      adequacyDecisionChecked: false,
      derogationsDocumented: false,
      transferImpactAssessmentConducted: false,
      dataLocalizationCompliant: false,
      transferAgreementsInPlace: false,
      violations: [],
      score: 0
    };

    try {
      // Check transfer safeguards
      results.transferSafeguardsImplemented = await this.validateTransferSafeguards();
      
      // Check adequacy decisions
      results.adequacyDecisionChecked = await this.validateAdequacyDecisions();
      
      // Check derogations documentation
      results.derogationsDocumented = await this.validateDerogationsDocumentation();
      
      // Check transfer impact assessment
      results.transferImpactAssessmentConducted = await this.validateTransferImpactAssessment();
      
      // Check data localization compliance
      results.dataLocalizationCompliant = await this.validateDataLocalization();
      
      // Check transfer agreements
      results.transferAgreementsInPlace = await this.validateTransferAgreements();
      
      // Calculate compliance score
      const checks = [
        results.transferSafeguardsImplemented,
        results.adequacyDecisionChecked,
        results.derogationsDocumented,
        results.transferImpactAssessmentConducted,
        results.dataLocalizationCompliant,
        results.transferAgreementsInPlace
      ];
      
      results.score = (checks.filter(Boolean).length / checks.length) * 100;
      
      this.complianceResults.crossBorderTransfer = results;
      
      console.log(`✅ Cross-border transfer validation completed. Score: ${results.score}%`);
      
    } catch (error) {
      console.error('❌ Error validating cross-border transfer controls:', error);
      results.violations.push(`Validation error: ${error.message}`);
    }

    return results;
  }

  /**
   * Validate lawful basis implementation
   */
  async validateLawfulBasis() {
    try {
      // Check if lawful basis is documented for each processing activity
      const privacyPolicyExists = await this.checkFileExists('secure-gate-access/docs/privacy-policy.md');
      const consentManagementExists = await this.checkCodePattern('consent', ['jsx', 'js']);
      const legalBasisDocumented = await this.checkCodePattern('lawfulBasis|legal.basis', ['js', 'jsx']);
      
      return privacyPolicyExists && consentManagementExists && legalBasisDocumented;
    } catch (error) {
      console.error('Error validating lawful basis:', error);
      return false;
    }
  }

  /**
   * Validate data minimization practices
   */
  async validateDataMinimization() {
    try {
      // Check for data minimization in data collection
      const dataValidationExists = await this.checkCodePattern('validation|minimize|necessary', ['js', 'jsx']);
      const fieldLimitationExists = await this.checkCodePattern('required.*field|optional.*field', ['js', 'jsx']);
      const dataRetentionPolicyExists = await this.checkFileExists('secure-gate-access/docs/data-retention-policy.md');
      
      return dataValidationExists && fieldLimitationExists && dataRetentionPolicyExists;
    } catch (error) {
      console.error('Error validating data minimization:', error);
      return false;
    }
  }

  /**
   * Validate purpose limitation enforcement
   */
  async validatePurposeLimitation() {
    try {
      // Check for purpose specification in data processing
      const purposeDocumentationExists = await this.checkCodePattern('purpose|reason.*processing', ['js', 'jsx']);
      const accessControlExists = await this.checkCodePattern('role.*based|permission|authorize', ['js', 'jsx']);
      const auditLoggingExists = await this.checkCodePattern('audit.*log|log.*audit', ['js', 'jsx']);
      
      return purposeDocumentationExists && accessControlExists && auditLoggingExists;
    } catch (error) {
      console.error('Error validating purpose limitation:', error);
      return false;
    }
  }

  /**
   * Validate data accuracy requirements
   */
  async validateDataAccuracy() {
    try {
      // Check for data accuracy measures
      const dataValidationExists = await this.checkCodePattern('validate|verify|accuracy', ['js', 'jsx']);
      const updateMechanismExists = await this.checkCodePattern('update.*profile|edit.*data', ['js', 'jsx']);
      const dataQualityChecksExist = await this.checkCodePattern('quality.*check|data.*integrity', ['js', 'jsx']);
      
      return dataValidationExists && updateMechanismExists && dataQualityChecksExist;
    } catch (error) {
      console.error('Error validating data accuracy:', error);
      return false;
    }
  }

  /**
   * Validate storage limitation
   */
  async validateStorageLimitation() {
    try {
      // Check for storage limitation measures
      const retentionPolicyExists = await this.checkCodePattern('retention|expire|delete.*old', ['js', 'jsx']);
      const dataArchivingExists = await this.checkCodePattern('archive|cleanup|purge', ['js', 'jsx']);
      const storageMonitoringExists = await this.checkCodePattern('storage.*limit|disk.*usage', ['js', 'jsx']);
      
      return retentionPolicyExists && dataArchivingExists && storageMonitoringExists;
    } catch (error) {
      console.error('Error validating storage limitation:', error);
      return false;
    }
  }

  /**
   * Validate integrity and confidentiality
   */
  async validateIntegrityConfidentiality() {
    try {
      // Check for security measures
      const encryptionExists = await this.checkCodePattern('encrypt|hash|secure', ['js', 'jsx']);
      const accessControlExists = await this.checkCodePattern('authentication|authorization', ['js', 'jsx']);
      const securityHeadersExist = await this.checkCodePattern('helmet|security.*header', ['js', 'jsx']);
      
      return encryptionExists && accessControlExists && securityHeadersExist;
    } catch (error) {
      console.error('Error validating integrity and confidentiality:', error);
      return false;
    }
  }

  /**
   * Validate data controller registration
   */
  async validateDataControllerRegistration() {
    try {
      // Check for data controller documentation
      const dataControllerDocExists = await this.checkFileExists('secure-gate-access/docs/data-controller-info.md');
      const registrationInfoExists = await this.checkCodePattern('data.*controller|registration.*number', ['js', 'jsx', 'md']);
      
      return dataControllerDocExists || registrationInfoExists;
    } catch (error) {
      console.error('Error validating data controller registration:', error);
      return false;
    }
  }

  /**
   * Validate privacy notice provision
   */
  async validatePrivacyNotice() {
    try {
      // Check for privacy notice
      const privacyNoticeExists = await this.checkFileExists('secure-gate-access/client/public/privacy-notice.html');
      const privacyPolicyExists = await this.checkFileExists('secure-gate-access/docs/privacy-policy.md');
      const privacyComponentExists = await this.checkCodePattern('privacy.*notice|privacy.*policy', ['jsx', 'js']);
      
      return privacyNoticeExists || privacyPolicyExists || privacyComponentExists;
    } catch (error) {
      console.error('Error validating privacy notice:', error);
      return false;
    }
  }

  /**
   * Validate consent management
   */
  async validateConsentManagement() {
    try {
      // Check for consent management implementation
      const consentComponentExists = await this.checkCodePattern('consent|agree|accept.*terms', ['jsx', 'js']);
      const consentStorageExists = await this.checkCodePattern('consent.*record|store.*consent', ['js', 'jsx']);
      const consentWithdrawalExists = await this.checkCodePattern('withdraw.*consent|revoke.*consent', ['js', 'jsx']);
      
      return consentComponentExists && consentStorageExists && consentWithdrawalExists;
    } catch (error) {
      console.error('Error validating consent management:', error);
      return false;
    }
  }

  /**
   * Validate data subject rights support
   */
  async validateDataSubjectRights() {
    try {
      // Check for data subject rights implementation
      const dataAccessExists = await this.checkCodePattern('data.*access|export.*data|download.*data', ['js', 'jsx']);
      const dataRectificationExists = await this.checkCodePattern('update.*profile|edit.*data|correct.*data', ['js', 'jsx']);
      const dataErasureExists = await this.checkCodePattern('delete.*account|remove.*data|erase.*data', ['js', 'jsx']);
      const dataPortabilityExists = await this.checkCodePattern('export.*data|download.*data|portable.*format', ['js', 'jsx']);
      
      return dataAccessExists && dataRectificationExists && dataErasureExists && dataPortabilityExists;
    } catch (error) {
      console.error('Error validating data subject rights:', error);
      return false;
    }
  }

  /**
   * Validate DPO appointment
   */
  async validateDPOAppointment() {
    try {
      // Check for DPO documentation
      const dpoDocExists = await this.checkFileExists('secure-gate-access/docs/data-protection-officer.md');
      const dpoContactExists = await this.checkCodePattern('data.*protection.*officer|dpo.*contact', ['js', 'jsx', 'md']);
      
      return dpoDocExists || dpoContactExists;
    } catch (error) {
      console.error('Error validating DPO appointment:', error);
      return false;
    }
  }

  /**
   * Validate local data residency
   */
  async validateLocalDataResidency() {
    try {
      // Check for data residency controls
      const dataResidencyDocExists = await this.checkFileExists('secure-gate-access/docs/data-residency-policy.md');
      const localStorageExists = await this.checkCodePattern('kenya|local.*storage|data.*residency', ['js', 'jsx', 'md']);
      const cloudProviderDocExists = await this.checkCodePattern('aws.*region|cloud.*provider.*kenya', ['js', 'jsx', 'md']);
      
      return dataResidencyDocExists || localStorageExists || cloudProviderDocExists;
    } catch (error) {
      console.error('Error validating local data residency:', error);
      return false;
    }
  }

  /**
   * Validate authority notification process
   */
  async validateAuthorityNotificationProcess() {
    try {
      // Check for breach notification procedures
      const breachProcedureExists = await this.checkFileExists('secure-gate-access/docs/breach-notification-procedure.md');
      const notificationCodeExists = await this.checkCodePattern('breach.*notification|notify.*authority', ['js', 'jsx']);
      const incidentResponseExists = await this.checkCodePattern('incident.*response|security.*breach', ['js', 'jsx']);
      
      return breachProcedureExists || notificationCodeExists || incidentResponseExists;
    } catch (error) {
      console.error('Error validating authority notification process:', error);
      return false;
    }
  }

  /**
   * Validate data subject notification process
   */
  async validateDataSubjectNotificationProcess() {
    try {
      // Check for data subject notification procedures
      const subjectNotificationExists = await this.checkCodePattern('notify.*user|user.*notification.*breach', ['js', 'jsx']);
      const emailNotificationExists = await this.checkCodePattern('email.*breach|breach.*email', ['js', 'jsx']);
      const notificationTemplateExists = await this.checkCodePattern('breach.*template|notification.*template', ['js', 'jsx']);
      
      return subjectNotificationExists || emailNotificationExists || notificationTemplateExists;
    } catch (error) {
      console.error('Error validating data subject notification process:', error);
      return false;
    }
  }

  /**
   * Validate breach register maintenance
   */
  async validateBreachRegister() {
    try {
      // Check for breach register implementation
      const breachLogExists = await this.checkCodePattern('breach.*log|incident.*log|security.*log', ['js', 'jsx']);
      const breachRecordExists = await this.checkCodePattern('breach.*record|incident.*record', ['js', 'jsx']);
      const auditTrailExists = await this.checkCodePattern('audit.*trail|log.*audit', ['js', 'jsx']);
      
      return breachLogExists || breachRecordExists || auditTrailExists;
    } catch (error) {
      console.error('Error validating breach register:', error);
      return false;
    }
  }

  /**
   * Validate risk assessment procedure
   */
  async validateRiskAssessmentProcedure() {
    try {
      // Check for risk assessment implementation
      const riskAssessmentExists = await this.checkCodePattern('risk.*assessment|impact.*assessment', ['js', 'jsx']);
      const securityAnalysisExists = await this.checkCodePattern('security.*analysis|vulnerability.*assessment', ['js', 'jsx']);
      const riskDocumentationExists = await this.checkFileExists('secure-gate-access/docs/risk-assessment.md');
      
      return riskAssessmentExists || securityAnalysisExists || riskDocumentationExists;
    } catch (error) {
      console.error('Error validating risk assessment procedure:', error);
      return false;
    }
  }

  /**
   * Validate notification timing compliance
   */
  async validateNotificationTiming() {
    try {
      // Check for timing compliance in notification procedures
      const timingRequirementExists = await this.checkCodePattern('72.*hour|notification.*timing|breach.*deadline', ['js', 'jsx', 'md']);
      const automatedNotificationExists = await this.checkCodePattern('automated.*notification|immediate.*notification', ['js', 'jsx']);
      const escalationProcedureExists = await this.checkCodePattern('escalation|urgent.*notification', ['js', 'jsx']);
      
      return timingRequirementExists || automatedNotificationExists || escalationProcedureExists;
    } catch (error) {
      console.error('Error validating notification timing:', error);
      return false;
    }
  }

  /**
   * Validate incident response plan
   */
  async validateIncidentResponsePlan() {
    try {
      // Check for incident response plan
      const incidentPlanExists = await this.checkFileExists('secure-gate-access/docs/incident-response-plan.md');
      const responseCodeExists = await this.checkCodePattern('incident.*response|emergency.*response', ['js', 'jsx']);
      const securityPlaybookExists = await this.checkFileExists('secure-gate-access/docs/security-playbook.md');
      
      return incidentPlanExists || responseCodeExists || securityPlaybookExists;
    } catch (error) {
      console.error('Error validating incident response plan:', error);
      return false;
    }
  }

  /**
   * Validate transfer safeguards
   */
  async validateTransferSafeguards() {
    try {
      // Check for transfer safeguards
      const safeguardsDocExists = await this.checkFileExists('secure-gate-access/docs/transfer-safeguards.md');
      const encryptionExists = await this.checkCodePattern('encrypt.*transfer|secure.*transfer', ['js', 'jsx']);
      const contractualSafeguardsExist = await this.checkCodePattern('contractual.*safeguard|data.*processing.*agreement', ['js', 'jsx', 'md']);
      
      return safeguardsDocExists || encryptionExists || contractualSafeguardsExist;
    } catch (error) {
      console.error('Error validating transfer safeguards:', error);
      return false;
    }
  }

  /**
   * Validate adequacy decisions
   */
  async validateAdequacyDecisions() {
    try {
      // Check for adequacy decision documentation
      const adequacyDocExists = await this.checkFileExists('secure-gate-access/docs/adequacy-decisions.md');
      const adequacyCheckExists = await this.checkCodePattern('adequacy.*decision|adequate.*protection', ['js', 'jsx', 'md']);
      const countryAssessmentExists = await this.checkCodePattern('country.*assessment|jurisdiction.*review', ['js', 'jsx', 'md']);
      
      return adequacyDocExists || adequacyCheckExists || countryAssessmentExists;
    } catch (error) {
      console.error('Error validating adequacy decisions:', error);
      return false;
    }
  }

  /**
   * Validate derogations documentation
   */
  async validateDerogationsDocumentation() {
    try {
      // Check for derogations documentation
      const derogationsDocExists = await this.checkFileExists('secure-gate-access/docs/transfer-derogations.md');
      const consentBasedTransferExists = await this.checkCodePattern('consent.*transfer|explicit.*consent', ['js', 'jsx']);
      const contractualNecessityExists = await this.checkCodePattern('contractual.*necessity|contract.*performance', ['js', 'jsx']);
      
      return derogationsDocExists || consentBasedTransferExists || contractualNecessityExists;
    } catch (error) {
      console.error('Error validating derogations documentation:', error);
      return false;
    }
  }

  /**
   * Validate transfer impact assessment
   */
  async validateTransferImpactAssessment() {
    try {
      // Check for transfer impact assessment
      const tiaDocExists = await this.checkFileExists('secure-gate-access/docs/transfer-impact-assessment.md');
      const impactAnalysisExists = await this.checkCodePattern('transfer.*impact|impact.*assessment.*transfer', ['js', 'jsx', 'md']);
      const riskEvaluationExists = await this.checkCodePattern('transfer.*risk|cross.*border.*risk', ['js', 'jsx', 'md']);
      
      return tiaDocExists || impactAnalysisExists || riskEvaluationExists;
    } catch (error) {
      console.error('Error validating transfer impact assessment:', error);
      return false;
    }
  }

  /**
   * Validate data localization
   */
  async validateDataLocalization() {
    try {
      // Check for data localization compliance
      const localizationDocExists = await this.checkFileExists('secure-gate-access/docs/data-localization-policy.md');
      const localStorageExists = await this.checkCodePattern('local.*storage|kenya.*data.*center', ['js', 'jsx', 'md']);
      const residencyRequirementExists = await this.checkCodePattern('data.*residency|local.*processing', ['js', 'jsx', 'md']);
      
      return localizationDocExists || localStorageExists || residencyRequirementExists;
    } catch (error) {
      console.error('Error validating data localization:', error);
      return false;
    }
  }

  /**
   * Validate transfer agreements
   */
  async validateTransferAgreements() {
    try {
      // Check for transfer agreements
      const transferAgreementExists = await this.checkFileExists('secure-gate-access/docs/data-transfer-agreements.md');
      const dpaExists = await this.checkCodePattern('data.*processing.*agreement|dpa', ['js', 'jsx', 'md']);
      const sccExists = await this.checkCodePattern('standard.*contractual.*clause|scc', ['js', 'jsx', 'md']);
      
      return transferAgreementExists || dpaExists || sccExists;
    } catch (error) {
      console.error('Error validating transfer agreements:', error);
      return false;
    }
  }

  /**
   * Check if a file exists
   */
  async checkFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check for code patterns in files
   */
  async checkCodePattern(pattern, extensions) {
    try {
      const regex = new RegExp(pattern, 'i');
      const searchPaths = [
        'secure-gate-access/client/src',
        'secure-gate-access/server/src',
        'secure-gate-access/docs'
      ];
      
      for (const searchPath of searchPaths) {
        const found = await this.searchInDirectory(searchPath, regex, extensions);
        if (found) return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error checking code pattern ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Search for pattern in directory
   */
  async searchInDirectory(dirPath, regex, extensions) {
    try {
      const files = await this.getFilesRecursively(dirPath, extensions);
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf8');
          if (regex.test(content)) {
            return true;
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get files recursively
   */
  async getFilesRecursively(dirPath, extensions) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath, extensions);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).slice(1);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  /**
   * Generate compliance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Data protection recommendations
    if (this.complianceResults.dataProtectionRequirements.score < 100) {
      recommendations.push({
        category: 'Data Protection',
        priority: 'High',
        recommendation: 'Implement comprehensive lawful basis documentation for all data processing activities',
        action: 'Create detailed privacy policy and consent management system'
      });
    }
    
    // Local data handling recommendations
    if (this.complianceResults.localDataHandling.score < 100) {
      recommendations.push({
        category: 'Local Data Handling',
        priority: 'High',
        recommendation: 'Ensure data controller registration with Kenya Data Protection Authority',
        action: 'Complete registration process and maintain compliance documentation'
      });
    }
    
    // Breach notification recommendations
    if (this.complianceResults.breachNotification.score < 100) {
      recommendations.push({
        category: 'Breach Notification',
        priority: 'Critical',
        recommendation: 'Implement automated breach notification system with 72-hour compliance',
        action: 'Develop incident response procedures and notification templates'
      });
    }
    
    // Cross-border transfer recommendations
    if (this.complianceResults.crossBorderTransfer.score < 100) {
      recommendations.push({
        category: 'Cross-Border Transfer',
        priority: 'Medium',
        recommendation: 'Implement transfer safeguards and impact assessments',
        action: 'Document transfer mechanisms and ensure adequate protection'
      });
    }
    
    return recommendations;
  }

  /**
   * Run complete KDPA compliance validation
   */
  async runCompleteValidation() {
    console.log('🚀 Starting KDPA compliance validation...');
    
    try {
      // Run all validation checks
      await this.validateDataProtectionRequirements();
      await this.validateLocalDataHandling();
      await this.validateBreachNotificationProcedures();
      await this.validateCrossBorderTransferControls();
      
      // Calculate overall compliance score
      const scores = [
        this.complianceResults.dataProtectionRequirements.score,
        this.complianceResults.localDataHandling.score,
        this.complianceResults.breachNotification.score,
        this.complianceResults.crossBorderTransfer.score
      ];
      
      const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      this.complianceResults.overallCompliance = overallScore >= 80;
      
      // Generate recommendations
      this.complianceResults.recommendations = this.generateRecommendations();
      
      // Collect all violations
      this.complianceResults.violations = [
        ...this.complianceResults.dataProtectionRequirements.violations,
        ...this.complianceResults.localDataHandling.violations,
        ...this.complianceResults.breachNotification.violations,
        ...this.complianceResults.crossBorderTransfer.violations
      ];
      
      console.log(`✅ KDPA compliance validation completed. Overall score: ${overallScore.toFixed(1)}%`);
      
      return {
        compliant: this.complianceResults.overallCompliance,
        score: overallScore,
        results: this.complianceResults,
        summary: this.generateComplianceSummary()
      };
      
    } catch (error) {
      console.error('❌ Error during KDPA compliance validation:', error);
      throw error;
    }
  }

  /**
   * Generate compliance summary
   */
  generateComplianceSummary() {
    const results = this.complianceResults;
    
    return {
      dataProtection: {
        score: results.dataProtectionRequirements.score,
        status: results.dataProtectionRequirements.score >= 80 ? 'Compliant' : 'Non-Compliant',
        criticalIssues: results.dataProtectionRequirements.violations.length
      },
      localHandling: {
        score: results.localDataHandling.score,
        status: results.localDataHandling.score >= 80 ? 'Compliant' : 'Non-Compliant',
        criticalIssues: results.localDataHandling.violations.length
      },
      breachNotification: {
        score: results.breachNotification.score,
        status: results.breachNotification.score >= 80 ? 'Compliant' : 'Non-Compliant',
        criticalIssues: results.breachNotification.violations.length
      },
      crossBorderTransfer: {
        score: results.crossBorderTransfer.score,
        status: results.crossBorderTransfer.score >= 80 ? 'Compliant' : 'Non-Compliant',
        criticalIssues: results.crossBorderTransfer.violations.length
      },
      totalViolations: results.violations.length,
      recommendationsCount: results.recommendations.length,
      overallCompliance: results.overallCompliance
    };
  }
}

module.exports = KDPAComplianceValidator;