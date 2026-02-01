#!/usr/bin/env node

/**
 * Production Monitoring and Alerting System
 * Comprehensive monitoring, alerting, and escalation procedures
 * Task 19.3 - Production deployment and launch readiness validation
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class ProductionMonitoringSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      environment: 'production',
      region: 'us-east-1',
      alertingEnabled: true,
      escalationEnabled: true,
      healthCheckInterval: 30000, // 30 seconds
      metricsCollectionInterval: 60000, // 1 minute
      alertCooldownPeriod: 300000, // 5 minutes
      ...options
    };
    
    this.metrics = new Map();
    this.alerts = new Map();
    this.escalationChain = [];
    this.healthStatus = {
      overall: 'unknown',
      services: new Map(),
      lastUpdate: null
    };
    
    this.alertHistory = [];
    this.isRunning = false;
    
    this.setupEscalationChain();
    this.setupMetricThresholds();
  }

  setupEscalationChain() {
    this.escalationChain = [
      {
        level: 1,
        name: 'On-Call Engineer',
        contacts: [
          { type: 'slack', channel: '#alerts-critical' },
          { type: 'pagerduty', service: 'secure-gate-oncall' }
        ],
        escalationDelay: 300000 // 5 minutes
      },
      {
        level: 2,
        name: 'Engineering Manager',
        contacts: [
          { type: 'slack', channel: '#engineering-escalation' },
          { type: 'email', address: 'engineering-manager@secure-gate.app' },
          { type: 'phone', number: process.env.MANAGER_PHONE }
        ],
        escalationDelay: 600000 // 10 minutes
      },
      {
        level: 3,
        name: 'CTO',
        contacts: [
          { type: 'slack', channel: '#executive-alerts' },
          { type: 'email', address: 'cto@secure-gate.app' },
          { type: 'phone', number: process.env.CTO_PHONE }
        ],
        escalationDelay: 900000 // 15 minutes
      }
    ];
  }

  setupMetricThresholds() {
    this.thresholds = {
      // Application Performance
      responseTime: {
        warning: 1000,   // 1 second
        critical: 2000   // 2 seconds
      },
      errorRate: {
        warning: 2,      // 2%
        critical: 5      // 5%
      },
      
      // Infrastructure
      cpuUtilization: {
        warning: 70,     // 70%
        critical: 85     // 85%
      },
      memoryUtilization: {
        warning: 80,     // 80%
        critical: 90     // 90%
      },
      diskUtilization: {
        warning: 80,     // 80%
        critical: 90     // 90%
      },
      
      // Database
      databaseConnections: {
        warning: 80,     // 80% of max connections
        critical: 95     // 95% of max connections
      },
      databaseResponseTime: {
        warning: 500,    // 500ms
        critical: 1000   // 1 second
      },
      
      // Business Metrics
      activeUsers: {
        warning: 10,     // Minimum active users
        critical: 5      // Critical minimum
      },
      visitorProcessingRate: {
        warning: 0.5,    // Visitors per minute
        critical: 0.1    // Critical minimum
      }
    };
  }

  async startMonitoring() {
    if (this.isRunning) {
      throw new Error('Monitoring system is already running');
    }
    
    console.log('🔍 Starting Production Monitoring System');
    console.log('=' .repeat(60));
    console.log(`📍 Environment: ${this.options.environment}`);
    console.log(`🌍 Region: ${this.options.region}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log('=' .repeat(60));
    
    this.isRunning = true;
    
    // Start monitoring loops
    this.startHealthChecks();
    this.startMetricsCollection();
    this.startAlertProcessing();
    
    // Setup graceful shutdown
    process.on('SIGINT', () => this.stopMonitoring());
    process.on('SIGTERM', () => this.stopMonitoring());
    
    console.log('✅ Production monitoring system started successfully');
  }

  async stopMonitoring() {
    if (!this.isRunning) return;
    
    console.log('\n🛑 Stopping Production Monitoring System');
    this.isRunning = false;
    
    // Clear intervals
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.alertProcessingInterval) clearInterval(this.alertProcessingInterval);
    
    // Generate final report
    await this.generateMonitoringReport();
    
    console.log('✅ Production monitoring system stopped');
    process.exit(0);
  }

  startHealthChecks() {
    console.log('🏥 Starting health check monitoring');
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        console.error('❌ Health check failed:', error);
        this.createAlert('health_check_failed', 'critical', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }, this.options.healthCheckInterval);
  }

  async performHealthChecks() {
    const healthChecks = [
      { name: 'application', url: `${process.env.APPLICATION_URL}/health` },
      { name: 'database', url: `${process.env.APPLICATION_URL}/health/db` },
      { name: 'redis', url: `${process.env.APPLICATION_URL}/health/redis` },
      { name: 'external_services', url: `${process.env.APPLICATION_URL}/health/external` }
    ];
    
    const results = new Map();
    let overallStatus = 'healthy';
    
    for (const check of healthChecks) {
      try {
        const startTime = Date.now();
        const response = await fetch(check.url, { timeout: 10000 });
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          const data = await response.json();
          results.set(check.name, {
            status: 'healthy',
            responseTime,
            data
          });
        } else {
          results.set(check.name, {
            status: 'unhealthy',
            responseTime,
            error: `HTTP ${response.status}`
          });
          overallStatus = 'unhealthy';
        }
        
      } catch (error) {
        results.set(check.name, {
          status: 'unhealthy',
          error: error.message
        });
        overallStatus = 'unhealthy';
      }
    }
    
    // Update health status
    this.healthStatus = {
      overall: overallStatus,
      services: results,
      lastUpdate: new Date().toISOString()
    };
    
    // Create alerts for unhealthy services
    for (const [serviceName, result] of results) {
      if (result.status === 'unhealthy') {
        this.createAlert(`service_unhealthy_${serviceName}`, 'critical', {
          service: serviceName,
          error: result.error,
          responseTime: result.responseTime
        });
      }
    }
    
    // Emit health status update
    this.emit('healthUpdate', this.healthStatus);
  }

  startMetricsCollection() {
    console.log('📊 Starting metrics collection');
    
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('❌ Metrics collection failed:', error);
      }
    }, this.options.metricsCollectionInterval);
  }

  async collectMetrics() {
    const timestamp = new Date().toISOString();
    
    // Collect application metrics
    const appMetrics = await this.collectApplicationMetrics();
    
    // Collect infrastructure metrics
    const infraMetrics = await this.collectInfrastructureMetrics();
    
    // Collect business metrics
    const businessMetrics = await this.collectBusinessMetrics();
    
    // Store metrics
    const allMetrics = {
      timestamp,
      application: appMetrics,
      infrastructure: infraMetrics,
      business: businessMetrics
    };
    
    this.metrics.set(timestamp, allMetrics);
    
    // Keep only last 1000 metric entries
    if (this.metrics.size > 1000) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }
    
    // Check thresholds and create alerts
    this.checkMetricThresholds(allMetrics);
    
    // Emit metrics update
    this.emit('metricsUpdate', allMetrics);
  }

  async collectApplicationMetrics() {
    try {
      const response = await fetch(`${process.env.APPLICATION_URL}/metrics`, { timeout: 10000 });
      
      if (response.ok) {
        return await response.json();
      } else {
        return {
          responseTime: null,
          errorRate: null,
          requestsPerMinute: null,
          activeConnections: null
        };
      }
    } catch (error) {
      return {
        error: error.message,
        responseTime: null,
        errorRate: null
      };
    }
  }

  async collectInfrastructureMetrics() {
    try {
      // Collect ECS metrics
      const ecsMetrics = await this.collectECSMetrics();
      
      // Collect RDS metrics
      const rdsMetrics = await this.collectRDSMetrics();
      
      // Collect ElastiCache metrics
      const redisMetrics = await this.collectRedisMetrics();
      
      return {
        ecs: ecsMetrics,
        rds: rdsMetrics,
        redis: redisMetrics
      };
      
    } catch (error) {
      return { error: error.message };
    }
  }

  async collectECSMetrics() {
    try {
      const { execSync } = require('child_process');
      
      // Get ECS service metrics
      const serviceInfo = execSync(`aws ecs describe-services --cluster secure-gate-cluster --services secure-gate-service --region ${this.options.region}`, { stdio: 'pipe' });
      const service = JSON.parse(serviceInfo.toString()).services[0];
      
      return {
        runningCount: service.runningCount,
        pendingCount: service.pendingCount,
        desiredCount: service.desiredCount,
        status: service.status
      };
      
    } catch (error) {
      return { error: error.message };
    }
  }

  async collectRDSMetrics() {
    try {
      const { execSync } = require('child_process');
      
      // Get RDS metrics from CloudWatch
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 300000).toISOString(); // 5 minutes ago
      
      const cpuMetrics = execSync(`aws cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name CPUUtilization --dimensions Name=DBInstanceIdentifier,Value=secure-gate-postgres --start-time ${startTime} --end-time ${endTime} --period 300 --statistics Average --region ${this.options.region}`, { stdio: 'pipe' });
      
      const cpu = JSON.parse(cpuMetrics.toString());
      const latestCpuValue = cpu.Datapoints.length > 0 ? cpu.Datapoints[cpu.Datapoints.length - 1].Average : null;
      
      return {
        cpuUtilization: latestCpuValue,
        connections: null, // Would need custom metric
        responseTime: null // Would need custom metric
      };
      
    } catch (error) {
      return { error: error.message };
    }
  }

  async collectRedisMetrics() {
    try {
      const { execSync } = require('child_process');
      
      // Get ElastiCache metrics
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 300000).toISOString();
      
      const cpuMetrics = execSync(`aws cloudwatch get-metric-statistics --namespace AWS/ElastiCache --metric-name CPUUtilization --dimensions Name=CacheClusterId,Value=secure-gate-redis --start-time ${startTime} --end-time ${endTime} --period 300 --statistics Average --region ${this.options.region}`, { stdio: 'pipe' });
      
      const cpu = JSON.parse(cpuMetrics.toString());
      const latestCpuValue = cpu.Datapoints.length > 0 ? cpu.Datapoints[cpu.Datapoints.length - 1].Average : null;
      
      return {
        cpuUtilization: latestCpuValue,
        memoryUtilization: null,
        connections: null
      };
      
    } catch (error) {
      return { error: error.message };
    }
  }

  async collectBusinessMetrics() {
    try {
      const response = await fetch(`${process.env.APPLICATION_URL}/api/admin/metrics`, {
        headers: {
          'Authorization': `Bearer ${process.env.MONITORING_API_TOKEN}`
        },
        timeout: 10000
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        return {
          activeUsers: null,
          visitorProcessingRate: null,
          errorCount: null
        };
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  checkMetricThresholds(metrics) {
    const checks = [
      // Application metrics
      { path: 'application.responseTime', threshold: 'responseTime' },
      { path: 'application.errorRate', threshold: 'errorRate' },
      
      // Infrastructure metrics
      { path: 'infrastructure.ecs.cpuUtilization', threshold: 'cpuUtilization' },
      { path: 'infrastructure.rds.cpuUtilization', threshold: 'cpuUtilization' },
      { path: 'infrastructure.redis.cpuUtilization', threshold: 'cpuUtilization' },
      
      // Business metrics
      { path: 'business.activeUsers', threshold: 'activeUsers', invert: true },
      { path: 'business.visitorProcessingRate', threshold: 'visitorProcessingRate', invert: true }
    ];
    
    for (const check of checks) {
      const value = this.getNestedValue(metrics, check.path);
      if (value === null || value === undefined) continue;
      
      const threshold = this.thresholds[check.threshold];
      if (!threshold) continue;
      
      let severity = null;
      
      if (check.invert) {
        // For metrics where lower values are bad (like active users)
        if (value <= threshold.critical) severity = 'critical';
        else if (value <= threshold.warning) severity = 'warning';
      } else {
        // For metrics where higher values are bad
        if (value >= threshold.critical) severity = 'critical';
        else if (value >= threshold.warning) severity = 'warning';
      }
      
      if (severity) {
        this.createAlert(`threshold_exceeded_${check.threshold}`, severity, {
          metric: check.path,
          value,
          threshold: threshold[severity],
          timestamp: metrics.timestamp
        });
      }
    }
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  createAlert(alertId, severity, data) {
    const now = Date.now();
    const existingAlert = this.alerts.get(alertId);
    
    // Check cooldown period
    if (existingAlert && (now - existingAlert.lastTriggered) < this.options.alertCooldownPeriod) {
      return;
    }
    
    const alert = {
      id: alertId,
      severity,
      data,
      createdAt: new Date().toISOString(),
      lastTriggered: now,
      escalationLevel: 0,
      acknowledged: false,
      resolved: false
    };
    
    this.alerts.set(alertId, alert);
    this.alertHistory.push({ ...alert });
    
    console.log(`🚨 ALERT [${severity.toUpperCase()}]: ${alertId}`, data);
    
    if (this.options.alertingEnabled) {
      this.processAlert(alert);
    }
    
    this.emit('alert', alert);
  }

  startAlertProcessing() {
    console.log('🚨 Starting alert processing');
    
    this.alertProcessingInterval = setInterval(() => {
      this.processEscalations();
    }, 60000); // Check every minute
  }

  async processAlert(alert) {
    if (alert.severity === 'critical') {
      await this.sendAlertNotification(alert, this.escalationChain[0]);
      
      // Schedule escalation
      if (this.options.escalationEnabled) {
        setTimeout(() => {
          this.escalateAlert(alert);
        }, this.escalationChain[0].escalationDelay);
      }
    } else if (alert.severity === 'warning') {
      await this.sendAlertNotification(alert, this.escalationChain[0]);
    }
  }

  async escalateAlert(alert) {
    if (alert.acknowledged || alert.resolved) return;
    
    alert.escalationLevel++;
    
    if (alert.escalationLevel < this.escalationChain.length) {
      const escalationTarget = this.escalationChain[alert.escalationLevel];
      
      console.log(`📈 Escalating alert ${alert.id} to level ${alert.escalationLevel + 1}: ${escalationTarget.name}`);
      
      await this.sendAlertNotification(alert, escalationTarget);
      
      // Schedule next escalation
      setTimeout(() => {
        this.escalateAlert(alert);
      }, escalationTarget.escalationDelay);
    } else {
      console.log(`🔴 Alert ${alert.id} has reached maximum escalation level`);
    }
  }

  async sendAlertNotification(alert, target) {
    for (const contact of target.contacts) {
      try {
        await this.sendNotification(contact, alert, target);
      } catch (error) {
        console.error(`❌ Failed to send notification via ${contact.type}:`, error);
      }
    }
  }

  async sendNotification(contact, alert, target) {
    const message = this.formatAlertMessage(alert, target);
    
    switch (contact.type) {
      case 'slack':
        await this.sendSlackNotification(contact.channel, message, alert);
        break;
        
      case 'email':
        await this.sendEmailNotification(contact.address, message, alert);
        break;
        
      case 'phone':
        await this.sendPhoneNotification(contact.number, message, alert);
        break;
        
      case 'pagerduty':
        await this.sendPagerDutyNotification(contact.service, message, alert);
        break;
        
      default:
        console.log(`📧 [${contact.type}] ${message}`);
    }
  }

  formatAlertMessage(alert, target) {
    const severity = alert.severity.toUpperCase();
    const timestamp = new Date(alert.createdAt).toLocaleString();
    
    return `🚨 [${severity}] SecureGate Alert - ${alert.id}
    
Escalation Level: ${alert.escalationLevel + 1} (${target.name})
Time: ${timestamp}
Environment: ${this.options.environment}

Details: ${JSON.stringify(alert.data, null, 2)}

Please acknowledge this alert in the monitoring dashboard.`;
  }

  async sendSlackNotification(channel, message, alert) {
    // Mock Slack notification
    console.log(`📱 Slack notification to ${channel}:`);
    console.log(message);
  }

  async sendEmailNotification(address, message, alert) {
    // Mock email notification
    console.log(`📧 Email notification to ${address}:`);
    console.log(message);
  }

  async sendPhoneNotification(number, message, alert) {
    // Mock phone notification
    console.log(`📞 Phone notification to ${number}:`);
    console.log(message);
  }

  async sendPagerDutyNotification(service, message, alert) {
    // Mock PagerDuty notification
    console.log(`📟 PagerDuty notification to ${service}:`);
    console.log(message);
  }

  processEscalations() {
    // Process any pending escalations
    for (const [alertId, alert] of this.alerts) {
      if (!alert.acknowledged && !alert.resolved && alert.severity === 'critical') {
        // Check if escalation is needed
        const timeSinceCreated = Date.now() - new Date(alert.createdAt).getTime();
        const escalationTarget = this.escalationChain[alert.escalationLevel];
        
        if (escalationTarget && timeSinceCreated >= escalationTarget.escalationDelay) {
          this.escalateAlert(alert);
        }
      }
    }
  }

  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date().toISOString();
      
      console.log(`✅ Alert ${alertId} acknowledged by ${acknowledgedBy}`);
      this.emit('alertAcknowledged', alert);
    }
  }

  resolveAlert(alertId, resolvedBy, resolution) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedBy = resolvedBy;
      alert.resolvedAt = new Date().toISOString();
      alert.resolution = resolution;
      
      console.log(`✅ Alert ${alertId} resolved by ${resolvedBy}: ${resolution}`);
      this.emit('alertResolved', alert);
    }
  }

  getMonitoringStatus() {
    return {
      isRunning: this.isRunning,
      healthStatus: this.healthStatus,
      activeAlerts: Array.from(this.alerts.values()).filter(alert => !alert.resolved),
      metricsCount: this.metrics.size,
      alertHistory: this.alertHistory.slice(-100), // Last 100 alerts
      uptime: process.uptime()
    };
  }

  async generateMonitoringReport() {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        environment: this.options.environment,
        region: this.options.region,
        monitoringDuration: process.uptime(),
        version: '1.0.0'
      },
      summary: {
        totalAlerts: this.alertHistory.length,
        criticalAlerts: this.alertHistory.filter(a => a.severity === 'critical').length,
        warningAlerts: this.alertHistory.filter(a => a.severity === 'warning').length,
        resolvedAlerts: this.alertHistory.filter(a => a.resolved).length,
        activeAlerts: Array.from(this.alerts.values()).filter(a => !a.resolved).length
      },
      healthStatus: this.healthStatus,
      activeAlerts: Array.from(this.alerts.values()).filter(alert => !alert.resolved),
      recentMetrics: Array.from(this.metrics.values()).slice(-10),
      alertHistory: this.alertHistory,
      escalationChain: this.escalationChain,
      thresholds: this.thresholds
    };
    
    const reportPath = path.join(__dirname, `monitoring-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Monitoring report saved to: ${reportPath}`);
    
    return report;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options = {
    environment: args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'production',
    region: args.find(arg => arg.startsWith('--region='))?.split('=')[1] || 'us-east-1',
    alertingEnabled: !args.includes('--no-alerts'),
    escalationEnabled: !args.includes('--no-escalation'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };
  
  const monitoringSystem = new ProductionMonitoringSystem(options);
  
  monitoringSystem.startMonitoring()
    .catch(error => {
      console.error('❌ Failed to start monitoring system:', error);
      process.exit(1);
    });
}

module.exports = ProductionMonitoringSystem;