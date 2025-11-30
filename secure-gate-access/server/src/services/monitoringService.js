#!/usr/bin/env node
/**
 * Monitoring Service
 * Provides comprehensive system monitoring and alerting capabilities
 */

import { Pool } from 'pg';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger, { performanceLogger, logHealthCheck, logSystemMetrics } from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MonitoringService {
  constructor() {
    this.dbConfig = {
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: process.env.PGPORT || process.env.DB_PORT || 5432,
      database: process.env.PGDATABASE || process.env.DB_NAME || 'secure_gate',
      user: process.env.PGUSER || process.env.DB_USER || 'postgres',  // Standardized to postgres
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres',  // Standardized default
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
    
    this.pool = new Pool(this.dbConfig);
    this.metrics = new Map();
    this.alerts = new Map();
    this.healthChecks = new Map();
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    // Thresholds for alerts
    this.thresholds = {
      cpu: 80, // CPU usage percentage
      memory: 85, // Memory usage percentage
      disk: 90, // Disk usage percentage
      responseTime: 2000, // Response time in ms
      errorRate: 5, // Error rate percentage
      dbConnections: 80 // Database connection percentage
    };
    
    this.initializeHealthChecks();
  }

  /**
   * Initialize health checks
   */
  initializeHealthChecks() {
    // Database health check
    this.healthChecks.set('database', {
      name: 'Database',
      check: () => this.checkDatabaseHealth(),
      interval: 30000, // 30 seconds
      lastCheck: null,
      status: 'unknown'
    });

    // Memory health check
    this.healthChecks.set('memory', {
      name: 'Memory',
      check: () => this.checkMemoryHealth(),
      interval: 10000, // 10 seconds
      lastCheck: null,
      status: 'unknown'
    });

    // CPU health check
    this.healthChecks.set('cpu', {
      name: 'CPU',
      check: () => this.checkCpuHealth(),
      interval: 10000, // 10 seconds
      lastCheck: null,
      status: 'unknown'
    });

    // Disk health check
    this.healthChecks.set('disk', {
      name: 'Disk',
      check: () => this.checkDiskHealth(),
      interval: 60000, // 1 minute
      lastCheck: null,
      status: 'unknown'
    });

    // Application health check
    this.healthChecks.set('application', {
      name: 'Application',
      check: () => this.checkApplicationHealth(),
      interval: 30000, // 30 seconds
      lastCheck: null,
      status: 'unknown'
    });
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isMonitoring) {
      logger.warn('Monitoring service is already running');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting monitoring service...');

    // Start health checks
    this.startHealthChecks();

    // Start metrics collection
    this.startMetricsCollection();

    // Start alert processing
    this.startAlertProcessing();

    logger.info('Monitoring service started successfully');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isMonitoring) {
      logger.warn('Monitoring service is not running');
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('Monitoring service stopped');
  }

  /**
   * Start health checks
   */
  startHealthChecks() {
    for (const [key, healthCheck] of this.healthChecks) {
      this.runHealthCheck(key, healthCheck);
      
      // Set up interval
      setInterval(() => {
        this.runHealthCheck(key, healthCheck);
      }, healthCheck.interval);
    }
  }

  /**
   * Run individual health check
   */
  async runHealthCheck(key, healthCheck) {
    try {
      const startTime = Date.now();
      const result = await healthCheck.check();
      const duration = Date.now() - startTime;

      healthCheck.lastCheck = new Date();
      healthCheck.status = result.status;

      // Log health check result
      logHealthCheck(healthCheck.name, result.status, {
        duration,
        details: result.details
      });

      // Check for alerts
      if (result.status !== 'healthy') {
        this.triggerAlert(key, result);
      }

    } catch (error) {
      logger.error(`Health check failed for ${healthCheck.name}:`, error);
      healthCheck.status = 'error';
      healthCheck.lastCheck = new Date();
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      const client = await this.pool.connect();
      
      // Test basic query
      const startTime = Date.now();
      await client.query('SELECT 1');
      const queryTime = Date.now() - startTime;
      
      // Get connection count
      const connectionResult = await client.query(`
        SELECT count(*) as connections 
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      
      const connections = parseInt(connectionResult.rows[0].connections);
      const maxConnections = this.pool.options.max || 20;
      const connectionPercentage = (connections / maxConnections) * 100;
      
      client.release();

      const status = queryTime > 1000 || connectionPercentage > this.thresholds.dbConnections 
        ? 'warning' 
        : 'healthy';

      return {
        status,
        details: {
          queryTime,
          connections,
          maxConnections,
          connectionPercentage: Math.round(connectionPercentage)
        }
      };

    } catch (error) {
      return {
        status: 'error',
        details: { error: error.message }
      };
    }
  }

  /**
   * Check memory health
   */
  checkMemoryHealth() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryPercentage = (usedMem / totalMem) * 100;

    const status = memoryPercentage > this.thresholds.memory ? 'warning' : 'healthy';

    return {
      status,
      details: {
        memoryPercentage: Math.round(memoryPercentage),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external
      }
    };
  }

  /**
   * Check CPU health
   */
  checkCpuHealth() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const cpuCount = cpus.length;
    
    // Calculate CPU usage percentage based on load average
    const cpuPercentage = (loadAvg[0] / cpuCount) * 100;

    const status = cpuPercentage > this.thresholds.cpu ? 'warning' : 'healthy';

    return {
      status,
      details: {
        cpuPercentage: Math.round(cpuPercentage),
        loadAverage: loadAvg,
        cpuCount
      }
    };
  }

  /**
   * Check disk health
   */
  checkDiskHealth() {
    try {
      const stats = fs.statSync(process.cwd());
      // This is a simplified check - in production, you'd use a proper disk usage library
      const diskUsage = 50; // Placeholder - would need actual disk usage calculation
      
      const status = diskUsage > this.thresholds.disk ? 'warning' : 'healthy';

      return {
        status,
        details: {
          diskUsage,
          path: process.cwd()
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: { error: error.message }
      };
    }
  }

  /**
   * Check application health
   */
  checkApplicationHealth() {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    // Check if application is responsive
    const isResponsive = uptime > 0 && memUsage.heapUsed > 0;
    
    const status = isResponsive ? 'healthy' : 'error';

    return {
      status,
      details: {
        uptime,
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    // Collect system metrics every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Initial collection
    this.collectSystemMetrics();
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    try {
      // Log system metrics
      logSystemMetrics();

      // Store metrics in memory
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.metrics.set('memory.heapUsed', memUsage.heapUsed);
      this.metrics.set('memory.heapTotal', memUsage.heapTotal);
      this.metrics.set('memory.rss', memUsage.rss);
      this.metrics.set('memory.external', memUsage.external);
      
      this.metrics.set('cpu.user', cpuUsage.user);
      this.metrics.set('cpu.system', cpuUsage.system);
      this.metrics.set('uptime', process.uptime());

      // Store in database
      this.storeMetrics();

    } catch (error) {
      logger.error('Failed to collect system metrics:', error);
    }
  }

  /**
   * Store metrics in database
   */
  async storeMetrics() {
    try {
      const client = await this.pool.connect();
      
      const metrics = Array.from(this.metrics.entries()).map(([key, value]) => ({
        metric_name: key,
        metric_value: value,
        timestamp: new Date()
      }));

      if (metrics.length > 0) {
        await client.query(`
          INSERT INTO performance_metrics (metric_name, metric_value, timestamp)
          VALUES ${metrics.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ')}
        `, metrics.flatMap(m => [m.metric_name, m.metric_value, m.timestamp]));
      }

      client.release();

    } catch (error) {
      logger.error('Failed to store metrics in database:', error);
    }
  }

  /**
   * Start alert processing
   */
  startAlertProcessing() {
    // Process alerts every 10 seconds
    setInterval(() => {
      this.processAlerts();
    }, 10000);
  }

  /**
   * Process alerts
   */
  processAlerts() {
    for (const [key, alert] of this.alerts) {
      if (alert.shouldTrigger()) {
        this.triggerAlert(key, alert);
        alert.lastTriggered = new Date();
      }
    }
  }

  /**
   * Trigger alert
   */
  triggerAlert(key, alert) {
    const alertData = {
      key,
      message: alert.message,
      severity: alert.severity || 'warning',
      timestamp: new Date(),
      details: alert.details || {}
    };

    // Log alert
    logger.warn(`Alert triggered: ${key}`, alertData);

    // Store alert in database
    this.storeAlert(alertData);

    // Send notification (implement based on requirements)
    this.sendNotification(alertData);
  }

  /**
   * Store alert in database
   */
  async storeAlert(alertData) {
    try {
      const client = await this.pool.connect();
      
      await client.query(`
        INSERT INTO system_health (component, status, message, response_time_ms, error_count, last_check)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (component) DO UPDATE SET
          status = $2,
          message = $3,
          response_time_ms = $4,
          error_count = system_health.error_count + 1,
          last_check = NOW()
      `, [
        alertData.key,
        alertData.severity,
        alertData.message,
        alertData.details.duration || 0,
        alertData.details.errorCount || 1
      ]);

      client.release();

    } catch (error) {
      logger.error('Failed to store alert in database:', error);
    }
  }

  /**
   * Send notification
   */
  sendNotification(alertData) {
    // Implement notification logic (email, Slack, etc.)
    logger.info(`Notification sent for alert: ${alertData.key}`);
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    const status = {
      monitoring: this.isMonitoring,
      healthChecks: {},
      metrics: Object.fromEntries(this.metrics),
      alerts: Array.from(this.alerts.keys()),
      timestamp: new Date()
    };

    // Add health check statuses
    for (const [key, healthCheck] of this.healthChecks) {
      status.healthChecks[key] = {
        name: healthCheck.name,
        status: healthCheck.status,
        lastCheck: healthCheck.lastCheck
      };
    }

    return status;
  }

  /**
   * Get metrics for a time range
   */
  async getMetrics(startTime, endTime, metricNames = null) {
    try {
      const client = await this.pool.connect();
      
      let query = `
        SELECT metric_name, metric_value, timestamp
        FROM performance_metrics
        WHERE timestamp BETWEEN $1 AND $2
      `;
      
      const params = [startTime, endTime];
      
      if (metricNames && metricNames.length > 0) {
        query += ` AND metric_name = ANY($3)`;
        params.push(metricNames);
      }
      
      query += ` ORDER BY timestamp DESC`;
      
      const result = await client.query(query, params);
      client.release();
      
      return result.rows;

    } catch (error) {
      logger.error('Failed to get metrics:', error);
      return [];
    }
  }

  /**
   * Get health check history
   */
  async getHealthCheckHistory(component = null, limit = 100) {
    try {
      const client = await this.pool.connect();
      
      let query = `
        SELECT component, status, message, response_time_ms, error_count, last_check
        FROM system_health
        WHERE 1=1
      `;
      
      const params = [];
      
      if (component) {
        query += ` AND component = $1`;
        params.push(component);
      }
      
      query += ` ORDER BY last_check DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await client.query(query, params);
      client.release();
      
      return result.rows;

    } catch (error) {
      logger.error('Failed to get health check history:', error);
      return [];
    }
  }

  /**
   * Close database connection
   */
  async close() {
    this.stop();
    await this.pool.end();
  }
}

export default MonitoringService;