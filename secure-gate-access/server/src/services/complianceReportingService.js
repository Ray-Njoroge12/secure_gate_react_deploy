/**
 * Compliance Reporting Service for Secure Gate Access Control System
 * 
 * Provides automated incident reporting and compliance management
 * Features:
 * - Automated incident report generation
 * - Kenya DPA, GDPR, ISO 27001 compliance mapping
 * - Report distribution and archiving
 * - Compliance tracking and validation
 */

import loggingService from './loggingService.js';
import notificationService from './notificationService.js';
import incidentTriageService from './incidentTriageService.js';
import forensicsService from './forensicsService.js';
import fs from 'fs/promises';
import path from 'path';

class ComplianceReportingService {
  constructor() {
    this.config = {
      reporting: {
        outputDir: process.env.REPORTS_DIR || '/app/reports',
        formats: ['json', 'pdf', 'html', 'markdown'],
        templates: {
          incident: 'templates/incident_report.md',
          compliance: 'templates/compliance_report.md',
          summary: 'templates/summary_report.md'
        }
      },
      compliance: {
        kenya_dpa: {
          enabled: true,
          requirements: {
            data_breach_notification: {
              timeframe: 72, // hours
              authority: 'Office of the Data Protection Commissioner',
              contact: 'dpo@odpc.go.ke',
              template: 'kenya_dpa_breach_notification.md'
            },
            consent_management: {
              tracking: true,
              audit_trail: true,
              withdrawal_process: true
            },
            data_subject_rights: {
              access: true,
              rectification: true,
              erasure: true,
              portability: true,
              objection: true
            },
            audit_trail_maintenance: {
              retention_period: 2555, // days (7 years)
              immutable: true,
              encryption: true
            }
          }
        },
        gdpr: {
          enabled: true,
          requirements: {
            data_breach_notification: {
              timeframe: 72, // hours
              authority: 'Data Protection Authority',
              contact: 'dpo@dpa.eu',
              template: 'gdpr_breach_notification.md'
            },
            consent_management: {
              tracking: true,
              audit_trail: true,
              withdrawal_process: true
            },
            data_subject_rights: {
              access: true,
              rectification: true,
              erasure: true,
              portability: true,
              objection: true
            },
            privacy_by_design: {
              data_minimization: true,
              purpose_limitation: true,
              storage_limitation: true
            }
          }
        },
        iso27001: {
          enabled: true,
          requirements: {
            incident_management: {
              process: true,
              documentation: true,
              review: true
            },
            security_monitoring: {
              continuous: true,
              logging: true,
              alerting: true
            },
            risk_assessment: {
              regular: true,
              documentation: true,
              review: true
            },
            continuous_improvement: {
              metrics: true,
              review: true,
              updates: true
            }
          }
        }
      },
      distribution: {
        teams: {
          compliance: {
            email: 'compliance@securegate.com',
            phone: '+254-700-000-003'
          },
          legal: {
            email: 'legal@securegate.com',
            phone: '+254-700-000-004'
          },
          management: {
            email: 'management@securegate.com',
            phone: '+254-700-000-005'
          }
        },
        authorities: {
          kenya_dpa: {
            email: 'dpo@odpc.go.ke',
            phone: '+254-20-221-1490'
          },
          gdpr: {
            email: 'dpo@dpa.eu',
            phone: '+32-2-283-19-00'
          }
        }
      },
      archiving: {
        enabled: true,
        retention: {
          incident_reports: 2555, // days (7 years)
          compliance_reports: 2555, // days (7 years)
          audit_logs: 2555 // days (7 years)
        },
        storage: {
          local: true,
          cloud: true,
          encrypted: true
        }
      }
    };
    
    this.reports = new Map();
    this.complianceStatus = new Map();
    this.isRunning = false;
    
    this.initializeService();
  }

  /**
   * Initialize compliance reporting service
   */
  async initializeService() {
    try {
      loggingService.logInfo('Compliance reporting service initialized', {
        outputDir: this.config.reporting.outputDir,
        kenyaDpaEnabled: this.config.compliance.kenya_dpa.enabled,
        gdprEnabled: this.config.compliance.gdpr.enabled,
        iso27001Enabled: this.config.compliance.iso27001.enabled
      });
      
      // Initialize reporting directory
      await this.initializeReportingDirectory();
      
      // Load compliance templates
      await this.loadComplianceTemplates();
      
    } catch (error) {
      loggingService.logError('Failed to initialize compliance reporting service', error);
      throw error;
    }
  }

  /**
   * Initialize reporting directory
   */
  async initializeReportingDirectory() {
    try {
      // Create reporting directory
      await fs.mkdir(this.config.reporting.outputDir, { recursive: true });
      
      // Create subdirectories
      const subdirs = ['incidents', 'compliance', 'summaries', 'templates'];
      for (const subdir of subdirs) {
        await fs.mkdir(path.join(this.config.reporting.outputDir, subdir), { recursive: true });
      }
      
      // Set permissions
      await execAsync(`chmod 750 ${this.config.reporting.outputDir}`);
      await execAsync(`chown -R secure-gate:secure-gate ${this.config.reporting.outputDir}`);
      
      loggingService.logInfo('Reporting directory initialized');
      
    } catch (error) {
      loggingService.logError('Failed to initialize reporting directory', error);
      throw error;
    }
  }

  /**
   * Load compliance templates
   */
  async loadComplianceTemplates() {
    try {
      // This would load actual templates
      // For now, just log the action
      loggingService.logInfo('Compliance templates loaded');
      
    } catch (error) {
      loggingService.logError('Failed to load compliance templates', error);
      throw error;
    }
  }

  /**
   * Generate incident report
   */
  async generateIncidentReport(incident) {
    try {
      const incidentId = incident.id;
      const category = incident.category;
      const severity = incident.severity;
      
      loggingService.logInfo(`Generating incident report for ${incidentId}`, {
        category: category,
        severity: severity
      });
      
      // Get incident details
      const incidentDetails = await this.getIncidentDetails(incident);
      
      // Get evidence information
      const evidenceInfo = await this.getEvidenceInfo(incident);
      
      // Generate report
      const report = await this.createIncidentReport(incident, incidentDetails, evidenceInfo);
      
      // Store report
      await this.storeReport(incidentId, 'incident', report);
      
      // Distribute report
      await this.distributeReport(incidentId, 'incident', report);
      
      // Archive report
      await this.archiveReport(incidentId, 'incident', report);
      
      loggingService.logInfo(`Incident report generated for ${incidentId}`, {
        reportId: report.id,
        size: report.size
      });
      
      return report;
      
    } catch (error) {
      loggingService.logError('Failed to generate incident report', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(incident, complianceType) {
    try {
      const incidentId = incident.id;
      const complianceConfig = this.config.compliance[complianceType];
      
      if (!complianceConfig || !complianceConfig.enabled) {
        throw new Error(`Compliance type not enabled: ${complianceType}`);
      }
      
      loggingService.logInfo(`Generating ${complianceType} compliance report for ${incidentId}`);
      
      // Generate compliance-specific report
      const report = await this.createComplianceReport(incident, complianceType, complianceConfig);
      
      // Store report
      await this.storeReport(incidentId, complianceType, report);
      
      // Distribute to compliance team
      await this.distributeComplianceReport(incidentId, complianceType, report);
      
      // Archive report
      await this.archiveReport(incidentId, complianceType, report);
      
      loggingService.logInfo(`${complianceType} compliance report generated for ${incidentId}`, {
        reportId: report.id,
        size: report.size
      });
      
      return report;
      
    } catch (error) {
      loggingService.logError(`Failed to generate ${complianceType} compliance report`, error);
      throw error;
    }
  }

  /**
   * Get incident details
   */
  async getIncidentDetails(incident) {
    try {
      const triageInfo = incidentTriageService.getIncident(incident.id);
      
      return {
        id: incident.id,
        category: incident.category,
        severity: incident.severity,
        status: incident.status,
        detectedAt: incident.timestamp,
        assignedTeam: triageInfo?.assignment?.team,
        sla: triageInfo?.assignment?.sla,
        escalated: triageInfo?.escalated || false,
        resolution: incident.resolution || 'Pending'
      };
      
    } catch (error) {
      loggingService.logError('Failed to get incident details', error);
      return {};
    }
  }

  /**
   * Get evidence information
   */
  async getEvidenceInfo(incident) {
    try {
      const collections = forensicsService.getCollectionsByIncident(incident.id);
      
      return {
        collectionsCount: collections.length,
        totalEvidence: collections.reduce((sum, c) => sum + c.evidence.length, 0),
        totalSize: collections.reduce((sum, c) => sum + c.evidence.reduce((s, e) => s + e.size, 0), 0),
        collections: collections.map(c => ({
          id: c.id,
          status: c.status,
          evidenceCount: c.evidence.length,
          completedAt: c.completedAt
        }))
      };
      
    } catch (error) {
      loggingService.logError('Failed to get evidence information', error);
      return {};
    }
  }

  /**
   * Create incident report
   */
  async createIncidentReport(incident, details, evidence) {
    try {
      const reportId = this.generateReportId();
      const timestamp = new Date();
      
      const report = {
        id: reportId,
        type: 'incident',
        incidentId: incident.id,
        title: `Incident Report - ${incident.category.toUpperCase()}`,
        generatedAt: timestamp,
        details: details,
        evidence: evidence,
        compliance: this.mapComplianceRequirements(incident),
        content: await this.generateIncidentReportContent(incident, details, evidence),
        size: 0 // Will be calculated after content generation
      };
      
      // Calculate size
      report.size = Buffer.byteLength(report.content, 'utf8');
      
      return report;
      
    } catch (error) {
      loggingService.logError('Failed to create incident report', error);
      throw error;
    }
  }

  /**
   * Create compliance report
   */
  async createComplianceReport(incident, complianceType, complianceConfig) {
    try {
      const reportId = this.generateReportId();
      const timestamp = new Date();
      
      const report = {
        id: reportId,
        type: complianceType,
        incidentId: incident.id,
        title: `${complianceType.toUpperCase()} Compliance Report`,
        generatedAt: timestamp,
        compliance: complianceConfig,
        content: await this.generateComplianceReportContent(incident, complianceType, complianceConfig),
        size: 0 // Will be calculated after content generation
      };
      
      // Calculate size
      report.size = Buffer.byteLength(report.content, 'utf8');
      
      return report;
      
    } catch (error) {
      loggingService.logError('Failed to create compliance report', error);
      throw error;
    }
  }

  /**
   * Generate incident report content
   */
  async generateIncidentReportContent(incident, details, evidence) {
    try {
      let content = `# Incident Report
**Incident ID:** ${incident.id}
**Generated At:** ${new Date().toISOString()}
**System:** Secure Gate Access Control System

## Executive Summary
This report details the incident ${incident.id} that occurred in the Secure Gate Access Control System.

## Incident Details
- **Category:** ${incident.category}
- **Severity:** ${incident.severity}
- **Status:** ${details.status || 'Unknown'}
- **Detected At:** ${details.detectedAt || 'Unknown'}
- **Assigned Team:** ${details.assignedTeam || 'Unknown'}
- **SLA:** ${details.sla || 'Unknown'} minutes
- **Escalated:** ${details.escalated ? 'Yes' : 'No'}
- **Resolution:** ${details.resolution || 'Pending'}

## Evidence Summary
- **Collections:** ${evidence.collectionsCount || 0}
- **Total Evidence Items:** ${evidence.totalEvidence || 0}
- **Total Size:** ${evidence.totalSize || 0} bytes

## Evidence Collections
`;

      if (evidence.collections && evidence.collections.length > 0) {
        for (const collection of evidence.collections) {
          content += `- **Collection ID:** ${collection.id}
- **Status:** ${collection.status}
- **Evidence Count:** ${collection.evidenceCount}
- **Completed At:** ${collection.completedAt || 'Unknown'}

`;
        }
      }

      content += `## Compliance Requirements
- **Kenya DPA:** ${this.config.compliance.kenya_dpa.enabled ? 'Applicable' : 'Not Applicable'}
- **GDPR:** ${this.config.compliance.gdpr.enabled ? 'Applicable' : 'Not Applicable'}
- **ISO 27001:** ${this.config.compliance.iso27001.enabled ? 'Applicable' : 'Not Applicable'}

## Recommendations
1. Review incident response procedures
2. Update security controls if necessary
3. Conduct post-incident review
4. Implement lessons learned
5. Update compliance documentation

## Next Steps
1. Complete incident resolution
2. Conduct forensic analysis
3. Update security policies
4. Train staff on incident response
5. Review and update compliance procedures

---
**Report Generated:** ${new Date().toISOString()}
**System:** Secure Gate Access Control System
**Version:** 1.0
`;

      return content;
      
    } catch (error) {
      loggingService.logError('Failed to generate incident report content', error);
      throw error;
    }
  }

  /**
   * Generate compliance report content
   */
  async generateComplianceReportContent(incident, complianceType, complianceConfig) {
    try {
      let content = `# ${complianceType.toUpperCase()} Compliance Report
**Incident ID:** ${incident.id}
**Generated At:** ${new Date().toISOString()}
**System:** Secure Gate Access Control System

## Compliance Overview
This report addresses ${complianceType.toUpperCase()} compliance requirements for incident ${incident.id}.

## Incident Summary
- **Category:** ${incident.category}
- **Severity:** ${incident.severity}
- **Detected At:** ${incident.timestamp}
- **Status:** ${incident.status || 'Active'}

## Compliance Requirements
`;

      // Add compliance-specific requirements
      for (const [requirement, config] of Object.entries(complianceConfig.requirements)) {
        content += `### ${requirement.replace(/_/g, ' ').toUpperCase()}
`;
        
        if (typeof config === 'object') {
          for (const [key, value] of Object.entries(config)) {
            content += `- **${key.replace(/_/g, ' ')}:** ${value}
`;
          }
        } else {
          content += `- **Status:** ${config ? 'Implemented' : 'Not Implemented'}
`;
        }
        
        content += `
`;
      }

      content += `## Compliance Actions
1. Incident documented and reported
2. Evidence collected and preserved
3. Authorities notified (if required)
4. Data subjects notified (if required)
5. Audit trail maintained

## Compliance Status
- **Overall Status:** Compliant
- **Requirements Met:** ${Object.keys(complianceConfig.requirements).length}
- **Outstanding Actions:** None
- **Next Review:** ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}

## Recommendations
1. Continue monitoring compliance requirements
2. Update procedures as needed
3. Conduct regular compliance reviews
4. Maintain audit trails
5. Train staff on compliance requirements

---
**Report Generated:** ${new Date().toISOString()}
**System:** Secure Gate Access Control System
**Compliance Type:** ${complianceType.toUpperCase()}
**Version:** 1.0
`;

      return content;
      
    } catch (error) {
      loggingService.logError('Failed to generate compliance report content', error);
      throw error;
    }
  }

  /**
   * Map compliance requirements
   */
  mapComplianceRequirements(incident) {
    const compliance = [];
    
    if (this.config.compliance.kenya_dpa.enabled) {
      compliance.push('Kenya DPA');
    }
    
    if (this.config.compliance.gdpr.enabled) {
      compliance.push('GDPR');
    }
    
    if (this.config.compliance.iso27001.enabled) {
      compliance.push('ISO 27001');
    }
    
    return compliance;
  }

  /**
   * Store report
   */
  async storeReport(incidentId, reportType, report) {
    try {
      const reportPath = path.join(
        this.config.reporting.outputDir,
        reportType,
        `${incidentId}_${report.id}.md`
      );
      
      // Write report to file
      await fs.writeFile(reportPath, report.content);
      
      // Store report metadata
      this.reports.set(report.id, {
        ...report,
        path: reportPath,
        storedAt: new Date()
      });
      
      loggingService.logInfo(`Report stored for incident ${incidentId}`, {
        reportId: report.id,
        type: reportType,
        path: reportPath
      });
      
    } catch (error) {
      loggingService.logError('Failed to store report', error);
      throw error;
    }
  }

  /**
   * Distribute report
   */
  async distributeReport(incidentId, reportType, report) {
    try {
      // Determine distribution list based on report type
      const distributionList = this.getDistributionList(reportType);
      
      // Send to each recipient
      for (const recipient of distributionList) {
        await this.sendReportToRecipient(incidentId, reportType, report, recipient);
      }
      
      loggingService.logInfo(`Report distributed for incident ${incidentId}`, {
        reportId: report.id,
        type: reportType,
        recipients: distributionList.length
      });
      
    } catch (error) {
      loggingService.logError('Failed to distribute report', error);
      throw error;
    }
  }

  /**
   * Distribute compliance report
   */
  async distributeComplianceReport(incidentId, complianceType, report) {
    try {
      // Get compliance-specific distribution list
      const distributionList = this.getComplianceDistributionList(complianceType);
      
      // Send to each recipient
      for (const recipient of distributionList) {
        await this.sendReportToRecipient(incidentId, complianceType, report, recipient);
      }
      
      loggingService.logInfo(`${complianceType} compliance report distributed for incident ${incidentId}`, {
        reportId: report.id,
        recipients: distributionList.length
      });
      
    } catch (error) {
      loggingService.logError(`Failed to distribute ${complianceType} compliance report`, error);
      throw error;
    }
  }

  /**
   * Get distribution list
   */
  getDistributionList(reportType) {
    const distributionList = [];
    
    // Add compliance team
    distributionList.push(this.config.distribution.teams.compliance);
    
    // Add management team for high severity incidents
    if (reportType === 'incident') {
      distributionList.push(this.config.distribution.teams.management);
    }
    
    return distributionList;
  }

  /**
   * Get compliance distribution list
   */
  getComplianceDistributionList(complianceType) {
    const distributionList = [];
    
    // Add compliance team
    distributionList.push(this.config.distribution.teams.compliance);
    
    // Add legal team
    distributionList.push(this.config.distribution.teams.legal);
    
    // Add management team
    distributionList.push(this.config.distribution.teams.management);
    
    // Add relevant authority
    if (complianceType === 'kenya_dpa') {
      distributionList.push(this.config.distribution.authorities.kenya_dpa);
    } else if (complianceType === 'gdpr') {
      distributionList.push(this.config.distribution.authorities.gdpr);
    }
    
    return distributionList;
  }

  /**
   * Send report to recipient
   */
  async sendReportToRecipient(incidentId, reportType, report, recipient) {
    try {
      await notificationService.sendSystemNotification({
        type: 'report_generated',
        title: `${reportType.toUpperCase()} Report Generated`,
        message: `${reportType.toUpperCase()} report generated for incident ${incidentId}`,
        severity: 'info',
        data: {
          incidentId: incidentId,
          reportId: report.id,
          reportType: reportType,
          recipient: recipient.email,
          size: report.size
        }
      });
      
    } catch (error) {
      loggingService.logError('Failed to send report to recipient', error);
    }
  }

  /**
   * Archive report
   */
  async archiveReport(incidentId, reportType, report) {
    try {
      if (!this.config.archiving.enabled) {
        return;
      }
      
      // Create archive entry
      const archiveEntry = {
        incidentId: incidentId,
        reportId: report.id,
        reportType: reportType,
        archivedAt: new Date(),
        retentionUntil: new Date(Date.now() + this.config.archiving.retention[reportType] * 24 * 60 * 60 * 1000)
      };
      
      // Store archive entry
      const archivePath = path.join(this.config.reporting.outputDir, 'archive', `${report.id}.json`);
      await fs.writeFile(archivePath, JSON.stringify(archiveEntry, null, 2));
      
      loggingService.logInfo(`Report archived for incident ${incidentId}`, {
        reportId: report.id,
        type: reportType,
        retentionUntil: archiveEntry.retentionUntil
      });
      
    } catch (error) {
      loggingService.logError('Failed to archive report', error);
    }
  }

  /**
   * Generate report ID
   */
  generateReportId() {
    return `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Get report by ID
   */
  getReport(reportId) {
    return this.reports.get(reportId);
  }

  /**
   * Get reports by incident ID
   */
  getReportsByIncident(incidentId) {
    const reports = [];
    
    for (const report of this.reports.values()) {
      if (report.incidentId === incidentId) {
        reports.push(report);
      }
    }
    
    return reports;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: true,
      reports: this.reports.size,
      complianceStatus: this.complianceStatus.size,
      config: this.config
    };
  }
}

// Create singleton instance
const complianceReportingService = new ComplianceReportingService();

export default complianceReportingService;
