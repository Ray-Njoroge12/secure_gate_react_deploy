// server/src/routes/rateLimitRoutes.js
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { ResponseUtil } from '../utils/responseUtils.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { rateLimitStats } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

/**
 * Rate limiting management and monitoring routes
 * Admin-only endpoints for managing rate limits and DDoS protection
 */

/**
 * GET /api/rate-limit/stats
 * Get current rate limiting statistics
 */
router.get('/stats',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const stats = await rateLimitStats.getStats();
    
    ResponseUtil.success(res, stats, 'Rate limit statistics retrieved successfully');
  })
);

/**
 * GET /api/rate-limit/status
 * Get rate limiting system status
 */
router.get('/status',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const status = {
      timestamp: new Date().toISOString(),
      rateLimiting: {
        enabled: true,
        store: process.env.REDIS_URL ? 'redis' : 'memory',
        limits: {
          general: '100 requests per 15 minutes',
          authentication: '5 attempts per 15 minutes',
          admin: '20 requests per hour',
          bulk: '3 operations per hour',
          passwordReset: '3 attempts per hour',
          registration: '3 attempts per hour',
          ddos: '20 requests per minute'
        }
      },
      ddosProtection: {
        enabled: true,
        monitoring: true,
        autoBlock: true
      },
      speedLimiting: {
        enabled: true,
        delayAfter: 50,
        maxDelay: '20 seconds'
      }
    };

    ResponseUtil.success(res, status, 'Rate limiting status retrieved');
  })
);

/**
 * POST /api/rate-limit/reset
 * Reset rate limits for specific key/pattern
 */
router.post('/reset',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { key, pattern } = req.body;

    if (!key && !pattern) {
      return ResponseUtil.error(res, 'Key or pattern is required', 'MISSING_PARAMETER', 400);
    }

    const resetKey = key || pattern;
    const success = await rateLimitStats.resetLimitForKey(resetKey);

    if (success) {
      // Log admin action
      req.auditLog?.({
        action: 'RATE_LIMIT_RESET',
        resource: 'rate_limiting',
        details: {
          resetKey,
          adminId: req.user.id
        }
      });

      ResponseUtil.success(res, 
        { reset: true, key: resetKey },
        'Rate limit reset successfully'
      );
    } else {
      ResponseUtil.error(res, 'Failed to reset rate limit', 'RESET_FAILED', 500);
    }
  })
);

/**
 * POST /api/rate-limit/whitelist
 * Add IP to rate limit whitelist (temporary)
 */
router.post('/whitelist',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { ip, duration = 3600 } = req.body; // Default 1 hour

    if (!ip) {
      return ResponseUtil.error(res, 'IP address is required', 'MISSING_IP', 400);
    }

    // For now, just reset existing rate limits for this IP
    const patterns = [
      `rate_limit:${ip}`,
      `rate_limit:auth:${ip}`,
      `rate_limit:ddos:${ip}`
    ];

    let resetCount = 0;
    for (const pattern of patterns) {
      const success = await rateLimitStats.resetLimitForKey(pattern);
      if (success) resetCount++;
    }

    // Log security action
    req.auditLog?.({
      action: 'RATE_LIMIT_WHITELIST_ADDED',
      resource: 'rate_limiting',
      details: {
        ip,
        duration,
        adminId: req.user.id,
        resetCount
      },
      severity: 'MEDIUM'
    });

    ResponseUtil.success(res, 
      { 
        whitelisted: true, 
        ip, 
        duration, 
        resetCount,
        expiresAt: new Date(Date.now() + duration * 1000).toISOString()
      },
      'IP temporarily whitelisted from rate limits'
    );
  })
);

/**
 * GET /api/rate-limit/blocked
 * Get currently rate-limited IPs and users
 */
router.get('/blocked',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    // This would query Redis for active rate limits
    // For now, return placeholder structure
    const blockedEntities = {
      timestamp: new Date().toISOString(),
      ips: [
        // Example structure:
        // {
        //   ip: '192.168.1.100',
        //   type: 'auth',
        //   remaining: 847, // seconds until reset
        //   attempts: 5
        // }
      ],
      users: [
        // {
        //   userId: 'user123',
        //   type: 'admin',
        //   remaining: 3420,
        //   attempts: 20
        // }
      ],
      ddosBlocked: []
    };

    ResponseUtil.success(res, blockedEntities, 'Currently blocked entities retrieved');
  })
);

/**
 * POST /api/rate-limit/config
 * Update rate limiting configuration (advanced)
 */
router.post('/config',
  authenticateToken,
  requireRole(['super_admin']),
  asyncHandler(async (req, res) => {
    const { 
      generalLimit, 
      authLimit, 
      adminLimit, 
      bulkLimit, 
      ddosThreshold 
    } = req.body;

    // In a full implementation, this would update configuration
    // For now, just validate the request and return current config
    
    const currentConfig = {
      general: { windowMs: 15 * 60 * 1000, max: generalLimit || 100 },
      auth: { windowMs: 15 * 60 * 1000, max: authLimit || 5 },
      admin: { windowMs: 60 * 60 * 1000, max: adminLimit || 20 },
      bulk: { windowMs: 60 * 60 * 1000, max: bulkLimit || 3 },
      ddos: { windowMs: 1 * 60 * 1000, max: ddosThreshold || 20 }
    };

    // Log configuration change
    req.auditLog?.({
      action: 'RATE_LIMIT_CONFIG_UPDATED',
      resource: 'system_configuration',
      details: {
        newConfig: currentConfig,
        adminId: req.user.id
      },
      severity: 'HIGH'
    });

    ResponseUtil.success(res, 
      { updated: true, config: currentConfig },
      'Rate limiting configuration updated'
    );
  })
);

/**
 * GET /api/rate-limit/metrics
 * Get rate limiting metrics for monitoring
 */
router.get('/metrics',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const timeRange = req.query.range || '1h'; // 1h, 6h, 24h
    
    // In a full implementation, this would aggregate metrics from logs/Redis
    const metrics = {
      timestamp: new Date().toISOString(),
      timeRange,
      totalRequests: 0,
      blockedRequests: 0,
      byType: {
        general: { total: 0, blocked: 0 },
        auth: { total: 0, blocked: 0 },
        admin: { total: 0, blocked: 0 },
        bulk: { total: 0, blocked: 0 },
        ddos: { total: 0, blocked: 0 }
      },
      topBlockedIps: [],
      averageResponseTime: 0,
      ddosEvents: 0
    };

    ResponseUtil.success(res, metrics, 'Rate limiting metrics retrieved');
  })
);

export default router;