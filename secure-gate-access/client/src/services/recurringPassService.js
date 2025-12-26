/**
 * Recurring Pass Service (Frontend)
 * P4: API client for managing daily workers, caregivers, contractors
 */

import apiClient from '../utils/apiClient';

const recurringPassService = {
  /**
   * Get all recurring passes for current resident
   */
  async getMyPasses(options = {}) {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.includeExpired) params.append('includeExpired', 'true');
    
    const response = await apiClient.get(`/api/recurring-passes?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single recurring pass by ID
   */
  async getPass(passId) {
    const response = await apiClient.get(`/api/recurring-passes/${passId}`);
    return response.data;
  },

  /**
   * Create a new recurring pass
   */
  async createPass(passData) {
    const response = await apiClient.post('/api/recurring-passes', passData);
    return response.data;
  },

  /**
   * Update an existing recurring pass
   */
  async updatePass(passId, updates) {
    const response = await apiClient.put(`/api/recurring-passes/${passId}`, updates);
    return response.data;
  },

  /**
   * Revoke a recurring pass
   */
  async revokePass(passId, reason = null) {
    const response = await apiClient.post(`/api/recurring-passes/${passId}/revoke`, { reason });
    return response.data;
  },

  /**
   * Suspend a recurring pass temporarily
   */
  async suspendPass(passId) {
    const response = await apiClient.post(`/api/recurring-passes/${passId}/suspend`);
    return response.data;
  },

  /**
   * Reactivate a suspended pass
   */
  async reactivatePass(passId) {
    const response = await apiClient.post(`/api/recurring-passes/${passId}/reactivate`);
    return response.data;
  },

  /**
   * Get entry history for a pass
   */
  async getPassHistory(passId) {
    const response = await apiClient.get(`/api/recurring-passes/${passId}/history`);
    return response.data;
  },

  /**
   * Validate a recurring pass (Guard action)
   */
  async validatePass(credential, method = 'pin') {
    const response = await apiClient.post('/api/recurring-passes/validate', {
      credential,
      method
    });
    return response.data;
  }
};

export default recurringPassService;
