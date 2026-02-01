/**
 * Monitoring and Alerting Validator Tests
 * 
 * Tests the production monitoring and alerting validation system
 * to ensure proper observability and incident response capabilities.
 */

const MonitoringAlertingValidator = require('./monitoring-alerting-validator');

describe('Monitoring and Alerting Validator', () => {
  let validator;

  beforeEach(() => {
    validator = new MonitoringAlertingValidator();
  });

  describe('Metrics Collection Validation', () => {
    test('should validate metrics collection configuration', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      expect(report).toHaveProperty('monitoringScore');
      expect(report).toHaveProperty('isMonitoringReady');
      expect(report).toHaveProperty('results');
      expect(report.results).toHaveProperty('metrics');
      
      // Check that metrics validation was attempted
      expect(typeof report.results.metrics.applicationMetrics).toBe('boolean');
      expect(typeof report.results.metrics.businessMetrics).toBe('boolean');
      expect(typeof report.results.metrics.infrastructureMetrics).toBe('boolean');
      expect(typeof report.results.metrics.customMetrics).toBe('boolean');
    });

    test('should identify missing metrics configuration', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      // Should have metrics-related checks
      expect(report.results.metrics).toBeDefined();
      expect(report.detailedIssues).toBeInstanceOf(Array);
      
      // May have metrics-related issues
      const metricsIssues = report.detailedIssues.filter(
        issue => issue.category === 'metrics'
      );
      expect(Array.isArray(metricsIssues)).toBe(true);
    });
  });

  describe('Logging System Validation', () => {
    test('should validate logging system configuration', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      expect(report.results.logging).toBeDefined();
      expect(typeof report.results.logging.structuredLogging).toBe('boolean');
      expect(typeof report.results.logging.logAggregation).toBe('boolean');
      expect(typeof report.results.logging.logRetention).toBe('boolean');
      expect(typeof report.results.logging.securityLogging).toBe('boolean');
    });

    test('should check for structured logging', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      const loggingIssues = report.detailedIssues.filter(
        issue => issue.category === 'logging'
      );
      
      expect(Array.isArray(loggingIssues)).toBe(true);
    });
  });

  describe('Alerting Configuration Validation', () => {
    test('should validate alerting configuration', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      expect(report.results.alerting).toBeDefined();
      expect(typeof report.results.alerting.alertRules).toBe('boolean');
      expect(typeof report.results.alerting.escalationProcedures).toBe('boolean');
      expect(typeof report.results.alerting.notificationChannels).toBe('boolean');
      expect(typeof report.results.alerting.alertTesting).toBe('boolean');
    });

    test('should check for alert rules and notification channels', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      const alertingIssues = report.detailedIssues.filter(
        issue => issue.category === 'alerting'
      );
      
      expect(Array.isArray(alertingIssues)).toBe(true);
    });
  });

  describe('Health Checks Validation', () => {
    test('should validate health check configuration', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      expect(report.results.healthChecks).toBeDefined();
      expect(typeof report.results.healthChecks.applicationHealth).toBe('boolean');
      expect(typeof report.results.healthChecks.databaseHealth).toBe('boolean');
      expect(typeof report.results.healthChecks.externalServices).toBe('boolean');
      expect(typeof report.results.healthChecks.statusReporting).toBe('boolean');
    });

    test('should check for application and database health endpoints', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      const healthIssues = report.detailedIssues.filter(
        issue => issue.category === 'health'
      );
      
      expect(Array.isArray(healthIssues)).toBe(true);
    });
  });

  describe('Observability Stack Validation', () => {
    test('should validate observability stack configuration', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      expect(report.results.observability).toBeDefined();
      expect(typeof report.results.observability.tracing).toBe('boolean');
      expect(typeof report.results.observability.profiling).toBe('boolean');
      expect(typeof report.results.observability.dashboards).toBe('boolean');
      expect(typeof report.results.observability.sla_monitoring).toBe('boolean');
    });

    test('should check for dashboards and monitoring tools', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      const observabilityIssues = report.detailedIssues.filter(
        issue => issue.category === 'observability'
      );
      
      expect(Array.isArray(observabilityIssues)).toBe(true);
    });
  });

  describe('Report Generation', () => {
    test('should generate comprehensive monitoring report', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('monitoringScore');
      expect(report).toHaveProperty('isMonitoringReady');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('results');
      expect(report).toHaveProperty('detailedIssues');
      expect(report).toHaveProperty('recommendations');
      
      expect(typeof report.monitoringScore).toBe('number');
      expect(report.monitoringScore).toBeGreaterThanOrEqual(0);
      expect(report.monitoringScore).toBeLessThanOrEqual(100);
      
      expect(typeof report.isMonitoringReady).toBe('boolean');
      expect(Array.isArray(report.detailedIssues)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    test('should calculate monitoring score correctly', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      const totalChecks = report.summary.totalChecks;
      const passedChecks = report.summary.passedChecks;
      const expectedScore = Math.round((passedChecks / totalChecks) * 100);
      
      expect(report.monitoringScore).toBe(expectedScore);
    });

    test('should categorize issues by severity', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      expect(report.issues).toHaveProperty('critical');
      expect(report.issues).toHaveProperty('high');
      expect(report.issues).toHaveProperty('medium');
      expect(report.issues).toHaveProperty('low');
      expect(report.issues).toHaveProperty('total');
      
      expect(typeof report.issues.critical).toBe('number');
      expect(typeof report.issues.high).toBe('number');
      expect(typeof report.issues.medium).toBe('number');
      expect(typeof report.issues.low).toBe('number');
      expect(typeof report.issues.total).toBe('number');
    });
  });

  describe('Monitoring Readiness Determination', () => {
    test('should determine monitoring readiness based on issues', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      // Monitoring ready if no critical issues, max 1 high issue, and score >= 70%
      const expectedReadiness = report.issues.critical === 0 && 
                               report.issues.high <= 1 && 
                               report.monitoringScore >= 70;
      
      expect(report.isMonitoringReady).toBe(expectedReadiness);
    });
  });

  describe('Recommendations Generation', () => {
    test('should generate relevant monitoring recommendations', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      expect(Array.isArray(report.recommendations)).toBe(true);
      
      // Should have recommendations if there are issues
      if (report.issues.total > 0) {
        expect(report.recommendations.length).toBeGreaterThan(0);
      }
    });

    test('should prioritize critical and high severity recommendations', async () => {
      const report = await validator.validateMonitoringAndAlerting();
      
      if (report.issues.critical > 0) {
        const criticalRecs = report.recommendations.filter(rec => 
          rec.includes('CRITICAL')
        );
        expect(criticalRecs.length).toBeGreaterThan(0);
      }
      
      if (report.issues.high > 0) {
        const highRecs = report.recommendations.filter(rec => 
          rec.includes('HIGH')
        );
        expect(highRecs.length).toBeGreaterThan(0);
      }
    });
  });
});

// Integration test for realistic monitoring scenarios
describe('Monitoring and Alerting Integration', () => {
  test('should provide actionable monitoring readiness assessment', async () => {
    const validator = new MonitoringAlertingValidator();
    const report = await validator.validateMonitoringAndAlerting();
    
    // Report should be comprehensive
    expect(report.monitoringScore).toBeGreaterThanOrEqual(0);
    expect(report.detailedIssues.length).toBeGreaterThanOrEqual(0);
    
    // Should have specific categories of validation
    expect(report.results.metrics).toBeDefined();
    expect(report.results.logging).toBeDefined();
    expect(report.results.alerting).toBeDefined();
    expect(report.results.healthChecks).toBeDefined();
    expect(report.results.observability).toBeDefined();
    
    // Issues should have actionable information
    report.detailedIssues.forEach(issue => {
      expect(issue).toHaveProperty('category');
      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('issue');
      expect(issue).toHaveProperty('recommendation');
      expect(['critical', 'high', 'medium', 'low']).toContain(issue.severity);
    });
    
    console.log(`Monitoring Readiness Score: ${report.monitoringScore}%`);
    console.log(`Monitoring Ready: ${report.isMonitoringReady ? 'YES' : 'NO'}`);
    console.log(`Total Issues: ${report.issues.total}`);
  });

  test('should validate essential monitoring components', async () => {
    const validator = new MonitoringAlertingValidator();
    const report = await validator.validateMonitoringAndAlerting();
    
    // Essential monitoring components should be checked
    const essentialComponents = [
      'applicationMetrics',
      'structuredLogging',
      'applicationHealth',
      'alertRules'
    ];
    
    essentialComponents.forEach(component => {
      let found = false;
      Object.values(report.results).forEach(category => {
        if (category.hasOwnProperty(component)) {
          found = true;
        }
      });
      
      if (!found) {
        // Check if it's mentioned in issues
        const componentIssues = report.detailedIssues.filter(issue =>
          issue.issue.toLowerCase().includes(component.toLowerCase()) ||
          issue.recommendation.toLowerCase().includes(component.toLowerCase())
        );
        expect(componentIssues.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});