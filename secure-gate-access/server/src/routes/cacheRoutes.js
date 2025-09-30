// server/src/routes/cacheRoutes.js
import express from 'express';
import { CacheKeys } from '../services/redisService.js';
import { sessionManager } from '../middleware/sessionMiddleware.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { ResponseUtil } from '../utils/responseUtils.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Cache routes factory function to inject Redis service
export default function createCacheRoutes(redisService) {

const router = express.Router();

/**
 * Cache health check endpoint (public)
 * GET /api/cache/health
 */
router.get('/health', asyncHandler(async (req, res) => {
  const health = await redisService.healthCheck();
  
  const response = ResponseUtil.success({
    cache: health,
    timestamp: new Date().toISOString()
  }, 'Cache health check completed');
  
  res.status(health.status === 'healthy' ? 200 : 503).json(response);
}));

/**
 * Cache statistics endpoint (admin only)
 * GET /api/cache/stats
 */
router.get('/stats', 
  authenticateToken, 
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const cacheStats = redisService.getStats();
    const sessionStats = await sessionManager.getSessionStats();
    
    const response = ResponseUtil.success({
      cache: cacheStats,
      sessions: sessionStats,
      timestamp: new Date().toISOString()
    }, 'Cache statistics retrieved');
    
    res.json(response);
  })
);

/**
 * Clear specific cache pattern (admin only)
 * DELETE /api/cache/pattern/:pattern
 */
router.delete('/pattern/:pattern',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const { pattern } = req.params;
    
    // Decode base64 pattern if needed
    const decodedPattern = Buffer.from(pattern, 'base64').toString('utf-8');
    
    const deletedCount = await redisService.deletePattern(decodedPattern);
    
    const response = ResponseUtil.success({
      pattern: decodedPattern,
      deletedKeys: deletedCount
    }, `Cleared ${deletedCount} cache entries`);
    
    res.json(response);
  })
);

/**
 * Clear specific cache key (admin only)
 * DELETE /api/cache/key/:key
 */
router.delete('/key/:key',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const { key } = req.params;
    
    // Decode base64 key if needed
    const decodedKey = Buffer.from(key, 'base64').toString('utf-8');
    
    const deleted = await redisService.delete(decodedKey);
    
    const response = ResponseUtil.success({
      key: decodedKey,
      deleted
    }, deleted ? 'Cache key cleared' : 'Cache key not found');
    
    res.json(response);
  })
);

/**
 * Clear all cache (admin only)
 * DELETE /api/cache/all
 */
router.delete('/all',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    // Clear common cache patterns
    const patterns = [
      'api:*',
      'user:*',
      'visitor:*',
      'bulk_invite:*',
      'access_logs:*',
      'dashboard_stats',
      'active_visitors'
    ];
    
    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await redisService.deletePattern(pattern);
      totalDeleted += deleted;
    }
    
    const response = ResponseUtil.success({
      deletedKeys: totalDeleted,
      patterns
    }, `Cleared ${totalDeleted} cache entries`);
    
    res.json(response);
  })
);

/**
 * Warm cache endpoint (admin only)
 * POST /api/cache/warm
 */
router.post('/warm',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const { type } = req.body;
    
    try {
      switch (type) {
        case 'dashboard':
          // This would be implemented with actual dashboard stats function
          await redisService.set(CacheKeys.dashboardStats(), {
            warmedAt: new Date().toISOString(),
            placeholder: true
          }, 300);
          break;
          
        case 'active_visitors':
          // This would be implemented with actual active visitors function
          await redisService.set(CacheKeys.activeVisitors(), {
            warmedAt: new Date().toISOString(),
            placeholder: true
          }, 300);
          break;
          
        default:
          return res.status(400).json(
            ResponseUtil.error('INVALID_CACHE_TYPE', 'Invalid cache type specified')
          );
      }
      
      const response = ResponseUtil.success({
        type,
        warmedAt: new Date().toISOString()
      }, `Cache warmed for type: ${type}`);
      
      res.json(response);
    } catch (error) {
      throw error;
    }
  })
);

/**
 * Session management endpoints
 */

/**
 * Get session statistics (admin only)
 * GET /api/cache/sessions/stats
 */
router.get('/sessions/stats',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const stats = await sessionManager.getSessionStats();
    
    const response = ResponseUtil.success(stats, 'Session statistics retrieved');
    res.json(response);
  })
);

/**
 * Force logout user from all sessions (admin only)
 * POST /api/cache/sessions/logout-user
 */
router.post('/sessions/logout-user',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json(
        ResponseUtil.error('MISSING_USER_ID', 'User ID is required')
      );
    }
    
    const result = await sessionManager.forceLogoutUser(userId);
    
    const response = ResponseUtil.success(result, `Force logged out user from ${result.destroyed} sessions`);
    res.json(response);
  })
);

/**
 * Reset cache statistics (admin only)
 * POST /api/cache/reset-stats
 */
router.post('/reset-stats',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    redisService.resetStats();
    
    const response = ResponseUtil.success({
      reset: true,
      timestamp: new Date().toISOString()
    }, 'Cache statistics reset');
    
    res.json(response);
  })
);

  return router;
}