/**
 * Audit Traceability Service for Secure Gate Access Control System
 * 
 * Provides comprehensive audit traceability and compliance reporting
 * Features:
 * - Trace ID usage and correlation
 * - Rollback events logging
 * - Compliance dashboard
 * - Audit trail maintenance
 * - Regulatory compliance reporting
 */

import loggingService from './loggingService.js';
import centralizedLoggingService from './centralizedLoggingService.js';
import notificationService from './notificationService.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class AuditTraceabilityService {
  constructor() {
    this.config = {
      traceability: {
        enabled: true,
        traceIdUsage: true,
        rollbackEventsLogged: true,
        complianceDashboard: true,
        auditTrailMaintenance: true
      },
      compliance: {
        kenya_dpa: {
          enabled: true,
          requirements: [
            'audit_trail_maintenance',
            'data_processing_logs',
            'consent_management_logs',
            'data_subject_rights_logs',
            'security_breach_logs',
            'data_retention_logs'
          ],
          reporting: {
            frequency: 'monthly',
            format: 'pdf',
            recipients: ['compliance@securegate.com', 'dpo@securegate.com']
          }
        },
        gdpr: {
          enabled: true,
          requirements: [
            'audit_trail_maintenance',
            'data_processing_logs',
            'consent_management_logs',
            'data_subject_rights_logs',
            'security_breach_logs',
            'data_retention_logs'
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
            'security_event_logging',
            'access_control_logs',
            'incident_management_logs',
            'audit_trail_maintenance',
            'risk_assessment_logs',
            'security_policy_logs'
          ],
          reporting: {
            frequency: 'quarterly',
            format: 'pdf',
            recipients: ['security@securegate.com', 'compliance@securegate.com']
          }
        }
      },
      audit: {
        retention: {
          default: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years in milliseconds
          security_events: 7 * 365 * 24 * 60 * 60 * 1000,
          compliance_logs: 7 * 365 * 24 * 60 * 60 * 1000,
          audit_trails: 7 * 365 * 24 * 60 * 60 * 1000
        },
        encryption: {
          enabled: true,
          algorithm: 'aes-256-gcm',
          keyRotation: 'monthly'
        },
        integrity: {
          enabled: true,
          algorithm: 'sha256',
          verification: 'daily'
        }
      },
      dashboard: {
        enabled: true,
        realTimeUpdates: true,
        metrics: [
          'audit_events_count',
          'compliance_violations',
          'rollback_events',
          'trace_correlation_success',
          'data_retention_compliance'
        ]
      }
    };
    
    this.auditTrail = new Map();
    this.complianceViolations = [];
    this.rollbackEvents = [];
    this.traceCorrelations = new Map();
    this.isRunning = false;
    
    this.initializeService();
  }

  /**
   * Initialize audit traceability service
   */
  async initializeService() {
    try {
      loggingService.logInfo('Audit traceability service initialized', {
        traceabilityEnabled: this.config.traceability.enabled,
        complianceFrameworks: Object.keys(this.config.compliance).filter(k => this.config.compliance[k].enabled),
        auditRetention: this.config.audit.retention.default
      });
      
      // Start audit trail maintenance
      this.startAuditTrailMaintenance();
      
    } catch (error) {
      loggingService.logError('Failed to initialize audit traceability service', error);
      throw error;
    }
  }

  /**
   * Start audit trail maintenance
   */
  startAuditTrailMaintenance() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Start maintenance intervals
    setInterval(async () => {
      try {
        await this.maintainAuditTrail();
      } catch (error) {
        loggingService.logError('Audit trail maintenance failed', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily
    
    setInterval(async () => {
      try {
        await this.verifyAuditIntegrity();
      } catch (error) {
        loggingService.logError('Audit integrity verification failed', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily
    
    setInterval(async () => {
      try {
        await this.generateComplianceReports();
      } catch (error) {
        loggingService.logError('Compliance report generation failed', error);
      }
    }, 7 * 24 * 60 * 60 * 1000); // Weekly
    
    loggingService.logInfo('Audit trail maintenance started');
  }

  /**
   * Log audit event
   */
  async logAuditEvent(event) {
    try {
      const auditEvent = await this.createAuditEvent(event);
      
      // Store in audit trail
      this.auditTrail.set(auditEvent.id, auditEvent);
      
      // Log to centralized logging
      await centralizedLoggingService.logEvent({
        ...auditEvent,
        type: 'audit_event',
        compliance: this.mapComplianceRequirements(auditEvent)
      });
      
      // Check for compliance violations
      await this.checkComplianceViolations(auditEvent);
      
      // Update trace correlations
      await this.updateTraceCorrelations(auditEvent);
      
      loggingService.logInfo('Audit event logged', {
        eventId: auditEvent.id,
        action: auditEvent.action,
        actor: auditEvent.actor,
        compliance: auditEvent.compliance
      });
      
      return auditEvent;
      
    } catch (error) {
      loggingService.logError('Failed to log audit event', error);
      throw error;
    }
  }

  /**
   * Create audit event
   */
  async createAuditEvent(event) {
    try {
      const auditEvent = {
        id: this.generateAuditEventId(),
        timestamp: new Date().toISOString(),
        trace_id: event.trace_id || this.generateTraceId(),
        actor: event.actor || 'system',
        action: event.action || 'unknown',
        status: event.status || 'info',
        rollback_status: event.rollback_status || 'none',
        level: event.level || 'info',
        message: event.message || '',
        metadata: event.metadata || {},
        compliance: this.mapComplianceRequirements(event),
        retention: this.determineRetentionPolicy(event),
        correlation_id: event.correlation_id || this.generateCorrelationId(),
        span_id: event.span_id || this.generateSpanId(),
        integrity_hash: null,
        encrypted: false
      };
      
      // Calculate integrity hash
      auditEvent.integrity_hash = await this.calculateIntegrityHash(auditEvent);
      
      // Encrypt if required
      if (this.config.audit.encryption.enabled) {
        await this.encryptAuditEvent(auditEvent);
      }
      
      return auditEvent;
      
    } catch (error) {
      loggingService.logError('Failed to create audit event', error);
      throw error;
    }
  }

  /**
   * Map compliance requirements
   */
  mapComplianceRequirements(event) {
    const compliance = [];
    
    if (this.config.compliance.kenya_dpa.enabled) {
      compliance.push(...this.config.compliance.kenya_dpa.requirements);
    }
    
    if (this.config.compliance.gdpr.enabled) {
      compliance.push(...this.config.compliance.gdpr.requirements);
    }
    
    if (this.config.compliance.iso27001.enabled) {
      compliance.push(...this.config.compliance.iso27001.requirements);
    }
    
    return compliance;
  }

  /**
   * Determine retention policy
   */
  determineRetentionPolicy(event) {
    const action = event.action || '';
    const actor = event.actor || '';
    
    // Security events
    if (action.includes('security') || action.includes('auth') || action.includes('access')) {
      return this.config.audit.retention.security_events;
    }
    
    // Compliance logs
    if (action.includes('compliance') || action.includes('audit') || action.includes('regulatory')) {
      return this.config.audit.retention.compliance_logs;
    }
    
    // Audit trails
    if (action.includes('audit') || action.includes('trace') || action.includes('log')) {
      return this.config.audit.retention.audit_trails;
    }
    
    // Default retention
    return this.config.audit.retention.default;
  }

  /**
   * Check compliance violations
   */
  async checkComplianceViolations(auditEvent) {
    try {
      const violations = [];
      
      // Check Kenya DPA compliance
      if (this.config.compliance.kenya_dpa.enabled) {
        const kenyaViolations = await this.checkKenyaDPACompliance(auditEvent);
        violations.push(...kenyaViolations);
      }
      
      // Check GDPR compliance
      if (this.config.compliance.gdpr.enabled) {
        const gdprViolations = await this.checkGDPRCompliance(auditEvent);
        violations.push(...gdprViolations);
      }
      
      // Check ISO 27001 compliance
      if (this.config.compliance.iso27001.enabled) {
        const isoViolations = await this.checkISO27001Compliance(auditEvent);
        violations.push(...isoViolations);
      }
      
      // Store violations
      if (violations.length > 0) {
        this.complianceViolations.push(...violations);
        
        // Send alerts
        await this.sendComplianceViolationAlerts(violations);
      }
      
    } catch (error) {
      loggingService.logError('Failed to check compliance violations', error);
    }
  }

  /**
   * Check Kenya DPA compliance
   */
  async checkKenyaDPACompliance(auditEvent) {
    const violations = [];
    
    // Check for data processing without consent
    if (auditEvent.action.includes('data_processing') && !auditEvent.metadata.consent) {
      violations.push({
        framework: 'kenya_dpa',
        requirement: 'consent_management_logs',
        violation: 'Data processing without consent',
        severity: 'high',
        event_id: auditEvent.id,
        timestamp: auditEvent.timestamp
      });
    }
    
    // Check for unauthorized data access
    if (auditEvent.action.includes('data_access') && auditEvent.status === 'unauthorized') {
      violations.push({
        framework: 'kenya_dpa',
        requirement: 'access_control_logs',
        violation: 'Unauthorized data access',
        severity: 'critical',
        event_id: auditEvent.id,
        timestamp: auditEvent.timestamp
      });
    }
    
    return violations;
  }

  /**
   * Check GDPR compliance
   */
  async checkGDPRCompliance(auditEvent) {
    const violations = [];
    
    // Check for data subject rights violations
    if (auditEvent.action.includes('data_subject_rights') && auditEvent.status === 'denied') {
      violations.push({
        framework: 'gdpr',
        requirement: 'data_subject_rights_logs',
        violation: 'Data subject rights denied',
        severity: 'high',
        event_id: auditEvent.id,
        timestamp: auditEvent.timestamp
      });
    }
    
    // Check for data retention violations
    if (auditEvent.action.includes('data_retention') && auditEvent.metadata.retention_exceeded) {
      violations.push({
        framework: 'gdpr',
        requirement: 'data_retention_logs',
        violation: 'Data retention period exceeded',
        severity: 'medium',
        event_id: auditEvent.id,
        timestamp: auditEvent.timestamp
      });
    }
    
    return violations;
  }

  /**
   * Check ISO 27001 compliance
   */
  async checkISO27001Compliance(auditEvent) {
    const violations = [];
    
    // Check for security event logging
    if (auditEvent.action.includes('security_event') && !auditEvent.metadata.logged) {
      violations.push({
        framework: 'iso27001',
        requirement: 'security_event_logging',
        violation: 'Security event not properly logged',
        severity: 'high',
        event_id: auditEvent.id,
        timestamp: auditEvent.timestamp
      });
    }
    
    // Check for incident management
    if (auditEvent.action.includes('incident') && auditEvent.status === 'unresolved') {
      violations.push({
        framework: 'iso27001',
        requirement: 'incident_management_logs',
        violation: 'Incident not properly managed',
        severity: 'medium',
        event_id: auditEvent.id,
        timestamp: auditEvent.timestamp
      });
    }
    
    return violations;
  }

  /**
   * Update trace correlations
   */
  async updateTraceCorrelations(auditEvent) {
    try {
      const traceId = auditEvent.trace_id;
      
      if (!this.traceCorrelations.has(traceId)) {
        this.traceCorrelations.set(traceId, {
          trace_id: traceId,
          events: [],
          start_time: auditEvent.timestamp,
          end_time: auditEvent.timestamp,
          status: 'active'
        });
      }
      
      const correlation = this.traceCorrelations.get(traceId);
      correlation.events.push(auditEvent);
      correlation.end_time = auditEvent.timestamp;
      
      // Update status based on events
      if (auditEvent.status === 'completed' || auditEvent.status === 'resolved') {
        correlation.status = 'completed';
      } else if (auditEvent.status === 'failed' || auditEvent.status === 'error') {
        correlation.status = 'failed';
      }
      
    } catch (error) {
      loggingService.logError('Failed to update trace correlations', error);
    }
  }

  /**
   * Maintain audit trail
   */
  async maintainAuditTrail() {
    try {
      const now = Date.now();
      const cutoffTime = now - this.config.audit.retention.default;
      
      // Remove old audit events
      for (const [id, event] of this.auditTrail.entries()) {
        if (new Date(event.timestamp).getTime() < cutoffTime) {
          this.auditTrail.delete(id);
        }
      }
      
      // Remove old compliance violations
      this.complianceViolations = this.complianceViolations.filter(v => 
        new Date(v.timestamp).getTime() > cutoffTime
      );
      
      // Remove old rollback events
      this.rollbackEvents = this.rollbackEvents.filter(e => 
        new Date(e.timestamp).getTime() > cutoffTime
      );
      
      loggingService.logInfo('Audit trail maintained', {
        auditEvents: this.auditTrail.size,
        complianceViolations: this.complianceViolations.length,
        rollbackEvents: this.rollbackEvents.length
      });
      
    } catch (error) {
      loggingService.logError('Failed to maintain audit trail', error);
    }
  }

  /**
   * Verify audit integrity
   */
  async verifyAuditIntegrity() {
    try {
      let verifiedCount = 0;
      let failedCount = 0;
      
      for (const [id, event] of this.auditTrail.entries()) {
        try {
          const calculatedHash = await this.calculateIntegrityHash(event);
          if (calculatedHash === event.integrity_hash) {
            verifiedCount++;
          } else {
            failedCount++;
            loggingService.logError('Audit event integrity verification failed', {
              eventId: id,
              expected: event.integrity_hash,
              calculated: calculatedHash
            });
          }
        } catch (error) {
          failedCount++;
          loggingService.logError('Failed to verify audit event integrity', error);
        }
      }
      
      loggingService.logInfo('Audit integrity verification completed', {
        verified: verifiedCount,
        failed: failedCount,
        total: this.auditTrail.size
      });
      
    } catch (error) {
      loggingService.logError('Failed to verify audit integrity', error);
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
      
      // Generate GDPR report
      if (this.config.compliance.gdpr.enabled) {
        await this.generateGDPRReport();
      }
      
      // Generate ISO 27001 report
      if (this.config.compliance.iso27001.enabled) {
        await this.generateISO27001Report();
      }
      
      loggingService.logInfo('Compliance reports generated');
      
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
        framework: 'kenya_dpa',
        period: this.getReportingPeriod(),
        generated_at: new Date().toISOString(),
        summary: {
          total_events: this.auditTrail.size,
          compliance_violations: this.complianceViolations.filter(v => v.framework === 'kenya_dpa').length,
          data_processing_events: this.getEventsByAction('data_processing').length,
          consent_management_events: this.getEventsByAction('consent_management').length,
          data_subject_rights_events: this.getEventsByAction('data_subject_rights').length
        },
        violations: this.complianceViolations.filter(v => v.framework === 'kenya_dpa'),
        recommendations: this.generateKenyaDPARecommendations()
      };
      
      // Save report
      await this.saveComplianceReport(report);
      
      // Send to recipients
      await this.sendComplianceReport(report, this.config.compliance.kenya_dpa.reporting.recipients);
      
    } catch (error) {
      loggingService.logError('Failed to generate Kenya DPA report', error);
    }
  }

  /**
   * Generate GDPR report
   */
  async generateGDPRReport() {
    try {
      const report = {
        framework: 'gdpr',
        period: this.getReportingPeriod(),
        generated_at: new Date().toISOString(),
        summary: {
          total_events: this.auditTrail.size,
          compliance_violations: this.complianceViolations.filter(v => v.framework === 'gdpr').length,
          data_processing_events: this.getEventsByAction('data_processing').length,
          consent_management_events: this.getEventsByAction('consent_management').length,
          data_subject_rights_events: this.getEventsByAction('data_subject_rights').length
        },
        violations: this.complianceViolations.filter(v => v.framework === 'gdpr'),
        recommendations: this.generateGDPRRecommendations()
      };
      
      // Save report
      await this.saveComplianceReport(report);
      
      // Send to recipients
      await this.sendComplianceReport(report, this.config.compliance.gdpr.reporting.recipients);
      
    } catch (error) {
      loggingService.logError('Failed to generate GDPR report', error);
    }
  }

  /**
   * Generate ISO 27001 report
   */
  async generateISO27001Report() {
    try {
      const report = {
        framework: 'iso27001',
        period: this.getReportingPeriod(),
        generated_at: new Date().toISOString(),
        summary: {
          total_events: this.auditTrail.size,
          compliance_violations: this.complianceViolations.filter(v => v.framework === 'iso27001').length,
          security_events: this.getEventsByAction('security_event').length,
          access_control_events: this.getEventsByAction('access_control').length,
          incident_management_events: this.getEventsByAction('incident_management').length
        },
        violations: this.complianceViolations.filter(v => v.framework === 'iso27001'),
        recommendations: this.generateISO27001Recommendations()
      };
      
      // Save report
      await this.saveComplianceReport(report);
      
      // Send to recipients
      await this.sendComplianceReport(report, this.config.compliance.iso27001.reporting.recipients);
      
    } catch (error) {
      loggingService.logError('Failed to generate ISO 27001 report', error);
    }
  }

  /**
   * Get events by action
   */
  getEventsByAction(action) {
    return Array.from(this.auditTrail.values()).filter(event => event.action.includes(action));
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
   * Generate Kenya DPA recommendations
   */
  generateKenyaDPARecommendations() {
    const recommendations = [];
    
    const violations = this.complianceViolations.filter(v => v.framework === 'kenya_dpa');
    
    if (violations.some(v => v.requirement === 'consent_management_logs')) {
      recommendations.push('Implement automated consent management system');
    }
    
    if (violations.some(v => v.requirement === 'data_subject_rights_logs')) {
      recommendations.push('Enhance data subject rights processing workflow');
    }
    
    return recommendations;
  }

  /**
   * Generate GDPR recommendations
   */
  generateGDPRRecommendations() {
    const recommendations = [];
    
    const violations = this.complianceViolations.filter(v => v.framework === 'gdpr');
    
    if (violations.some(v => v.requirement === 'data_subject_rights_logs')) {
      recommendations.push('Implement automated data subject rights processing');
    }
    
    if (violations.some(v => v.requirement === 'data_retention_logs')) {
      recommendations.push('Implement automated data retention management');
    }
    
    return recommendations;
  }

  /**
   * Generate ISO 27001 recommendations
   */
  generateISO27001Recommendations() {
    const recommendations = [];
    
    const violations = this.complianceViolations.filter(v => v.framework === 'iso27001');
    
    if (violations.some(v => v.requirement === 'security_event_logging')) {
      recommendations.push('Enhance security event logging and monitoring');
    }
    
    if (violations.some(v => v.requirement === 'incident_management_logs')) {
      recommendations.push('Improve incident management and response procedures');
    }
    
    return recommendations;
  }

  /**
   * Save compliance report
   */
  async saveComplianceReport(report) {
    try {
      const reportsDir = '/app/compliance_reports';
      await fs.mkdir(reportsDir, { recursive: true });
      
      const filename = `${report.framework}_report_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(reportsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      
      loggingService.logInfo(`Compliance report saved: ${filename}`);
      
    } catch (error) {
      loggingService.logError('Failed to save compliance report', error);
    }
  }

  /**
   * Send compliance report
   */
  async sendComplianceReport(report, recipients) {
    try {
      for (const recipient of recipients) {
        await notificationService.sendSystemNotification({
          type: 'compliance_report',
          title: `${report.framework.toUpperCase()} Compliance Report`,
          message: `Compliance report generated for ${report.period.start} to ${report.period.end}`,
          severity: 'info',
          data: {
            framework: report.framework,
            period: report.period,
            violations: report.summary.compliance_violations,
            recommendations: report.recommendations
          }
        });
      }
      
    } catch (error) {
      loggingService.logError('Failed to send compliance report', error);
    }
  }

  /**
   * Send compliance violation alerts
   */
  async sendComplianceViolationAlerts(violations) {
    try {
      for (const violation of violations) {
        await notificationService.sendSystemNotification({
          type: 'compliance_violation',
          title: `${violation.framework.toUpperCase()} Compliance Violation`,
          message: violation.violation,
          severity: violation.severity,
          data: {
            framework: violation.framework,
            requirement: violation.requirement,
            violation: violation.violation,
            event_id: violation.event_id,
            timestamp: violation.timestamp
          }
        });
      }
      
    } catch (error) {
      loggingService.logError('Failed to send compliance violation alerts', error);
    }
  }

  /**
   * Calculate integrity hash
   */
  async calculateIntegrityHash(event) {
    try {
      const data = JSON.stringify({
        id: event.id,
        timestamp: event.timestamp,
        trace_id: event.trace_id,
        actor: event.actor,
        action: event.action,
        status: event.status,
        metadata: event.metadata
      });
      
      return crypto.createHash('sha256').update(data).digest('hex');
      
    } catch (error) {
      loggingService.logError('Failed to calculate integrity hash', error);
      return null;
    }
  }

  /**
   * Encrypt audit event
   */
  async encryptAuditEvent(event) {
    try {
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', key);
      
      const data = JSON.stringify(event);
      const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
      const tag = cipher.getAuthTag();
      
      event.encrypted = true;
      event.encryption_key = key.toString('hex');
      event.encryption_iv = iv.toString('hex');
      event.encryption_tag = tag.toString('hex');
      
    } catch (error) {
      loggingService.logError('Failed to encrypt audit event', error);
    }
  }

  /**
   * Generate audit event ID
   */
  generateAuditEventId() {
    return `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate trace ID
   */
  generateTraceId() {
    return `TRACE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate correlation ID
   */
  generateCorrelationId() {
    return `CORR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate span ID
   */
  generateSpanId() {
    return `SPAN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Get audit trail
   */
  getAuditTrail() {
    return Array.from(this.auditTrail.values());
  }

  /**
   * Get compliance violations
   */
  getComplianceViolations() {
    return this.complianceViolations;
  }

  /**
   * Get rollback events
   */
  getRollbackEvents() {
    return this.rollbackEvents;
  }

  /**
   * Get trace correlations
   */
  getTraceCorrelations() {
    return Array.from(this.traceCorrelations.values());
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: true,
      running: this.isRunning,
      auditTrail: this.auditTrail.size,
      complianceViolations: this.complianceViolations.length,
      rollbackEvents: this.rollbackEvents.length,
      traceCorrelations: this.traceCorrelations.size,
      config: this.config
    };
  }
}

// Create singleton instance
const auditTraceabilityService = new AuditTraceabilityService();

export default auditTraceabilityService;
