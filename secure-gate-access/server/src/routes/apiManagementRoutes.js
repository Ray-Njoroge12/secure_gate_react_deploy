/**
 * API Management Routes
 * Provides endpoints for API client management, usage analytics, and documentation
 */

import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import apiEnhancementMiddleware from '../middleware/apiEnhancementMiddleware.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';

const router = express.Router();

/**
 * Get API documentation
 */
router.get('/documentation', (req, res) => {
  try {
    const documentation = apiEnhancementMiddleware.getApiDocumentation();
    successResponse(res, documentation, 'API documentation retrieved successfully');
  } catch (error) {
    errorResponse(res, 'Failed to retrieve API documentation', 'DOCUMENTATION_ERROR', 500);
  }
});

/**
 * Create API client (Admin only)
 */
router.post('/clients',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  async (req, res) => {
    try {
      const { name, tier, permissions, rateLimit } = req.body;

      if (!name) {
        return errorResponse(res, 'Client name is required', 'VALIDATION_ERROR', 400);
      }

      const clientData = {
        name,
        tier: tier || 'authenticated',
        permissions: permissions || [],
        rateLimit,
        createdBy: req.user.id
      };

      const client = await apiEnhancementMiddleware.createApiClient(clientData);

      successResponse(res, {
        client: {
          ...client,
          apiKey: client.apiKey // Include API key in response for initial setup
        }
      }, 'API client created successfully', 201);

    } catch (error) {
      console.error('Error creating API client:', error);
      errorResponse(res, 'Failed to create API client', 'CLIENT_CREATION_ERROR', 500);
    }
  }
);

/**
 * Get API clients (Admin only)
 */
router.get('/clients',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  async (req, res) => {
    try {
      const clients = await apiEnhancementMiddleware.getAllApiClients();
      successResponse(res, { clients }, 'API clients retrieved successfully');
    } catch (error) {
      console.error('Error retrieving API clients:', error);
      errorResponse(res, 'Failed to retrieve API clients', 'CLIENTS_RETRIEVAL_ERROR', 500);
    }
  }
);

/**
 * Revoke API client (Admin only)
 */
router.delete('/clients/:clientId',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  async (req, res) => {
    try {
      const { clientId } = req.params;

      const success = await apiEnhancementMiddleware.revokeApiClient(clientId);

      if (success) {
        successResponse(res, null, 'API client revoked successfully');
      } else {
        errorResponse(res, 'API client not found', 'CLIENT_NOT_FOUND', 404);
      }

    } catch (error) {
      console.error('Error revoking API client:', error);
      errorResponse(res, 'Failed to revoke API client', 'CLIENT_REVOCATION_ERROR', 500);
    }
  }
);

/**
 * Get API usage analytics (Admin only)
 */
router.get('/analytics',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  (req, res) => {
    try {
      const { clientId, period } = req.query;

      const stats = apiEnhancementMiddleware.getApiUsageStats(clientId);

      // Calculate summary statistics
      const summary = {
        totalRequests: 0,
        totalErrors: 0,
        averageResponseTime: 0,
        topEndpoints: [],
        clientCount: new Set()
      };

      let totalResponseTime = 0;
      let requestCount = 0;

      for (const [key, stat] of Object.entries(stats)) {
        const [client, endpoint] = key.split(':', 2);
        summary.clientCount.add(client);
        summary.totalRequests += stat.totalRequests;
        summary.totalErrors += stat.errorCount;
        totalResponseTime += stat.totalResponseTime;
        requestCount += stat.totalRequests;

        summary.topEndpoints.push({
          endpoint,
          client,
          requests: stat.totalRequests,
          errorRate: stat.errorRate,
          avgResponseTime: stat.averageResponseTime
        });
      }

      summary.averageResponseTime = requestCount > 0 ?
        Math.round(totalResponseTime / requestCount) : 0;
      summary.clientCount = summary.clientCount.size;
      summary.topEndpoints = summary.topEndpoints
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10);

      successResponse(res, {
        summary,
        detailed: stats,
        period: period || 'all_time'
      }, 'API analytics retrieved successfully');

    } catch (error) {
      console.error('Error retrieving API analytics:', error);
      errorResponse(res, 'Failed to retrieve API analytics', 'ANALYTICS_ERROR', 500);
    }
  }
);

/**
 * Get API usage for current client
 */
router.get('/usage',
  apiEnhancementMiddleware.enhancedAuthentication(),
  (req, res) => {
    try {
      const clientId = req.apiClient?.id || req.user?.id;

      if (!clientId) {
        return errorResponse(res, 'Client identification required', 'CLIENT_ID_REQUIRED', 400);
      }

      const stats = apiEnhancementMiddleware.getApiUsageStats(clientId);

      successResponse(res, {
        clientId,
        usage: stats,
        generatedAt: new Date().toISOString()
      }, 'API usage retrieved successfully');

    } catch (error) {
      console.error('Error retrieving API usage:', error);
      errorResponse(res, 'Failed to retrieve API usage', 'USAGE_ERROR', 500);
    }
  }
);

/**
 * Get rate limit status for current client
 */
router.get('/rate-limit-status',
  apiEnhancementMiddleware.enhancedAuthentication(),
  (req, res) => {
    try {
      const tier = req.apiClient?.tier || 'authenticated';
      // Read real rate limit values from response headers (set by rateLimiters middleware)
      const limitHeader = res.getHeader('X-RateLimit-Limit');
      const remainingHeader = res.getHeader('X-RateLimit-Remaining');
      const resetHeader = res.getHeader('X-RateLimit-Reset');

      const limit = limitHeader ? parseInt(limitHeader, 10) : 1000;
      const remaining = remainingHeader ? parseInt(remainingHeader, 10) : limit;
      const resetTime = resetHeader
        ? new Date(parseInt(resetHeader, 10) * 1000).toISOString()
        : new Date(Date.now() + 15 * 60 * 1000).toISOString();

      successResponse(res, { limit, remaining, resetTime, tier }, 'Rate limit status retrieved successfully');
    } catch (error) {
      console.error('Error retrieving rate limit status:', error);
      errorResponse(res, 'Failed to retrieve rate limit status', 'RATE_LIMIT_STATUS_ERROR', 500);
    }
  }
);

/**
 * Test API endpoint for connectivity and authentication
 */
router.get('/test',
  apiEnhancementMiddleware.enhancedAuthentication(),
  (req, res) => {
    try {
      const testResult = {
        status: 'success',
        timestamp: new Date().toISOString(),
        authentication: {
          method: req.authMethod,
          clientId: req.apiClient?.id || null,
          userId: req.user?.id || null,
          tier: req.apiClient?.tier || 'authenticated'
        },
        apiVersion: req.apiVersion || 'v1',
        rateLimit: {
          tier: req.apiClient?.tier || 'authenticated',
          // This would be populated by actual rate limit middleware
        }
      };

      successResponse(res, testResult, 'API test successful');

    } catch (error) {
      console.error('API test error:', error);
      errorResponse(res, 'API test failed', 'API_TEST_ERROR', 500);
    }
  }
);

/**
 * Get API health status
 */
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || 'v1',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json(health);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;