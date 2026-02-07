/**
 * @fileoverview Performance Monitoring API Routes
 * @description API endpoints for performance metrics, alerts, and monitoring
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import performanceMonitoringService from '../services/performanceMonitoringService.js';
import loggingService from '../services/loggingService.js';

const router = express.Router();

/**
 * Get current performance metrics
 * GET /api/admin/performance/metrics
 */
router.get('/metrics', 
  authenticateToken, 
  requireRolePolicy('adminOnly'), 
  async (req, res) => {
    try {
      const metrics = performanceMonitoringService.getMetrics();
      
      successResponse(res, metrics, 'Performance metrics retrieved successfully');
      
    } catch (error) {
      loggingService.logError('Error retrieving performance metrics', error, {
        userId: req.user?.id,
        estateId: req.user?.estate_id
      });
      
      errorResponse(res, 'Failed to retrieve performance metrics', 'METRICS_RETRIEVAL_ERROR', 500);
    }
  }
);

/**
 * Get real-time performance stream (Server-Sent Events)
 * GET /api/admin/performance/stream
 */
router.get('/stream', 
  authenticateToken, 
  requireRolePolicy('adminOnly'), 
  (req, res) => {
    try {
      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Send initial connection message
      res.write(`event: connected\n`);
      res.write(`data: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);
      
      // Set up event listeners for real-time updates
      const handleMetricsUpdate = (metrics) => {
        res.write(`event: metrics-update\n`);
        res.write(`data: ${JSON.stringify({ type: 'metrics-update', payload: metrics })}\n\n`);
      };
      
      const handleAlertTriggered = (alert) => {
        res.write(`event: alert-triggered\n`);
        res.write(`data: ${JSON.stringify({ type: 'alert-triggered', payload: alert })}\n\n`);
      };
      
      const handleAlertResolved = (alert) => {
        res.write(`event: alert-resolved\n`);
        res.write(`data: ${JSON.stringify({ type: 'alert-resolved', payload: alert })}\n\n`);
      };
      
      const handleScaleEvent = (event) => {
        res.write(`event: scale-event\n`);
        res.write(`data: ${JSON.stringify({ type: 'scale-event', payload: event })}\n\n`);
      };
      
      // Register event listeners
      performanceMonitoringService.on('metrics-updated', handleMetricsUpdate);
      performanceMonitoringService.on('alert-triggered', handleAlertTriggered);
      performanceMonitoringService.on('alert-resolved', handleAlertResolved);
      performanceMonitoringService.on('scale-up-triggered', handleScaleEvent);
      performanceMonitoringService.on('scale-down-triggered', handleScaleEvent);
      
      // Handle client disconnect
      req.on('close', () => {
        performanceMonitoringService.removeListener('metrics-updated', handleMetricsUpdate);
        performanceMonitoringService.removeListener('alert-triggered', handleAlertTriggered);
        performanceMonitoringService.removeListener('alert-resolved', handleAlertResolved);
        performanceMonitoringService.removeListener('scale-up-triggered', handleScaleEvent);
        performanceMonitoringService.removeListener('scale-down-triggered', handleScaleEvent);
        
        loggingService.logInfo('[PERFORMANCE] Client disconnected from stream', { clientId });
      });
      
      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        res.write(`event: heartbeat\n`);
        res.write(`data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
      }, 30000); // Every 30 seconds
      
      req.on('close', () => {
        clearInterval(heartbeat);
      });
      
      loggingService.logInfo('[PERFORMANCE] Client connected to stream', { 
        clientId,
        userId: req.user?.id,
        estateId: req.user?.estate_id
      });
      
    } catch (error) {
      loggingService.logError('Error setting up performance stream', error, {
        userId: req.user?.id,
        estateId: req.user?.estate_id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to establish performance stream'
      });
    }
  }
);

/**
 * Update performance thresholds
 * PUT /api/admin/performance/thresholds
 */
router.put('/thresholds', 
  authenticateToken, 
  requireRolePolicy('adminOnly'), 
  async (req, res) => {
    try {
      const { thresholds } = req.body;
      
      if (!thresholds || typeof thresholds !== 'object') {
        return errorResponse(res, 'Invalid thresholds data', 'INVALID_THRESHOLDS', 400);
      }
      
      performanceMonitoringService.updateThresholds(thresholds);
      
      loggingService.logInfo('[PERFORMANCE] Thresholds updated', {
        userId: req.user?.id,
        estateId: req.user?.estate_id,
        newThresholds: thresholds
      });
      
      successResponse(res, { thresholds }, 'Performance thresholds updated successfully');
      
    } catch (error) {
      loggingService.logError('Error updating performance thresholds', error, {
        userId: req.user?.id,
        estateId: req.user?.estate_id
      });
      
      errorResponse(res, 'Failed to update performance thresholds', 'THRESHOLD_UPDATE_ERROR', 500);
    }
  }
);

/**
 * Acknowledge an alert
 * POST /api/admin/performance/alerts/:alertId/acknowledge
 */
router.post('/alerts/:alertId/acknowledge', 
  authenticateToken, 
  requireRolePolicy('adminOnly'), 
  async (req, res) => {
    try {
      const { alertId } = req.params;
      const acknowledgedBy = req.user?.email || req.user?.username;
      
      performanceMonitoringService.acknowledgeAlert(alertId, acknowledgedBy);
      
      loggingService.logInfo('[PERFORMANCE] Alert acknowledged', {
        alertId,
        acknowledgedBy,
        userId: req.user?.id,
        estateId: req.user?.estate_id
      });
      
      successResponse(res, { alertId, acknowledgedBy }, 'Alert acknowledged successfully');
      
    } catch (error) {
      loggingService.logError('Error acknowledging alert', error, {
        alertId: req.params.alertId,
        userId: req.user?.id,
        estateId: req.user?.estate_id
      });
      
      errorResponse(res, 'Failed to acknowledge alert', 'ALERT_ACKNOWLEDGE_ERROR', 500);
    }
  }
);

/**
 * Get performance history for a specific time range
 * GET /api/admin/performance/history
 */
router.get('/history', 
  authenticateToken, 
  requireRolePolicy('adminOnly'), 
  async (req, res) => {
    try {
      const { timeRange = '24h', metric = 'all' } = req.query;
      
      const metrics = performanceMonitoringService.getMetrics();
      
      // Filter historical data based on time range
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
      };
      
      const cutoff = Date.now() - (timeRanges[timeRange] || timeRanges['24h']);
      
      let historicalData = metrics.historical.filter(entry => entry.timestamp > cutoff);
      
      // Filter by specific metric if requested
      if (metric !== 'all') {
        historicalData = historicalData.map(entry => ({
          timestamp: entry.timestamp,
          [metric]: entry[metric]
        }));
      }
      
      successResponse(res, {
        timeRange,
        metric,
        data: historicalData,
        count: historicalData.length
      }, 'Performance history retrieved successfully');
      
    } catch (error) {
      loggingService.logError('Error retrieving performance history', error, {
        userId: req.user?.id,
        estateId: req.user?.estate_id
      });
      
      errorResponse(res, 'Failed to retrieve performance history', 'HISTORY_RETRIEVAL_ERROR', 500);
    }
  }
);

/**
 * Get system health status
 * GET /api/admin/performance/health
 */
router.get('/health', 
  authenticateToken, 
  requireRolePolicy('adminOnly'), 
  async (req, res) => {
    try {
      const metrics = performanceMonitoringService.getMetrics();
      const { realTime, alerts } = metrics;
      
      // Determine overall health status
      const criticalAlerts = alerts.filter(alert => 
        alert.severity === 'critical' && !alert.resolved
      );
      
      const warningAlerts = alerts.filter(alert => 
        alert.severity === 'warning' && !alert.resolved
      );
      
      let status = 'healthy';
      let statusColor = 'green';
      
      if (criticalAlerts.length > 0) {
        status = 'critical';
        statusColor = 'red';
      } else if (warningAlerts.length > 0) {
        status = 'warning';
        statusColor = 'yellow';
      }
      
      const healthData = {
        status,
        statusColor,
        timestamp: Date.now(),
        alerts: {
          total: alerts.length,
          critical: criticalAlerts.length,
          warning: warningAlerts.length,
          active: alerts.filter(alert => !alert.resolved).length
        },
        metrics: {
          responseTime: realTime.responseTime.current,
          throughput: realTime.throughput.requestsPerSecond,
          errorRate: realTime.errorRate,
          cpuUsage: realTime.system.cpuUsage,
          memoryUsage: realTime.system.memoryUsage.percentage
        },
        uptime: realTime.system.uptime
      };
      
      successResponse(res, healthData, 'System health status retrieved successfully');
      
    } catch (error) {
      loggingService.logError('Error retrieving system health', error, {
        userId: req.user?.id,
        estateId: req.user?.estate_id
      });
      
      errorResponse(res, 'Failed to retrieve system health', 'HEALTH_RETRIEVAL_ERROR', 500);
    }
  }
);

/**
 * Trigger manual performance test
 * POST /api/admin/performance/test
 */
router.post('/test', 
  authenticateToken, 
  requireRolePolicy('adminOnly'), 
  async (req, res) => {
    try {
      const { testType = 'load', duration = 60 } = req.body;
      
      // This would trigger a performance test
      // For now, we'll just log the request and return a test ID
      const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      loggingService.logInfo('[PERFORMANCE] Manual performance test triggered', {
        testId,
        testType,
        duration,
        triggeredBy: req.user?.email || req.user?.username,
        userId: req.user?.id,
        estateId: req.user?.estate_id
      });
      
      // In a real implementation, you would:
      // 1. Start the performance test
      // 2. Monitor the results
      // 3. Store the results for later retrieval
      
      successResponse(res, {
        testId,
        testType,
        duration,
        status: 'started',
        estimatedCompletion: Date.now() + (duration * 1000)
      }, 'Performance test started successfully');
      
    } catch (error) {
      loggingService.logError('Error starting performance test', error, {
        userId: req.user?.id,
        estateId: req.user?.estate_id
      });
      
      errorResponse(res, 'Failed to start performance test', 'TEST_START_ERROR', 500);
    }
  }
);

export default router;