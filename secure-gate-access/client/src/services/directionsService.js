/**
 * Directions Service (Frontend)
 * Phase 2.3: API client for Visitor Directions
 */

import api from './api';

const directionsService = {
  /**
   * Get estate gate location
   */
  async getEstateLocation() {
    const response = await api.get('/directions/estate');
    return response.data;
  },

  /**
   * Update estate location (Admin)
   */
  async updateEstateLocation(locationData) {
    const response = await api.put('/directions/estate', locationData);
    return response.data;
  },

  /**
   * Add custom directions for a visitor
   */
  async addCustomDirections(visitorId, customInstructions) {
    const response = await api.post(`/directions/visitor/${visitorId}/custom`, {
      customInstructions
    });
    return response.data;
  },

  /**
   * Get directions for visitor (public)
   */
  async getVisitorDirections(visitorId, token) {
    const response = await api.get(`/directions/visitor/${visitorId}?token=${token}`);
    return response.data;
  },

  /**
   * Get shareable link
   */
  async getShareableLink(visitorId) {
    const response = await api.get(`/directions/visitor/${visitorId}/share`);
    return response.data;
  },

  /**
   * Delete custom directions
   */
  async deleteCustomDirections(visitorId) {
    const response = await api.delete(`/directions/visitor/${visitorId}/custom`);
    return response.data;
  }
};

export default directionsService;
