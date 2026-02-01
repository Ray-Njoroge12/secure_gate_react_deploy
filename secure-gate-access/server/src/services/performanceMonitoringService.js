/**
 * @fileoverview Enhanced Performance Monitoring Service
 * @description Real-time performance metrics collection, alerting, and automated scaling
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import EventEmitter from 'events';
import { performance } from 'perf_hooks';
import os from 'os';
import cluster from 'cluster';
import loggingService from './loggingService.js';
import { performanceMonitor } from '../middleware/performanceMiddleware.js';

/**
 * Enhanced Performance Monitoring Service
 * Implements requirements 6.5, 6.6, 15.2, 15.3
 */
class PerformanceMonitoringService extends EventEmitter {
  constructor() {
    super();
    
    this.isEnabled = true;
    this.monitoringInterval = null;
    this.metricsCollectionInterval = 5000; // 5 seconds
    this.alertCheckInterval = 30000; // 30 seconds
    
    // Performance thresholds
    this.thresholds = {
      responseTime: {
        warning: 1000, // 1 second
        critical: 2000 // 2 seconds
      },
      errorRate: {
        warning: 0.05, // 5%
        critical: 0.10 // 10%
      },
      cpuUsage: {
        warning: 70, // 70%
        critical: 85 // 85%
      },
      memoryUsage: {
        warning: 80, // 80%
        critical: 90 // 90%
      },
      diskUsage: {
        warning: 80, // 80%
        critical: 90 // 90%
      },
      throughput: {
        minimum: 10 // requests per second
      }
    };
    
    // Metrics storage
    this.metrics = {
      realTime: {
        timestamp: null,
        responseTime: {
          current: 0,
          p50: 0,
          p95: 0,
          p99: 0
        },
        throughput: {
          requestsPerSecond: 0,
          requestsPerMinute: 0
        },
        errorRate: 0,
        system: {
          cpuUsage: 0,
          memoryUsage: 0,
          diskUsage: 0,
          loadAverage: []
        },
        database: {
          connectionPoolUsage: 0,
          queryResponseTime: 0,
          activeConnections: 0
        }
      },
      historical: [],
      alerts: [],
      trends: {
        responseTime: [],
        throughput: [],
        errorRate: [],
        cpuUsage: [],
        memoryUsage: []
      }
    };
    
    // Request tracking for throughput calculation
    this.requestTracker = {
      requests: [],
      windowSize: 60000 // 1 minute window
    };
    
    // Response time tracking for percentiles
    this.responseTimeTracker = {
      times: [],
      maxSize: 1000 // Keep last 1000 response times
    };
    
    // Alert management
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.escalationRules = {
      critical: {
        immediate: true,
        channels: ['email', 'sms', 'webhook'],
        escalationDelay: 300000 // 5 minutes
      },
      warning: {
        immediate: false,
        channels: ['email'],
        escalationDelay: 900000 // 15 minutes
      }
    };
    
    // Auto-scaling configuration
    this.autoScaling = {
      enabled: process.env.AUTO_SCALING_ENABLED === 'true',
      minInstances: parseInt(process.env.MIN_INSTANCES) || 1,
      maxInstances: parseInt(process.env.MAX_INSTANCES) || 10,
      scaleUpThreshold: 80, // CPU/Memory %
      scaleDownThreshold: 30, // CPU/Memory %
      cooldownPeriod: 300000, // 5 minutes
      lastScalingAction: null
    };
    
    this.initializeService();
  }

  /**
   * Initialize the performance monitoring service
   */
  initializeService() {
    this.startMetricsCollection();
    this.startAlertMonitoring();
    this.setupEventListeners();
    
    loggingService.logInfo('[PERFORMANCE] Enhanced monitoring service initialized', {
      thresholds: this.thresholds,
      autoScaling: this.autoScaling.enabled,
      metricsInterval: this.metricsCollectionInterval
    });
  }

  /**
   * Start real-time metrics collection
   */
  startMetricsCollection() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(() => {
      this.collectRealTimeMetrics();
    }, this.metricsCollectionInterval);
    
    // Start alert checking
    setInterval(() => {
      this.checkAlerts();
    }, this.alertCheckInterval);
  }

  /**
   * Collect real-time performance metrics
   */
  async collectRealTimeMetrics() {
    try {
      const timestamp = Date.now();
      
      // Collect system metrics
      const systemMetrics = await this.collectSystemMetrics();
      
      // Collect application metrics
      const appMetrics = await this.collectApplicationMetrics();
      
      // Collect database metrics
      const dbMetrics = await this.collectDatabaseMetrics();
      
      // Update real-time metrics
      this.metrics.realTime = {
        timestamp,
        responseTime: appMetrics.responseTime,
        throughput: appMetrics.throughput,
        errorRate: appMetrics.errorRate,
        system: systemMetrics,
        database: dbMetrics
      };
      
      // Store historical data
      this.storeHistoricalMetrics(this.metrics.realTime);
      
      // Update trends
      this.updateTrends();
      
      // Emit metrics update event
      this.emit('metrics-updated', this.metrics.realTime);
      
      // Check for auto-scaling triggers
      if (this.autoScaling.enabled) {
        this.checkAutoScaling(systemMetrics);
      }
      
    } catch (error) {
      loggingService.logError('[PERFORMANCE] Error collecting metrics', error);
    }
  }

  /**
   * Collect system-level metrics
   */
  async collectSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = await this.getCPUUsage();
    const loadAverage = os.loadavg();
    
    return {
      cpuUsage,
      memoryUsage: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        percentage: (memoryUsage.rss / os.totalmem()) * 100
      },
      diskUsage: await this.getDiskUsage(),
      loadAverage,
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version
    };
  }

  /**
   * Get CPU usage percentage
   */
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();
      
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime(startTime);
        
        const totalTime = endTime[0] * 1000000 + endTime[1] / 1000; // microseconds
        const totalCPU = endUsage.user + endUsage.system;
        const cpuPercent = (totalCPU / totalTime) * 100;
        
        resolve(Math.min(100, Math.max(0, cpuPercent)));
      }, 100);
    });
  }

  /**
   * Get disk usage (simplified implementation)
   */
  async getDiskUsage() {
    // In a real implementation, you would use fs.stat or a library like 'diskusage'
    // For now, return a mock value
    return {
      total: 100 * 1024 * 1024 * 1024, // 100GB
      used: 50 * 1024 * 1024 * 1024,   // 50GB
      free: 50 * 1024 * 1024 * 1024,   // 50GB
      percentage: 50
    };
  }

  /**
   * Collect application-level metrics
   */
  async collectApplicationMetrics() {
    // Get metrics from existing performance monitor
    const perfMetrics = performanceMonitor.getMetrics();
    
    // Calculate throughput
    const throughput = this.calculateThroughput();
    
    // Calculate response time percentiles
    const responseTimePercentiles = this.calculateResponseTimePercentiles();
    
    return {
      responseTime: {
        current: perfMetrics.overall?.averageResponseTime || 0,
        ...responseTimePercentiles
      },
      throughput,
      errorRate: (perfMetrics.overall?.errorRate || 0) / 100,
      totalRequests: perfMetrics.overall?.requests || 0,
      slowRequests: perfMetrics.overall?.slowRequests || 0,
      endpoints: perfMetrics.endpoints || {}
    };
  }

  /**
   * Collect database metrics
   */
  async collectDatabaseMetrics() {
    // This would integrate with your database monitoring
    // For now, return mock data
    return {
      connectionPoolUsage: 0,
      queryResponseTime: 0,
      activeConnections: 0,
      slowQueries: 0,
      queryErrors: 0
    };
  }

  /**
   * Calculate throughput metrics
   */
  calculateThroughput() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneSecondAgo = now - 1000;
    
    // Filter requests in the last minute and second
    const requestsLastMinute = this.requestTracker.requests.filter(
      req => req.timestamp > oneMinuteAgo
    ).length;
    
    const requestsLastSecond = this.requestTracker.requests.filter(
      req => req.timestamp > oneSecondAgo
    ).length;
    
    return {
      requestsPerSecond: requestsLastSecond,
      requestsPerMinute: requestsLastMinute
    };
  }

  /**
   * Calculate response time percentiles
   */
  calculateResponseTimePercentiles() {
    if (this.responseTimeTracker.times.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }
    
    const sorted = [...this.responseTimeTracker.times].sort((a, b) => a - b);
    const length = sorted.length;
    
    return {
      p50: sorted[Math.floor(length * 0.5)],
      p95: sorted[Math.floor(length * 0.95)],
      p99: sorted[Math.floor(length * 0.99)]
    };
  }

  /**
   * Track request for throughput calculation
   */
  trackRequest(timestamp = Date.now()) {
    this.requestTracker.requests.push({ timestamp });
    
    // Clean old requests (older than window)
    const cutoff = timestamp - this.requestTracker.windowSize;
    this.requestTracker.requests = this.requestTracker.requests.filter(
      req => req.timestamp > cutoff
    );
  }

  /**
   * Track response time for percentile calculation
   */
  trackResponseTime(responseTime) {
    this.responseTimeTracker.times.push(responseTime);
    
    // Keep only the most recent times
    if (this.responseTimeTracker.times.length > this.responseTimeTracker.maxSize) {
      this.responseTimeTracker.times.shift();
    }
  }

  /**
   * Store historical metrics
   */
  storeHistoricalMetrics(metrics) {
    this.metrics.historical.push({
      ...metrics,
      timestamp: Date.now()
    });
    
    // Keep only last 24 hours (assuming 5-second intervals)
    const maxHistoricalEntries = (24 * 60 * 60) / (this.metricsCollectionInterval / 1000);
    if (this.metrics.historical.length > maxHistoricalEntries) {
      this.metrics.historical = this.metrics.historical.slice(-maxHistoricalEntries);
    }
  }

  /**
   * Update performance trends
   */
  updateTrends() {
    const current = this.metrics.realTime;
    const maxTrendPoints = 100;
    
    // Update each trend
    this.metrics.trends.responseTime.push({
      timestamp: current.timestamp,
      value: current.responseTime.current
    });
    
    this.metrics.trends.throughput.push({
      timestamp: current.timestamp,
      value: current.throughput.requestsPerSecond
    });
    
    this.metrics.trends.errorRate.push({
      timestamp: current.timestamp,
      value: current.errorRate
    });
    
    this.metrics.trends.cpuUsage.push({
      timestamp: current.timestamp,
      value: current.system.cpuUsage
    });
    
    this.metrics.trends.memoryUsage.push({
      timestamp: current.timestamp,
      value: current.system.memoryUsage.percentage
    });
    
    // Trim trends to max points
    Object.keys(this.metrics.trends).forEach(key => {
      if (this.metrics.trends[key].length > maxTrendPoints) {
        this.metrics.trends[key] = this.metrics.trends[key].slice(-maxTrendPoints);
      }
    });
  }

  /**
   * Start alert monitoring
   */
  startAlertMonitoring() {
    this.on('metrics-updated', (metrics) => {
      this.checkAlerts(metrics);
    });
  }

  /**
   * Check for alert conditions
   */
  checkAlerts(metrics = this.metrics.realTime) {
    const alerts = [];
    const timestamp = Date.now();
    
    // Check response time alerts
    if (metrics.responseTime.current > this.thresholds.responseTime.critical) {
      alerts.push(this.createAlert('response_time', 'critical', 
        `Critical response time: ${metrics.responseTime.current.toFixed(0)}ms`, 
        metrics.responseTime.current, this.thresholds.responseTime.critical));
    } else if (metrics.responseTime.current > this.thresholds.responseTime.warning) {
      alerts.push(this.createAlert('response_time', 'warning', 
        `High response time: ${metrics.responseTime.current.toFixed(0)}ms`, 
        metrics.responseTime.current, this.thresholds.responseTime.warning));
    }
    
    // Check error rate alerts
    if (metrics.errorRate > this.thresholds.errorRate.critical) {
      alerts.push(this.createAlert('error_rate', 'critical', 
        `Critical error rate: ${(metrics.errorRate * 100).toFixed(2)}%`, 
        metrics.errorRate * 100, this.thresholds.errorRate.critical * 100));
    } else if (metrics.errorRate > this.thresholds.errorRate.warning) {
      alerts.push(this.createAlert('error_rate', 'warning', 
        `High error rate: ${(metrics.errorRate * 100).toFixed(2)}%`, 
        metrics.errorRate * 100, this.thresholds.errorRate.warning * 100));
    }
    
    // Check CPU usage alerts
    if (metrics.system.cpuUsage > this.thresholds.cpuUsage.critical) {
      alerts.push(this.createAlert('cpu_usage', 'critical', 
        `Critical CPU usage: ${metrics.system.cpuUsage.toFixed(1)}%`, 
        metrics.system.cpuUsage, this.thresholds.cpuUsage.critical));
    } else if (metrics.system.cpuUsage > this.thresholds.cpuUsage.warning) {
      alerts.push(this.createAlert('cpu_usage', 'warning', 
        `High CPU usage: ${metrics.system.cpuUsage.toFixed(1)}%`, 
        metrics.system.cpuUsage, this.thresholds.cpuUsage.warning));
    }
    
    // Check memory usage alerts
    if (metrics.system.memoryUsage.percentage > this.thresholds.memoryUsage.critical) {
      alerts.push(this.createAlert('memory_usage', 'critical', 
        `Critical memory usage: ${metrics.system.memoryUsage.percentage.toFixed(1)}%`, 
        metrics.system.memoryUsage.percentage, this.thresholds.memoryUsage.critical));
    } else if (metrics.system.memoryUsage.percentage > this.thresholds.memoryUsage.warning) {
      alerts.push(this.createAlert('memory_usage', 'warning', 
        `High memory usage: ${metrics.system.memoryUsage.percentage.toFixed(1)}%`, 
        metrics.system.memoryUsage.percentage, this.thresholds.memoryUsage.warning));
    }
    
    // Check throughput alerts
    if (metrics.throughput.requestsPerSecond < this.thresholds.throughput.minimum) {
      alerts.push(this.createAlert('low_throughput', 'warning', 
        `Low throughput: ${metrics.throughput.requestsPerSecond} req/s`, 
        metrics.throughput.requestsPerSecond, this.thresholds.throughput.minimum));
    }
    
    // Process new alerts
    this.processAlerts(alerts);
  }

  /**
   * Create an alert object
   */
  createAlert(type, severity, message, currentValue, threshold) {
    return {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      currentValue,
      threshold,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false
    };
  }

  /**
   * Process alerts and handle escalation
   */
  processAlerts(newAlerts) {
    newAlerts.forEach(alert => {
      const existingAlert = this.activeAlerts.get(alert.type);
      
      if (!existingAlert || existingAlert.severity !== alert.severity) {
        // New alert or severity change
        this.activeAlerts.set(alert.type, alert);
        this.metrics.alerts.push(alert);
        
        // Log the alert
        loggingService.logWarning(`[PERFORMANCE ALERT] ${alert.message}`, {
          alertId: alert.id,
          type: alert.type,
          severity: alert.severity,
          currentValue: alert.currentValue,
          threshold: alert.threshold
        });
        
        // Emit alert event
        this.emit('alert-triggered', alert);
        
        // Handle escalation
        this.handleAlertEscalation(alert);
      }
    });
    
    // Check for resolved alerts
    this.checkResolvedAlerts(newAlerts);
  }

  /**
   * Handle alert escalation based on severity
   */
  handleAlertEscalation(alert) {
    const escalationRule = this.escalationRules[alert.severity];
    
    if (!escalationRule) return;
    
    if (escalationRule.immediate) {
      // Send immediate notification
      this.sendAlertNotification(alert, escalationRule.channels);
    }
    
    // Schedule escalation if not acknowledged
    setTimeout(() => {
      if (!alert.acknowledged && !alert.resolved) {
        this.escalateAlert(alert);
      }
    }, escalationRule.escalationDelay);
  }

  /**
   * Send alert notification
   */
  sendAlertNotification(alert, channels) {
    // This would integrate with your notification system
    loggingService.logInfo(`[PERFORMANCE] Sending alert notification`, {
      alertId: alert.id,
      channels,
      message: alert.message
    });
    
    // Emit notification event for external handlers
    this.emit('alert-notification', { alert, channels });
  }

  /**
   * Escalate alert to higher priority
   */
  escalateAlert(alert) {
    loggingService.logWarning(`[PERFORMANCE] Escalating unacknowledged alert`, {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity
    });
    
    // Send to all channels for escalated alerts
    this.sendAlertNotification(alert, ['email', 'sms', 'webhook', 'pager']);
    
    this.emit('alert-escalated', alert);
  }

  /**
   * Check for resolved alerts
   */
  checkResolvedAlerts(currentAlerts) {
    const currentAlertTypes = new Set(currentAlerts.map(a => a.type));
    
    for (const [type, alert] of this.activeAlerts) {
      if (!currentAlertTypes.has(type) && !alert.resolved) {
        // Alert resolved
        alert.resolved = true;
        alert.resolvedAt = Date.now();
        
        loggingService.logInfo(`[PERFORMANCE] Alert resolved`, {
          alertId: alert.id,
          type: alert.type,
          duration: alert.resolvedAt - alert.timestamp
        });
        
        this.emit('alert-resolved', alert);
        this.activeAlerts.delete(type);
      }
    }
  }

  /**
   * Check auto-scaling conditions
   */
  checkAutoScaling(systemMetrics) {
    if (!this.autoScaling.enabled) return;
    
    const now = Date.now();
    const cooldownExpired = !this.autoScaling.lastScalingAction || 
      (now - this.autoScaling.lastScalingAction) > this.autoScaling.cooldownPeriod;
    
    if (!cooldownExpired) return;
    
    const cpuUsage = systemMetrics.cpuUsage;
    const memoryUsage = systemMetrics.memoryUsage.percentage;
    const avgUsage = (cpuUsage + memoryUsage) / 2;
    
    // Check scale up conditions
    if (avgUsage > this.autoScaling.scaleUpThreshold) {
      this.triggerScaleUp(avgUsage);
    }
    // Check scale down conditions
    else if (avgUsage < this.autoScaling.scaleDownThreshold) {
      this.triggerScaleDown(avgUsage);
    }
  }

  /**
   * Trigger scale up action
   */
  triggerScaleUp(currentUsage) {
    loggingService.logInfo(`[PERFORMANCE] Triggering scale up`, {
      currentUsage: currentUsage.toFixed(1),
      threshold: this.autoScaling.scaleUpThreshold,
      currentInstances: this.getCurrentInstanceCount()
    });
    
    this.autoScaling.lastScalingAction = Date.now();
    
    // Emit scale up event
    this.emit('scale-up-triggered', {
      currentUsage,
      threshold: this.autoScaling.scaleUpThreshold,
      timestamp: Date.now()
    });
    
    // In a real implementation, this would trigger actual scaling
    // For example, with AWS Auto Scaling Groups, Kubernetes HPA, etc.
  }

  /**
   * Trigger scale down action
   */
  triggerScaleDown(currentUsage) {
    const currentInstances = this.getCurrentInstanceCount();
    
    if (currentInstances <= this.autoScaling.minInstances) {
      return; // Don't scale below minimum
    }
    
    loggingService.logInfo(`[PERFORMANCE] Triggering scale down`, {
      currentUsage: currentUsage.toFixed(1),
      threshold: this.autoScaling.scaleDownThreshold,
      currentInstances
    });
    
    this.autoScaling.lastScalingAction = Date.now();
    
    // Emit scale down event
    this.emit('scale-down-triggered', {
      currentUsage,
      threshold: this.autoScaling.scaleDownThreshold,
      timestamp: Date.now()
    });
  }

  /**
   * Get current instance count (simplified)
   */
  getCurrentInstanceCount() {
    // In a real implementation, this would query your orchestration system
    return cluster.isMaster ? Object.keys(cluster.workers).length : 1;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for process events
    process.on('exit', () => {
      this.stop();
    });
    
    process.on('SIGINT', () => {
      this.stop();
    });
    
    process.on('SIGTERM', () => {
      this.stop();
    });
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return {
      realTime: this.metrics.realTime,
      historical: this.metrics.historical.slice(-100), // Last 100 entries
      alerts: this.metrics.alerts.slice(-50), // Last 50 alerts
      trends: this.metrics.trends,
      thresholds: this.thresholds,
      autoScaling: {
        ...this.autoScaling,
        currentInstances: this.getCurrentInstanceCount()
      }
    };
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds) {
    this.thresholds = {
      ...this.thresholds,
      ...newThresholds
    };
    
    loggingService.logInfo('[PERFORMANCE] Thresholds updated', {
      newThresholds: this.thresholds
    });
    
    this.emit('thresholds-updated', this.thresholds);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.metrics.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();
      
      loggingService.logInfo('[PERFORMANCE] Alert acknowledged', {
        alertId,
        acknowledgedBy
      });
      
      this.emit('alert-acknowledged', alert);
    }
  }

  /**
   * Stop the monitoring service
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isEnabled = false;
    
    loggingService.logInfo('[PERFORMANCE] Monitoring service stopped');
  }

  /**
   * Start the monitoring service
   */
  start() {
    if (!this.isEnabled) {
      this.isEnabled = true;
      this.startMetricsCollection();
      
      loggingService.logInfo('[PERFORMANCE] Monitoring service started');
    }
  }
}

// Create singleton instance
const performanceMonitoringService = new PerformanceMonitoringService();

export default performanceMonitoringService;
export { PerformanceMonitoringService };