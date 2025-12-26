/**
 * Auto-Approval Service (Frontend)
 * Phase 2.2: API client for Auto-Approval Rules Engine
 */

import apiClient from '../utils/apiClient';

const autoApprovalService = {
  /**
   * Get all rules for the current resident
   */
  async getRules() {
    const response = await apiClient.get('/api/auto-approval/rules');
    return response.data;
  },

  /**
   * Create a new auto-approval rule
   */
  async createRule(ruleData) {
    const response = await apiClient.post('/api/auto-approval/rules', ruleData);
    return response.data;
  },

  /**
   * Update an existing rule
   */
  async updateRule(ruleId, updates) {
    const response = await apiClient.put(`/api/auto-approval/rules/${ruleId}`, updates);
    return response.data;
  },

  /**
   * Delete a rule
   */
  async deleteRule(ruleId) {
    const response = await apiClient.delete(`/api/auto-approval/rules/${ruleId}`);
    return response.data;
  },

  /**
   * Toggle rule active status
   */
  async toggleRule(ruleId) {
    const response = await apiClient.post(`/api/auto-approval/rules/${ruleId}/toggle`);
    return response.data;
  },

  /**
   * Get approval history
   */
  async getHistory(limit = 20) {
    const response = await apiClient.get(`/api/auto-approval/history?limit=${limit}`);
    return response.data;
  },

  /**
   * Get available categories
   */
  async getCategories() {
    const response = await apiClient.get('/api/auto-approval/categories');
    return response.data;
  },

  /**
   * Get statistics (Admin)
   */
  async getStats() {
    const response = await apiClient.get('/api/auto-approval/stats');
    return response.data;
  },

  /**
   * Delete all rules (Privacy control)
   */
  async deleteAllRules() {
    const response = await apiClient.delete('/api/auto-approval/rules/all');
    return response.data;
  },

  /**
   * Export rules (Data portability)
   */
  async exportRules() {
    const response = await apiClient.get('/api/auto-approval/export');
    return response.data;
  }
};

export default autoApprovalService;
