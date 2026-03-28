/**
 * Emergency Service - API calls for panic button functionality
 * Phase 1.1: Guard Panic Button Implementation
 * 
 * Privacy Features:
 * - GPS captured only at trigger moment
 * - Guards can only view their own history
 * - No continuous location tracking
 */

import apiClient from '../utils/apiClient';
import logger from '../utils/logger';

/**
 * Trigger panic button alert
 * Privacy: GPS is captured once at this moment only
 * @param {Object} locationData - Optional GPS coordinates
 * @param {number} gateId - Optional gate assignment
 * @returns {Promise<Object>} Emergency creation result
 */
export const triggerPanicButton = async (locationData = {}, gateId = null) => {
  try {
    const safeLocation = locationData || {};
    const response = await apiClient.post('/api/emergency/panic', {
      latitude: safeLocation.latitude || null,
      longitude: safeLocation.longitude || null,
      accuracy: safeLocation.accuracy || null,
      gateId
    });
    logger.info('Panic button triggered successfully');
    return response.data;
  } catch (error) {
    logger.error('Failed to trigger panic button:', error);
    throw error;
  }
};

/**
 * Cancel a panic alert (within 30 seconds)
 * @param {number} emergencyId - Emergency ID to cancel
 * @returns {Promise<Object>} Cancellation result
 */
export const cancelPanicAlert = async (emergencyId) => {
  try {
    const response = await apiClient.post(`/api/emergency/${emergencyId}/cancel`);
    logger.info('Panic alert cancelled');
    return response.data;
  } catch (error) {
    logger.error('Failed to cancel panic alert:', error);
    throw error;
  }
};

/**
 * Acknowledge an emergency (for responding guards/admins)
 * @param {number} emergencyId - Emergency ID to acknowledge
 * @returns {Promise<Object>} Acknowledgement result
 */
export const acknowledgeEmergency = async (emergencyId) => {
  try {
    const response = await apiClient.post(`/api/emergency/${emergencyId}/acknowledge`);
    logger.info('Emergency acknowledged');
    return response.data;
  } catch (error) {
    logger.error('Failed to acknowledge emergency:', error);
    throw error;
  }
};

/**
 * Resolve an emergency (admin only)
 * @param {number} emergencyId - Emergency ID to resolve
 * @param {Object} resolution - Resolution details
 * @returns {Promise<Object>} Resolution result
 */
export const resolveEmergency = async (emergencyId, resolution = {}) => {
  try {
    const response = await apiClient.post(`/api/emergency/${emergencyId}/resolve`, resolution);
    logger.info('Emergency resolved');
    return response.data;
  } catch (error) {
    logger.error('Failed to resolve emergency:', error);
    throw error;
  }
};

/**
 * Get all active emergencies
 * @returns {Promise<Array>} List of active emergencies
 */
export const getActiveEmergencies = async () => {
  try {
    const response = await apiClient.get('/api/emergency/active');
    return response.data.data || [];
  } catch (error) {
    logger.error('Failed to fetch active emergencies:', error);
    throw error;
  }
};

/**
 * Get guard's own emergency history (privacy: only their own)
 * @param {number} limit - Maximum number of records
 * @returns {Promise<Array>} Guard's emergency history
 */
export const getMyEmergencyHistory = async (limit = 10) => {
  try {
    const response = await apiClient.get('/api/emergency/my-history', {
      params: { limit }
    });
    return response.data.data || [];
  } catch (error) {
    logger.error('Failed to fetch emergency history:', error);
    throw error;
  }
};

/**
 * Get emergency details
 * @param {number} emergencyId - Emergency ID
 * @returns {Promise<Object>} Emergency details
 */
export const getEmergencyDetails = async (emergencyId) => {
  try {
    const response = await apiClient.get(`/api/emergency/${emergencyId}`);
    return response.data.data;
  } catch (error) {
    logger.error('Failed to fetch emergency details:', error);
    throw error;
  }
};

/**
 * Get privacy information about panic button
 * @returns {Promise<Object>} Privacy policies
 */
export const getPanicPrivacyInfo = async () => {
  try {
    const response = await apiClient.get('/api/emergency/privacy-info');
    return response.data.data;
  } catch (error) {
    logger.error('Failed to fetch privacy info:', error);
    throw error;
  }
};

/**
 * Get current location with user permission
 * Returns null if permission denied - never blocks functionality
 * @returns {Promise<Object|null>} Location data or null
 */
export const getCurrentLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      logger.info('Geolocation not supported - proceeding without location');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (_error) => {
        // Privacy: Never block panic button if location is denied
        logger.info('Location permission denied - proceeding without location');
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000, // 5 seconds max
        maximumAge: 0
      }
    );
  });
};

const emergencyService = {
  triggerPanicButton,
  cancelPanicAlert,
  acknowledgeEmergency,
  resolveEmergency,
  getActiveEmergencies,
  getMyEmergencyHistory,
  getEmergencyDetails,
  getPanicPrivacyInfo,
  getCurrentLocation
};

export default emergencyService;
