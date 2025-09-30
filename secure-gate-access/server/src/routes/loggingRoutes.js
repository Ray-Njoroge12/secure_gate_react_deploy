// server/src/routes/loggingRoutes.js
/**
 * Logging Management Routes
 * Administrative endpoints for log monitoring and management
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import loggingService from '../services/loggingService.js';
import { logAuditEvent } from '../middleware/loggingMiddleware.js';

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
 * @route GET /api/logs/stats
 * @desc Get logging statistics and metrics
 * @access Admin
 */
router.get('/stats', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const stats = loggingService.getStats();
    
    logAuditEvent('logs.stats.accessed', { adminId: req.user.id }, req);
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error getting logging stats', error, {
      correlationId: req.correlationId,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve logging statistics',
      message: error.message
    });
  }
});

/**
 * @route GET /api/logs/files
 * @desc Get list of log files
 * @access Admin
 */
router.get('/files', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const files = await loggingService.getLogFiles();
    
    logAuditEvent('logs.files.listed', { 
      adminId: req.user.id,
      fileCount: files.length 
    }, req);
    
    res.json({
      success: true,
      data: {
        files,
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error getting log files', error, {
      correlationId: req.correlationId,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve log files',
      message: error.message
    });
  }
});

/**
 * @route GET /api/logs/file/:filename
 * @desc Read content of a specific log file
 * @access Admin
 */
router.get('/file/:filename', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { filename } = req.params;
    const { maxSize = 1024 * 1024 } = req.query; // 1MB default
    
    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }
    
    const fileContent = await loggingService.readLogFile(filename, parseInt(maxSize));
    
    logAuditEvent('logs.file.accessed', { 
      adminId: req.user.id,
      filename,
      size: fileContent.readSize
    }, req);
    
    res.json({
      success: true,
      data: {
        filename,
        content: fileContent.content,
        truncated: fileContent.truncated,
        originalSize: fileContent.originalSize,
        readSize: fileContent.readSize
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error reading log file', error, {
      correlationId: req.correlationId,
      filename: req.params.filename,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to read log file',
      message: error.message
    });
  }
});

/**
 * @route POST /api/logs/search
 * @desc Search logs by criteria
 * @access Admin
 */
router.post('/search', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      level = null,
      category = null,
      startDate = null,
      endDate = null,
      message = null,
      limit = 100
    } = req.body;
    
    // Validate limit
    const validLimit = Math.min(parseInt(limit) || 100, 1000); // Max 1000 results
    
    const criteria = {
      level,
      category,
      startDate,
      endDate,
      message,
      limit: validLimit
    };
    
    const results = await loggingService.searchLogs(criteria);
    
    logAuditEvent('logs.search.performed', { 
      adminId: req.user.id,
      criteria,
      resultCount: results.length 
    }, req);
    
    res.json({
      success: true,
      data: {
        results,
        criteria,
        resultCount: results.length,
        maxResults: validLimit
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error searching logs', error, {
      correlationId: req.correlationId,
      criteria: req.body,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to search logs',
      message: error.message
    });
  }
});

/**
 * @route GET /api/logs/health
 * @desc Get logging service health status
 * @access Admin
 */
router.get('/health', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const health = loggingService.healthCheck();
    
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error checking logging health', error, {
      correlationId: req.correlationId,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to check logging service health',
      message: error.message
    });
  }
});

/**
 * @route POST /api/logs/cleanup
 * @desc Cleanup old log files
 * @access Super Admin
 */
router.post('/cleanup', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    
    // Validate daysToKeep
    const validDays = Math.max(1, Math.min(parseInt(daysToKeep) || 30, 365)); // 1-365 days
    
    const deletedFiles = await loggingService.cleanupOldLogs(validDays);
    
    logAuditEvent('logs.cleanup.performed', { 
      adminId: req.user.id,
      daysToKeep: validDays,
      deletedFiles 
    }, req);
    
    res.json({
      success: true,
      data: {
        deletedFiles,
        daysToKeep: validDays,
        message: `Cleaned up ${deletedFiles} old log files`
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error cleaning up logs', error, {
      correlationId: req.correlationId,
      daysToKeep: req.body.daysToKeep,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup old logs',
      message: error.message
    });
  }
});

/**
 * @route POST /api/logs/reset-stats
 * @desc Reset logging statistics
 * @access Super Admin
 */
router.post('/reset-stats', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    loggingService.resetStats();
    
    logAuditEvent('logs.stats.reset', { 
      adminId: req.user.id 
    }, req);
    
    res.json({
      success: true,
      message: 'Logging statistics have been reset',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error resetting logging stats', error, {
      correlationId: req.correlationId,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to reset logging statistics',
      message: error.message
    });
  }
});

/**
 * @route GET /api/logs/dashboard
 * @desc Get logging dashboard data
 * @access Admin
 */
router.get('/dashboard', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const stats = loggingService.getStats();
    const health = loggingService.healthCheck();
    const files = await loggingService.getLogFiles();
    
    // Recent error logs (last 24 hours)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    
    const recentErrors = await loggingService.searchLogs({
      level: 'error',
      startDate: yesterday.toISOString(),
      limit: 10
    });
    
    // Recent security logs
    const recentSecurity = await loggingService.searchLogs({
      category: 'security',
      startDate: yesterday.toISOString(),
      limit: 10
    });
    
    const dashboard = {
      summary: {
        totalLogs: stats.totalLogs,
        errorCount: stats.errorCount,
        warningCount: stats.warningCount,
        errorRate: stats.totalLogs > 0 ? (stats.errorCount / stats.totalLogs) * 100 : 0,
        lastLogTime: stats.lastLogTime,
        uptime: stats.uptime
      },
      logFiles: {
        count: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        newestFile: files[0]?.name || 'none',
        oldestFile: files[files.length - 1]?.name || 'none'
      },
      health: {
        status: health.status,
        diskSpace: health.diskSpace,
        activeLoggers: health.activeLoggers
      },
      recentActivity: {
        errors: recentErrors.slice(0, 5),
        security: recentSecurity.slice(0, 5)
      },
      levelDistribution: stats.logsByLevel,
      categoryDistribution: stats.logsByCategory
    };
    
    logAuditEvent('logs.dashboard.accessed', { adminId: req.user.id }, req);
    
    res.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error getting logging dashboard', error, {
      correlationId: req.correlationId,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve logging dashboard',
      message: error.message
    });
  }
});

/**
 * @route POST /api/logs/test
 * @desc Test logging functionality (creates sample logs)
 * @access Admin
 */
router.post('/test', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { type = 'all', count = 1 } = req.body;
    const validCount = Math.min(parseInt(count) || 1, 10); // Max 10 test logs
    
    const testMessages = [];
    
    for (let i = 0; i < validCount; i++) {
      if (type === 'all' || type === 'info') {
        loggingService.logInfo(`Test info log ${i + 1}`, {
          testId: `test-${Date.now()}-${i}`,
          adminId: req.user.id
        });
        testMessages.push(`info-${i + 1}`);
      }
      
      if (type === 'all' || type === 'warning') {
        loggingService.logWarning(`Test warning log ${i + 1}`, {
          testId: `test-${Date.now()}-${i}`,
          adminId: req.user.id
        });
        testMessages.push(`warning-${i + 1}`);
      }
      
      if (type === 'all' || type === 'error') {
        loggingService.logError(`Test error log ${i + 1}`, new Error(`Test error ${i + 1}`), {
          testId: `test-${Date.now()}-${i}`,
          adminId: req.user.id
        });
        testMessages.push(`error-${i + 1}`);
      }
      
      if (type === 'all' || type === 'security') {
        loggingService.logSecurity('warn', `Test security log ${i + 1}`, {
          testId: `test-${Date.now()}-${i}`,
          adminId: req.user.id,
          testEvent: true
        });
        testMessages.push(`security-${i + 1}`);
      }
      
      if (type === 'all' || type === 'performance') {
        loggingService.logPerformance('info', `Test performance log ${i + 1}`, {
          testId: `test-${Date.now()}-${i}`,
          adminId: req.user.id,
          duration: Math.random() * 1000
        });
        testMessages.push(`performance-${i + 1}`);
      }
    }
    
    logAuditEvent('logs.test.performed', { 
      adminId: req.user.id,
      type,
      count: validCount,
      messages: testMessages
    }, req);
    
    res.json({
      success: true,
      data: {
        type,
        count: validCount,
        messages: testMessages,
        message: `Generated ${testMessages.length} test log entries`
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Error generating test logs', error, {
      correlationId: req.correlationId,
      adminId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate test logs',
      message: error.message
    });
  }
});

export default router;