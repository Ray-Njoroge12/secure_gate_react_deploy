/**
 * REAL-TIME DASHBOARD METRICS SERVICE - Phase 2.3
 * Provides live metrics and analytics for the dashboard
 * 
 * Features:
 * - Live visitor counts and status updates
 * - System performance metrics
 * - Security event tracking
 * - Real-time analytics and reporting
 */

import { dbManager } from '../database/db.enhanced.js';
import logger from '../config/logger.js';

class DashboardMetrics {
  constructor(webSocketService) {
    this.webSocketService = webSocketService;
    this.metricsCache = new Map();
    this.updateInterval = 30000; // Update every 30 seconds
    this.intervalId = null;
  }

  /**
   * Start real-time metrics updates
   */
  start() {
    if (this.intervalId) {
      this.stop(); // Stop existing interval
    }

    this.intervalId = setInterval(() => {
      this.updateMetrics();
    }, this.updateInterval);

    // Initial metrics update
    this.updateMetrics();
    
    logger.info('Dashboard metrics service started', {
      updateInterval: this.updateInterval
    });
  }

  /**
   * Stop metrics updates
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Dashboard metrics service stopped');
    }
  }

  /**
   * Update all metrics and broadcast to connected clients
   */
  async updateMetrics() {
    try {
      const metrics = await this.collectAllMetrics();
      
      // Cache the metrics
      this.metricsCache.set('latest', {
        data: metrics,
        timestamp: new Date().toISOString()
      });

      // Broadcast to dashboard clients
      if (this.webSocketService && this.webSocketService.dashboardEvents) {
        this.webSocketService.dashboardEvents.emitMetricsUpdate(metrics);
      }

    } catch (error) {
      logger.error('Failed to update dashboard metrics', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Collect all dashboard metrics
   */
  async collectAllMetrics() {
    const [
      visitorMetrics,
      systemMetrics,
      securityMetrics,
      performanceMetrics
    ] = await Promise.all([
      this.getVisitorMetrics(),
      this.getSystemMetrics(),
      this.getSecurityMetrics(),
      this.getPerformanceMetrics()
    ]);

    return {
      visitors: visitorMetrics,
      system: systemMetrics,
      security: securityMetrics,
      performance: performanceMetrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get visitor-related metrics
   */
  async getVisitorMetrics() {
    try {
      const queries = [
        // Active visitors (checked in, not checked out)
        `SELECT COUNT(*) as active_visitors FROM check_ins 
         WHERE check_out_time IS NULL`,
        
        // Today's total visitors
        `SELECT COUNT(*) as today_visitors FROM check_ins 
         WHERE DATE(check_in_time) = CURRENT_DATE`,
        
        // This week's visitors
        `SELECT COUNT(*) as week_visitors FROM check_ins 
         WHERE check_in_time >= DATE_TRUNC('week', CURRENT_DATE)`,
        
        // Average visit duration today
        `SELECT AVG(EXTRACT(EPOCH FROM (check_out_time - check_in_time))/60) as avg_duration_minutes
         FROM check_ins 
         WHERE DATE(check_in_time) = CURRENT_DATE AND check_out_time IS NOT NULL`,
        
        // Visitor status breakdown
        `SELECT 
           SUM(CASE WHEN check_out_time IS NULL THEN 1 ELSE 0 END) as checked_in,
           SUM(CASE WHEN check_out_time IS NOT NULL THEN 1 ELSE 0 END) as checked_out
         FROM check_ins 
         WHERE DATE(check_in_time) = CURRENT_DATE`,
         
        // Recent visitor activity (last 5)
        `SELECT id, visitor_name, purpose, check_in_time, check_out_time
         FROM check_ins 
         ORDER BY check_in_time DESC LIMIT 5`
      ];

      const results = await Promise.all(
        queries.map(query => dbManager.query(query))
      );

      return {
        activeVisitors: parseInt(results[0].rows[0]?.active_visitors || 0),
        todayTotal: parseInt(results[1].rows[0]?.today_visitors || 0),
        weekTotal: parseInt(results[2].rows[0]?.week_visitors || 0),
        averageDuration: parseFloat(results[3].rows[0]?.avg_duration_minutes || 0),
        statusBreakdown: {
          checkedIn: parseInt(results[4].rows[0]?.checked_in || 0),
          checkedOut: parseInt(results[4].rows[0]?.checked_out || 0)
        },
        recentActivity: results[5].rows.map(row => ({
          id: row.id,
          name: row.visitor_name,
          purpose: row.purpose,
          checkInTime: row.check_in_time,
          checkOutTime: row.check_out_time,
          status: row.check_out_time ? 'CHECKED_OUT' : 'CHECKED_IN'
        }))
      };

    } catch (error) {
      logger.error('Failed to get visitor metrics', { error: error.message });
      return {
        activeVisitors: 0,
        todayTotal: 0,
        weekTotal: 0,
        averageDuration: 0,
        statusBreakdown: { checkedIn: 0, checkedOut: 0 },
        recentActivity: []
      };
    }
  }

  /**
   * Get system-related metrics
   */
  async getSystemMetrics() {
    try {
      const queries = [
        // Total invitations
        `SELECT COUNT(*) as total_invitations FROM visitor_invitations`,
        
        // Pending invitations
        `SELECT COUNT(*) as pending_invitations FROM visitor_invitations 
         WHERE status = 'pending'`,
        
        // Active invitations (valid and not used)
        `SELECT COUNT(*) as active_invitations FROM visitor_invitations 
         WHERE status = 'active' AND valid_until > NOW()`,
        
        // User activity (last 24 hours)
        `SELECT COUNT(DISTINCT user_id) as active_users 
         FROM audit_logs 
         WHERE created_at > NOW() - INTERVAL '24 hours'`
      ];

      const results = await Promise.all(
        queries.map(query => dbManager.query(query))
      );

      return {
        totalInvitations: parseInt(results[0].rows[0]?.total_invitations || 0),
        pendingInvitations: parseInt(results[1].rows[0]?.pending_invitations || 0),
        activeInvitations: parseInt(results[2].rows[0]?.active_invitations || 0),
        activeUsers24h: parseInt(results[3].rows[0]?.active_users || 0),
        serverUptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get system metrics', { error: error.message });
      return {
        totalInvitations: 0,
        pendingInvitations: 0,
        activeInvitations: 0,
        activeUsers24h: 0,
        serverUptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get security-related metrics
   */
  async getSecurityMetrics() {
    try {
      const queries = [
        // Failed login attempts (last 24 hours)
        `SELECT COUNT(*) as failed_logins 
         FROM audit_logs 
         WHERE action = 'login_failed' 
         AND created_at > NOW() - INTERVAL '24 hours'`,
        
        // Security events (last 24 hours)
        `SELECT COUNT(*) as security_events 
         FROM audit_logs 
         WHERE action LIKE '%security%' 
         AND created_at > NOW() - INTERVAL '24 hours'`,
        
        // Unauthorized access attempts
        `SELECT COUNT(*) as unauthorized_attempts 
         FROM audit_logs 
         WHERE action = 'unauthorized_access' 
         AND created_at > NOW() - INTERVAL '24 hours'`
      ];

      const results = await Promise.all(
        queries.map(query => dbManager.query(query))
      );

      return {
        failedLogins24h: parseInt(results[0].rows[0]?.failed_logins || 0),
        securityEvents24h: parseInt(results[1].rows[0]?.security_events || 0),
        unauthorizedAttempts24h: parseInt(results[2].rows[0]?.unauthorized_attempts || 0),
        lastSecurityCheck: new Date().toISOString(),
        securityStatus: 'normal' // Could be calculated based on thresholds
      };

    } catch (error) {
      logger.error('Failed to get security metrics', { error: error.message });
      return {
        failedLogins24h: 0,
        securityEvents24h: 0,
        unauthorizedAttempts24h: 0,
        lastSecurityCheck: new Date().toISOString(),
        securityStatus: 'unknown'
      };
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        usage_percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: Math.round(process.uptime()),
      websocketConnections: this.webSocketService ? this.webSocketService.connectedUsers.size : 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get cached metrics
   */
  getCachedMetrics() {
    return this.metricsCache.get('latest') || null;
  }

  /**
   * Get specific metric value
   */
  getMetric(category, key) {
    const cached = this.getCachedMetrics();
    if (cached && cached.data[category]) {
      return cached.data[category][key];
    }
    return null;
  }

  /**
   * Trigger immediate metrics update
   */
  async forceUpdate() {
    await this.updateMetrics();
    return this.getCachedMetrics();
  }

  /**
   * Get metrics history (could be extended to store historical data)
   */
  getMetricsHistory(timeRange = '24h') {
    // This would typically query a metrics history table
    // For now, return the current cached metrics
    return [this.getCachedMetrics()].filter(Boolean);
  }

  /**
   * Check if metrics service is running
   */
  isRunning() {
    return !!this.intervalId;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      running: this.isRunning(),
      updateInterval: this.updateInterval,
      cacheSize: this.metricsCache.size,
      lastUpdate: this.getCachedMetrics()?.timestamp || null
    };
  }
}

export default DashboardMetrics;
