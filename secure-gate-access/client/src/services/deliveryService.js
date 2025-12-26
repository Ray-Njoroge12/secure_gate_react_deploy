/**
 * Delivery Service (Frontend)
 * Phase 2.1: API client for Delivery & Package Management
 */

import apiClient from '../utils/apiClient';

const deliveryService = {
  /**
   * Get all deliveries for the current resident
   */
  async getMyDeliveries(options = {}) {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    
    const response = await apiClient.get(`/api/deliveries?${params.toString()}`);
    return response.data;
  },

  /**
   * Get pending deliveries (Guard view)
   */
  async getPendingDeliveries() {
    const response = await apiClient.get('/api/deliveries/pending');
    return response.data;
  },

  /**
   * Get delivery details
   */
  async getDeliveryDetail(deliveryId) {
    const response = await apiClient.get(`/api/deliveries/${deliveryId}`);
    return response.data;
  },

  /**
   * Get delivery photo (recipient only)
   */
  async getDeliveryPhoto(deliveryId) {
    const response = await apiClient.get(`/api/deliveries/${deliveryId}/photo`, {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Register a new delivery (Guard action)
   */
  async registerDelivery(deliveryData) {
    const response = await apiClient.post('/api/deliveries', deliveryData);
    return response.data;
  },

  /**
   * Add photo to delivery (Guard action)
   */
  async addPhoto(deliveryId, photoFile) {
    const formData = new FormData();
    formData.append('photo', photoFile);
    
    const response = await apiClient.post(`/api/deliveries/${deliveryId}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Mark delivery as collected
   */
  async collectDelivery(deliveryId, collectedBy) {
    const response = await apiClient.post(`/api/deliveries/${deliveryId}/collect`, {
      collectedBy
    });
    return response.data;
  },

  /**
   * Send notification to resident
   */
  async notifyResident(deliveryId) {
    const response = await apiClient.post(`/api/deliveries/${deliveryId}/notify`);
    return response.data;
  },

  async setHandoffPreference(deliveryId, preference) {
    const response = await apiClient.post(`/api/deliveries/${deliveryId}/handoff`, {
      preference
    });
    return response.data;
  },

  /**
   * Get delivery statistics (Admin)
   */
  async getStats() {
    const response = await apiClient.get('/api/deliveries/stats/overview');
    return response.data;
  },

  /**
   * Delete delivery history (Privacy control)
   */
  async deleteHistory() {
    const response = await apiClient.delete('/api/deliveries/history');
    return response.data;
  }
};

export default deliveryService;
