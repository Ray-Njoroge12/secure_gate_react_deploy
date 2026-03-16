import apiClient from '../utils/apiClient';
import logger from '../utils/logger';

/**
 * Guard Service - API calls for guard functionalities
 */

/**
 * Get visitor history for guards
 * @returns {Promise<Array>} List of visitors
 */
export const getVisitorHistory = async () => {
  try {
    const response = await apiClient.get('/api/guard/visitor-history');
    return response.data.data || [];
  } catch (error) {
    logger.error('Failed to fetch visitor history:', error);
    throw error;
  }
};

/**
 * Verify a visitor by QR code or pass ID
 * @param {string} passId - The pass ID or QR code data
 * @returns {Promise<Object>} Verification result
 */
export const verifyVisitor = async (passId) => {
  try {
    const response = await apiClient.post('/api/guard/verify', { passId });
    return response.data;
  } catch (error) {
    logger.error('Failed to verify visitor:', error);
    throw error;
  }
};

/**
 * Manual check-in a visitor
 * @param {Object} visitorData - Visitor details for manual check-in
 * @returns {Promise<Object>} Check-in result
 */
export const manualCheckIn = async (visitorData) => {
  try {
    const response = await apiClient.post('/api/guard/manual-checkin', visitorData);
    return response.data;
  } catch (error) {
    logger.error('Failed to manually check in visitor:', error);
    throw error;
  }
};

/**
 * Check out a visitor
 * @param {string} visitorId - The visitor ID
 * @returns {Promise<Object>} Check-out result
 */
export const checkOutVisitor = async (visitorId) => {
  try {
    const response = await apiClient.post('/api/guard/checkout', { visitorId });
    return response.data;
  } catch (error) {
    logger.error('Failed to check out visitor:', error);
    throw error;
  }
};

/**
 * Register a walk-in visitor
 * @param {Object} visitorData - Walk-in visitor details
 * @returns {Promise<Object>} Registration result
 */
export const registerWalkIn = async (visitorData) => {
  try {
    const response = await apiClient.post('/api/guard/walk-in', visitorData);
    return response.data;
  } catch (error) {
    logger.error('Failed to register walk-in visitor:', error);
    throw error;
  }
};

/**
 * Report an incident
 * @param {Object} incidentData - Incident details
 * @returns {Promise<Object>} Incident report result
 */
export const reportIncident = async (incidentData) => {
  try {
    const response = await apiClient.post('/api/guard/incident', incidentData);
    return response.data;
  } catch (error) {
    logger.error('Failed to report incident:', error);
    throw error;
  }
};

/**
 * Get guard analytics
 * @param {Object} params - Query parameters for analytics
 * @returns {Promise<Object>} Analytics data
 */
export const getGuardAnalytics = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/guard/analytics', { params });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch guard analytics:', error);
    throw error;
  }
};

/**
 * Fetch dashboard KPI totals for guard dashboard cards
 * @returns {Promise<Object>} KPI totals
 */
export const fetchDashboardKPIs = async () => {
  const today = new Date().toISOString().split('T')[0];
  const extractTotal = (response) =>
    response?.data?.data?.pagination?.total ??
    response?.data?.pagination?.total ??
    0;

  try {
    const [onPremRes, arrivingRes, pendingRes, deniedRes] = await Promise.all([
      apiClient.get('/api/visitors?status=on_premise&limit=1'),
      apiClient.get(`/api/visitors?fromDate=${today}&toDate=${today}&status=approved&limit=1`),
      apiClient.get('/api/visitors?status=pending_approval&limit=1'),
      apiClient.get(`/api/visitors?status=rejected&fromDate=${today}&toDate=${today}&limit=1`)
    ]);

    return {
      onPremise: extractTotal(onPremRes),
      arrivingToday: extractTotal(arrivingRes),
      pendingApproval: extractTotal(pendingRes),
      deniedToday: extractTotal(deniedRes)
    };
  } catch (error) {
    logger.error('Failed to fetch dashboard KPIs:', error);
    throw error;
  }
};

/**
 * Get active visitors list
 * @returns {Promise<Array>} List of currently checked-in visitors
 */
export const getActiveVisitors = async () => {
  try {
    const response = await apiClient.get('/api/guard/active-visitors');
    return response.data.data || [];
  } catch (error) {
    logger.error('Failed to fetch active visitors:', error);
    throw error;
  }
};

/**
 * Get pending approvals
 * @returns {Promise<Array>} List of visitors pending approval
 */
export const getPendingApprovals = async () => {
  try {
    const response = await apiClient.get('/api/guard/pending-approvals');
    return response.data.data || [];
  } catch (error) {
    logger.error('Failed to fetch pending approvals:', error);
    throw error;
  }
};

/**
 * Approve or reject a visitor
 * @param {string} visitorId - The visitor ID
 * @param {boolean} approved - Whether to approve or reject
 * @param {string} reason - Optional reason for rejection
 * @returns {Promise<Object>} Approval result
 */
export const processApproval = async (visitorId, approved, reason = '') => {
  try {
    const response = await apiClient.post('/api/guard/process-approval', {
      visitorId,
      approved,
      reason
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to process approval:', error);
    throw error;
  }
};

export default {
  getVisitorHistory,
  verifyVisitor,
  manualCheckIn,
  checkOutVisitor,
  registerWalkIn,
  reportIncident,
  getGuardAnalytics,
  fetchDashboardKPIs,
  getActiveVisitors,
  getPendingApprovals,
  processApproval
};
