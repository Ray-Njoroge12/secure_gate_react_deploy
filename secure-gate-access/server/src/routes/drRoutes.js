/**
 * Disaster Recovery Routes for Secure Gate Access Control System
 * 
 * Provides REST API endpoints for DR management and monitoring
 * Features:
 * - DR status monitoring
 * - Drill management
 * - Failover control
 * - Recovery procedures
 */

import express from 'express';
import drService from '../services/drService.js';
import drDrillService from '../services/drDrillService.js';
import loggingService from '../services/loggingService.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all DR routes
router.use(authenticateToken);

/**
 * @route GET /api/dr/status
 * @desc Get DR status and health
 * @access Private (Admin, DRP Team)
 */
router.get('/status', requireRole(['admin', 'drp_team']), async (req, res) => {
  try {
    const drStatus = drService.getDRStatus();
    
    res.json({
      success: true,
      data: drStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Failed to get DR status', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get DR status',
      error: error.message
    });
  }
});

/**
 * @route GET /api/dr/health
 * @desc Get DR health check
 * @access Private (Admin, DRP Team)
 */
router.get('/health', requireRole(['admin', 'drp_team']), async (req, res) => {
  try {
    const health = {
      primary: {
        postgres: drService.drStatus.primary.postgres.status,
        redis: drService.drStatus.primary.redis.status,
        vault: drService.drStatus.primary.vault.status
      },
      dr: {
        postgres: drService.drStatus.dr.postgres.status,
        redis: drService.drStatus.dr.redis.status,
        vault: drService.drStatus.dr.vault.status
      },
      replication: {
        status: drService.drStatus.replication.status,
        lastSync: drService.drStatus.replication.lastSync,
        syncLag: drService.drStatus.replication.syncLag
      }
    };
    
    const isHealthy = Object.values(health.primary).every(status => status === 'healthy') &&
                     Object.values(health.dr).every(status => status === 'healthy') &&
                     health.replication.status === 'healthy';
    
    res.status(isHealthy ? 200 : 503).json({
      success: true,
      healthy: isHealthy,
      data: health,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Failed to get DR health', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get DR health',
      error: error.message
    });
  }
});

/**
 * @route POST /api/dr/failover
 * @desc Initiate DR failover
 * @access Private (Admin, DRP Team)
 */
router.post('/failover', requireRole(['admin', 'drp_team']), async (req, res) => {
  try {
    const { reason, initiatedBy } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Failover reason is required'
      });
    }
    
    loggingService.logInfo('DR failover initiated', {
      reason,
      initiatedBy: initiatedBy || req.user.id,
      timestamp: new Date().toISOString()
    });
    
    await drService.initiateFailover();
    
    res.json({
      success: true,
      message: 'DR failover initiated successfully',
      data: {
        reason,
        initiatedBy: initiatedBy || req.user.id,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    loggingService.logError('DR failover failed', error);
    res.status(500).json({
      success: false,
      message: 'DR failover failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/dr/drills
 * @desc Get DR drill status and history
 * @access Private (Admin, DRP Team)
 */
router.get('/drills', requireRole(['admin', 'drp_team']), async (req, res) => {
  try {
    const drillStatus = drDrillService.getDrillStatus();
    
    res.json({
      success: true,
      data: drillStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Failed to get DR drill status', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get DR drill status',
      error: error.message
    });
  }
});

/**
 * @route POST /api/dr/drills/schedule
 * @desc Schedule a DR drill
 * @access Private (Admin, DRP Team)
 */
router.post('/drills/schedule', requireRole(['admin', 'drp_team']), async (req, res) => {
  try {
    const { drillType, scheduledTime, participants } = req.body;
    
    if (!drillType) {
      return res.status(400).json({
        success: false,
        message: 'Drill type is required'
      });
    }
    
    const drill = await drDrillService.scheduleDrill(
      drillType,
      scheduledTime ? new Date(scheduledTime) : null,
      participants || []
    );
    
    res.json({
      success: true,
      message: 'DR drill scheduled successfully',
      data: drill
    });
    
  } catch (error) {
    loggingService.logError('Failed to schedule DR drill', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule DR drill',
      error: error.message
    });
  }
});

/**
 * @route POST /api/dr/drills/:drillId/execute
 * @desc Execute a DR drill
 * @access Private (Admin, DRP Team)
 */
router.post('/drills/:drillId/execute', requireRole(['admin', 'drp_team']), async (req, res) => {
  try {
    const { drillId } = req.params;
    
    const drill = await drDrillService.executeDrill(drillId);
    
    res.json({
      success: true,
      message: 'DR drill executed successfully',
      data: drill
    });
    
  } catch (error) {
    loggingService.logError('Failed to execute DR drill', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute DR drill',
      error: error.message
    });
  }
});

/**
 * @route GET /api/dr/drills/:drillId/report
 * @desc Get DR drill report
 * @access Private (Admin, DRP Team)
 */
router.get('/drills/:drillId/report', requireRole(['admin', 'drp_team']), async (req, res) => {
  try {
    const { drillId } = req.params;
    const drillStatus = drDrillService.getDrillStatus();
    
    const drill = drillStatus.drillHistory.find(d => d.id === drillId);
    
    if (!drill) {
      return res.status(404).json({
        success: false,
        message: 'Drill not found'
      });
    }
    
    res.json({
      success: true,
      data: drill
    });
    
  } catch (error) {
    loggingService.logError('Failed to get DR drill report', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get DR drill report',
      error: error.message
    });
  }
});

/**
 * @route GET /api/dr/drills/types
 * @desc Get available DR drill types
 * @access Private (Admin, DRP Team)
 */
router.get('/drills/types', requireRole(['admin', 'drp_team']), async (req, res) => {
  try {
    const drillTypes = Object.keys(drDrillService.config.drillTypes).map(type => ({
      type,
      ...drDrillService.config.drillTypes[type]
    }));
    
    res.json({
      success: true,
      data: drillTypes
    });
    
  } catch (error) {
    loggingService.logError('Failed to get DR drill types', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get DR drill types',
      error: error.message
    });
  }
});

/**
 * @route GET /api/dr/metrics
 * @desc Get DR metrics and statistics
 * @access Private (Admin, DRP Team)
 */
router.get('/metrics', requireRole(['admin', 'drp_team']), async (req, res) => {
  try {
    const drillStatus = drDrillService.getDrillStatus();
    
    const metrics = {
      totalDrills: drillStatus.drillHistory.length,
      activeDrills: drillStatus.activeDrills.length,
      rtoCompliance: drillStatus.drillHistory.filter(d => d.result?.rtoCompliance).length / drillStatus.drillHistory.length * 100,
      rpoCompliance: drillStatus.drillHistory.filter(d => d.result?.rpoCompliance).length / drillStatus.drillHistory.length * 100,
      averageRecoveryTime: drillStatus.drillHistory.reduce((sum, d) => sum + (d.result?.duration || 0), 0) / drillStatus.drillHistory.length,
      lessonsLearned: drillStatus.lessonsLearned.length,
      drillTypes: Object.keys(drDrillService.config.drillTypes).map(type => ({
        type,
        count: drillStatus.drillHistory.filter(d => d.type === type).length
      }))
    };
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Failed to get DR metrics', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get DR metrics',
      error: error.message
    });
  }
});

/**
 * @route POST /api/dr/replication/start
 * @desc Start cross-region replication
 * @access Private (Admin, DRP Team)
 */
router.post('/replication/start', requireRole(['admin', 'drp_team']), async (req, res) => {
  try {
    drService.startReplication();
    
    res.json({
      success: true,
      message: 'Cross-region replication started'
    });
    
  } catch (error) {
    loggingService.logError('Failed to start replication', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start replication',
      error: error.message
    });
  }
});

/**
 * @route POST /api/dr/replication/stop
 * @desc Stop cross-region replication
 * @access Private (Admin, DRP Team)
 */
router.post('/replication/stop', requireRole(['admin', 'drp_team']), async (req, res) => {
  try {
    drService.stopReplication();
    
    res.json({
      success: true,
      message: 'Cross-region replication stopped'
    });
    
  } catch (error) {
    loggingService.logError('Failed to stop replication', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop replication',
      error: error.message
    });
  }
});

/**
 * @route GET /api/dr/replication/status
 * @desc Get replication status
 * @access Private (Admin, DRP Team)
 */
router.get('/replication/status', requireRole(['admin', 'drp_team']), async (req, res) => {
  try {
    const drStatus = drService.getDRStatus();
    
    res.json({
      success: true,
      data: {
        isReplicating: drStatus.isReplicating,
        lastSync: drStatus.replication.lastSync,
        syncLag: drStatus.replication.syncLag,
        errors: drStatus.replication.errors
      }
    });
    
  } catch (error) {
    loggingService.logError('Failed to get replication status', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get replication status',
      error: error.message
    });
  }
});

/**
 * @route GET /api/dr/lessons-learned
 * @desc Get lessons learned from DR drills
 * @access Private (Admin, DRP Team)
 */
router.get('/lessons-learned', requireRole(['admin', 'drp_team']), async (req, res) => {
  try {
    const drillStatus = drDrillService.getDrillStatus();
    
    res.json({
      success: true,
      data: drillStatus.lessonsLearned
    });
    
  } catch (error) {
    loggingService.logError('Failed to get lessons learned', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get lessons learned',
      error: error.message
    });
  }
});

/**
 * @route GET /api/dr/recommendations
 * @desc Get DR recommendations
 * @access Private (Admin, DRP Team)
 */
router.get('/recommendations', requireRole(['admin', 'drp_team']), async (req, res) => {
  try {
    const drillStatus = drDrillService.getDrillStatus();
    
    const recommendations = drillStatus.drillHistory
      .filter(d => d.result?.recommendations)
      .flatMap(d => d.result.recommendations);
    
    res.json({
      success: true,
      data: recommendations
    });
    
  } catch (error) {
    loggingService.logError('Failed to get DR recommendations', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get DR recommendations',
      error: error.message
    });
  }
});

export default router;
