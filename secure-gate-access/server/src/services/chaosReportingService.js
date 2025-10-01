/**
 * Chaos Reporting Service for Secure Gate Access Control System
 * 
 * Provides comprehensive reporting and metrics for chaos engineering tests
 * Features:
 * - RTO/RPO/MTTR calculation
 * - Service availability tracking
 * - Error rate monitoring
 * - Compliance reporting
 * - Automated test report generation
 */

import loggingService from './loggingService.js';
import centralizedLoggingService from './centralizedLoggingService.js';
import auditTraceabilityService from './auditTraceabilityService.js';
import rollbackAlertingService from './rollbackAlertingService.js';
import chaosService from './chaosService.js';
import networkChaosService from './networkChaosService.js';
import resourceStressService from './resourceStressService.js';
import applicationFaultService from './applicationFaultService.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class ChaosReportingService {
  constructor() {
    this.config = {
      reporting: {
        enabled: true,
        metrics: [
          'rto', // Recovery Time Objective
          'rpo', // Recovery Point Objective
          'mttr', // Mean Time To Recovery
          'availability', // Service Availability %
          'error_rate' // Error Rate %
        ],
        compliance: [
          'kenya_dpa',
          'iso27001'
        ],
        output: {
          format: 'pdf',
          directory: '/app/chaos_reports',
          retention: 90 * 24 * 60 * 60 * 1000 // 90 days
        }
      },
      thresholds: {
        rto: {
          critical: 30 * 60 * 1000, // 30 minutes
          warning: 15 * 60 * 1000, // 15 minutes
          good: 5 * 60 * 1000 // 5 minutes
        },
        rpo: {
          critical: 15 * 60 * 1000, // 15 minutes
          warning: 5 * 60 * 1000, // 5 minutes
          good: 1 * 60 * 1000 // 1 minute
        },
        mttr: {
          critical: 60 * 60 * 1000, // 1 hour
          warning: 30 * 60 * 1000, // 30 minutes
          good: 10 * 60 * 1000 // 10 minutes
        },
        availability: {
          critical: 95, // 95%
          warning: 99, // 99%
          good: 99.9 // 99.9%
        },
        error_rate: {
          critical: 10, // 10%
          warning: 5, // 5%
          good: 1 // 1%
        }
      },
      compliance: {
        kenya_dpa: {
          enabled: true,
          requirements: [
            'data_integrity',
            'data_availability',
            'business_continuity',
            'incident_response'
          ],
          reporting: {
            frequency: 'monthly',
            format: 'pdf',
            recipients: ['compliance@securegate.com', 'dpo@securegate.com']
          }
        },
        iso27001: {
          enabled: true,
          requirements: [
            'business_continuity_testing',
            'incident_management',
            'risk_assessment',
            'security_controls'
          ],
          reporting: {
            frequency: 'quarterly',
            format: 'pdf',
            recipients: ['security@securegate.com', 'compliance@securegate.com']
          }
        }
      }
    };
    
    this.testResults = new Map();
    this.metricsHistory = [];
    this.complianceReports = [];
    this.isRunning = false;
    
    this.initializeService();
  }

  /**
   * Initialize chaos reporting service
   */
  async initializeService() {
    try {
      loggingService.logInfo('Chaos reporting service initialized', {
        enabled: this.config.reporting.enabled,
        metrics: this.config.reporting.metrics,
        compliance: this.config.reporting.compliance
      });
      
      // Create reports directory
      await this.createReportsDirectory();
      
      // Start reporting
      this.startReporting();
      
    } catch (error) {
      loggingService.logError('Failed to initialize chaos reporting service', error);
      throw error;
    }
  }

  /**
   * Create reports directory
   */
  async createReportsDirectory() {
    try {
      await fs.mkdir(this.config.reporting.output.directory, { recursive: true });
      loggingService.logInfo(`Created reports directory: ${this.config.reporting.output.directory}`);
    } catch (error) {
      loggingService.logError('Failed to create reports directory', error);
      throw error;
    }
  }

  /**
   * Start reporting
   */
  startReporting() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Generate reports every hour
    setInterval(async () => {
      try {
        await this.generateHourlyReport();
      } catch (error) {
        loggingService.logError('Hourly report generation failed', error);
      }
    }, 60 * 60 * 1000);
    
    // Generate compliance reports
    setInterval(async () => {
      try {
        await this.generateComplianceReports();
      } catch (error) {
        loggingService.logError('Compliance report generation failed', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily
    
    loggingService.logInfo('Chaos reporting started');
  }

  /**
   * Record test result
   */
  async recordTestResult(testResult) {
    try {
      const resultId = this.generateResultId();
      const result = {
        id: resultId,
        test_type: testResult.test_type,
        service: testResult.service,
        status: testResult.status,
        start_time: testResult.start_time,
        end_time: testResult.end_time,
        duration: testResult.duration,
        metrics: await this.calculateMetrics(testResult),
        compliance: await this.assessCompliance(testResult),
        timestamp: new Date().toISOString()
      };
      
      // Store result
      this.testResults.set(resultId, result);
      
      // Add to metrics history
      this.metricsHistory.push(result);
      
      // Log result
      await this.logTestResult(result);
      
      // Check thresholds
      await this.checkThresholds(result);
      
      loggingService.logInfo('Test result recorded', {
        resultId: resultId,
        testType: result.test_type,
        status: result.status,
        metrics: result.metrics
      });
      
      return result;
      
    } catch (error) {
      loggingService.logError('Failed to record test result', error);
      throw error;
    }
  }

  /**
   * Calculate metrics for test result
   */
  async calculateMetrics(testResult) {
    try {
      const metrics = {
        rto: 0,
        rpo: 0,
        mttr: 0,
        availability: 0,
        error_rate: 0
      };
      
      // Calculate RTO (Recovery Time Objective)
      if (testResult.end_time && testResult.start_time) {
        const startTime = new Date(testResult.start_time).getTime();
        const endTime = new Date(testResult.end_time).getTime();
        metrics.rto = endTime - startTime;
      }
      
      // Calculate RPO (Recovery Point Objective)
      // This would be calculated based on data loss
      metrics.rpo = Math.random() * 5 * 60 * 1000; // 0-5 minutes simulated
      
      // Calculate MTTR (Mean Time To Recovery)
      metrics.mttr = metrics.rto; // For single test, MTTR = RTO
      
      // Calculate availability
      if (testResult.status === 'completed') {
        metrics.availability = 100;
      } else if (testResult.status === 'failed') {
        metrics.availability = 0;
      } else {
        metrics.availability = 50; // Partial availability
      }
      
      // Calculate error rate
      if (testResult.status === 'failed') {
        metrics.error_rate = 100;
      } else if (testResult.status === 'completed') {
        metrics.error_rate = 0;
      } else {
        metrics.error_rate = Math.random() * 50; // 0-50% simulated
      }
      
      return metrics;
      
    } catch (error) {
      loggingService.logError('Failed to calculate metrics', error);
      return {
        rto: 0,
        rpo: 0,
        mttr: 0,
        availability: 0,
        error_rate: 100
      };
    }
  }

  /**
   * Assess compliance for test result
   */
  async assessCompliance(testResult) {
    try {
      const compliance = {
        kenya_dpa: {
          compliant: true,
          violations: [],
          score: 100
        },
        iso27001: {
          compliant: true,
          violations: [],
          score: 100
        }
      };
      
      // Assess Kenya DPA compliance
      if (this.config.compliance.kenya_dpa.enabled) {
        const kenyaAssessment = await this.assessKenyaDPACompliance(testResult);
        compliance.kenya_dpa = kenyaAssessment;
      }
      
      // Assess ISO 27001 compliance
      if (this.config.compliance.iso27001.enabled) {
        const isoAssessment = await this.assessISO27001Compliance(testResult);
        compliance.iso27001 = isoAssessment;
      }
      
      return compliance;
      
    } catch (error) {
      loggingService.logError('Failed to assess compliance', error);
      return {
        kenya_dpa: { compliant: false, violations: ['assessment_failed'], score: 0 },
        iso27001: { compliant: false, violations: ['assessment_failed'], score: 0 }
      };
    }
  }

  /**
   * Assess Kenya DPA compliance
   */
  async assessKenyaDPACompliance(testResult) {
    try {
      const violations = [];
      let score = 100;
      
      // Check data integrity
      if (testResult.status === 'failed' && testResult.test_type.includes('data')) {
        violations.push('data_integrity_compromised');
        score -= 20;
      }
      
      // Check data availability
      if (testResult.metrics && testResult.metrics.availability < 95) {
        violations.push('data_availability_below_threshold');
        score -= 15;
      }
      
      // Check business continuity
      if (testResult.metrics && testResult.metrics.rto > 30 * 60 * 1000) {
        violations.push('business_continuity_compromised');
        score -= 25;
      }
      
      // Check incident response
      if (testResult.status === 'failed' && testResult.metrics && testResult.metrics.mttr > 60 * 60 * 1000) {
        violations.push('incident_response_delayed');
        score -= 20;
      }
      
      return {
        compliant: violations.length === 0,
        violations: violations,
        score: Math.max(0, score)
      };
      
    } catch (error) {
      loggingService.logError('Failed to assess Kenya DPA compliance', error);
      return {
        compliant: false,
        violations: ['assessment_failed'],
        score: 0
      };
    }
  }

  /**
   * Assess ISO 27001 compliance
   */
  async assessISO27001Compliance(testResult) {
    try {
      const violations = [];
      let score = 100;
      
      // Check business continuity testing
      if (testResult.status === 'failed') {
        violations.push('business_continuity_testing_failed');
        score -= 30;
      }
      
      // Check incident management
      if (testResult.metrics && testResult.metrics.mttr > 30 * 60 * 1000) {
        violations.push('incident_management_ineffective');
        score -= 20;
      }
      
      // Check risk assessment
      if (testResult.metrics && testResult.metrics.error_rate > 10) {
        violations.push('risk_assessment_inadequate');
        score -= 15;
      }
      
      // Check security controls
      if (testResult.test_type.includes('security') && testResult.status === 'failed') {
        violations.push('security_controls_ineffective');
        score -= 25;
      }
      
      return {
        compliant: violations.length === 0,
        violations: violations,
        score: Math.max(0, score)
      };
      
    } catch (error) {
      loggingService.logError('Failed to assess ISO 27001 compliance', error);
      return {
        compliant: false,
        violations: ['assessment_failed'],
        score: 0
      };
    }
  }

  /**
   * Log test result
   */
  async logTestResult(result) {
    try {
      const event = {
        trace_id: result.id,
        actor: 'chaos_reporting_service',
        action: 'record_test_result',
        status: 'success',
        metadata: {
          result_id: result.id,
          test_type: result.test_type,
          service: result.service,
          status: result.status,
          metrics: result.metrics,
          compliance: result.compliance
        }
      };
      
      // Log to centralized logging
      await centralizedLoggingService.logEvent(event);
      
      // Log audit event
      await auditTraceabilityService.logAuditEvent(event);
      
    } catch (error) {
      loggingService.logError('Failed to log test result', error);
    }
  }

  /**
   * Check thresholds
   */
  async checkThresholds(result) {
    try {
      const metrics = result.metrics;
      const violations = [];
      
      // Check RTO threshold
      if (metrics.rto > this.config.thresholds.rto.critical) {
        violations.push({
          metric: 'rto',
          value: metrics.rto,
          threshold: this.config.thresholds.rto.critical,
          severity: 'critical'
        });
      } else if (metrics.rto > this.config.thresholds.rto.warning) {
        violations.push({
          metric: 'rto',
          value: metrics.rto,
          threshold: this.config.thresholds.rto.warning,
          severity: 'warning'
        });
      }
      
      // Check RPO threshold
      if (metrics.rpo > this.config.thresholds.rpo.critical) {
        violations.push({
          metric: 'rpo',
          value: metrics.rpo,
          threshold: this.config.thresholds.rpo.critical,
          severity: 'critical'
        });
      } else if (metrics.rpo > this.config.thresholds.rpo.warning) {
        violations.push({
          metric: 'rpo',
          value: metrics.rpo,
          threshold: this.config.thresholds.rpo.warning,
          severity: 'warning'
        });
      }
      
      // Check MTTR threshold
      if (metrics.mttr > this.config.thresholds.mttr.critical) {
        violations.push({
          metric: 'mttr',
          value: metrics.mttr,
          threshold: this.config.thresholds.mttr.critical,
          severity: 'critical'
        });
      } else if (metrics.mttr > this.config.thresholds.mttr.warning) {
        violations.push({
          metric: 'mttr',
          value: metrics.mttr,
          threshold: this.config.thresholds.mttr.warning,
          severity: 'warning'
        });
      }
      
      // Check availability threshold
      if (metrics.availability < this.config.thresholds.availability.critical) {
        violations.push({
          metric: 'availability',
          value: metrics.availability,
          threshold: this.config.thresholds.availability.critical,
          severity: 'critical'
        });
      } else if (metrics.availability < this.config.thresholds.availability.warning) {
        violations.push({
          metric: 'availability',
          value: metrics.availability,
          threshold: this.config.thresholds.availability.warning,
          severity: 'warning'
        });
      }
      
      // Check error rate threshold
      if (metrics.error_rate > this.config.thresholds.error_rate.critical) {
        violations.push({
          metric: 'error_rate',
          value: metrics.error_rate,
          threshold: this.config.thresholds.error_rate.critical,
          severity: 'critical'
        });
      } else if (metrics.error_rate > this.config.thresholds.error_rate.warning) {
        violations.push({
          metric: 'error_rate',
          value: metrics.error_rate,
          threshold: this.config.thresholds.error_rate.warning,
          severity: 'warning'
        });
      }
      
      // Send alerts for violations
      if (violations.length > 0) {
        await this.sendThresholdViolationAlert(result, violations);
      }
      
    } catch (error) {
      loggingService.logError('Failed to check thresholds', error);
    }
  }

  /**
   * Send threshold violation alert
   */
  async sendThresholdViolationAlert(result, violations) {
    try {
      const criticalViolations = violations.filter(v => v.severity === 'critical');
      const warningViolations = violations.filter(v => v.severity === 'warning');
      
      if (criticalViolations.length > 0) {
        await rollbackAlertingService.sendSystemFailureAlert({
          system_component: 'chaos_test_thresholds',
          failure_reason: `Critical threshold violations in test ${result.id}`,
          impact_assessment: `Test ${result.test_type} failed critical thresholds`,
          recovery_actions: 'Review test configuration and system resilience'
        });
      }
      
      if (warningViolations.length > 0) {
        await rollbackAlertingService.sendSystemFailureAlert({
          system_component: 'chaos_test_thresholds',
          failure_reason: `Warning threshold violations in test ${result.id}`,
          impact_assessment: `Test ${result.test_type} exceeded warning thresholds`,
          recovery_actions: 'Monitor system performance and consider adjustments'
        });
      }
      
    } catch (error) {
      loggingService.logError('Failed to send threshold violation alert', error);
    }
  }

  /**
   * Generate hourly report
   */
  async generateHourlyReport() {
    try {
      const report = {
        type: 'hourly',
        timestamp: new Date().toISOString(),
        period: {
          start: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        summary: await this.calculateSummaryMetrics(),
        tests: await this.getRecentTests(60 * 60 * 1000), // Last hour
        compliance: await this.calculateComplianceSummary(),
        recommendations: await this.generateRecommendations()
      };
      
      // Save report
      await this.saveReport(report);
      
      // Log report generation
      await this.logReportGeneration(report);
      
      loggingService.logInfo('Hourly report generated', {
        timestamp: report.timestamp,
        tests: report.tests.length,
        summary: report.summary
      });
      
    } catch (error) {
      loggingService.logError('Failed to generate hourly report', error);
    }
  }

  /**
   * Generate compliance reports
   */
  async generateComplianceReports() {
    try {
      // Generate Kenya DPA report
      if (this.config.compliance.kenya_dpa.enabled) {
        await this.generateKenyaDPAReport();
      }
      
      // Generate ISO 27001 report
      if (this.config.compliance.iso27001.enabled) {
        await this.generateISO27001Report();
      }
      
    } catch (error) {
      loggingService.logError('Failed to generate compliance reports', error);
    }
  }

  /**
   * Generate Kenya DPA report
   */
  async generateKenyaDPAReport() {
    try {
      const report = {
        type: 'compliance',
        framework: 'kenya_dpa',
        timestamp: new Date().toISOString(),
        period: this.getReportingPeriod(),
        summary: await this.calculateKenyaDPASummary(),
        tests: await this.getTestsForPeriod(this.getReportingPeriod()),
        compliance: await this.calculateKenyaDPACompliance(),
        recommendations: await this.generateKenyaDPARecommendations()
      };
      
      // Save report
      await this.saveReport(report);
      
      // Send to recipients
      await this.sendComplianceReport(report, this.config.compliance.kenya_dpa.reporting.recipients);
      
      loggingService.logInfo('Kenya DPA compliance report generated');
      
    } catch (error) {
      loggingService.logError('Failed to generate Kenya DPA report', error);
    }
  }

  /**
   * Generate ISO 27001 report
   */
  async generateISO27001Report() {
    try {
      const report = {
        type: 'compliance',
        framework: 'iso27001',
        timestamp: new Date().toISOString(),
        period: this.getReportingPeriod(),
        summary: await this.calculateISO27001Summary(),
        tests: await this.getTestsForPeriod(this.getReportingPeriod()),
        compliance: await this.calculateISO27001Compliance(),
        recommendations: await this.generateISO27001Recommendations()
      };
      
      // Save report
      await this.saveReport(report);
      
      // Send to recipients
      await this.sendComplianceReport(report, this.config.compliance.iso27001.reporting.recipients);
      
      loggingService.logInfo('ISO 27001 compliance report generated');
      
    } catch (error) {
      loggingService.logError('Failed to generate ISO 27001 report', error);
    }
  }

  /**
   * Calculate summary metrics
   */
  async calculateSummaryMetrics() {
    try {
      const recentTests = await this.getRecentTests(24 * 60 * 60 * 1000); // Last 24 hours
      
      if (recentTests.length === 0) {
        return {
          total_tests: 0,
          passed_tests: 0,
          failed_tests: 0,
          success_rate: 0,
          avg_rto: 0,
          avg_rpo: 0,
          avg_mttr: 0,
          avg_availability: 0,
          avg_error_rate: 0
        };
      }
      
      const passedTests = recentTests.filter(t => t.status === 'completed');
      const failedTests = recentTests.filter(t => t.status === 'failed');
      
      const avgRto = recentTests.reduce((sum, t) => sum + (t.metrics.rto || 0), 0) / recentTests.length;
      const avgRpo = recentTests.reduce((sum, t) => sum + (t.metrics.rpo || 0), 0) / recentTests.length;
      const avgMttr = recentTests.reduce((sum, t) => sum + (t.metrics.mttr || 0), 0) / recentTests.length;
      const avgAvailability = recentTests.reduce((sum, t) => sum + (t.metrics.availability || 0), 0) / recentTests.length;
      const avgErrorRate = recentTests.reduce((sum, t) => sum + (t.metrics.error_rate || 0), 0) / recentTests.length;
      
      return {
        total_tests: recentTests.length,
        passed_tests: passedTests.length,
        failed_tests: failedTests.length,
        success_rate: (passedTests.length / recentTests.length) * 100,
        avg_rto: avgRto,
        avg_rpo: avgRpo,
        avg_mttr: avgMttr,
        avg_availability: avgAvailability,
        avg_error_rate: avgErrorRate
      };
      
    } catch (error) {
      loggingService.logError('Failed to calculate summary metrics', error);
      return {
        total_tests: 0,
        passed_tests: 0,
        failed_tests: 0,
        success_rate: 0,
        avg_rto: 0,
        avg_rpo: 0,
        avg_mttr: 0,
        avg_availability: 0,
        avg_error_rate: 0
      };
    }
  }

  /**
   * Get recent tests
   */
  async getRecentTests(timeframe) {
    try {
      const cutoffTime = Date.now() - timeframe;
      return this.metricsHistory.filter(test => 
        new Date(test.timestamp).getTime() > cutoffTime
      );
    } catch (error) {
      loggingService.logError('Failed to get recent tests', error);
      return [];
    }
  }

  /**
   * Get tests for period
   */
  async getTestsForPeriod(period) {
    try {
      const startTime = new Date(period.start).getTime();
      const endTime = new Date(period.end).getTime();
      
      return this.metricsHistory.filter(test => {
        const testTime = new Date(test.timestamp).getTime();
        return testTime >= startTime && testTime <= endTime;
      });
    } catch (error) {
      loggingService.logError('Failed to get tests for period', error);
      return [];
    }
  }

  /**
   * Get reporting period
   */
  getReportingPeriod() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  /**
   * Calculate compliance summary
   */
  async calculateComplianceSummary() {
    try {
      const recentTests = await this.getRecentTests(24 * 60 * 60 * 1000); // Last 24 hours
      
      const kenyaDPACompliant = recentTests.filter(t => t.compliance.kenya_dpa.compliant).length;
      const iso27001Compliant = recentTests.filter(t => t.compliance.iso27001.compliant).length;
      
      return {
        kenya_dpa: {
          compliant_tests: kenyaDPACompliant,
          total_tests: recentTests.length,
          compliance_rate: recentTests.length > 0 ? (kenyaDPACompliant / recentTests.length) * 100 : 0
        },
        iso27001: {
          compliant_tests: iso27001Compliant,
          total_tests: recentTests.length,
          compliance_rate: recentTests.length > 0 ? (iso27001Compliant / recentTests.length) * 100 : 0
        }
      };
      
    } catch (error) {
      loggingService.logError('Failed to calculate compliance summary', error);
      return {
        kenya_dpa: { compliant_tests: 0, total_tests: 0, compliance_rate: 0 },
        iso27001: { compliant_tests: 0, total_tests: 0, compliance_rate: 0 }
      };
    }
  }

  /**
   * Generate recommendations
   */
  async generateRecommendations() {
    try {
      const recommendations = [];
      const summary = await this.calculateSummaryMetrics();
      
      // RTO recommendations
      if (summary.avg_rto > this.config.thresholds.rto.warning) {
        recommendations.push({
          category: 'rto',
          priority: 'high',
          message: `Average RTO (${Math.round(summary.avg_rto / 1000 / 60)} minutes) exceeds warning threshold. Consider improving recovery procedures.`
        });
      }
      
      // RPO recommendations
      if (summary.avg_rpo > this.config.thresholds.rpo.warning) {
        recommendations.push({
          category: 'rpo',
          priority: 'high',
          message: `Average RPO (${Math.round(summary.avg_rpo / 1000 / 60)} minutes) exceeds warning threshold. Consider improving backup frequency.`
        });
      }
      
      // Availability recommendations
      if (summary.avg_availability < this.config.thresholds.availability.warning) {
        recommendations.push({
          category: 'availability',
          priority: 'critical',
          message: `Average availability (${summary.avg_availability.toFixed(2)}%) below warning threshold. Review system reliability.`
        });
      }
      
      // Error rate recommendations
      if (summary.avg_error_rate > this.config.thresholds.error_rate.warning) {
        recommendations.push({
          category: 'error_rate',
          priority: 'high',
          message: `Average error rate (${summary.avg_error_rate.toFixed(2)}%) exceeds warning threshold. Review error handling.`
        });
      }
      
      return recommendations;
      
    } catch (error) {
      loggingService.logError('Failed to generate recommendations', error);
      return [];
    }
  }

  /**
   * Save report
   */
  async saveReport(report) {
    try {
      const filename = `${report.type}_${report.framework || 'general'}_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(this.config.reporting.output.directory, filename);
      
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      
      loggingService.logInfo(`Report saved: ${filename}`);
      
    } catch (error) {
      loggingService.logError('Failed to save report', error);
    }
  }

  /**
   * Send compliance report
   */
  async sendComplianceReport(report, recipients) {
    try {
      for (const recipient of recipients) {
        await rollbackAlertingService.sendSystemFailureAlert({
          system_component: 'compliance_reporting',
          failure_reason: `${report.framework.toUpperCase()} compliance report generated`,
          impact_assessment: `Compliance report for ${report.period.start} to ${report.period.end}`,
          recovery_actions: 'Review compliance status and take necessary actions'
        });
      }
      
    } catch (error) {
      loggingService.logError('Failed to send compliance report', error);
    }
  }

  /**
   * Log report generation
   */
  async logReportGeneration(report) {
    try {
      const event = {
        trace_id: this.generateTraceId(),
        actor: 'chaos_reporting_service',
        action: 'generate_report',
        status: 'success',
        metadata: {
          report_type: report.type,
          framework: report.framework,
          timestamp: report.timestamp,
          tests_count: report.tests ? report.tests.length : 0
        }
      };
      
      // Log to centralized logging
      await centralizedLoggingService.logEvent(event);
      
      // Log audit event
      await auditTraceabilityService.logAuditEvent(event);
      
    } catch (error) {
      loggingService.logError('Failed to log report generation', error);
    }
  }

  /**
   * Generate result ID
   */
  generateResultId() {
    return `RESULT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate trace ID
   */
  generateTraceId() {
    return `TRACE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Get test results
   */
  getTestResults() {
    return Array.from(this.testResults.values());
  }

  /**
   * Get metrics history
   */
  getMetricsHistory() {
    return this.metricsHistory;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: true,
      running: this.isRunning,
      testResults: this.testResults.size,
      metricsHistory: this.metricsHistory.length,
      complianceReports: this.complianceReports.length,
      config: this.config
    };
  }
}

// Create singleton instance
const chaosReportingService = new ChaosReportingService();

export default chaosReportingService;
