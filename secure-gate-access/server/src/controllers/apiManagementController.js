/**
 * API Management Controller
 * Handles API key lifecycle, usage analytics, and performance metrics
 */

import { apiKeyService } from '../services/apiKeyService.js';
import { analyticsService } from '../services/analyticsService.js';

const apiManagementController = {
  /**
   * Generate a new API key for the authenticated user
   */
  async generateApiKey(req, res, next) {
    try {
      const { name, permissions, rateLimit, expiresInDays } = req.body;
      const { id: userId, estate_id: estateId } = req.user;

      const apiKey = await apiKeyService.generateApiKey({
        userId,
        estateId,
        name,
        permissions,
        rateLimit,
        expiresInDays
      });

      return res.status(201).json({
        success: true,
        message: 'API key generated successfully',
        data: { apiKey },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Revoke an existing API key
   */
  async revokeApiKey(req, res, next) {
    try {
      const { keyId } = req.params;
      const { id: userId } = req.user;

      await apiKeyService.revokeApiKey(keyId, userId);

      return res.status(200).json({
        success: true,
        message: 'API key revoked successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get API usage metrics
   */
  async getUsageMetrics(req, res, next) {
    try {
      const { startDate, endDate, apiKeyId } = req.query;
      const { estate_id: estateId } = req.user;

      const metrics = await analyticsService.getUsageMetrics({
        startDate,
        endDate,
        apiKeyId,
        estateId
      });

      return res.status(200).json({
        success: true,
        message: 'Usage metrics retrieved successfully',
        data: { metrics },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get API performance metrics
   */
  async getPerformanceMetrics(req, res, next) {
    try {
      const { timeRange } = req.query;
      const { estate_id: estateId } = req.user;

      const metrics = await analyticsService.getPerformanceMetrics({
        timeRange,
        estateId
      });

      return res.status(200).json({
        success: true,
        message: 'Performance metrics retrieved successfully',
        data: { metrics },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return next(error);
    }
  }
};

export { apiManagementController };
