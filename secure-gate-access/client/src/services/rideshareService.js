/**
 * Rideshare Service (Frontend)
 * P5: API client for Uber/Bolt/Taxi quick entry
 */

import apiClient from '../utils/apiClient';

const rideshareService = {
  /**
   * Create a rideshare entry
   */
  async createEntry(data) {
    const response = await apiClient.post('/api/rideshare', data);
    return response.data;
  },

  /**
   * Get resident's rideshare entries
   */
  async getMyEntries(includeExpired = false) {
    const params = includeExpired ? '?includeExpired=true' : '';
    const response = await apiClient.get(`/api/rideshare${params}`);
    return response.data;
  },

  /**
   * Cancel a rideshare entry
   */
  async cancelEntry(entryId) {
    const response = await apiClient.post(`/api/rideshare/${entryId}/cancel`);
    return response.data;
  },

  /**
   * Get pending entries (Guard view)
   */
  async getPendingEntries() {
    const response = await apiClient.get('/api/rideshare/pending');
    return response.data;
  },

  /**
   * Validate rideshare entry (Guard action)
   */
  async validateEntry(credential, method = 'code') {
    const response = await apiClient.post('/api/rideshare/validate', {
      credential,
      method
    });
    return response.data;
  },

  /**
   * Mark entry as completed (Guard action)
   */
  async completeEntry(entryId) {
    const response = await apiClient.post(`/api/rideshare/${entryId}/complete`);
    return response.data;
  }
};

export default rideshareService;
