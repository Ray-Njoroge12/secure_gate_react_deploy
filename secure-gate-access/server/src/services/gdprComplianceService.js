/**
 * GDPR & International Compliance Service for Secure Gate Access Control System
 * 
 * Provides comprehensive GDPR and international data privacy compliance validation
 * Features:
 * - Data minimization validation
 * - Encryption validation (AES-256 at rest, TLS 1.3 in transit)
 * - Automated data subject request handling
 * - Cross-border data transfer compliance
 * - International privacy standards validation
 */

import loggingService from './loggingService.js';
import centralizedLoggingService from './centralizedLoggingService.js';
import auditTraceabilityService from './auditTraceabilityService.js';
import rollbackAlertingService from './rollbackAlertingService.js';
import { dbManager } from '../database/db.enhanced.js';
import { validateEncryptionConfig } from './encryptionService.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class GDPRComplianceService {
  constructor() {
    this.config = {
      gdpr: {
        enabled: true,
        compliance_frequency: 'monthly',
        reporting: {
          format: 'pdf',
          recipients: ['dpo@securegate.com', 'compliance@securegate.com', 'legal@securegate.com'],
          outputDirectory: '/app/compliance_audits/gdpr'
        }
      },
      data_minimization: {
        enabled: true,
        requirements: [
          'visitor_data_minimization',
          'guard_data_minimization',
          'access_log_minimization',
          'audit_log_minimization',
          'personal_data_retention'
        ],
        validation: {
          data_collection_necessity: true,
          data_retention_limits: true,
          data_purpose_limitation: true,
          data_accuracy: true
        }
      },
      encryption: {
        enabled: true,
        at_rest: {
          algorithm: 'AES-256',
          key_management: true,
          key_rotation: true,
          key_storage: true
        },
        in_transit: {
          protocol: 'TLS 1.3',
          certificate_validation: true,
          perfect_forward_secrecy: true,
          hsts_enforcement: true
        },
        validation: {
          encryption_verification: true,
          key_management_audit: true,
          certificate_validation: true,
          protocol_compliance: true
        }
      },
      data_subject_requests: {
        enabled: true,
        request_types: [
          'access_request',
          'rectification_request',
          'erasure_request',
          'portability_request',
          'objection_request',
          'restriction_request'
        ],
        validation: {
          automated_processing: true,
          response_time_compliance: true,
          request_verification: true,
          data_subject_identification: true
        }
      },
      cross_border_transfers: {
        enabled: true,
        transfer_mechanisms: [
          'adequacy_decision',
          'standard_contractual_clauses',
          'binding_corporate_rules',
          'certification_mechanism',
          'derogations'
        ],
        validation: {
          transfer_legality: true,
          recipient_country_adequacy: true,
          transfer_agreements: true,
          data_protection_safeguards: true
        }
      },
      international_standards: {
        enabled: true,
        standards: [
          'ccpa', // California Consumer Privacy Act
          'pipeda', // Personal Information Protection and Electronic Documents Act (Canada)
          'pdpa', // Personal Data Protection Act (Singapore)
          'lgpd', // Lei Geral de Proteção de Dados (Brazil)
          'pdpa_thailand', // Personal Data Protection Act (Thailand)
          'privacy_act_australia' // Privacy Act (Australia)
        ],
        validation: {
          standard_compliance: true,
          jurisdiction_requirements: true,
          data_residency: true,
          local_law_compliance: true
        }
      },
      monitoring: {
        enabled: true,
        interval: 30000, // 30 seconds
        metrics: [
          'compliance_score',
          'data_minimization_score',
          'encryption_compliance_score',
          'data_subject_request_processing_time',
          'cross_border_transfer_compliance',
          'international_standards_compliance'
        ]
      }
    };
    
    this.complianceResults = [];
    this.violations = [];
    this.remediations = [];
    this.dataSubjectRequests = [];
    this.isRunning = false;
    
    this.initializeService();
  }

  /**
   * Initialize GDPR compliance service
   */
  async initializeService() {
    try {
      loggingService.logInfo('GDPR compliance service initialized', {
        enabled: this.config.gdpr.enabled,
        compliance_frequency: this.config.gdpr.compliance_frequency,
        data_minimization: this.config.data_minimization.enabled,
        encryption: this.config.encryption.enabled,
        data_subject_requests: this.config.data_subject_requests.enabled,
        cross_border_transfers: this.config.cross_border_transfers.enabled,
        international_standards: this.config.international_standards.enabled
      });
      
      // Create compliance directory
      await this.createComplianceDirectory();
      
      // Start monitoring
      this.startComplianceMonitoring();
      
    } catch (error) {
      loggingService.logError('Failed to initialize GDPR compliance service', error);
      throw error;
    }
  }

  /**
   * Create compliance directory
   */
  async createComplianceDirectory() {
    try {
      await fs.mkdir(this.config.gdpr.reporting.outputDirectory, { recursive: true });
      loggingService.logInfo(`Created GDPR compliance directory: ${this.config.gdpr.reporting.outputDirectory}`);
    } catch (error) {
      loggingService.logError('Failed to create GDPR compliance directory', error);
      throw error;
    }
  }

  /**
   * Start compliance monitoring
   */
  startComplianceMonitoring() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Monitor compliance every 30 seconds
    setInterval(async () => {
      try {
        await this.collectComplianceMetrics();
      } catch (error) {
        loggingService.logError('GDPR compliance monitoring failed', error);
      }
    }, this.config.monitoring.interval);
    
    loggingService.logInfo('GDPR compliance monitoring started');
  }

  async queryDb(query, params = []) {
    if (!dbManager?.isInitialized || !dbManager.pool) {
      return null;
    }

    try {
      return await dbManager.pool.query(query, params);
    } catch (error) {
      loggingService.logError('GDPR compliance DB query failed', error, {
        query: query.trim().split('\n')[0]
      });
      return null;
    }
  }

  async tableExists(tableName) {
    const result = await this.queryDb(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS exists`,
      [tableName]
    );

    return result ? result.rows[0]?.exists === true : false;
  }

  async columnExists(tableName, columnName) {
    const result = await this.queryDb(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
      ) AS exists`,
      [tableName, columnName]
    );

    return result ? result.rows[0]?.exists === true : false;
  }

  async retentionPolicyExists(tableName) {
    const result = await this.queryDb(
      `SELECT EXISTS (
        SELECT 1
        FROM data_retention_policies
        WHERE table_name = $1 AND retention_days > 0
      ) AS exists`,
      [tableName]
    );

    return result ? result.rows[0]?.exists === true : false;
  }

  async getLatestRetentionRun() {
    const executionLogExists = await this.tableExists('retention_execution_log');
    if (executionLogExists) {
      const result = await this.queryDb(
        `SELECT MAX(executed_at) AS last_run
         FROM retention_execution_log`
      );
      return result?.rows[0]?.last_run || null;
    }

    const auditLogExists = await this.tableExists('audit_logs');
    if (auditLogExists) {
      const result = await this.queryDb(
        `SELECT MAX(created_at) AS last_run
         FROM audit_logs
         WHERE action = 'data_retention_job'`
      );
      return result?.rows[0]?.last_run || null;
    }

    return null;
  }

  getCrossBorderConfig() {
    const mechanism = process.env.CROSS_BORDER_TRANSFER_MECHANISM;
    const residencyRegion = process.env.DATA_RESIDENCY_REGION || process.env.AWS_REGION || process.env.DB_REGION;
    const recipientCountries = process.env.CROSS_BORDER_TRANSFER_RECIPIENT_COUNTRIES;
    const agreementsSigned = process.env.CROSS_BORDER_TRANSFER_AGREEMENTS_SIGNED === 'true';
    const safeguardsEnabled = process.env.CROSS_BORDER_TRANSFER_SAFEGUARDS === 'true';

    return {
      mechanism,
      residencyRegion,
      recipientCountries,
      agreementsSigned,
      safeguardsEnabled
    };
  }

  async baseComplianceArtifactsExist() {
    const [consentLog, portabilityRequests, retentionPolicies] = await Promise.all([
      this.tableExists('consent_log'),
      this.tableExists('portability_requests'),
      this.tableExists('data_retention_policies')
    ]);

    return consentLog && portabilityRequests && retentionPolicies;
  }

  /**
   * Collect compliance metrics
   */
  async collectComplianceMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        compliance_score: await this.calculateComplianceScore(),
        data_minimization_score: await this.calculateDataMinimizationScore(),
        encryption_compliance_score: await this.calculateEncryptionComplianceScore(),
        data_subject_request_processing_time: await this.calculateDataSubjectRequestProcessingTime(),
        cross_border_transfer_compliance: await this.calculateCrossBorderTransferCompliance(),
        international_standards_compliance: await this.calculateInternationalStandardsCompliance()
      };
      
      // Log to centralized logging
      await centralizedLoggingService.logEvent({
        trace_id: this.generateTraceId(),
        actor: 'gdpr_compliance_service',
        action: 'collect_compliance_metrics',
        status: 'success',
        metadata: metrics
      });
      
    } catch (error) {
      loggingService.logError('Failed to collect GDPR compliance metrics', error);
    }
  }

  /**
   * Calculate compliance score
   */
  async calculateComplianceScore() {
    try {
      let score = 100;
      
      // Deduct points for violations
      const criticalViolations = this.violations.filter(v => v.severity === 'critical').length;
      const highViolations = this.violations.filter(v => v.severity === 'high').length;
      const mediumViolations = this.violations.filter(v => v.severity === 'medium').length;
      const lowViolations = this.violations.filter(v => v.severity === 'low').length;
      
      score -= criticalViolations * 25;
      score -= highViolations * 15;
      score -= mediumViolations * 10;
      score -= lowViolations * 5;
      
      return Math.max(0, Math.min(100, score));
      
    } catch (error) {
      loggingService.logError('Failed to calculate GDPR compliance score', error);
      return 0;
    }
  }

  /**
   * Calculate data minimization score
   */
  async calculateDataMinimizationScore() {
    try {
      const results = await Promise.all([
        this.validateVisitorDataMinimization(),
        this.validateGuardDataMinimization(),
        this.validateAccessLogMinimization(),
        this.validateAuditLogMinimization(),
        this.validatePersonalDataRetention()
      ]);

      const compliantCount = results.filter(result => result.compliant).length;
      return Math.round((compliantCount / results.length) * 100);
      
    } catch (error) {
      loggingService.logError('Failed to calculate data minimization score', error);
      return 0;
    }
  }

  /**
   * Calculate encryption compliance score
   */
  async calculateEncryptionComplianceScore() {
    try {
      const results = await Promise.all([
        this.validateEncryptionAtRest(),
        this.validateEncryptionInTransit(),
        this.validateKeyManagement(),
        this.validateCertificateValidation()
      ]);

      const compliantCount = results.filter(result => result.compliant).length;
      return Math.round((compliantCount / results.length) * 100);
      
    } catch (error) {
      loggingService.logError('Failed to calculate encryption compliance score', error);
      return 0;
    }
  }

  /**
   * Calculate data subject request processing time
   */
  async calculateDataSubjectRequestProcessingTime() {
    try {
      const result = await this.queryDb(
        `SELECT AVG(EXTRACT(EPOCH FROM (processed_at - requested_at))) AS avg_seconds
         FROM portability_requests
         WHERE status = 'completed' AND processed_at IS NOT NULL`
      );

      const avgSeconds = result?.rows[0]?.avg_seconds;
      if (!avgSeconds) {
        return 0;
      }

      return Math.round(avgSeconds * 1000);
      
    } catch (error) {
      loggingService.logError('Failed to calculate data subject request processing time', error);
      return 0;
    }
  }

  /**
   * Calculate cross-border transfer compliance
   */
  async calculateCrossBorderTransferCompliance() {
    try {
      const results = await Promise.all([
        this.validateTransferLegality(),
        this.validateRecipientCountryAdequacy(),
        this.validateTransferAgreements(),
        this.validateDataProtectionSafeguards()
      ]);

      const compliantCount = results.filter(result => result.compliant).length;
      return Math.round((compliantCount / results.length) * 100);
      
    } catch (error) {
      loggingService.logError('Failed to calculate cross-border transfer compliance', error);
      return 0;
    }
  }

  /**
   * Calculate international standards compliance
   */
  async calculateInternationalStandardsCompliance() {
    try {
      const results = await Promise.all([
        this.validateCCPACompliance(),
        this.validatePIPEDACompliance(),
        this.validatePDPACompliance(),
        this.validateLGPDCompliance()
      ]);

      const compliantCount = results.filter(result => result.compliant).length;
      return Math.round((compliantCount / results.length) * 100);
      
    } catch (error) {
      loggingService.logError('Failed to calculate international standards compliance', error);
      return 0;
    }
  }

  /**
   * Execute GDPR compliance validation
   */
  async executeGDPRComplianceValidation() {
    try {
      const validationId = this.generateValidationId();
      const validation = {
        id: validationId,
        type: 'gdpr_compliance_validation',
        status: 'running',
        startTime: new Date().toISOString(),
        endTime: null,
        violations: [],
        remediations: [],
        compliance_score: 0,
        launch_ready: false,
        errors: []
      };
      
      // Log validation start
      await this.logComplianceEvent(validation, 'started');
      
      // Execute validation components
      const dataMinimizationResult = await this.validateDataMinimization();
      const encryptionResult = await this.validateEncryption();
      const dataSubjectRequestsResult = await this.validateDataSubjectRequests();
      const crossBorderTransfersResult = await this.validateCrossBorderTransfers();
      const internationalStandardsResult = await this.validateInternationalStandards();
      
      // Compile results
      validation.violations = [
        ...dataMinimizationResult.violations,
        ...encryptionResult.violations,
        ...dataSubjectRequestsResult.violations,
        ...crossBorderTransfersResult.violations,
        ...internationalStandardsResult.violations
      ];
      
      validation.remediations = [
        ...dataMinimizationResult.remediations,
        ...encryptionResult.remediations,
        ...dataSubjectRequestsResult.remediations,
        ...crossBorderTransfersResult.remediations,
        ...internationalStandardsResult.remediations
      ];
      
      // Calculate compliance score
      validation.compliance_score = await this.calculateComplianceScore();
      
      // Determine launch readiness
      validation.launch_ready = validation.compliance_score >= 85 && validation.violations.filter(v => v.severity === 'critical').length === 0;
      
      // Update status
      validation.status = validation.launch_ready ? 'completed' : 'failed';
      validation.endTime = new Date().toISOString();
      
      // Store validation results
      this.complianceResults.push(validation);
      
      // Log validation completion
      await this.logComplianceEvent(validation, 'completed');
      
      // Send alerts if not launch ready
      if (!validation.launch_ready) {
        await this.sendLaunchNotReadyAlert(validation);
      }
      
      return validation;
      
    } catch (error) {
      loggingService.logError('GDPR compliance validation failed', error);
      throw error;
    }
  }

  /**
   * Validate data minimization
   */
  async validateDataMinimization() {
    try {
      const violations = [];
      const remediations = [];
      
      // Check visitor data minimization
      const visitorDataResult = await this.validateVisitorDataMinimization();
      if (!visitorDataResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'data_minimization',
          requirement: 'visitor_data_minimization',
          severity: 'high',
          description: 'Visitor data not properly minimized',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check guard data minimization
      const guardDataResult = await this.validateGuardDataMinimization();
      if (!guardDataResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'data_minimization',
          requirement: 'guard_data_minimization',
          severity: 'high',
          description: 'Guard data not properly minimized',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check access log minimization
      const accessLogResult = await this.validateAccessLogMinimization();
      if (!accessLogResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'data_minimization',
          requirement: 'access_log_minimization',
          severity: 'medium',
          description: 'Access logs not properly minimized',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check audit log minimization
      const auditLogResult = await this.validateAuditLogMinimization();
      if (!auditLogResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'data_minimization',
          requirement: 'audit_log_minimization',
          severity: 'medium',
          description: 'Audit logs not properly minimized',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check personal data retention
      const dataRetentionResult = await this.validatePersonalDataRetention();
      if (!dataRetentionResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'data_minimization',
          requirement: 'personal_data_retention',
          severity: 'high',
          description: 'Personal data retention not properly managed',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Store violations
      this.violations.push(...violations);
      
      return { violations, remediations };
      
    } catch (error) {
      loggingService.logError('Failed to validate data minimization', error);
      return { violations: [], remediations: [] };
    }
  }

  /**
   * Validate visitor data minimization
   */
  async validateVisitorDataMinimization() {
    try {
      if (!dbManager?.isInitialized || !dbManager.pool) {
        return {
          compliant: false,
          details: 'Database unavailable for visitor data minimization checks',
          timestamp: new Date().toISOString()
        };
      }

      const [policyExists, archiveExists] = await Promise.all([
        this.retentionPolicyExists('visitors'),
        this.tableExists('visitors_archive')
      ]);

      const compliant = policyExists && archiveExists;
      
      return {
        compliant: compliant,
        details: compliant
          ? 'Visitor retention policy and archive table configured'
          : 'Missing visitor retention policy or archive table',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate visitor data minimization', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate guard data minimization
   */
  async validateGuardDataMinimization() {
    try {
      if (!dbManager?.isInitialized || !dbManager.pool) {
        return {
          compliant: false,
          details: 'Database unavailable for guard data minimization checks',
          timestamp: new Date().toISOString()
        };
      }

      const [preferenceColumn, guardPolicy, userPolicy] = await Promise.all([
        this.columnExists('users', 'data_retention_preference'),
        this.retentionPolicyExists('guards'),
        this.retentionPolicyExists('users')
      ]);

      const compliant = preferenceColumn && (guardPolicy || userPolicy);
      
      return {
        compliant: compliant,
        details: compliant
          ? 'Guard data minimization controls configured'
          : 'Missing guard retention policy or retention preference column',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate guard data minimization', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate access log minimization
   */
  async validateAccessLogMinimization() {
    try {
      if (!dbManager?.isInitialized || !dbManager.pool) {
        return {
          compliant: false,
          details: 'Database unavailable for access log minimization checks',
          timestamp: new Date().toISOString()
        };
      }

      const archiveExists = await this.tableExists('access_logs_archive');
      const retentionPolicy = await this.retentionPolicyExists('access_logs');
      let logRetentionPolicy = false;

      if (await this.tableExists('log_retention_policies')) {
        const result = await this.queryDb(
          `SELECT EXISTS (
             SELECT 1
             FROM log_retention_policies
             WHERE log_type IN ('access_logs', 'access_log') AND enabled = true
           ) AS exists`
        );
        logRetentionPolicy = result ? result.rows[0]?.exists === true : false;
      }

      const compliant = archiveExists && (retentionPolicy || logRetentionPolicy);
      
      return {
        compliant: compliant,
        details: compliant
          ? 'Access log retention and archival configured'
          : 'Missing access log retention policy or archive table',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate access log minimization', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate audit log minimization
   */
  async validateAuditLogMinimization() {
    try {
      if (!dbManager?.isInitialized || !dbManager.pool) {
        return {
          compliant: false,
          details: 'Database unavailable for audit log minimization checks',
          timestamp: new Date().toISOString()
        };
      }

      const archiveExists = await this.tableExists('audit_logs_archive');
      const retentionPolicy = await this.retentionPolicyExists('audit_logs');
      let logRetentionPolicy = false;

      if (await this.tableExists('log_retention_policies')) {
        const result = await this.queryDb(
          `SELECT EXISTS (
             SELECT 1
             FROM log_retention_policies
             WHERE log_type IN ('audit_logs', 'audit_log') AND enabled = true
           ) AS exists`
        );
        logRetentionPolicy = result ? result.rows[0]?.exists === true : false;
      }

      const compliant = archiveExists && (retentionPolicy || logRetentionPolicy);
      
      return {
        compliant: compliant,
        details: compliant
          ? 'Audit log retention and archival configured'
          : 'Missing audit log retention policy or archive table',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate audit log minimization', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate personal data retention
   */
  async validatePersonalDataRetention() {
    try {
      if (!dbManager?.isInitialized || !dbManager.pool) {
        return {
          compliant: false,
          details: 'Database unavailable for retention checks',
          timestamp: new Date().toISOString()
        };
      }

      const policyTables = ['visitors', 'access_logs', 'audit_logs', 'delivery_logs', 'rideshare_entries'];
      const policyResults = await Promise.all(policyTables.map((table) => this.retentionPolicyExists(table)));
      const missingPolicies = policyTables.filter((table, index) => !policyResults[index]);

      const lastRun = await this.getLatestRetentionRun();
      const daysSinceRun = lastRun
        ? Math.floor((Date.now() - new Date(lastRun).getTime()) / (24 * 60 * 60 * 1000))
        : null;
      const hasRecentRun = daysSinceRun !== null && daysSinceRun <= 30;

      const compliant = missingPolicies.length === 0 && hasRecentRun;
      
      return {
        compliant: compliant,
        details: compliant
          ? 'Retention policies present and job executed recently'
          : `Retention policies missing for: ${missingPolicies.join(', ') || 'none'}; last run ${daysSinceRun ?? 'unknown'} days ago`,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate personal data retention', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate encryption
   */
  async validateEncryption() {
    try {
      const violations = [];
      const remediations = [];
      
      // Check encryption at rest
      const encryptionAtRestResult = await this.validateEncryptionAtRest();
      if (!encryptionAtRestResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'encryption',
          requirement: 'encryption_at_rest',
          severity: 'critical',
          description: 'Encryption at rest not properly implemented',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check encryption in transit
      const encryptionInTransitResult = await this.validateEncryptionInTransit();
      if (!encryptionInTransitResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'encryption',
          requirement: 'encryption_in_transit',
          severity: 'critical',
          description: 'Encryption in transit not properly implemented',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check key management
      const keyManagementResult = await this.validateKeyManagement();
      if (!keyManagementResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'encryption',
          requirement: 'key_management',
          severity: 'high',
          description: 'Key management not properly implemented',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check certificate validation
      const certificateValidationResult = await this.validateCertificateValidation();
      if (!certificateValidationResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'encryption',
          requirement: 'certificate_validation',
          severity: 'high',
          description: 'Certificate validation not properly implemented',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Store violations
      this.violations.push(...violations);
      
      return { violations, remediations };
      
    } catch (error) {
      loggingService.logError('Failed to validate encryption', error);
      return { violations: [], remediations: [] };
    }
  }

  /**
   * Validate encryption at rest
   */
  async validateEncryptionAtRest() {
    try {
      const validation = validateEncryptionConfig();
      const compliant = validation.isValid;
      const details = compliant
        ? `Encryption at rest configured (${validation.method})`
        : `Encryption config errors: ${validation.errors.join('; ')}`;
      
      return {
        compliant: compliant,
        details,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate encryption at rest', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate encryption in transit
   */
  async validateEncryptionInTransit() {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      const enforceHttps = process.env.ENFORCE_HTTPS === 'true';
      const allowHttp = process.env.ALLOW_HTTP_IN_PRODUCTION === 'true';
      const hstsMaxAge = Number.parseInt(process.env.HSTS_MAX_AGE || '', 10);
      const hstsConfigured = !Number.isNaN(hstsMaxAge) && hstsMaxAge >= 31536000;
      const compliant = !isProduction || (enforceHttps && !allowHttp && hstsConfigured);

      let details = 'TLS enforcement not evaluated';
      if (!isProduction) {
        details = 'Non-production environment; HTTPS enforcement not required';
      } else if (compliant) {
        details = 'HTTPS enforcement and HSTS configured for production';
      } else {
        details = 'HTTPS enforcement or HSTS configuration missing for production';
      }
      
      return {
        compliant: compliant,
        details,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate encryption in transit', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate key management
   */
  async validateKeyManagement() {
    try {
      const method = process.env.ENCRYPTION_METHOD || 'local';
      let compliant = true;
      let details = 'Key management configured';

      if (method === 'aws-kms') {
        compliant = !!process.env.AWS_KMS_KEY_ID;
        details = compliant ? 'AWS KMS key configured' : 'AWS_KMS_KEY_ID is missing';
      } else if (method === 'vault') {
        compliant = !!process.env.VAULT_ADDR && (!!process.env.VAULT_TOKEN || !!process.env.VAULT_ROOT_TOKEN);
        details = compliant ? 'Vault credentials configured' : 'Vault address or token missing';
      } else if (method === 'local') {
        compliant = !!process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32;
        details = compliant ? 'Local encryption key configured' : 'ENCRYPTION_KEY missing or too short';
      } else {
        compliant = false;
        details = `Unknown encryption method: ${method}`;
      }
      
      return {
        compliant: compliant,
        details,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate key management', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate certificate validation
   */
  async validateCertificateValidation() {
    try {
      const rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0';
      const allowInsecure = process.env.ALLOW_INSECURE_TLS === 'true';
      const compliant = rejectUnauthorized && !allowInsecure;
      
      return {
        compliant: compliant,
        details: compliant ? 'TLS certificate validation enforced' : 'TLS certificate validation disabled',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate certificate validation', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate data subject requests
   */
  async validateDataSubjectRequests() {
    try {
      const violations = [];
      const remediations = [];
      
      // Check automated processing
      const automatedProcessingResult = await this.validateAutomatedProcessing();
      if (!automatedProcessingResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'data_subject_requests',
          requirement: 'automated_processing',
          severity: 'high',
          description: 'Automated data subject request processing not properly implemented',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check response time compliance
      const responseTimeResult = await this.validateResponseTimeCompliance();
      if (!responseTimeResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'data_subject_requests',
          requirement: 'response_time_compliance',
          severity: 'high',
          description: 'Data subject request response time not compliant',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check request verification
      const requestVerificationResult = await this.validateRequestVerification();
      if (!requestVerificationResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'data_subject_requests',
          requirement: 'request_verification',
          severity: 'medium',
          description: 'Data subject request verification not properly implemented',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check data subject identification
      const dataSubjectIdentificationResult = await this.validateDataSubjectIdentification();
      if (!dataSubjectIdentificationResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'data_subject_requests',
          requirement: 'data_subject_identification',
          severity: 'medium',
          description: 'Data subject identification not properly implemented',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Store violations
      this.violations.push(...violations);
      
      return { violations, remediations };
      
    } catch (error) {
      loggingService.logError('Failed to validate data subject requests', error);
      return { violations: [], remediations: [] };
    }
  }

  /**
   * Validate automated processing
   */
  async validateAutomatedProcessing() {
    try {
      if (!dbManager?.isInitialized || !dbManager.pool) {
        return {
          compliant: false,
          details: 'Database unavailable for automated processing checks',
          timestamp: new Date().toISOString()
        };
      }

      const [portabilityRequests, dataExportLog] = await Promise.all([
        this.tableExists('portability_requests'),
        this.tableExists('data_export_log')
      ]);

      const compliant = portabilityRequests && dataExportLog;
      
      return {
        compliant: compliant,
        details: compliant
          ? 'Portability requests and export logs configured'
          : 'Missing portability request or export log tables',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate automated processing', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate response time compliance
   */
  async validateResponseTimeCompliance() {
    try {
      if (!dbManager?.isInitialized || !dbManager.pool) {
        return {
          compliant: false,
          details: 'Database unavailable for response time checks',
          timestamp: new Date().toISOString()
        };
      }

      const result = await this.queryDb(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'completed' AND processed_at IS NOT NULL) AS total_completed,
           COUNT(*) FILTER (
             WHERE status = 'completed'
               AND processed_at IS NOT NULL
               AND processed_at <= requested_at + INTERVAL '30 days'
           ) AS within_window
         FROM portability_requests`
      );

      const totalCompleted = Number(result?.rows[0]?.total_completed || 0);
      const withinWindow = Number(result?.rows[0]?.within_window || 0);

      if (totalCompleted === 0) {
        return {
          compliant: true,
          details: 'No completed data subject requests available for response time evaluation',
          timestamp: new Date().toISOString()
        };
      }

      const ratio = withinWindow / totalCompleted;
      const compliant = ratio >= 0.9;
      
      return {
        compliant: compliant,
        details: compliant
          ? `Response time compliant (${Math.round(ratio * 100)}% within 30 days)`
          : `Response time non-compliant (${Math.round(ratio * 100)}% within 30 days)`,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate response time compliance', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate request verification
   */
  async validateRequestVerification() {
    try {
      if (!dbManager?.isInitialized || !dbManager.pool) {
        return {
          compliant: false,
          details: 'Database unavailable for request verification checks',
          timestamp: new Date().toISOString()
        };
      }

      const [ipColumn, userAgentColumn] = await Promise.all([
        this.columnExists('portability_requests', 'ip_address'),
        this.columnExists('portability_requests', 'user_agent')
      ]);

      const compliant = ipColumn && userAgentColumn;
      
      return {
        compliant: compliant,
        details: compliant
          ? 'Portability requests capture IP and user agent metadata'
          : 'Portability requests missing IP or user agent fields',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate request verification', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate data subject identification
   */
  async validateDataSubjectIdentification() {
    try {
      if (!dbManager?.isInitialized || !dbManager.pool) {
        return {
          compliant: false,
          details: 'Database unavailable for data subject identification checks',
          timestamp: new Date().toISOString()
        };
      }

      const [userIdColumn, emailColumn, phoneColumn] = await Promise.all([
        this.columnExists('portability_requests', 'user_id'),
        this.columnExists('users', 'email'),
        this.columnExists('users', 'phone')
      ]);

      const compliant = userIdColumn && (emailColumn || phoneColumn);
      
      return {
        compliant: compliant,
        details: compliant
          ? 'Portability requests link to users with identifying fields'
          : 'Missing user linkage or identifying fields for data subject requests',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate data subject identification', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate cross-border transfers
   */
  async validateCrossBorderTransfers() {
    try {
      const violations = [];
      const remediations = [];
      
      // Check transfer legality
      const transferLegalityResult = await this.validateTransferLegality();
      if (!transferLegalityResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'cross_border_transfers',
          requirement: 'transfer_legality',
          severity: 'critical',
          description: 'Cross-border data transfers not legally compliant',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check recipient country adequacy
      const recipientCountryResult = await this.validateRecipientCountryAdequacy();
      if (!recipientCountryResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'cross_border_transfers',
          requirement: 'recipient_country_adequacy',
          severity: 'high',
          description: 'Recipient country adequacy not properly validated',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check transfer agreements
      const transferAgreementsResult = await this.validateTransferAgreements();
      if (!transferAgreementsResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'cross_border_transfers',
          requirement: 'transfer_agreements',
          severity: 'high',
          description: 'Transfer agreements not properly implemented',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check data protection safeguards
      const dataProtectionSafeguardsResult = await this.validateDataProtectionSafeguards();
      if (!dataProtectionSafeguardsResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'cross_border_transfers',
          requirement: 'data_protection_safeguards',
          severity: 'high',
          description: 'Data protection safeguards not properly implemented',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Store violations
      this.violations.push(...violations);
      
      return { violations, remediations };
      
    } catch (error) {
      loggingService.logError('Failed to validate cross-border transfers', error);
      return { violations: [], remediations: [] };
    }
  }

  /**
   * Validate transfer legality
   */
  async validateTransferLegality() {
    try {
      const config = this.getCrossBorderConfig();
      if (!config.mechanism) {
        return {
          compliant: true,
          details: 'Cross-border transfers not configured',
          timestamp: new Date().toISOString()
        };
      }

      const compliant = this.config.cross_border_transfers.transfer_mechanisms.includes(config.mechanism);
      
      return {
        compliant: compliant,
        details: compliant
          ? `Transfer mechanism configured: ${config.mechanism}`
          : 'Transfer mechanism is missing or not approved',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate transfer legality', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate recipient country adequacy
   */
  async validateRecipientCountryAdequacy() {
    try {
      const config = this.getCrossBorderConfig();
      if (!config.mechanism) {
        return {
          compliant: true,
          details: 'Cross-border transfers not configured',
          timestamp: new Date().toISOString()
        };
      }

      const compliant = !!config.recipientCountries;
      
      return {
        compliant: compliant,
        details: compliant
          ? 'Recipient country adequacy list configured'
          : 'Recipient country adequacy list not configured',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate recipient country adequacy', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate transfer agreements
   */
  async validateTransferAgreements() {
    try {
      const config = this.getCrossBorderConfig();
      if (!config.mechanism) {
        return {
          compliant: true,
          details: 'Cross-border transfers not configured',
          timestamp: new Date().toISOString()
        };
      }

      const compliant = config.agreementsSigned;
      
      return {
        compliant: compliant,
        details: compliant
          ? 'Transfer agreements confirmed'
          : 'Transfer agreements not confirmed',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate transfer agreements', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate data protection safeguards
   */
  async validateDataProtectionSafeguards() {
    try {
      const config = this.getCrossBorderConfig();
      if (!config.mechanism) {
        return {
          compliant: true,
          details: 'Cross-border transfers not configured',
          timestamp: new Date().toISOString()
        };
      }

      const compliant = config.safeguardsEnabled && !!config.residencyRegion;
      
      return {
        compliant: compliant,
        details: compliant
          ? 'Safeguards enabled with residency region defined'
          : 'Safeguards or residency region not configured',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate data protection safeguards', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate international standards
   */
  async validateInternationalStandards() {
    try {
      const violations = [];
      const remediations = [];
      
      // Check CCPA compliance
      const ccpaResult = await this.validateCCPACompliance();
      if (!ccpaResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'international_standards',
          standard: 'ccpa',
          severity: 'medium',
          description: 'CCPA compliance not properly implemented',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check PIPEDA compliance
      const pipedaResult = await this.validatePIPEDACompliance();
      if (!pipedaResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'international_standards',
          standard: 'pipeda',
          severity: 'medium',
          description: 'PIPEDA compliance not properly implemented',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check PDPA compliance
      const pdpaResult = await this.validatePDPACompliance();
      if (!pdpaResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'international_standards',
          standard: 'pdpa',
          severity: 'medium',
          description: 'PDPA compliance not properly implemented',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Check LGPD compliance
      const lgpdResult = await this.validateLGPDCompliance();
      if (!lgpdResult.compliant) {
        violations.push({
          id: this.generateViolationId(),
          type: 'international_standards',
          standard: 'lgpd',
          severity: 'medium',
          description: 'LGPD compliance not properly implemented',
          discovered: new Date().toISOString(),
          remediated: false
        });
      }
      
      // Store violations
      this.violations.push(...violations);
      
      return { violations, remediations };
      
    } catch (error) {
      loggingService.logError('Failed to validate international standards', error);
      return { violations: [], remediations: [] };
    }
  }

  /**
   * Validate CCPA compliance
   */
  async validateCCPACompliance() {
    try {
      if (process.env.COMPLIANCE_CCPA === 'false') {
        return {
          compliant: true,
          details: 'CCPA compliance checks disabled',
          timestamp: new Date().toISOString()
        };
      }

      const baseArtifacts = await this.baseComplianceArtifactsExist();
      const compliant = baseArtifacts;
      
      return {
        compliant: compliant,
        details: compliant
          ? 'CCPA compliance artifacts present'
          : 'CCPA compliance artifacts missing (consent, portability, retention)',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate CCPA compliance', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate PIPEDA compliance
   */
  async validatePIPEDACompliance() {
    try {
      if (process.env.COMPLIANCE_PIPEDA === 'false') {
        return {
          compliant: true,
          details: 'PIPEDA compliance checks disabled',
          timestamp: new Date().toISOString()
        };
      }

      const baseArtifacts = await this.baseComplianceArtifactsExist();
      const compliant = baseArtifacts;
      
      return {
        compliant: compliant,
        details: compliant
          ? 'PIPEDA compliance artifacts present'
          : 'PIPEDA compliance artifacts missing (consent, portability, retention)',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate PIPEDA compliance', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate PDPA compliance
   */
  async validatePDPACompliance() {
    try {
      if (process.env.COMPLIANCE_PDPA === 'false') {
        return {
          compliant: true,
          details: 'PDPA compliance checks disabled',
          timestamp: new Date().toISOString()
        };
      }

      const baseArtifacts = await this.baseComplianceArtifactsExist();
      const compliant = baseArtifacts;
      
      return {
        compliant: compliant,
        details: compliant
          ? 'PDPA compliance artifacts present'
          : 'PDPA compliance artifacts missing (consent, portability, retention)',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate PDPA compliance', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate LGPD compliance
   */
  async validateLGPDCompliance() {
    try {
      if (process.env.COMPLIANCE_LGPD === 'false') {
        return {
          compliant: true,
          details: 'LGPD compliance checks disabled',
          timestamp: new Date().toISOString()
        };
      }

      const baseArtifacts = await this.baseComplianceArtifactsExist();
      const compliant = baseArtifacts;
      
      return {
        compliant: compliant,
        details: compliant
          ? 'LGPD compliance artifacts present'
          : 'LGPD compliance artifacts missing (consent, portability, retention)',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      loggingService.logError('Failed to validate LGPD compliance', error);
      return {
        compliant: false,
        details: 'Validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send launch not ready alert
   */
  async sendLaunchNotReadyAlert(validation) {
    try {
      const criticalViolations = validation.violations.filter(v => v.severity === 'critical').length;
      const highViolations = validation.violations.filter(v => v.severity === 'high').length;
      
      await rollbackAlertingService.sendSystemFailureAlert({
        system_component: 'gdpr_compliance',
        failure_reason: `GDPR compliance validation failed with score ${validation.compliance_score}%`,
        impact_assessment: `Critical violations: ${criticalViolations}, High violations: ${highViolations}. System not launch ready.`,
        recovery_actions: 'Address critical and high violations immediately. Re-run validation after fixes.'
      });
      
    } catch (error) {
      loggingService.logError('Failed to send launch not ready alert', error);
    }
  }

  /**
   * Log compliance event
   */
  async logComplianceEvent(validation, eventType) {
    try {
      const event = {
        trace_id: validation.id,
        actor: 'gdpr_compliance_service',
        action: `compliance_${eventType}`,
        status: eventType === 'started' ? 'info' : (validation.launch_ready ? 'success' : 'error'),
        metadata: {
          validation_id: validation.id,
          type: validation.type,
          status: validation.status,
          compliance_score: validation.compliance_score,
          launch_ready: validation.launch_ready,
          violations: validation.violations.length
        }
      };
      
      // Log to centralized logging
      await centralizedLoggingService.logEvent(event);
      
      // Log audit event
      await auditTraceabilityService.logAuditEvent(event);
      
    } catch (error) {
      loggingService.logError('Failed to log compliance event', error);
    }
  }

  /**
   * Generate validation ID
   */
  generateValidationId() {
    return `VALID-${Date.now()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  }

  /**
   * Generate violation ID
   */
  generateViolationId() {
    return `VIOL-${Date.now()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  }

  /**
   * Generate trace ID
   */
  generateTraceId() {
    return `TRACE-${Date.now()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  }

  /**
   * Get compliance results
   */
  getComplianceResults() {
    return this.complianceResults;
  }

  /**
   * Get violations
   */
  getViolations() {
    return this.violations;
  }

  /**
   * Get remediations
   */
  getRemediations() {
    return this.remediations;
  }

  /**
   * Get data subject requests
   */
  getDataSubjectRequests() {
    return this.dataSubjectRequests;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: true,
      running: this.isRunning,
      complianceResults: this.complianceResults.length,
      violations: this.violations.length,
      remediations: this.remediations.length,
      dataSubjectRequests: this.dataSubjectRequests.length,
      config: this.config
    };
  }
}

// Create singleton instance
const gdprComplianceService = new GDPRComplianceService();

export default gdprComplianceService;
