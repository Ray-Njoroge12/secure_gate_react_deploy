/**
 * Production Environment Monitoring and Alerting Validator
 * 
 * Validates: Requirements 7.2, 7.6
 * 
 * This validator ensures that comprehensive monitoring, alerting, and observability
 * systems are properly configured for production operations.
 */

const fs = require('fs').promises;
const path = require('path');

class MonitoringAlertingValidator {
  constructor() {
    this.results = {
      metrics: {
        applicationMetrics: false,
        businessMetrics: false,
        infrastructureMetrics: false,
        customMetrics: false
      },
      logging: {
        structuredLogging: false,
        logAggregation: false,
        logRetention: false,
        securityLogging: false
      },
      alerting: {
        alertRules: false,
        escalationProcedures: false,
        notificationChannels: false,
        alertTesting: false
      },
      healthChecks: {
        applicationHealth: false,
        databaseHealth: false,
        externalServices: false,
        statusReporting: false
      },
      observability: {
        tracing: false,
        profiling: false,
        dashboards: false,
        sla_monitoring: false
      }
    };
    this.issues = [];
    this.recommendations = [];
  }

  async validateMonitoringAndAlerting() {
    console.log('📊 Starting Monitoring and Alerting Validation...');
    
    try {
      await this.validateMetricsCollection();
      await this.validateLoggingSystem();
      await this.validateAlertingConfiguration();
      await this.validateHealthChecks();
      await this.validateObservabilityStack();
      
      return this.generateMonitoringReport();
    } catch (error) {
      this.issues.push({
        category: 'monitoring',
        severity: 'critical',
        issue: 'Monitoring validation failed',
        details: error.message,
        recommendation: 'Review monitoring configuration and resolve critical issues'
      });
      
      return this.generateMonitoringReport();
    }
  }

  async validateMetricsCollection() {
    console.log('  📈 Validating metrics collection...');
    
    try {
      // Check for application metrics
      const metricsFiles = [
        'secure-gate-access/server/src/middleware/metricsMiddleware.js',
        'secure-gate-access/server/src/services/metricsService.js',
        'monitoring/prometheus.yml',
        'monitoring/metrics-config.json'
      ];
      
      let hasApplicationMetrics = false;
      for (const metricsFile of metricsFiles) {
        try {
          const content = await fs.readFile(metricsFile, 'utf8');
          if (content.includes('metrics') || 
              content.includes('prometheus') ||
              content.includes('counter') ||
              content.includes('histogram')) {
            hasApplicationMetrics = true;
            this.results.metrics.applicationMetrics = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasApplicationMetrics) {
        this.issues.push({
          category: 'metrics',
          severity: 'high',
          issue: 'No application metrics collection found',
          recommendation: 'Implement Prometheus metrics or similar monitoring system'
        });
      }
      
      // Check for business metrics
      const businessMetricsIndicators = [
        'secure-gate-access/server/src/services/analyticsService.js',
        'secure-gate-access/server/src/controllers/metricsController.js'
      ];
      
      let hasBusinessMetrics = false;
      for (const indicator of businessMetricsIndicators) {
        try {
          const content = await fs.readFile(indicator, 'utf8');
          if (content.includes('visitor') || 
              content.includes('user') ||
              content.includes('analytics') ||
              content.includes('business')) {
            hasBusinessMetrics = true;
            this.results.metrics.businessMetrics = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasBusinessMetrics) {
        this.issues.push({
          category: 'metrics',
          severity: 'medium',
          issue: 'No business metrics collection found',
          recommendation: 'Implement business KPI tracking (user registrations, visitor check-ins, etc.)'
        });
      }
      
      // Check for infrastructure metrics
      const infraMetricsFiles = [
        'monitoring/node-exporter.yml',
        'monitoring/cadvisor.yml',
        'docker-compose.monitoring.yml'
      ];
      
      let hasInfraMetrics = false;
      for (const infraFile of infraMetricsFiles) {
        try {
          const content = await fs.readFile(infraFile, 'utf8');
          if (content.includes('node-exporter') || 
              content.includes('cadvisor') ||
              content.includes('infrastructure')) {
            hasInfraMetrics = true;
            this.results.metrics.infrastructureMetrics = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasInfraMetrics) {
        this.issues.push({
          category: 'metrics',
          severity: 'medium',
          issue: 'No infrastructure metrics collection found',
          recommendation: 'Set up node-exporter, cAdvisor, or similar infrastructure monitoring'
        });
      }
      
    } catch (error) {
      this.issues.push({
        category: 'metrics',
        severity: 'high',
        issue: 'Failed to validate metrics collection',
        details: error.message
      });
    }
  }
  async validateLoggingSystem() {
    console.log('  📝 Validating logging system...');
    
    try {
      // Check for structured logging
      const loggingFiles = [
        'secure-gate-access/server/src/services/loggingService.js',
        'secure-gate-access/server/src/middleware/loggingMiddleware.js',
        'secure-gate-access/server/src/utils/logger.js'
      ];
      
      let hasStructuredLogging = false;
      for (const logFile of loggingFiles) {
        try {
          const content = await fs.readFile(logFile, 'utf8');
          if (content.includes('winston') || 
              content.includes('structured') ||
              content.includes('json') ||
              content.includes('correlationId')) {
            hasStructuredLogging = true;
            this.results.logging.structuredLogging = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasStructuredLogging) {
        this.issues.push({
          category: 'logging',
          severity: 'high',
          issue: 'No structured logging system found',
          recommendation: 'Implement structured logging with Winston or similar library'
        });
      }
      
      // Check for log aggregation
      const logAggregationFiles = [
        'monitoring/loki-config.yml',
        'monitoring/fluentd.conf',
        'monitoring/logstash.conf',
        'docker-compose.logging.yml'
      ];
      
      let hasLogAggregation = false;
      for (const aggFile of logAggregationFiles) {
        try {
          const content = await fs.readFile(aggFile, 'utf8');
          if (content.includes('loki') || 
              content.includes('elasticsearch') ||
              content.includes('fluentd') ||
              content.includes('logstash')) {
            hasLogAggregation = true;
            this.results.logging.logAggregation = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasLogAggregation) {
        this.issues.push({
          category: 'logging',
          severity: 'medium',
          issue: 'No log aggregation system found',
          recommendation: 'Set up Loki, ELK stack, or similar log aggregation system'
        });
      }
      
      // Check for security logging
      const securityLogFiles = [
        'secure-gate-access/server/src/middleware/auditLogger.js',
        'secure-gate-access/server/src/services/securityLogger.js'
      ];
      
      let hasSecurityLogging = false;
      for (const secFile of securityLogFiles) {
        try {
          const content = await fs.readFile(secFile, 'utf8');
          if (content.includes('audit') || 
              content.includes('security') ||
              content.includes('authentication') ||
              content.includes('authorization')) {
            hasSecurityLogging = true;
            this.results.logging.securityLogging = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasSecurityLogging) {
        this.issues.push({
          category: 'logging',
          severity: 'high',
          issue: 'No security logging found',
          recommendation: 'Implement comprehensive security event logging'
        });
      }
      
    } catch (error) {
      this.issues.push({
        category: 'logging',
        severity: 'high',
        issue: 'Failed to validate logging system',
        details: error.message
      });
    }
  }

  async validateAlertingConfiguration() {
    console.log('  🚨 Validating alerting configuration...');
    
    try {
      // Check for alert rules
      const alertFiles = [
        'monitoring/alert-rules.yml',
        'monitoring/prometheus-alerts.yml',
        'monitoring/alertmanager.yml'
      ];
      
      let hasAlertRules = false;
      for (const alertFile of alertFiles) {
        try {
          const content = await fs.readFile(alertFile, 'utf8');
          if (content.includes('alert') || 
              content.includes('rule') ||
              content.includes('threshold') ||
              content.includes('condition')) {
            hasAlertRules = true;
            this.results.alerting.alertRules = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasAlertRules) {
        this.issues.push({
          category: 'alerting',
          severity: 'high',
          issue: 'No alert rules configuration found',
          recommendation: 'Configure alert rules for critical system metrics'
        });
      }
      
      // Check for notification channels
      const notificationFiles = [
        'monitoring/notification-config.yml',
        'secure-gate-access/server/src/services/notificationService.js',
        '.github/workflows/alerts.yml'
      ];
      
      let hasNotificationChannels = false;
      for (const notifFile of notificationFiles) {
        try {
          const content = await fs.readFile(notifFile, 'utf8');
          if (content.includes('slack') || 
              content.includes('email') ||
              content.includes('webhook') ||
              content.includes('notification')) {
            hasNotificationChannels = true;
            this.results.alerting.notificationChannels = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasNotificationChannels) {
        this.issues.push({
          category: 'alerting',
          severity: 'medium',
          issue: 'No notification channels configured',
          recommendation: 'Set up Slack, email, or webhook notifications for alerts'
        });
      }
      
      // Check for escalation procedures
      const escalationFiles = [
        'docs/incident-response.md',
        'docs/escalation-procedures.md',
        'monitoring/escalation-config.yml'
      ];
      
      let hasEscalationProcedures = false;
      for (const escFile of escalationFiles) {
        try {
          const content = await fs.readFile(escFile, 'utf8');
          if (content.includes('escalation') || 
              content.includes('incident') ||
              content.includes('on-call') ||
              content.includes('response')) {
            hasEscalationProcedures = true;
            this.results.alerting.escalationProcedures = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasEscalationProcedures) {
        this.issues.push({
          category: 'alerting',
          severity: 'medium',
          issue: 'No escalation procedures documented',
          recommendation: 'Document incident response and escalation procedures'
        });
      }
      
    } catch (error) {
      this.issues.push({
        category: 'alerting',
        severity: 'high',
        issue: 'Failed to validate alerting configuration',
        details: error.message
      });
    }
  }

  async validateHealthChecks() {
    console.log('  ❤️ Validating health checks...');
    
    try {
      // Check for application health endpoints
      const healthFiles = [
        'secure-gate-access/server/src/routes/health.js',
        'secure-gate-access/server/src/controllers/healthController.js',
        'secure-gate-access/server/src/middleware/healthCheck.js'
      ];
      
      let hasApplicationHealth = false;
      for (const healthFile of healthFiles) {
        try {
          const content = await fs.readFile(healthFile, 'utf8');
          if (content.includes('health') || 
              content.includes('/health') ||
              content.includes('status') ||
              content.includes('ready')) {
            hasApplicationHealth = true;
            this.results.healthChecks.applicationHealth = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasApplicationHealth) {
        this.issues.push({
          category: 'health',
          severity: 'high',
          issue: 'No application health checks found',
          recommendation: 'Implement /health and /ready endpoints'
        });
      }
      
      // Check for database health monitoring
      const dbHealthFiles = [
        'secure-gate-access/server/src/services/databaseHealthService.js',
        'secure-gate-access/server/src/database/healthCheck.js'
      ];
      
      let hasDatabaseHealth = false;
      for (const dbFile of dbHealthFiles) {
        try {
          const content = await fs.readFile(dbFile, 'utf8');
          if (content.includes('database') || 
              content.includes('connection') ||
              content.includes('pool') ||
              content.includes('ping')) {
            hasDatabaseHealth = true;
            this.results.healthChecks.databaseHealth = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasDatabaseHealth) {
        this.issues.push({
          category: 'health',
          severity: 'medium',
          issue: 'No database health monitoring found',
          recommendation: 'Implement database connection health checks'
        });
      }
      
      // Check for external service health monitoring
      const externalHealthFiles = [
        'secure-gate-access/server/src/services/externalHealthService.js',
        'secure-gate-access/server/src/middleware/serviceHealthCheck.js'
      ];
      
      let hasExternalServiceHealth = false;
      for (const extFile of externalHealthFiles) {
        try {
          const content = await fs.readFile(extFile, 'utf8');
          if (content.includes('external') || 
              content.includes('mailgun') ||
              content.includes('africastalking') ||
              content.includes('service')) {
            hasExternalServiceHealth = true;
            this.results.healthChecks.externalServices = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasExternalServiceHealth) {
        this.issues.push({
          category: 'health',
          severity: 'low',
          issue: 'No external service health monitoring found',
          recommendation: 'Monitor health of external services (email, SMS, etc.)'
        });
      }
      
    } catch (error) {
      this.issues.push({
        category: 'health',
        severity: 'high',
        issue: 'Failed to validate health checks',
        details: error.message
      });
    }
  }
  async validateObservabilityStack() {
    console.log('  🔍 Validating observability stack...');
    
    try {
      // Check for distributed tracing
      const tracingFiles = [
        'secure-gate-access/server/src/middleware/tracingMiddleware.js',
        'monitoring/jaeger-config.yml',
        'monitoring/zipkin-config.yml'
      ];
      
      let hasTracing = false;
      for (const tracingFile of tracingFiles) {
        try {
          const content = await fs.readFile(tracingFile, 'utf8');
          if (content.includes('tracing') || 
              content.includes('jaeger') ||
              content.includes('zipkin') ||
              content.includes('opentelemetry')) {
            hasTracing = true;
            this.results.observability.tracing = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasTracing) {
        this.issues.push({
          category: 'observability',
          severity: 'low',
          issue: 'No distributed tracing found',
          recommendation: 'Consider implementing distributed tracing with Jaeger or Zipkin'
        });
      }
      
      // Check for dashboards
      const dashboardFiles = [
        'monitoring/grafana-dashboard.json',
        'monitoring/dashboards/',
        'monitoring/grafana-config.yml'
      ];
      
      let hasDashboards = false;
      for (const dashFile of dashboardFiles) {
        try {
          const stats = await fs.stat(dashFile);
          if (stats.isFile() || stats.isDirectory()) {
            const content = stats.isFile() ? await fs.readFile(dashFile, 'utf8') : 'directory';
            if (content.includes('dashboard') || 
                content.includes('grafana') ||
                content.includes('panel') ||
                dashFile.includes('dashboard')) {
              hasDashboards = true;
              this.results.observability.dashboards = true;
              break;
            }
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasDashboards) {
        this.issues.push({
          category: 'observability',
          severity: 'medium',
          issue: 'No monitoring dashboards found',
          recommendation: 'Create Grafana dashboards for system monitoring'
        });
      }
      
      // Check for SLA monitoring
      const slaFiles = [
        'monitoring/sla-config.yml',
        'secure-gate-access/server/src/services/slaMonitoringService.js',
        'docs/sla-requirements.md'
      ];
      
      let hasSLAMonitoring = false;
      for (const slaFile of slaFiles) {
        try {
          const content = await fs.readFile(slaFile, 'utf8');
          if (content.includes('sla') || 
              content.includes('slo') ||
              content.includes('uptime') ||
              content.includes('availability')) {
            hasSLAMonitoring = true;
            this.results.observability.sla_monitoring = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasSLAMonitoring) {
        this.issues.push({
          category: 'observability',
          severity: 'medium',
          issue: 'No SLA monitoring found',
          recommendation: 'Implement SLA/SLO monitoring and tracking'
        });
      }
      
      // Check for profiling
      const profilingFiles = [
        'secure-gate-access/server/src/middleware/profilingMiddleware.js',
        'monitoring/profiling-config.yml'
      ];
      
      let hasProfiling = false;
      for (const profFile of profilingFiles) {
        try {
          const content = await fs.readFile(profFile, 'utf8');
          if (content.includes('profiling') || 
              content.includes('performance') ||
              content.includes('cpu') ||
              content.includes('memory')) {
            hasProfiling = true;
            this.results.observability.profiling = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasProfiling) {
        this.issues.push({
          category: 'observability',
          severity: 'low',
          issue: 'No application profiling found',
          recommendation: 'Consider implementing application performance profiling'
        });
      }
      
    } catch (error) {
      this.issues.push({
        category: 'observability',
        severity: 'medium',
        issue: 'Failed to validate observability stack',
        details: error.message
      });
    }
  }

  generateMonitoringReport() {
    const totalChecks = Object.values(this.results).reduce((total, category) => {
      return total + Object.keys(category).length;
    }, 0);
    
    const passedChecks = Object.values(this.results).reduce((total, category) => {
      return total + Object.values(category).filter(Boolean).length;
    }, 0);
    
    const monitoringScore = Math.round((passedChecks / totalChecks) * 100);
    
    const criticalIssues = this.issues.filter(issue => issue.severity === 'critical').length;
    const highIssues = this.issues.filter(issue => issue.severity === 'high').length;
    const mediumIssues = this.issues.filter(issue => issue.severity === 'medium').length;
    const lowIssues = this.issues.filter(issue => issue.severity === 'low').length;
    
    const isMonitoringReady = criticalIssues === 0 && highIssues <= 1 && monitoringScore >= 70;
    
    const report = {
      timestamp: new Date().toISOString(),
      monitoringScore,
      isMonitoringReady,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks: totalChecks - passedChecks
      },
      issues: {
        critical: criticalIssues,
        high: highIssues,
        medium: mediumIssues,
        low: lowIssues,
        total: this.issues.length
      },
      results: this.results,
      detailedIssues: this.issues,
      recommendations: this.generateRecommendations()
    };
    
    console.log('\n📊 Monitoring and Alerting Report:');
    console.log(`   Monitoring Score: ${monitoringScore}%`);
    console.log(`   Monitoring Ready: ${isMonitoringReady ? '✅ YES' : '❌ NO'}`);
    console.log(`   Critical Issues: ${criticalIssues}`);
    console.log(`   High Issues: ${highIssues}`);
    console.log(`   Medium Issues: ${mediumIssues}`);
    console.log(`   Low Issues: ${lowIssues}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.issues.filter(i => i.severity === 'critical').length > 0) {
      recommendations.push('🚨 CRITICAL: Resolve all critical monitoring issues immediately');
    }
    
    if (this.issues.filter(i => i.severity === 'high').length > 0) {
      recommendations.push('⚠️ HIGH: Address high-severity monitoring issues for production readiness');
    }
    
    if (!this.results.metrics.applicationMetrics) {
      recommendations.push('📈 Implement comprehensive application metrics collection');
    }
    
    if (!this.results.logging.structuredLogging) {
      recommendations.push('📝 Set up structured logging with correlation IDs');
    }
    
    if (!this.results.alerting.alertRules) {
      recommendations.push('🚨 Configure alert rules for critical system metrics');
    }
    
    if (!this.results.healthChecks.applicationHealth) {
      recommendations.push('❤️ Implement application health check endpoints');
    }
    
    if (!this.results.logging.securityLogging) {
      recommendations.push('🔒 Implement comprehensive security event logging');
    }
    
    if (!this.results.observability.dashboards) {
      recommendations.push('📊 Create monitoring dashboards for operational visibility');
    }
    
    return recommendations;
  }
}

module.exports = MonitoringAlertingValidator;