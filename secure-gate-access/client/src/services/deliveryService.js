/**
 * Delivery Service (Frontend)
 * Phase 2.1: API client for Delivery & Package Management
 */

import api from './api';

const deliveryService = {
  /**
   * Get all deliveries for the current resident
   */
  async getMyDeliveries(options = {}) {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    
    const response = await api.get(`/deliveries?${params.toString()}`);
    return response.data;
  },

  /**
   * Get pending deliveries (Guard view)
   */
  async getPendingDeliveries() {
    const response = await api.get('/deliveries/pending');
    return response.data;
  },

  /**
   * Get delivery details
   */
  async getDeliveryDetail(deliveryId) {
    const response = await api.get(`/deliveries/${deliveryId}`);
    return response.data;
  },

  /**
   * Get delivery photo (recipient only)
   */
  async getDeliveryPhoto(deliveryId) {
    const response = await api.get(`/deliveries/${deliveryId}/photo`, {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Register a new delivery (Guard action)
   */
  async registerDelivery(deliveryData) {
    const response = await api.post('/deliveries', deliveryData);
    return response.data;
  },

  /**
   * Add photo to delivery (Guard action)
   */
  async addPhoto(deliveryId, photoFile) {
    const formData = new FormData();
    formData.append('photo', photoFile);
    
    const response = await api.post(`/deliveries/${deliveryId}/photo`, formData, {
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
    const response = await api.post(`/deliveries/${deliveryId}/collect`, {
      collectedBy
    });
    return response.data;
  },

  /**
   * Send notification to resident
   */
  async notifyResident(deliveryId) {
    const response = await api.post(`/deliveries/${deliveryId}/notify`);
    return response.data;
  },

  /**
   * Get delivery statistics (Admin)
   */
  async getStats() {
    const response = await api.get('/deliveries/stats/overview');
    return response.data;
  },

  /**
   * Delete delivery history (Privacy control)
   */
  async deleteHistory() {
    const response = await api.delete('/deliveries/history');
    return response.data;
  }
};

export default deliveryService;
