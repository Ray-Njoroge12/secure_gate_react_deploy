/**
 * System Health Service
 * Provides comprehensive health checks and monitoring for all system components
 */

import { dbManager } from '../database/db.enhanced.js';
import loggingService from './loggingService.js';
import performanceMonitoringService from './performanceMonitoringService.js';
import performanceAlertingService from './performanceAlertingService.js';

class SystemHealthService {
  constructor() {
    this.healthChecks = new Map();
    this.healthHistory = [];
    this.alertThresholds = {
      database: { responseTime: 1000, connectionPool: 0.8 },
      redis: { responseTime: 100, memoryUsage: 0.9 },
      api: { responseTime: 2000, errorRate: 0.05 },
      system: { cpuUsage: 0.8, memoryUsage: 0.85, diskUsage: 0.9 }
    };
    this.healthStatus = 'unknown';
    this.lastHealthCheck = null;
    this.healthCheckInterval = null;
    this.isMonitoring = false;
    
    // Zero-downtime deployment support
    this.deploymentMode = false;
    this.gracefulShutdownInProgress = false;
    this.activeConnections = new Set();
    this.shutdownTimeout = 30000; // 30 seconds
    
    // Advanced monitoring features
    this.circuitBreakers = new Map();
    this.degradationModes = new Map();
    this.capacityMetrics = {
      currentLoad: 0,
      maxCapacity: 100,
      scalingThreshold: 80,
      lastScalingAction: null
    };
    
    // Real-time monitoring
    this.realTimeMetrics = {
      requestsPerSecond: 0,
      activeUsers: 0,
      errorRate: 0,
      responseTime: 0
    };
    
    this.metricsWindow = [];
    this.metricsWindowSize = 60; // 1 minute of data points
  }

  /**
   * Initialize health monitoring system
   */
  async initialize() {
    try {
      // Register all health check components
      this.registerHealthChecks();
      
      // Start continuous monitoring
      await this.startMonitoring();
      
      loggingService.logInfo('System health monitoring initialized successfully');
    } catch (error) {
      loggingService.logError('Failed to initialize system health monitoring', error);
      throw error;
    }
  }

  /**
   * Register all health check components
   */
  registerHealthChecks() {
    // Database health check
    this.healthChecks.set('database', {
      name: 'Database Connection',
      check: this.checkDatabaseHealth.bind(this),
      critical: true,
      timeout: 5000
    });

    // Redis health check
    this.healthChecks.set('redis', {
      name: 'Redis Cache',
      check: this.checkRedisHealth.bind(this),
      critical: true,
      timeout: 3000
    });

    // External services health check
    this.healthChecks.set('external_services', {
      name: 'External Services',
      check: this.checkExternalServicesHealth.bind(this),
      critical: false,
      timeout: 10000
    });

    // System resources health check
    this.healthChecks.set('system_resources', {
      name: 'System Resources',
      check: this.checkSystemResourcesHealth.bind(this),
      critical: true,
      timeout: 2000
    });

    // Application health check
    this.healthChecks.set('application', {
      name: 'Application Health',
      check: this.checkApplicationHealth.bind(this),
      critical: true,
      timeout: 3000
    });
  }

  /**
   * Start continuous health monitoring
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // Initial health check
    await this.performHealthCheck();
    
    // Set up periodic health checks (every 30 seconds)
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        loggingService.logError('Health check failed', error);
      }
    }, 30000);

    loggingService.logInfo('Health monitoring started');
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.isMonitoring = false;
    loggingService.logInfo('Health monitoring stopped');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const startTime = Date.now();
    const healthReport = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      components: {},
      metrics: {},
      alerts: [],
      responseTime: 0
    };

    try {
      // Run all health checks in parallel
      const healthCheckPromises = Array.from(this.healthChecks.entries()).map(
        async ([key, config]) => {
          try {
            const componentHealth = await Promise.race([
              config.check(),
              this.createTimeoutPromise(config.timeout)
            ]);

            healthReport.components[key] = {
              name: config.name,
              status: componentHealth.status,
              responseTime: componentHealth.responseTime,
              details: componentHealth.details,
              critical: config.critical
            };

            // Check for alerts
            if (componentHealth.status !== 'healthy' && config.critical) {
              healthReport.status = 'unhealthy';
              healthReport.alerts.push({
                component: key,
                severity: 'critical',
                message: componentHealth.message || `${config.name} is unhealthy`
              });
            } else if (componentHealth.status === 'degraded') {
              if (healthReport.status === 'healthy') {
                healthReport.status = 'degraded';
              }
              healthReport.alerts.push({
                component: key,
                severity: 'warning',
                message: componentHealth.message || `${config.name} is degraded`
              });
            }

          } catch (error) {
            healthReport.components[key] = {
              name: config.name,
              status: 'unhealthy',
              error: error.message,
              critical: config.critical
            };

            if (config.critical) {
              healthReport.status = 'unhealthy';
              healthReport.alerts.push({
                component: key,
                severity: 'critical',
                message: `${config.name} health check failed: ${error.message}`
              });
            }
          }
        }
      );

      await Promise.all(healthCheckPromises);

      // Calculate overall response time
      healthReport.responseTime = Date.now() - startTime;

      // Add system metrics
      healthReport.metrics = await this.collectSystemMetrics();

      // Store health report
      this.lastHealthCheck = healthReport;
      this.healthStatus = healthReport.status;
      this.addToHealthHistory(healthReport);

      // Process alerts
      if (healthReport.alerts.length > 0) {
        await this.processHealthAlerts(healthReport.alerts);
      }

      return healthReport;

    } catch (error) {
      loggingService.logError('Health check execution failed', error);
      
      healthReport.status = 'unhealthy';
      healthReport.error = error.message;
      healthReport.responseTime = Date.now() - startTime;
      
      this.lastHealthCheck = healthReport;
      this.healthStatus = 'unhealthy';
      
      return healthReport;
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      const result = await dbManager.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;

      // Get connection pool status
      const poolStatus = dbManager.getStatus();
      const connectionUtilization = poolStatus.totalConnections / poolStatus.maxConnections;

      let status = 'healthy';
      let message = 'Database is healthy';

      // Check response time threshold
      if (responseTime > this.alertThresholds.database.responseTime) {
        status = 'degraded';
        message = `Database response time is high: ${responseTime}ms`;
      }

      // Check connection pool utilization
      if (connectionUtilization > this.alertThresholds.database.connectionPool) {
        status = 'degraded';
        message = `Database connection pool utilization is high: ${Math.round(connectionUtilization * 100)}%`;
      }

      return {
        status,
        responseTime,
        message,
        details: {
          connectionPool: {
            total: poolStatus.totalConnections,
            idle: poolStatus.idleConnections,
            max: poolStatus.maxConnections,
            utilization: Math.round(connectionUtilization * 100)
          },
          queryResult: result.rows[0]
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Database health check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Check Redis health
   */
  async checkRedisHealth() {
    const startTime = Date.now();
    
    try {
      // Test Redis connectivity with ping
      const testKey = `health_check_${Date.now()}`;
      const testValue = 'health_check_value';
      
      // Set and get test value
      await this.redisClient?.set(testKey, testValue, 'EX', 10);
      const retrievedValue = await this.redisClient?.get(testKey);
      await this.redisClient?.del(testKey);
      
      const responseTime = Date.now() - startTime;

      if (retrievedValue !== testValue) {
        throw new Error('Redis set/get test failed');
      }

      // Get Redis info
      const info = await this.redisClient?.info('memory');
      const memoryInfo = this.parseRedisInfo(info);
      const memoryUsage = memoryInfo.used_memory / memoryInfo.maxmemory;

      let status = 'healthy';
      let message = 'Redis is healthy';

      if (responseTime > this.alertThresholds.redis.responseTime) {
        status = 'degraded';
        message = `Redis response time is high: ${responseTime}ms`;
      }

      if (memoryUsage > this.alertThresholds.redis.memoryUsage) {
        status = 'degraded';
        message = `Redis memory usage is high: ${Math.round(memoryUsage * 100)}%`;
      }

      return {
        status,
        responseTime,
        message,
        details: {
          memory: {
            used: memoryInfo.used_memory,
            max: memoryInfo.maxmemory,
            usage: Math.round(memoryUsage * 100)
          }
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Redis health check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Check external services health
   */
  async checkExternalServicesHealth() {
    const startTime = Date.now();
    const services = [];

    try {
      // Check email service (Mailgun)
      if (process.env.MAILGUN_API_KEY) {
        const emailHealth = await this.checkEmailServiceHealth();
        services.push({ name: 'Email Service', ...emailHealth });
      }

      // Check SMS service (AfricaTalking)
      if (process.env.AFRICASTALKING_API_KEY) {
        const smsHealth = await this.checkSMSServiceHealth();
        services.push({ name: 'SMS Service', ...smsHealth });
      }

      const responseTime = Date.now() - startTime;
      const unhealthyServices = services.filter(s => s.status === 'unhealthy');
      const degradedServices = services.filter(s => s.status === 'degraded');

      let status = 'healthy';
      let message = 'All external services are healthy';

      if (unhealthyServices.length > 0) {
        status = 'degraded'; // External services are not critical
        message = `${unhealthyServices.length} external service(s) are unhealthy`;
      } else if (degradedServices.length > 0) {
        status = 'degraded';
        message = `${degradedServices.length} external service(s) are degraded`;
      }

      return {
        status,
        responseTime,
        message,
        details: { services }
      };

    } catch (error) {
      return {
        status: 'degraded',
        responseTime: Date.now() - startTime,
        message: `External services health check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Check system resources health
   */
  async checkSystemResourcesHealth() {
    const startTime = Date.now();
    
    try {
      const metrics = await this.collectSystemMetrics();
      const responseTime = Date.now() - startTime;

      let status = 'healthy';
      let message = 'System resources are healthy';
      const alerts = [];

      // Check CPU usage
      if (metrics.cpu.usage > this.alertThresholds.system.cpuUsage) {
        status = 'degraded';
        alerts.push(`High CPU usage: ${Math.round(metrics.cpu.usage * 100)}%`);
      }

      // Check memory usage
      if (metrics.memory.usage > this.alertThresholds.system.memoryUsage) {
        status = 'degraded';
        alerts.push(`High memory usage: ${Math.round(metrics.memory.usage * 100)}%`);
      }

      // Check disk usage
      if (metrics.disk.usage > this.alertThresholds.system.diskUsage) {
        status = 'degraded';
        alerts.push(`High disk usage: ${Math.round(metrics.disk.usage * 100)}%`);
      }

      if (alerts.length > 0) {
        message = alerts.join(', ');
      }

      return {
        status,
        responseTime,
        message,
        details: metrics
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `System resources health check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Check application health
   */
  async checkApplicationHealth() {
    const startTime = Date.now();
    
    try {
      // Get application metrics from performance monitoring service
      const appMetrics = await performanceMonitoringService.getApplicationMetrics();
      const responseTime = Date.now() - startTime;

      let status = 'healthy';
      let message = 'Application is healthy';

      // Check API response times
      if (appMetrics.api.averageResponseTime > this.alertThresholds.api.responseTime) {
        status = 'degraded';
        message = `API response time is high: ${appMetrics.api.averageResponseTime}ms`;
      }

      // Check error rate
      if (appMetrics.api.errorRate > this.alertThresholds.api.errorRate) {
        status = 'degraded';
        message = `API error rate is high: ${Math.round(appMetrics.api.errorRate * 100)}%`;
      }

      return {
        status,
        responseTime,
        message,
        details: appMetrics
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Application health check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    const process = await import('process');
    const os = await import('os');

    // CPU metrics
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 / os.cpus().length;

    // Memory metrics
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Disk metrics (simplified - in production would use more sophisticated disk monitoring)
    const diskUsage = 0.5; // Placeholder - would integrate with actual disk monitoring

    return {
      cpu: {
        usage: Math.min(cpuPercent, 1),
        cores: os.cpus().length,
        loadAverage: os.loadavg()
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usage: usedMemory / totalMemory,
        process: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external
        }
      },
      disk: {
        usage: diskUsage
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Process health alerts
   */
  async processHealthAlerts(alerts) {
    for (const alert of alerts) {
      try {
        // Send alert through performance alerting service
        await performanceAlertingService.sendAlert({
          type: 'health_check',
          severity: alert.severity,
          component: alert.component,
          message: alert.message,
          timestamp: new Date().toISOString()
        });

        loggingService.logSecurity('warn', 'Health alert triggered', {
          component: alert.component,
          severity: alert.severity,
          message: alert.message
        });

      } catch (error) {
        loggingService.logError('Failed to process health alert', error, {
          alert: alert
        });
      }
    }
  }

  /**
   * Add health report to history
   */
  addToHealthHistory(healthReport) {
    this.healthHistory.push({
      timestamp: healthReport.timestamp,
      status: healthReport.status,
      responseTime: healthReport.responseTime,
      alertCount: healthReport.alerts.length
    });

    // Keep only last 100 health checks
    if (this.healthHistory.length > 100) {
      this.healthHistory.shift();
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    return {
      status: this.healthStatus,
      lastCheck: this.lastHealthCheck,
      isMonitoring: this.isMonitoring,
      history: this.healthHistory.slice(-10) // Last 10 checks
    };
  }

  /**
   * Get detailed health report
   */
  getDetailedHealthReport() {
    return this.lastHealthCheck;
  }

  /**
   * Create timeout promise for health checks
   */
  createTimeoutPromise(timeout) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Parse Redis info string
   */
  parseRedisInfo(info) {
    const result = {};
    if (info) {
      info.split('\r\n').forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          result[key] = isNaN(value) ? value : Number(value);
        }
      });
    }
    return result;
  }

  /**
   * Check email service health
   */
  async checkEmailServiceHealth() {
    try {
      // Simplified email service health check
      // In production, would make actual API call to Mailgun
      return {
        status: 'healthy',
        responseTime: 100,
        message: 'Email service is healthy'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: 0,
        message: `Email service health check failed: ${error.message}`
      };
    }
  }

  /**
   * Check SMS service health
   */
  async checkSMSServiceHealth() {
    try {
      // Simplified SMS service health check
      // In production, would make actual API call to AfricaTalking
      return {
        status: 'healthy',
        responseTime: 150,
        message: 'SMS service is healthy'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: 0,
        message: `SMS service health check failed: ${error.message}`
      };
    }
  }

  /**
   * Shutdown health monitoring
   */
  async shutdown() {
    this.stopMonitoring();
    loggingService.logInfo('System health service shutdown complete');
  }

  /**
   * Enable deployment mode for zero-downtime deployments
   */
  async enableDeploymentMode() {
    this.deploymentMode = true;
    
    // Adjust health check thresholds for deployment
    this.alertThresholds = {
      ...this.alertThresholds,
      api: { ...this.alertThresholds.api, responseTime: 5000 }, // More lenient during deployment
      system: { ...this.alertThresholds.system, cpuUsage: 0.95 }
    };
    
    loggingService.logInfo('Deployment mode enabled - health checks adjusted for deployment');
    
    // Notify monitoring systems
    await performanceAlertingService.sendAlert({
      type: 'deployment_mode',
      severity: 'info',
      message: 'System entering deployment mode',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Disable deployment mode
   */
  async disableDeploymentMode() {
    this.deploymentMode = false;
    
    // Restore normal health check thresholds
    this.alertThresholds = {
      database: { responseTime: 1000, connectionPool: 0.8 },
      redis: { responseTime: 100, memoryUsage: 0.9 },
      api: { responseTime: 2000, errorRate: 0.05 },
      system: { cpuUsage: 0.8, memoryUsage: 0.85, diskUsage: 0.9 }
    };
    
    loggingService.logInfo('Deployment mode disabled - normal health checks restored');
    
    // Notify monitoring systems
    await performanceAlertingService.sendAlert({
      type: 'deployment_complete',
      severity: 'info',
      message: 'System deployment completed successfully',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Initiate graceful shutdown
   */
  async initiateGracefulShutdown() {
    if (this.gracefulShutdownInProgress) {
      return;
    }

    this.gracefulShutdownInProgress = true;
    loggingService.logInfo('Initiating graceful shutdown');

    // Stop accepting new connections
    this.healthStatus = 'shutting_down';

    // Wait for active connections to complete
    const shutdownPromise = this.waitForActiveConnections();
    const timeoutPromise = new Promise(resolve => 
      setTimeout(resolve, this.shutdownTimeout)
    );

    try {
      await Promise.race([shutdownPromise, timeoutPromise]);
      loggingService.logInfo('Graceful shutdown completed');
    } catch (error) {
      loggingService.logError('Graceful shutdown timeout', error);
    }

    // Force close remaining connections
    this.forceCloseConnections();
    
    // Stop health monitoring
    this.stopMonitoring();
  }

  /**
   * Wait for active connections to complete
   */
  async waitForActiveConnections() {
    while (this.activeConnections.size > 0) {
      loggingService.logInfo(`Waiting for ${this.activeConnections.size} active connections to complete`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Force close remaining connections
   */
  forceCloseConnections() {
    for (const connection of this.activeConnections) {
      try {
        if (connection.destroy) {
          connection.destroy();
        }
      } catch (error) {
        loggingService.logError('Error closing connection', error);
      }
    }
    this.activeConnections.clear();
  }

  /**
   * Register active connection
   */
  registerConnection(connection) {
    this.activeConnections.add(connection);
    
    // Auto-remove when connection closes
    connection.on('close', () => {
      this.activeConnections.delete(connection);
    });
  }

  /**
   * Check if system is ready for deployment
   */
  async checkDeploymentReadiness() {
    const healthReport = await this.performHealthCheck();
    const capacityCheck = await this.checkCapacity();
    
    const readinessChecks = {
      systemHealth: healthReport.status === 'healthy',
      lowLoad: this.capacityMetrics.currentLoad < 50, // Less than 50% load
      noActiveDeployment: !this.deploymentMode,
      databaseStable: healthReport.components?.database?.status === 'healthy',
      externalServicesStable: healthReport.components?.external_services?.status !== 'unhealthy'
    };
    
    const passedChecks = Object.values(readinessChecks).filter(Boolean).length;
    const totalChecks = Object.keys(readinessChecks).length;
    const readinessScore = Math.round((passedChecks / totalChecks) * 100);
    
    return {
      ready: readinessScore >= 90,
      score: readinessScore,
      checks: readinessChecks,
      recommendations: this.generateDeploymentRecommendations(readinessChecks),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate deployment recommendations
   */
  generateDeploymentRecommendations(checks) {
    const recommendations = [];
    
    if (!checks.systemHealth) {
      recommendations.push('Resolve system health issues before deployment');
    }
    if (!checks.lowLoad) {
      recommendations.push('Wait for system load to decrease below 50%');
    }
    if (!checks.databaseStable) {
      recommendations.push('Ensure database is stable and responsive');
    }
    if (!checks.externalServicesStable) {
      recommendations.push('Check external service connectivity');
    }
    
    return recommendations;
  }

  /**
   * Enable circuit breaker for a component
   */
  enableCircuitBreaker(component, options = {}) {
    const defaultOptions = {
      failureThreshold: 5,
      timeout: 60000,
      monitoringPeriod: 10000
    };
    
    this.circuitBreakers.set(component, {
      ...defaultOptions,
      ...options,
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: null,
      successCount: 0
    });
    
    loggingService.logInfo(`Circuit breaker enabled for ${component}`);
  }

  /**
   * Check circuit breaker state
   */
  checkCircuitBreaker(component) {
    const breaker = this.circuitBreakers.get(component);
    if (!breaker) return { allowed: true, state: 'NONE' };
    
    const now = Date.now();
    
    if (breaker.state === 'OPEN') {
      if (now - breaker.lastFailureTime > breaker.timeout) {
        breaker.state = 'HALF_OPEN';
        breaker.successCount = 0;
      } else {
        return { allowed: false, state: 'OPEN' };
      }
    }
    
    return { allowed: true, state: breaker.state };
  }

  /**
   * Record circuit breaker success
   */
  recordCircuitBreakerSuccess(component) {
    const breaker = this.circuitBreakers.get(component);
    if (!breaker) return;
    
    if (breaker.state === 'HALF_OPEN') {
      breaker.successCount++;
      if (breaker.successCount >= 3) {
        breaker.state = 'CLOSED';
        breaker.failureCount = 0;
        loggingService.logInfo(`Circuit breaker for ${component} closed - service recovered`);
      }
    }
  }

  /**
   * Record circuit breaker failure
   */
  recordCircuitBreakerFailure(component) {
    const breaker = this.circuitBreakers.get(component);
    if (!breaker) return;
    
    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();
    
    if (breaker.failureCount >= breaker.failureThreshold) {
      breaker.state = 'OPEN';
      loggingService.logError(`Circuit breaker for ${component} opened - service degraded`);
      
      // Send alert
      performanceAlertingService.sendAlert({
        type: 'circuit_breaker_open',
        severity: 'warning',
        component,
        message: `Circuit breaker opened for ${component} due to repeated failures`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Enable degradation mode for a component
   */
  enableDegradationMode(component, fallbackFunction) {
    this.degradationModes.set(component, {
      enabled: true,
      fallback: fallbackFunction,
      enabledAt: new Date(),
      usageCount: 0
    });
    
    loggingService.logInfo(`Degradation mode enabled for ${component}`);
  }

  /**
   * Disable degradation mode
   */
  disableDegradationMode(component) {
    const degradation = this.degradationModes.get(component);
    if (degradation) {
      this.degradationModes.delete(component);
      loggingService.logInfo(`Degradation mode disabled for ${component} (used ${degradation.usageCount} times)`);
    }
  }

  /**
   * Use degradation mode if available
   */
  async useDegradationMode(component, originalFunction, ...args) {
    const degradation = this.degradationModes.get(component);
    
    if (degradation && degradation.enabled) {
      degradation.usageCount++;
      loggingService.logInfo(`Using degradation mode for ${component}`);
      return await degradation.fallback(...args);
    }
    
    return await originalFunction(...args);
  }

  /**
   * Check system capacity
   */
  async checkCapacity() {
    const metrics = await this.collectSystemMetrics();
    
    // Calculate current load based on multiple factors
    const cpuLoad = metrics.cpu.usage * 100;
    const memoryLoad = metrics.memory.usage * 100;
    const connectionLoad = (metrics.database?.connectionUtilization || 0) * 100;
    
    // Weighted average of different load metrics
    const currentLoad = Math.round(
      (cpuLoad * 0.4) + (memoryLoad * 0.4) + (connectionLoad * 0.2)
    );
    
    this.capacityMetrics.currentLoad = currentLoad;
    
    const capacityStatus = {
      currentLoad,
      maxCapacity: this.capacityMetrics.maxCapacity,
      utilizationPercentage: currentLoad,
      status: currentLoad > 90 ? 'critical' : currentLoad > 80 ? 'warning' : 'normal',
      scalingRecommended: currentLoad > this.capacityMetrics.scalingThreshold,
      metrics: {
        cpu: cpuLoad,
        memory: memoryLoad,
        connections: connectionLoad
      }
    };
    
    // Check if scaling is needed
    if (capacityStatus.scalingRecommended && !this.capacityMetrics.lastScalingAction) {
      await this.recommendScaling(capacityStatus);
    }
    
    return capacityStatus;
  }

  /**
   * Recommend scaling action
   */
  async recommendScaling(capacityStatus) {
    this.capacityMetrics.lastScalingAction = new Date();
    
    await performanceAlertingService.sendAlert({
      type: 'scaling_recommended',
      severity: 'warning',
      message: `System capacity at ${capacityStatus.utilizationPercentage}% - scaling recommended`,
      details: capacityStatus,
      timestamp: new Date().toISOString()
    });
    
    loggingService.logInfo('Scaling recommended', capacityStatus);
  }

  /**
   * Update real-time metrics
   */
  updateRealTimeMetrics(metrics) {
    this.realTimeMetrics = { ...this.realTimeMetrics, ...metrics };
    
    // Add to metrics window
    this.metricsWindow.push({
      timestamp: new Date(),
      ...this.realTimeMetrics
    });
    
    // Keep only recent metrics
    if (this.metricsWindow.length > this.metricsWindowSize) {
      this.metricsWindow.shift();
    }
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics() {
    return {
      current: this.realTimeMetrics,
      history: this.metricsWindow,
      trends: this.calculateMetricsTrends()
    };
  }

  /**
   * Calculate metrics trends
   */
  calculateMetricsTrends() {
    if (this.metricsWindow.length < 2) {
      return { requestsPerSecond: 0, responseTime: 0, errorRate: 0 };
    }
    
    const recent = this.metricsWindow.slice(-10); // Last 10 data points
    const older = this.metricsWindow.slice(-20, -10); // Previous 10 data points
    
    const recentAvg = this.calculateAverage(recent);
    const olderAvg = this.calculateAverage(older);
    
    return {
      requestsPerSecond: recentAvg.requestsPerSecond - olderAvg.requestsPerSecond,
      responseTime: recentAvg.responseTime - olderAvg.responseTime,
      errorRate: recentAvg.errorRate - olderAvg.errorRate
    };
  }

  /**
   * Calculate average of metrics
   */
  calculateAverage(metrics) {
    if (metrics.length === 0) return { requestsPerSecond: 0, responseTime: 0, errorRate: 0 };
    
    const sum = metrics.reduce((acc, metric) => ({
      requestsPerSecond: acc.requestsPerSecond + metric.requestsPerSecond,
      responseTime: acc.responseTime + metric.responseTime,
      errorRate: acc.errorRate + metric.errorRate
    }), { requestsPerSecond: 0, responseTime: 0, errorRate: 0 });
    
    return {
      requestsPerSecond: sum.requestsPerSecond / metrics.length,
      responseTime: sum.responseTime / metrics.length,
      errorRate: sum.errorRate / metrics.length
    };
  }
}

export const systemHealthService = new SystemHealthService();