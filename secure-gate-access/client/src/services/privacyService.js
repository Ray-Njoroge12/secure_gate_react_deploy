/**
 * @file privacyService.js
 * @description Privacy Dashboard service
 * Phase 3: Privacy Dashboard Features
 * 
 * Features:
 * - Data export (GDPR/KDPA compliant)
 * - Data deletion requests
 * - Privacy preferences management
 * - Consent history
 */

import http from './http';

class PrivacyService {
  /**
   * Get user's privacy settings
   */
  async getPrivacySettings() {
    try {
      const response = await http.get('/api/privacy/settings');
      return response.data || {
        showVisitorFrequency: true,
        shareLocationOnPanic: true,
        allowDeliveryPhotos: true,
        receiveNonCriticalAnnouncements: true,
        dataRetentionPreference: 'default'
      };
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      throw error;
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(settings) {
    try {
      const response = await http.put('/api/privacy/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw error;
    }
  }

  /**
   * Get data inventory (what data we have about the user)
   */
  async getDataInventory() {
    try {
      const response = await http.get('/api/privacy/data-inventory');
      return response.data || {
        personalInfo: {},
        visitors: [],
        deliveries: [],
        emergencyIncidents: [],
        activityLogs: []
      };
    } catch (error) {
      console.error('Error fetching data inventory:', error);
      throw error;
    }
  }

  /**
   * Request data export (GDPR Article 20 / KDPA compliance)
   */
  async requestDataExport(format = 'json') {
    try {
      const response = await http.post('/api/privacy/export', { format });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error requesting data export:', error);
      throw error;
    }
  }

  /**
   * Get data export status
   */
  async getExportStatus(requestId) {
    try {
      const response = await http.get(`/api/privacy/export/${requestId}/status`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching export status:', error);
      throw error;
    }
  }

  /**
   * Download completed export
   */
  async downloadExport(requestId) {
    try {
      const response = await fetch(`/api/privacy/export/${requestId}/download`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to download export');
      }
      
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Error downloading export:', error);
      throw error;
    }
  }

  /**
   * Request data deletion (specific category)
   */
  async requestDataDeletion(category, options = {}) {
    try {
      const response = await http.post('/api/privacy/delete', {
        category,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Error requesting data deletion:', error);
      throw error;
    }
  }

  /**
   * Delete visitor history
   */
  async deleteVisitorHistory(options = {}) {
    return this.requestDataDeletion('visitors', options);
  }

  /**
   * Delete delivery history
   */
  async deleteDeliveryHistory(options = {}) {
    return this.requestDataDeletion('deliveries', options);
  }

  /**
   * Delete emergency incident history (guard only)
   */
  async deleteEmergencyHistory(options = {}) {
    return this.requestDataDeletion('emergencies', options);
  }

  /**
   * Get consent history
   */
  async getConsentHistory() {
    try {
      const response = await http.get('/api/privacy/consents');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching consent history:', error);
      throw error;
    }
  }

  /**
   * Update consent
   */
  async updateConsent(consentType, granted) {
    try {
      const response = await http.post('/api/privacy/consents', {
        consentType,
        granted,
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('Error updating consent:', error);
      throw error;
    }
  }

  /**
   * Get processing activities (transparency)
   */
  async getProcessingActivities() {
    try {
      const response = await http.get('/api/privacy/processing-activities');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching processing activities:', error);
      throw error;
    }
  }

  /**
   * Get data retention policies
   */
  async getRetentionPolicies() {
    try {
      const response = await http.get('/api/privacy/retention-policies');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching retention policies:', error);
      throw error;
    }
  }

  /**
   * Request account deletion
   */
  async requestAccountDeletion(reason = '') {
    try {
      const response = await http.post('/api/privacy/delete-account', {
        reason,
        confirmDeletion: true
      });
      return response.data;
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      throw error;
    }
  }

  /**
   * Get third-party data sharing info
   */
  async getThirdPartySharing() {
    try {
      const response = await http.get('/api/privacy/third-party');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching third-party sharing info:', error);
      throw error;
    }
  }
}

// Export singleton instance
const privacyService = new PrivacyService();
export default privacyService;
