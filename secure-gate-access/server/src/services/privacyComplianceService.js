/**
 * Privacy Compliance Service
 * 
 * Handles privacy controls, data retention policies, GDPR/KDPA compliance,
 * and consent management for the Secure Gate Access Control System.
 */

import { dbManager } from '../database/db.enhanced.js';
import loggingService from './loggingService.js';
import crypto from 'crypto';

class PrivacyComplianceService {
  constructor() {
    this.retentionPolicies = new Map();
    this.consentTypes = new Set([
      'data_processing',
      'marketing_communications',
      'analytics_tracking',
      'third_party_sharing',
      'location_tracking',
      'biometric_data',
      'automated_decision_making'
    ]);
    this.dataCategories = new Set([
      'personal_identifiers',
      'contact_information',
      'location_data',
      'behavioral_data',
      'security_logs',
      'communication_records',
      'biometric_data',
      'device_information'
    ]);
  }

  /**
   * Initialize privacy compliance service with default policies
   */
  async initialize() {
    try {
      await this.loadRetentionPolicies();
      await this.scheduleDataRetentionTasks();
      
      loggingService.logInfo('Privacy compliance service initialized successfully');
    } catch (error) {
      loggingService.logError('Failed to initialize privacy compliance service', error);
      throw error;
    }
  }

  /**
   * Get user privacy settings with detailed descriptions
   */
  async getUserPrivacySettings(userId, estateId) {
    try {
      const query = `
        SELECT 
          ups.*,
          u.email,
          u.role,
          e.name as estate_name
        FROM user_privacy_settings ups
        JOIN users u ON ups.user_id = u.id
        JOIN estates e ON ups.estate_id = e.id
        WHERE ups.user_id = $1 AND ups.estate_id = $2
      `;
      
      const result = await dbManager.query(query, [userId, estateId]);
      
      if (result.rows.length === 0) {
        // Create default privacy settings
        return await this.createDefaultPrivacySettings(userId, estateId);
      }

      const settings = result.rows[0];
      
      // Add detailed descriptions for each setting
      const enhancedSettings = {
        ...settings,
        settingsWithDescriptions: this.getPrivacySettingsDescriptions(settings)
      };

      await this.logPrivacyAccess(userId, estateId, 'privacy_settings_viewed');
      
      return enhancedSettings;
    } catch (error) {
      loggingService.logError('Failed to get user privacy settings', error, {
        userId,
        estateId
      });
      throw error;
    }
  }

  /**
   * Update user privacy settings with immediate application
   */
  async updatePrivacySettings(userId, estateId, settings, updatedBy) {
    const client = await dbManager.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current settings for comparison
      const currentResult = await client.query(
        'SELECT * FROM user_privacy_settings WHERE user_id = $1 AND estate_id = $2',
        [userId, estateId]
      );

      const currentSettings = currentResult.rows[0] || {};
      const changes = this.detectPrivacyChanges(currentSettings, settings);

      // Update privacy settings
      const updateQuery = `
        INSERT INTO user_privacy_settings (
          user_id, estate_id, data_sharing_consent, marketing_consent,
          analytics_consent, third_party_consent, location_tracking_consent,
          biometric_consent, automated_decisions_consent, data_retention_period,
          communication_preferences, visibility_settings, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13)
        ON CONFLICT (user_id, estate_id) 
        DO UPDATE SET
          data_sharing_consent = EXCLUDED.data_sharing_consent,
          marketing_consent = EXCLUDED.marketing_consent,
          analytics_consent = EXCLUDED.analytics_consent,
          third_party_consent = EXCLUDED.third_party_consent,
          location_tracking_consent = EXCLUDED.location_tracking_consent,
          biometric_consent = EXCLUDED.biometric_consent,
          automated_decisions_consent = EXCLUDED.automated_decisions_consent,
          data_retention_period = EXCLUDED.data_retention_period,
          communication_preferences = EXCLUDED.communication_preferences,
          visibility_settings = EXCLUDED.visibility_settings,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        userId,
        estateId,
        settings.dataSharingConsent || false,
        settings.marketingConsent || false,
        settings.analyticsConsent || false,
        settings.thirdPartyConsent || false,
        settings.locationTrackingConsent || false,
        settings.biometricConsent || false,
        settings.automatedDecisionsConsent || false,
        settings.dataRetentionPeriod || '2_years',
        JSON.stringify(settings.communicationPreferences || {}),
        JSON.stringify(settings.visibilitySettings || {}),
        updatedBy
      ]);

      // Log privacy setting changes
      await this.logPrivacyChanges(client, userId, estateId, changes, updatedBy);

      // Apply settings immediately
      await this.applyPrivacySettingsImmediately(client, userId, estateId, settings);

      await client.query('COMMIT');

      loggingService.logInfo('Privacy settings updated successfully', {
        userId,
        estateId,
        changesCount: changes.length,
        updatedBy
      });

      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      loggingService.logError('Failed to update privacy settings', error, {
        userId,
        estateId,
        updatedBy
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get data retention policies for estate
   */
  async getDataRetentionPolicies(estateId) {
    try {
      const query = `
        SELECT 
          drp.*,
          COUNT(CASE WHEN drp.auto_delete_enabled THEN 1 END) as auto_delete_count,
          COUNT(CASE WHEN drp.archive_enabled THEN 1 END) as archive_count
        FROM data_retention_policies drp
        WHERE drp.estate_id = $1 OR drp.estate_id IS NULL
        GROUP BY drp.id, drp.data_category, drp.retention_period_days, 
                 drp.auto_delete_enabled, drp.archive_enabled, drp.created_at
        ORDER BY drp.data_category
      `;
      
      const result = await dbManager.query(query, [estateId]);
      
      return result.rows.map(policy => ({
        ...policy,
        description: this.getRetentionPolicyDescription(policy),
        nextExecutionDate: this.calculateNextExecutionDate(policy),
        affectedDataTypes: this.getAffectedDataTypes(policy.data_category)
      }));
    } catch (error) {
      loggingService.logError('Failed to get data retention policies', error, {
        estateId
      });
      throw error;
    }
  }

  /**
   * Execute data retention policies
   */
  async executeDataRetention(estateId, dryRun = false) {
    const client = await dbManager.pool.connect();
    const results = {
      archived: 0,
      deleted: 0,
      errors: [],
      executionId: crypto.randomUUID()
    };

    try {
      await client.query('BEGIN');

      const policies = await this.getDataRetentionPolicies(estateId);
      
      for (const policy of policies) {
        try {
          const policyResult = await this.executeRetentionPolicy(
            client, 
            policy, 
            estateId, 
            dryRun
          );
          
          results.archived += policyResult.archived;
          results.deleted += policyResult.deleted;
        } catch (error) {
          results.errors.push({
            policy: policy.data_category,
            error: error.message
          });
        }
      }

      if (!dryRun) {
        // Log retention execution
        await client.query(`
          INSERT INTO compliance_audit_logs (
            estate_id, action_type, action_details, execution_id,
            records_affected, execution_status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          estateId,
          'data_retention_execution',
          JSON.stringify({
            archived: results.archived,
            deleted: results.deleted,
            errors: results.errors
          }),
          results.executionId,
          results.archived + results.deleted,
          results.errors.length === 0 ? 'success' : 'partial_success'
        ]);

        await client.query('COMMIT');
      } else {
        await client.query('ROLLBACK');
      }

      loggingService.logInfo('Data retention execution completed', {
        estateId,
        dryRun,
        results
      });

      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      loggingService.logError('Failed to execute data retention', error, {
        estateId,
        dryRun
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate GDPR/KDPA compliance report
   */
  async generateComplianceReport(estateId, reportType = 'full', dateRange = null) {
    try {
      const reportId = crypto.randomUUID();
      const startDate = dateRange?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.end || new Date();

      const report = {
        reportId,
        estateId,
        reportType,
        generatedAt: new Date(),
        dateRange: { start: startDate, end: endDate },
        sections: {}
      };

      // Data Processing Activities
      report.sections.dataProcessing = await this.getDataProcessingActivities(
        estateId, 
        startDate, 
        endDate
      );

      // Consent Management
      report.sections.consentManagement = await this.getConsentManagementReport(
        estateId, 
        startDate, 
        endDate
      );

      // Data Subject Rights
      report.sections.dataSubjectRights = await this.getDataSubjectRightsReport(
        estateId, 
        startDate, 
        endDate
      );

      // Security Incidents
      report.sections.securityIncidents = await this.getSecurityIncidentsReport(
        estateId, 
        startDate, 
        endDate
      );

      // Data Retention Compliance
      report.sections.dataRetention = await this.getDataRetentionComplianceReport(
        estateId, 
        startDate, 
        endDate
      );

      // Third-Party Data Sharing
      report.sections.thirdPartySharing = await this.getThirdPartyDataSharingReport(
        estateId, 
        startDate, 
        endDate
      );

      // Store report for audit trail
      await this.storeComplianceReport(report);

      loggingService.logInfo('Compliance report generated successfully', {
        reportId,
        estateId,
        reportType,
        sectionsCount: Object.keys(report.sections).length
      });

      return report;
    } catch (error) {
      loggingService.logError('Failed to generate compliance report', error, {
        estateId,
        reportType
      });
      throw error;
    }
  }

  /**
   * Manage user consent with clear withdrawal options
   */
  async manageUserConsent(userId, estateId, consentType, granted, metadata = {}) {
    const client = await dbManager.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate consent type
      if (!this.consentTypes.has(consentType)) {
        throw new Error(`Invalid consent type: ${consentType}`);
      }

      // Record consent decision
      const consentId = crypto.randomUUID();
      await client.query(`
        INSERT INTO user_consent_records (
          id, user_id, estate_id, consent_type, granted, 
          consent_method, ip_address, user_agent, metadata,
          granted_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
      `, [
        consentId,
        userId,
        estateId,
        consentType,
        granted,
        metadata.method || 'web_interface',
        metadata.ipAddress,
        metadata.userAgent,
        JSON.stringify(metadata),
        metadata.expiresAt || null
      ]);

      // Update current consent status
      await client.query(`
        INSERT INTO current_user_consents (
          user_id, estate_id, consent_type, granted, last_updated_at, consent_record_id
        ) VALUES ($1, $2, $3, $4, NOW(), $5)
        ON CONFLICT (user_id, estate_id, consent_type)
        DO UPDATE SET
          granted = EXCLUDED.granted,
          last_updated_at = NOW(),
          consent_record_id = EXCLUDED.consent_record_id
      `, [userId, estateId, consentType, granted, consentId]);

      // Apply consent decision immediately
      await this.applyConsentDecision(client, userId, estateId, consentType, granted);

      // Log consent change for audit trail
      await client.query(`
        INSERT INTO compliance_audit_logs (
          estate_id, user_id, action_type, action_details, 
          legal_basis, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        estateId,
        userId,
        'consent_updated',
        JSON.stringify({
          consentType,
          granted,
          previousState: metadata.previousState,
          method: metadata.method
        }),
        granted ? 'consent' : 'consent_withdrawn'
      ]);

      await client.query('COMMIT');

      loggingService.logInfo('User consent updated successfully', {
        userId,
        estateId,
        consentType,
        granted,
        consentId
      });

      return {
        consentId,
        granted,
        recordedAt: new Date(),
        effectiveImmediately: true
      };
    } catch (error) {
      await client.query('ROLLBACK');
      loggingService.logError('Failed to manage user consent', error, {
        userId,
        estateId,
        consentType,
        granted
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's current consent status
   */
  async getUserConsentStatus(userId, estateId) {
    try {
      const query = `
        SELECT 
          cuc.*,
          ucr.granted_at,
          ucr.expires_at,
          ucr.consent_method,
          ucr.metadata
        FROM current_user_consents cuc
        LEFT JOIN user_consent_records ucr ON cuc.consent_record_id = ucr.id
        WHERE cuc.user_id = $1 AND cuc.estate_id = $2
        ORDER BY cuc.consent_type
      `;
      
      const result = await dbManager.query(query, [userId, estateId]);
      
      const consentStatus = {};
      
      // Initialize all consent types
      for (const consentType of this.consentTypes) {
        consentStatus[consentType] = {
          granted: false,
          lastUpdated: null,
          method: null,
          expiresAt: null,
          canWithdraw: true,
          description: this.getConsentDescription(consentType)
        };
      }
      
      // Update with actual consent records
      result.rows.forEach(record => {
        consentStatus[record.consent_type] = {
          granted: record.granted,
          lastUpdated: record.last_updated_at,
          grantedAt: record.granted_at,
          expiresAt: record.expires_at,
          method: record.consent_method,
          canWithdraw: true,
          description: this.getConsentDescription(record.consent_type),
          metadata: record.metadata
        };
      });

      return consentStatus;
    } catch (error) {
      loggingService.logError('Failed to get user consent status', error, {
        userId,
        estateId
      });
      throw error;
    }
  }

  /**
   * Process data subject rights requests (GDPR Article 15-22)
   */
  async processDataSubjectRequest(userId, estateId, requestType, requestDetails, requestedBy) {
    const client = await dbManager.pool.connect();
    const requestId = crypto.randomUUID();
    
    try {
      await client.query('BEGIN');

      // Validate request type
      const validRequestTypes = [
        'data_access',      // Article 15 - Right of access
        'data_rectification', // Article 16 - Right to rectification
        'data_erasure',     // Article 17 - Right to erasure
        'data_portability', // Article 20 - Right to data portability
        'processing_restriction', // Article 18 - Right to restriction
        'object_processing' // Article 21 - Right to object
      ];

      if (!validRequestTypes.includes(requestType)) {
        throw new Error(`Invalid data subject request type: ${requestType}`);
      }

      // Create request record
      await client.query(`
        INSERT INTO data_subject_requests (
          id, user_id, estate_id, request_type, request_details,
          requested_by, status, created_at, due_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
      `, [
        requestId,
        userId,
        estateId,
        requestType,
        JSON.stringify(requestDetails),
        requestedBy,
        'pending',
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      ]);

      // Process request based on type
      let processingResult;
      switch (requestType) {
        case 'data_access':
          processingResult = await this.processDataAccessRequest(client, userId, estateId);
          break;
        case 'data_erasure':
          processingResult = await this.processDataErasureRequest(client, userId, estateId, requestDetails);
          break;
        case 'data_portability':
          processingResult = await this.processDataPortabilityRequest(client, userId, estateId);
          break;
        default:
          processingResult = { status: 'manual_review_required' };
      }

      // Update request with processing result
      await client.query(`
        UPDATE data_subject_requests 
        SET processing_result = $1, 
            status = $2,
            processed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE NULL END
        WHERE id = $3
      `, [
        JSON.stringify(processingResult),
        processingResult.status === 'completed' ? 'completed' : 'processing',
        requestId
      ]);

      // Log for compliance audit
      await client.query(`
        INSERT INTO compliance_audit_logs (
          estate_id, user_id, action_type, action_details,
          legal_basis, request_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        estateId,
        userId,
        'data_subject_request',
        JSON.stringify({
          requestType,
          requestId,
          processingResult: processingResult.status
        }),
        'data_subject_rights',
        requestId
      ]);

      await client.query('COMMIT');

      loggingService.logInfo('Data subject request processed', {
        requestId,
        userId,
        estateId,
        requestType,
        status: processingResult.status
      });

      return {
        requestId,
        status: processingResult.status,
        processingResult,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      loggingService.logError('Failed to process data subject request', error, {
        userId,
        estateId,
        requestType
      });
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper methods

  async createDefaultPrivacySettings(userId, estateId) {
    const defaultSettings = {
      dataSharingConsent: false,
      marketingConsent: false,
      analyticsConsent: false,
      thirdPartyConsent: false,
      locationTrackingConsent: false,
      biometricConsent: false,
      automatedDecisionsConsent: false,
      dataRetentionPeriod: '2_years',
      communicationPreferences: {
        email: true,
        sms: false,
        push: true,
        inApp: true
      },
      visibilitySettings: {
        profileVisibility: 'estate_only',
        activityVisibility: 'private',
        contactVisibility: 'estate_admins_only'
      }
    };

    return await this.updatePrivacySettings(userId, estateId, defaultSettings, 'system');
  }

  getPrivacySettingsDescriptions(settings) {
    return {
      dataSharingConsent: {
        value: settings.data_sharing_consent,
        title: 'Data Sharing',
        description: 'Allow sharing of your data with authorized third parties for service improvement',
        impact: 'When enabled, your anonymized usage data may be shared with trusted partners to enhance system functionality',
        category: 'data_processing'
      },
      marketingConsent: {
        value: settings.marketing_consent,
        title: 'Marketing Communications',
        description: 'Receive promotional emails and updates about new features',
        impact: 'You will receive periodic marketing emails that you can unsubscribe from at any time',
        category: 'communications'
      },
      analyticsConsent: {
        value: settings.analytics_consent,
        title: 'Analytics Tracking',
        description: 'Allow collection of usage analytics to improve system performance',
        impact: 'Your interaction patterns will be analyzed to optimize user experience and system performance',
        category: 'analytics'
      },
      thirdPartyConsent: {
        value: settings.third_party_consent,
        title: 'Third-Party Integrations',
        description: 'Enable integrations with external services and applications',
        impact: 'Your data may be processed by integrated third-party services according to their privacy policies',
        category: 'integrations'
      },
      locationTrackingConsent: {
        value: settings.location_tracking_consent,
        title: 'Location Tracking',
        description: 'Allow the system to track your location for enhanced security features',
        impact: 'Your location data will be used for security monitoring and access control within the estate',
        category: 'location'
      },
      biometricConsent: {
        value: settings.biometric_consent,
        title: 'Biometric Data Processing',
        description: 'Allow processing of biometric data for enhanced security',
        impact: 'Biometric templates may be stored and processed for authentication and access control',
        category: 'biometric'
      },
      automatedDecisionsConsent: {
        value: settings.automated_decisions_consent,
        title: 'Automated Decision Making',
        description: 'Allow automated systems to make decisions about your access and permissions',
        impact: 'AI systems may automatically approve or deny certain requests based on predefined criteria',
        category: 'automation'
      }
    };
  }

  detectPrivacyChanges(currentSettings, newSettings) {
    const changes = [];
    const settingsMap = {
      'data_sharing_consent': 'dataSharingConsent',
      'marketing_consent': 'marketingConsent',
      'analytics_consent': 'analyticsConsent',
      'third_party_consent': 'thirdPartyConsent',
      'location_tracking_consent': 'locationTrackingConsent',
      'biometric_consent': 'biometricConsent',
      'automated_decisions_consent': 'automatedDecisionsConsent'
    };

    for (const [dbField, jsField] of Object.entries(settingsMap)) {
      const oldValue = currentSettings[dbField];
      const newValue = newSettings[jsField];
      
      if (oldValue !== newValue) {
        changes.push({
          field: dbField,
          oldValue,
          newValue,
          timestamp: new Date()
        });
      }
    }

    return changes;
  }

  async logPrivacyChanges(client, userId, estateId, changes, updatedBy) {
    for (const change of changes) {
      await client.query(`
        INSERT INTO privacy_setting_changes (
          user_id, estate_id, setting_name, old_value, new_value,
          changed_by, changed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        userId,
        estateId,
        change.field,
        change.oldValue,
        change.newValue,
        updatedBy
      ]);
    }
  }

  async applyPrivacySettingsImmediately(client, userId, estateId, settings) {
    // Apply analytics consent
    if (settings.analyticsConsent === false) {
      await client.query(`
        UPDATE user_analytics_data 
        SET anonymized = true, processing_disabled = true
        WHERE user_id = $1 AND estate_id = $2
      `, [userId, estateId]);
    }

    // Apply marketing consent
    if (settings.marketingConsent === false) {
      await client.query(`
        UPDATE user_communication_preferences 
        SET marketing_enabled = false
        WHERE user_id = $1 AND estate_id = $2
      `, [userId, estateId]);
    }

    // Apply third-party consent
    if (settings.thirdPartyConsent === false) {
      await client.query(`
        UPDATE third_party_data_shares 
        SET sharing_disabled = true
        WHERE user_id = $1 AND estate_id = $2
      `, [userId, estateId]);
    }
  }

  getConsentDescription(consentType) {
    const descriptions = {
      'data_processing': 'Consent for processing personal data for service provision',
      'marketing_communications': 'Consent for receiving marketing and promotional communications',
      'analytics_tracking': 'Consent for tracking usage analytics and system optimization',
      'third_party_sharing': 'Consent for sharing data with authorized third-party services',
      'location_tracking': 'Consent for tracking location data for security and access control',
      'biometric_data': 'Consent for processing biometric data for authentication',
      'automated_decision_making': 'Consent for automated decision-making processes'
    };

    return descriptions[consentType] || 'Consent for data processing activities';
  }

  async logPrivacyAccess(userId, estateId, action) {
    await dbManager.query(`
      INSERT INTO privacy_access_logs (
        user_id, estate_id, action, accessed_at, ip_address
      ) VALUES ($1, $2, $3, NOW(), $4)
    `, [userId, estateId, action, null]); // IP address would be passed from request
  }

  /**
   * Load retention policies from database
   */
  async loadRetentionPolicies() {
    try {
      const result = await dbManager.query(`
        SELECT * FROM data_retention_policies 
        WHERE estate_id IS NULL OR estate_id IN (SELECT id FROM estates)
        ORDER BY data_category
      `);

      for (const policy of result.rows) {
        this.retentionPolicies.set(policy.data_category, policy);
      }

      loggingService.logInfo('Retention policies loaded successfully', {
        policiesCount: result.rows.length
      });
    } catch (error) {
      loggingService.logError('Failed to load retention policies', error);
      throw error;
    }
  }

  /**
   * Schedule data retention tasks
   */
  async scheduleDataRetentionTasks() {
    // This would integrate with a job scheduler in production
    loggingService.logInfo('Data retention tasks scheduled');
  }

  /**
   * Get retention policy description
   */
  getRetentionPolicyDescription(policy) {
    const descriptions = {
      'visitor_records': 'Visitor information and access logs are retained for security and compliance purposes',
      'audit_logs': 'System audit logs are retained for security monitoring and compliance requirements',
      'user_data': 'User profile and preference data is retained while the account is active',
      'communication_records': 'Email and SMS communication records are retained for service delivery',
      'security_logs': 'Security event logs are retained for incident investigation and compliance'
    };

    return descriptions[policy.data_category] || 'Data retention policy for compliance and operational needs';
  }

  /**
   * Calculate next execution date for retention policy
   */
  calculateNextExecutionDate(policy) {
    // Simple calculation - in production this would be more sophisticated
    const now = new Date();
    const nextExecution = new Date(now);
    nextExecution.setDate(nextExecution.getDate() + 1); // Daily execution
    return nextExecution;
  }

  /**
   * Get affected data types for a retention policy
   */
  getAffectedDataTypes(dataCategory) {
    const dataTypeMap = {
      'visitor_records': ['personal_identifiers', 'contact_information', 'location_data'],
      'audit_logs': ['security_logs', 'behavioral_data'],
      'user_data': ['personal_identifiers', 'contact_information', 'behavioral_data'],
      'communication_records': ['contact_information', 'communication_records'],
      'security_logs': ['security_logs', 'device_information']
    };

    return dataTypeMap[dataCategory] || ['personal_identifiers'];
  }

  /**
   * Execute retention policy for specific data category
   */
  async executeRetentionPolicy(client, policy, estateId, dryRun) {
    const result = { archived: 0, deleted: 0 };
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_period_days);

      // This is a simplified implementation
      // In production, each data category would have specific retention logic
      
      if (policy.archive_enabled && !dryRun) {
        // Archive old records
        const archiveResult = await client.query(`
          INSERT INTO ${policy.data_category}_archive 
          SELECT *, NOW() as archived_at, 'retention_policy' as archive_reason
          FROM ${policy.data_category}
          WHERE estate_id = $1 AND created_at < $2
        `, [estateId, cutoffDate]);
        
        result.archived = archiveResult.rowCount || 0;
      }

      if (policy.auto_delete_enabled && !dryRun) {
        // Delete old records
        const deleteResult = await client.query(`
          DELETE FROM ${policy.data_category}
          WHERE estate_id = $1 AND created_at < $2
        `, [estateId, cutoffDate]);
        
        result.deleted = deleteResult.rowCount || 0;
      }

      return result;
    } catch (error) {
      loggingService.logError('Failed to execute retention policy', error, {
        policy: policy.data_category,
        estateId
      });
      throw error;
    }
  }

  /**
   * Get data processing activities report
   */
  async getDataProcessingActivities(estateId, startDate, endDate) {
    const result = await dbManager.query(`
      SELECT 
        COUNT(*) as total_activities,
        COUNT(CASE WHEN action_type LIKE '%create%' THEN 1 END) as create_operations,
        COUNT(CASE WHEN action_type LIKE '%update%' THEN 1 END) as update_operations,
        COUNT(CASE WHEN action_type LIKE '%delete%' THEN 1 END) as delete_operations
      FROM compliance_audit_logs
      WHERE estate_id = $1 AND created_at BETWEEN $2 AND $3
    `, [estateId, startDate, endDate]);

    return result.rows[0] || { total_activities: 0, create_operations: 0, update_operations: 0, delete_operations: 0 };
  }

  /**
   * Get consent management report
   */
  async getConsentManagementReport(estateId, startDate, endDate) {
    const result = await dbManager.query(`
      SELECT 
        COUNT(*) as total_consent_changes,
        COUNT(CASE WHEN granted = true THEN 1 END) as consents_granted,
        COUNT(CASE WHEN granted = false THEN 1 END) as consents_withdrawn,
        COUNT(DISTINCT user_id) as users_with_consent_changes
      FROM user_consent_records
      WHERE estate_id = $1 AND granted_at BETWEEN $2 AND $3
    `, [estateId, startDate, endDate]);

    return result.rows[0] || { total_consent_changes: 0, consents_granted: 0, consents_withdrawn: 0, users_with_consent_changes: 0 };
  }

  /**
   * Get data subject rights report
   */
  async getDataSubjectRightsReport(estateId, startDate, endDate) {
    const result = await dbManager.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN request_type = 'data_access' THEN 1 END) as access_requests,
        COUNT(CASE WHEN request_type = 'data_erasure' THEN 1 END) as erasure_requests
      FROM data_subject_requests
      WHERE estate_id = $1 AND created_at BETWEEN $2 AND $3
    `, [estateId, startDate, endDate]);

    return result.rows[0] || { total_requests: 0, completed_requests: 0, pending_requests: 0, access_requests: 0, erasure_requests: 0 };
  }

  /**
   * Get security incidents report
   */
  async getSecurityIncidentsReport(estateId, startDate, endDate) {
    const result = await dbManager.query(`
      SELECT 
        COUNT(*) as total_incidents,
        COUNT(CASE WHEN severity = 'high' OR severity = 'critical' THEN 1 END) as high_severity_incidents,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_incidents
      FROM security_incidents
      WHERE estate_id = $1 AND created_at BETWEEN $2 AND $3
    `, [estateId, startDate, endDate]);

    return result.rows[0] || { total_incidents: 0, high_severity_incidents: 0, resolved_incidents: 0 };
  }

  /**
   * Get data retention compliance report
   */
  async getDataRetentionComplianceReport(estateId, startDate, endDate) {
    const result = await dbManager.query(`
      SELECT 
        COUNT(*) as retention_executions,
        SUM(records_affected) as total_records_processed,
        COUNT(CASE WHEN execution_status = 'success' THEN 1 END) as successful_executions
      FROM compliance_audit_logs
      WHERE estate_id = $1 AND action_type = 'data_retention_execution' 
      AND created_at BETWEEN $2 AND $3
    `, [estateId, startDate, endDate]);

    return result.rows[0] || { retention_executions: 0, total_records_processed: 0, successful_executions: 0 };
  }

  /**
   * Get third-party data sharing report
   */
  async getThirdPartyDataSharingReport(estateId, startDate, endDate) {
    const result = await dbManager.query(`
      SELECT 
        COUNT(*) as sharing_events,
        COUNT(DISTINCT user_id) as users_affected,
        COUNT(CASE WHEN sharing_disabled = false THEN 1 END) as active_sharing
      FROM third_party_data_shares
      WHERE estate_id = $1 AND created_at BETWEEN $2 AND $3
    `, [estateId, startDate, endDate]);

    return result.rows[0] || { sharing_events: 0, users_affected: 0, active_sharing: 0 };
  }

  /**
   * Store compliance report
   */
  async storeComplianceReport(report) {
    await dbManager.query(`
      INSERT INTO compliance_reports (
        id, estate_id, report_type, report_data, generated_at
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      report.reportId,
      report.estateId,
      report.reportType,
      JSON.stringify(report),
      report.generatedAt
    ]);
  }

  /**
   * Apply consent decision immediately
   */
  async applyConsentDecision(client, userId, estateId, consentType, granted) {
    // Apply the consent decision to relevant data processing
    switch (consentType) {
      case 'analytics_tracking':
        if (!granted) {
          await client.query(`
            UPDATE user_analytics_data 
            SET processing_disabled = true, anonymized = true
            WHERE user_id = $1 AND estate_id = $2
          `, [userId, estateId]);
        }
        break;

      case 'marketing_communications':
        await client.query(`
          UPDATE user_communication_preferences 
          SET marketing_enabled = $3
          WHERE user_id = $1 AND estate_id = $2
        `, [userId, estateId, granted]);
        break;

      case 'third_party_sharing':
        await client.query(`
          UPDATE third_party_data_shares 
          SET sharing_disabled = $3
          WHERE user_id = $1 AND estate_id = $2
        `, [userId, estateId, !granted]);
        break;

      case 'location_tracking':
        if (!granted) {
          await client.query(`
            UPDATE user_location_data 
            SET tracking_disabled = true
            WHERE user_id = $1 AND estate_id = $2
          `, [userId, estateId]);
        }
        break;
    }
  }

  /**
   * Process data access request
   */
  async processDataAccessRequest(client, userId, estateId) {
    // Collect all user data for access request
    const userData = {
      personal_info: {},
      visit_history: [],
      communication_records: [],
      privacy_settings: {}
    };

    try {
      // Get user profile data
      const userResult = await client.query(`
        SELECT username, email, phone, created_at, last_login_at
        FROM users WHERE id = $1 AND estate_id = $2
      `, [userId, estateId]);
      
      if (userResult.rows.length > 0) {
        userData.personal_info = userResult.rows[0];
      }

      // Get visit history
      const visitsResult = await client.query(`
        SELECT name, phone, purpose, date_of_visit, status, created_at
        FROM visitors WHERE host_id = $1 AND estate_id = $2
        ORDER BY created_at DESC LIMIT 100
      `, [userId, estateId]);
      
      userData.visit_history = visitsResult.rows;

      return { status: 'completed', data: userData };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Process data erasure request
   */
  async processDataErasureRequest(client, userId, estateId, requestDetails) {
    try {
      const erasureResults = {
        personal_data: false,
        visit_history: false,
        communication_records: false
      };

      // Anonymize user data instead of complete deletion for audit trail
      await client.query(`
        UPDATE users 
        SET username = 'anonymized_user_' || id,
            email = 'anonymized_' || id || '@deleted.local',
            phone = NULL,
            anonymized = true,
            anonymized_at = NOW()
        WHERE id = $1 AND estate_id = $2
      `, [userId, estateId]);
      erasureResults.personal_data = true;

      // Anonymize visitor records where user was host
      await client.query(`
        UPDATE visitors 
        SET created_by = 'anonymized_user',
            host_id = NULL
        WHERE host_id = $1 AND estate_id = $2
      `, [userId, estateId]);
      erasureResults.visit_history = true;

      return { status: 'completed', erasure_results: erasureResults };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Process data portability request
   */
  async processDataPortabilityRequest(client, userId, estateId) {
    try {
      // Generate portable data export
      const exportData = await this.processDataAccessRequest(client, userId, estateId);
      
      if (exportData.status === 'completed') {
        // Format data for portability (JSON format)
        const portableData = {
          export_format: 'JSON',
          export_date: new Date().toISOString(),
          user_id: userId,
          estate_id: estateId,
          data: exportData.data
        };

        return { 
          status: 'completed', 
          portable_data: portableData,
          format: 'JSON'
        };
      }

      return exportData;
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}

export const privacyComplianceService = new PrivacyComplianceService();