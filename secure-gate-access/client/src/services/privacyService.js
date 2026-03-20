/**
 * Privacy Service - Frontend API integration for privacy compliance features
 * Provides comprehensive privacy control and GDPR/KDPA compliance functionality
 */

import apiClient from '../utils/apiClient.js';
import logger from '../utils/logger';

class PrivacyService {
  constructor() {
    this.baseUrl = '/api/privacy';
  }

  // Privacy Settings Management
  async getPrivacySettings() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/settings`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch privacy settings:', error);
      throw new Error('Unable to load privacy settings. Please try again.');
    }
  }

  async updatePrivacySettings(settings) {
    try {
      const response = await apiClient.put(`${this.baseUrl}/settings`, settings);
      return response.data;
    } catch (error) {
      logger.error('Failed to update privacy settings:', error);
      throw new Error('Unable to update privacy settings. Please try again.');
    }
  }

  // Data Access and Portability
  async requestDataExport(options = {}) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/data-export`, {
        format: options.format || 'json',
        includeAuditLogs: options.includeAuditLogs || false,
        includePersonalData: options.includePersonalData || true,
        dateRange: options.dateRange || null
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to request data export:', error);
      throw new Error('Unable to request data export. Please try again.');
    }
  }

  async getDataExportStatus(exportId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/data-export/${exportId}/status`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get export status:', error);
      throw new Error('Unable to check export status. Please try again.');
    }
  }

  async downloadDataExport(exportId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/data-export/${exportId}/download`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `privacy-data-export-${exportId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      logger.error('Failed to download data export:', error);
      throw new Error('Unable to download data export. Please try again.');
    }
  }

  // Data Deletion and Right to be Forgotten
  async requestDataDeletion(options = {}) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/data-deletion`, {
        deletePersonalData: options.deletePersonalData || true,
        deleteAuditLogs: options.deleteAuditLogs || false,
        retainMinimalData: options.retainMinimalData || true,
        reason: options.reason || 'User requested deletion'
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to request data deletion:', error);
      throw new Error('Unable to request data deletion. Please try again.');
    }
  }

  async getDeletionStatus(deletionId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/data-deletion/${deletionId}/status`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get deletion status:', error);
      throw new Error('Unable to check deletion status. Please try again.');
    }
  }

  // Consent Management
  async getConsentHistory() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/consent/history`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch consent history:', error);
      throw new Error('Unable to load consent history. Please try again.');
    }
  }

  async updateConsent(consentData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/consent`, {
        consentType: consentData.type,
        granted: consentData.granted,
        purpose: consentData.purpose,
        metadata: consentData.metadata || {}
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to update consent:', error);
      throw new Error('Unable to update consent. Please try again.');
    }
  }

  async withdrawConsent(consentType) {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/consent/${consentType}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to withdraw consent:', error);
      throw new Error('Unable to withdraw consent. Please try again.');
    }
  }

  // Data Processing Activities
  async getProcessingActivities() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/processing-activities`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch processing activities:', error);
      throw new Error('Unable to load processing activities. Please try again.');
    }
  }

  async getDataCategories() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/data-categories`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch data categories:', error);
      throw new Error('Unable to load data categories. Please try again.');
    }
  }

  // Audit and Compliance
  async getPrivacyAuditLog(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.startDate) params.append('start_date', options.startDate);
      if (options.endDate) params.append('end_date', options.endDate);
      if (options.action) params.append('action', options.action);
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);

      const response = await apiClient.get(`${this.baseUrl}/audit-log?${params}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch privacy audit log:', error);
      throw new Error('Unable to load privacy audit log. Please try again.');
    }
  }

  async generateComplianceReport(reportType = 'gdpr') {
    try {
      const response = await apiClient.post(`${this.baseUrl}/compliance-report`, {
        reportType,
        includeAuditTrail: true,
        includeConsentHistory: true,
        includeDataProcessing: true
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw new Error('Unable to generate compliance report. Please try again.');
    }
  }

  // Data Retention Management
  async getRetentionPolicies() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/retention-policies`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch retention policies:', error);
      throw new Error('Unable to load retention policies. Please try again.');
    }
  }

  async updateRetentionPolicy(policyId, policy) {
    try {
      const response = await apiClient.put(`${this.baseUrl}/retention-policies/${policyId}`, policy);
      return response.data;
    } catch (error) {
      logger.error('Failed to update retention policy:', error);
      throw new Error('Unable to update retention policy. Please try again.');
    }
  }

  async getRetentionStatus() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/retention-status`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch retention status:', error);
      throw new Error('Unable to load retention status. Please try again.');
    }
  }

  // Privacy Impact Assessment
  async getPrivacyImpactAssessment() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/privacy-impact-assessment`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch privacy impact assessment:', error);
      throw new Error('Unable to load privacy impact assessment. Please try again.');
    }
  }

  // Data Breach Management
  async reportDataBreach(breachData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/data-breach`, {
        description: breachData.description,
        severity: breachData.severity,
        affectedDataTypes: breachData.affectedDataTypes,
        estimatedAffectedUsers: breachData.estimatedAffectedUsers,
        containmentMeasures: breachData.containmentMeasures,
        discoveredAt: breachData.discoveredAt || new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to report data breach:', error);
      throw new Error('Unable to report data breach. Please try again.');
    }
  }

  async getDataBreaches(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.severity) params.append('severity', options.severity);
      if (options.status) params.append('status', options.status);
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);

      const response = await apiClient.get(`${this.baseUrl}/data-breaches?${params}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch data breaches:', error);
      throw new Error('Unable to load data breaches. Please try again.');
    }
  }

  // Utility Methods
  formatPrivacyDate(dateString) {
    if (!dateString) return 'Not set';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  getConsentStatusText(granted) {
    return granted ? 'Granted' : 'Withdrawn';
  }

  getRetentionPeriodText(days) {
    if (!days) return 'Indefinite';

    if (days < 30) {
      return `${days} days`;
    } else if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(days / 365);
      const remainingDays = days % 365;
      const months = Math.floor(remainingDays / 30);

      let text = `${years} year${years > 1 ? 's' : ''}`;
      if (months > 0) {
        text += ` and ${months} month${months > 1 ? 's' : ''}`;
      }
      return text;
    }
  }

  validatePrivacySettings(settings) {
    const errors = {};

    // Validate data retention periods
    if (settings.dataRetentionDays && settings.dataRetentionDays < 1) {
      errors.dataRetentionDays = 'Data retention period must be at least 1 day';
    }

    // Validate email preferences
    if (settings.emailNotifications && !settings.email) {
      errors.email = 'Email address is required for email notifications';
    }

    // Validate marketing consent age
    if (settings.marketingConsent && settings.userAge && settings.userAge < 16) {
      errors.marketingConsent = 'Marketing consent requires users to be at least 16 years old';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Create and export singleton instance
const privacyService = new PrivacyService();
export default privacyService;

// Named exports for specific functionality
export {
  PrivacyService
};