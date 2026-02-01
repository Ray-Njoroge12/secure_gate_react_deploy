/**
 * Security Service
 * 
 * Handles security-related API calls including additional authentication,
 * security settings management, and incident reporting.
 */

import apiClient from '../utils/apiClient.js';

class SecurityService {
  constructor() {
    this.baseUrl = '/api/security';
  }

  /**
   * Get user security settings
   */
  async getSecuritySettings() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/settings`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update user security settings
   */
  async updateSecuritySettings(settings, additionalHeaders = {}) {
    try {
      const response = await apiClient.put(`${this.baseUrl}/settings`, settings, {
        headers: additionalHeaders
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Request additional authentication for sensitive operation
   */
  async requestAdditionalAuth(operation, context = {}) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/additional-auth/request`, {
        operation,
        context
      });
      return response.data;
    } catch (error) {
      // If additional auth is required, return the auth data instead of throwing
      if (error.response?.status === 202) {
        return error.response.data;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Verify additional authentication factors
   */
  async verifyAdditionalAuth(sessionId, factors) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/additional-auth/verify`, {
        sessionId,
        factors
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Setup TOTP (Time-based One-Time Password)
   */
  async setupTOTP() {
    try {
      const response = await apiClient.post(`${this.baseUrl}/mfa/totp/setup`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Setup SMS MFA
   */
  async setupSMS() {
    try {
      const response = await apiClient.post(`${this.baseUrl}/mfa/sms/setup`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Verify MFA setup
   */
  async verifyMfaSetup(code, method) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/mfa/verify-setup`, {
        code,
        method
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Remove MFA method
   */
  async removeMfaMethod(method) {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/mfa/${method}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get security incidents (Admin only)
   */
  async getSecurityIncidents(filters = {}) {
    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      const response = await apiClient.get(`${this.baseUrl}/incidents?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get specific security incident details
   */
  async getSecurityIncident(incidentId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/incidents/${incidentId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update security incident
   */
  async updateSecurityIncident(incidentId, updates, additionalHeaders = {}) {
    try {
      const response = await apiClient.put(`${this.baseUrl}/incidents/${incidentId}`, updates, {
        headers: additionalHeaders
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get security audit logs (Admin only)
   */
  async getSecurityAuditLogs(filters = {}) {
    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      const response = await apiClient.get(`${this.baseUrl}/audit-logs?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get security analytics dashboard data
   */
  async getSecurityAnalytics(timeRange = '7d') {
    try {
      const response = await apiClient.get(`${this.baseUrl}/analytics?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Report security incident
   */
  async reportSecurityIncident(incidentData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/incidents/report`, incidentData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get security recommendations
   */
  async getSecurityRecommendations() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/recommendations`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check password strength
   */
  async checkPasswordStrength(password) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/password/check-strength`, {
        password
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate backup codes for MFA
   */
  async generateBackupCodes() {
    try {
      const response = await apiClient.post(`${this.baseUrl}/mfa/backup-codes/generate`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Download backup codes
   */
  async downloadBackupCodes() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/mfa/backup-codes/download`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'mfa-backup-codes.txt');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get active sessions
   */
  async getActiveSessions() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/sessions`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId) {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherSessions() {
    try {
      const response = await apiClient.post(`${this.baseUrl}/sessions/revoke-others`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get security score
   */
  async getSecurityScore() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/score`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Enable account lockout protection
   */
  async enableAccountLockoutProtection(settings) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/lockout-protection`, settings);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get security timeline for user
   */
  async getSecurityTimeline(timeRange = '30d') {
    try {
      const response = await apiClient.get(`${this.baseUrl}/timeline?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Export security data
   */
  async exportSecurityData(format = 'json', filters = {}) {
    try {
      const params = new URLSearchParams({ format, ...filters });
      const response = await apiClient.get(`${this.baseUrl}/export?${params.toString()}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `security-data.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Test security configuration
   */
  async testSecurityConfiguration() {
    try {
      const response = await apiClient.post(`${this.baseUrl}/test-configuration`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get security compliance status
   */
  async getComplianceStatus() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/compliance`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
        case 403:
          // Forbidden - insufficient permissions
          break;
        case 404:
          // Not found
          break;
        case 429:
          // Rate limited
          break;
        case 500:
          // Server error
          break;
      }

      return new Error(data?.message || `HTTP ${status} Error`);
    } else if (error.request) {
      // Network error
      return new Error('Network error - please check your connection');
    } else {
      // Other error
      return new Error(error.message || 'An unexpected error occurred');
    }
  }

  /**
   * Validate additional auth requirements
   */
  validateAdditionalAuthFactors(factors, providedFactors) {
    const validation = {
      valid: true,
      missing: [],
      invalid: []
    };

    factors.forEach(factor => {
      const provided = providedFactors[factor.type];

      if (!provided) {
        validation.valid = false;
        validation.missing.push(factor.type);
        return;
      }

      // Validate factor format
      switch (factor.type) {
        case 'totp':
        case 'sms_otp':
          if (!/^\d{6}$/.test(provided)) {
            validation.valid = false;
            validation.invalid.push(factor.type);
          }
          break;
        case 'password_confirmation':
          if (provided.length < 8) {
            validation.valid = false;
            validation.invalid.push(factor.type);
          }
          break;
      }
    });

    return validation;
  }

  /**
   * Format security event for display
   */
  formatSecurityEvent(event) {
    const eventTypes = {
      'login_success': 'Successful Login',
      'login_failure': 'Failed Login Attempt',
      'password_change': 'Password Changed',
      'mfa_enabled': 'MFA Enabled',
      'mfa_disabled': 'MFA Disabled',
      'additional_auth_required': 'Additional Authentication Required',
      'security_settings_updated': 'Security Settings Updated',
      'suspicious_activity': 'Suspicious Activity Detected',
      'account_locked': 'Account Locked',
      'session_revoked': 'Session Revoked'
    };

    return {
      ...event,
      displayType: eventTypes[event.type] || event.type,
      formattedTimestamp: new Date(event.timestamp).toLocaleString(),
      riskLevel: this.getRiskLevel(event.riskScore || 0)
    };
  }

  /**
   * Get risk level from risk score
   */
  getRiskLevel(riskScore) {
    if (riskScore >= 0.8) return 'critical';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Generate security recommendations based on settings
   */
  generateSecurityRecommendations(settings) {
    const recommendations = [];

    if (!settings.mfaEnabled) {
      recommendations.push({
        type: 'mfa',
        priority: 'high',
        title: 'Enable Multi-Factor Authentication',
        description: 'Add an extra layer of security to your account by enabling MFA.',
        action: 'Enable MFA'
      });
    }

    if (settings.sessionTimeoutMinutes > 60) {
      recommendations.push({
        type: 'session_timeout',
        priority: 'medium',
        title: 'Reduce Session Timeout',
        description: 'Consider reducing your session timeout for better security.',
        action: 'Update Settings'
      });
    }

    if (!settings.loginNotificationsEnabled) {
      recommendations.push({
        type: 'login_notifications',
        priority: 'medium',
        title: 'Enable Login Notifications',
        description: 'Get notified when someone signs into your account.',
        action: 'Enable Notifications'
      });
    }

    return recommendations;
  }
}

export const securityService = new SecurityService();