// server/src/routes/monitoringRoutes.js
/**
 * Monitoring Dashboard Routes
 * Real-time monitoring endpoints and SSE streaming
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import monitoringDashboard from '../services/monitoringDashboardService.js';
import { logAuditEvent } from '../middleware/loggingMiddleware.js';
import loggingService from '../services/loggingService.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Simple role check middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

/**
 * @route GET /api/monitoring/metrics
 * @desc Get current system metrics
 * @access Admin
 */
router.get('/metrics', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const metrics = monitoringDashboard.getMetrics();
    
    logAuditEvent('monitoring.metrics.accessed', { adminId: req.user.id }, req);
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error getting monitoring metrics', error, {
      correlationId: req.correlationId,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve monitoring metrics',
      message: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/health
 * @desc Get system health status
 * @access Admin
 */
router.get('/health', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const health = monitoringDashboard.getHealthStatus();
    
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error getting system health', error, {
      correlationId: req.correlationId,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system health',
      message: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/dashboard
 * @desc Get comprehensive dashboard data
 * @access Admin
 */
router.get('/dashboard', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const metrics = monitoringDashboard.getMetrics();
    const health = monitoringDashboard.getHealthStatus();
    
    const dashboard = {
      overview: {
        status: health.status,
        uptime: metrics.current.system?.uptime || 0,
        lastUpdate: metrics.current.lastUpdate,
        isMonitoring: metrics.isRunning
      },
      performance: {
        responseTime: metrics.current.application?.averageResponseTime || 0,
        errorRate: metrics.current.application?.errorRate || 0,
        totalRequests: metrics.current.application?.totalRequests || 0,
        activeRequests: metrics.current.application?.activeRequests || 0
      },
      system: {
        memoryUsage: metrics.current.system?.memoryUsage || 0,
        heapUsed: metrics.current.system?.heapUsed || 0,
        heapTotal: metrics.current.system?.heapTotal || 0,
        uptime: metrics.current.system?.uptime || 0
      },
      database: {
        status: metrics.current.database?.status || 'unknown',
        responseTime: metrics.current.database?.responseTime || 0,
        slowQueries: metrics.current.database?.slowQueries || 0,
        avgQueryTime: metrics.current.database?.avgQueryTime || 0
      },
      logging: {
        totalLogs: metrics.current.logging?.totalLogs || 0,
        errorCount: metrics.current.logging?.errorCount || 0,
        errorRate: metrics.current.logging?.errorRate || 0,
        logsByLevel: metrics.current.logging?.logsByLevel || {}
      },
      alerts: {
        active: metrics.current.alerts || [],
        counts: health.alertCounts,
        critical: health.alertCounts?.critical || 0,
        high: health.alertCounts?.high || 0
      },
      trends: metrics.historical || null
    };
    
    logAuditEvent('monitoring.dashboard.accessed', { adminId: req.user.id }, req);
    
    res.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error getting monitoring dashboard', error, {
      correlationId: req.correlationId,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve monitoring dashboard',
      message: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/alerts
 * @desc Get current alerts
 * @access Admin
 */
router.get('/alerts', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const metrics = monitoringDashboard.getMetrics();
    const alerts = metrics.current.alerts || [];
    
    // Filter by severity if requested
    const { severity } = req.query;
    const filteredAlerts = severity 
      ? alerts.filter(alert => alert.severity === severity)
      : alerts;
    
    res.json({
      success: true,
      data: {
        alerts: filteredAlerts,
        totalAlerts: alerts.length,
        filteredCount: filteredAlerts.length,
        severityFilter: severity || 'all',
        categories: [...new Set(alerts.map(alert => alert.category))],
        severities: [...new Set(alerts.map(alert => alert.severity))]
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error getting alerts', error, {
      correlationId: req.correlationId,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts',
      message: error.message
    });
  }
});

/**
 * @route POST /api/monitoring/thresholds
 * @desc Update alert thresholds
 * @access Super Admin
 */
router.post('/thresholds', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const {
      errorRate,
      responseTime,
      memoryUsage,
      logErrors,
      securityEvents
    } = req.body;
    
    const newThresholds = {};
    
    // Validate and set new thresholds
    if (typeof errorRate === 'number' && errorRate >= 0 && errorRate <= 1) {
      newThresholds.errorRate = errorRate;
    }
    
    if (typeof responseTime === 'number' && responseTime > 0) {
      newThresholds.responseTime = responseTime;
    }
    
    if (typeof memoryUsage === 'number' && memoryUsage > 0) {
      newThresholds.memoryUsage = memoryUsage;
    }
    
    if (typeof logErrors === 'number' && logErrors > 0) {
      newThresholds.logErrors = logErrors;
    }
    
    if (typeof securityEvents === 'number' && securityEvents > 0) {
      newThresholds.securityEvents = securityEvents;
    }
    
    if (Object.keys(newThresholds).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid threshold values provided'
      });
    }
    
    monitoringDashboard.updateThresholds(newThresholds);
    
    logAuditEvent('monitoring.thresholds.updated', { 
      adminId: req.user.id,
      newThresholds
    }, req);
    
    res.json({
      success: true,
      data: {
        updatedThresholds: newThresholds,
        message: 'Alert thresholds updated successfully'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error updating alert thresholds', error, {
      correlationId: req.correlationId,
      adminId: req.user.id,
      requestedThresholds: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to update alert thresholds',
      message: error.message
    });
  }
});

/**
 * @route POST /api/monitoring/start
 * @desc Start monitoring service
 * @access Super Admin
 */
router.post('/start', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    if (monitoringDashboard.isRunning) {
      return res.status(400).json({
        success: false,
        error: 'Monitoring service is already running'
      });
    }
    
    monitoringDashboard.start();
    
    logAuditEvent('monitoring.service.started', { adminId: req.user.id }, req);
    
    res.json({
      success: true,
      data: {
        message: 'Monitoring service started successfully',
        isRunning: true
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error starting monitoring service', error, {
      correlationId: req.correlationId,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to start monitoring service',
      message: error.message
    });
  }
});

/**
 * @route POST /api/monitoring/stop
 * @desc Stop monitoring service
 * @access Super Admin
 */
router.post('/stop', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    if (!monitoringDashboard.isRunning) {
      return res.status(400).json({
        success: false,
        error: 'Monitoring service is not running'
      });
    }
    
    monitoringDashboard.stop();
    
    logAuditEvent('monitoring.service.stopped', { adminId: req.user.id }, req);
    
    res.json({
      success: true,
      data: {
        message: 'Monitoring service stopped successfully',
        isRunning: false
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error stopping monitoring service', error, {
      correlationId: req.correlationId,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to stop monitoring service',
      message: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/stream
 * @desc Real-time monitoring data stream (Server-Sent Events)
 * @access Admin
 */
router.get('/stream', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const clientId = uuidv4();
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    // Send initial connection confirmation
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);
    
    // Add client to monitoring service
    monitoringDashboard.addClient(res, clientId);
    
    logAuditEvent('monitoring.stream.connected', { 
      adminId: req.user.id,
      clientId 
    }, req);
    
    // Handle client disconnect
    req.on('close', () => {
      monitoringDashboard.removeClient(clientId);
      
      logAuditEvent('monitoring.stream.disconnected', { 
        adminId: req.user.id,
        clientId 
      }, req);
    });
    
    req.on('error', (error) => {
      loggingService.logError('SSE stream error', error, {
        correlationId: req.correlationId,
        clientId,
        adminId: req.user.id
      });
      
      monitoringDashboard.removeClient(clientId);
    });
    
  } catch (error) {
    loggingService.logError('Error setting up monitoring stream', error, {
      correlationId: req.correlationId,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to set up monitoring stream',
      message: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/historical
 * @desc Get historical metrics data
 * @access Admin
 */
router.get('/historical', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { 
      period = '1h', // 1h, 24h, 7d
      metric = 'all' // responseTime, errorRate, memoryUsage, etc.
    } = req.query;
    
    const metrics = monitoringDashboard.getMetrics();
    const historical = metrics.historical;
    
    if (!historical) {
      return res.json({
        success: true,
        data: {
          message: 'No historical data available yet',
          period,
          metric
        },
        timestamp: new Date().toISOString()
      });
    }
    
    let data;
    switch (period) {
      case '1h':
        data = historical.lastHour;
        break;
      case '24h':
        data = historical.last24Hours;
        break;
      default:
        data = historical.last24Hours;
    }
    
    res.json({
      success: true,
      data: {
        period,
        metric,
        historical: data,
        dataAvailable: true
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error getting historical metrics', error, {
      correlationId: req.correlationId,
      adminId: req.user.id,
      period: req.query.period,
      metric: req.query.metric
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve historical metrics',
      message: error.message
    });
  }
});

export default router;