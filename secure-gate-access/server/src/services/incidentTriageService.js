/**
 * Incident Triage & Routing Service for Secure Gate Access Control System
 * 
 * Provides automated incident triage and routing capabilities
 * Features:
 * - Integration with Prometheus, Grafana, and Alertmanager
 * - Automated team assignment and SLA management
 * - Escalation procedures
 * - Compliance tracking
 */

import loggingService from './loggingService.js';
import notificationService from './notificationService.js';
import incidentDetectionService from './incidentDetectionService.js';

class IncidentTriageService {
  constructor() {
    this.config = {
      prometheus: {
        enabled: true,
        endpoint: process.env.PROMETHEUS_ENDPOINT || 'http://prometheus:9090',
        queryInterval: parseInt(process.env.PROMETHEUS_QUERY_INTERVAL) || 30000
      },
      grafana: {
        enabled: true,
        endpoint: process.env.GRAFANA_ENDPOINT || 'http://grafana:3000',
        apiKey: process.env.GRAFANA_API_KEY || 'SG2024!GrafanaAPIKeyForSecureGate'
      },
      alertmanager: {
        enabled: true,
        endpoint: process.env.ALERTMANAGER_ENDPOINT || 'http://alertmanager:9093',
        webhookUrl: process.env.ALERTMANAGER_WEBHOOK_URL || 'http://server:3000/api/incidents/webhook'
      },
      routing: {
        teams: {
          security: {
            name: 'Security Team',
            email: 'security@securegate.com',
            phone: '+254-700-000-001',
            escalation: 'security-lead@securegate.com',
            sla: {
              critical: 15, // minutes
              high: 60,
              medium: 240,
              low: 480
            }
          },
          ops: {
            name: 'Operations Team',
            email: 'ops@securegate.com',
            phone: '+254-700-000-002',
            escalation: 'ops-lead@securegate.com',
            sla: {
              critical: 15,
              high: 60,
              medium: 240,
              low: 480
            }
          },
          compliance: {
            name: 'Compliance Team',
            email: 'compliance@securegate.com',
            phone: '+254-700-000-003',
            escalation: 'compliance-lead@securegate.com',
            sla: {
              critical: 30,
              high: 120,
              medium: 480,
              low: 960
            }
          },
          management: {
            name: 'Management Team',
            email: 'management@securegate.com',
            phone: '+254-700-000-004',
            escalation: 'ceo@securegate.com',
            sla: {
              critical: 5,
              high: 15,
              medium: 60,
              low: 240
            }
          }
        },
        rules: {
          security: {
            patterns: ['authentication_failure', 'unauthorized_access', 'data_breach', 'malware_detection'],
            team: 'security',
            priority: 'high'
          },
          availability: {
            patterns: ['service_down', 'database_connection_failed', 'high_cpu_usage'],
            team: 'ops',
            priority: 'critical'
          },
          performance: {
            patterns: ['slow_query', 'high_response_time', 'connection_pool_exhausted'],
            team: 'ops',
            priority: 'medium'
          },
          compliance: {
            patterns: ['gdpr_violation', 'kenya_dpa_violation', 'audit_log_tampering'],
            team: 'compliance',
            priority: 'high'
          }
        }
      },
      escalation: {
        levels: {
          1: {
            name: 'Initial Assignment',
            timeout: 15, // minutes
            action: 'assign_to_team'
          },
          2: {
            name: 'Team Lead Escalation',
            timeout: 30,
            action: 'escalate_to_lead'
          },
          3: {
            name: 'Management Escalation',
            timeout: 60,
            action: 'escalate_to_management'
          },
          4: {
            name: 'Executive Escalation',
            timeout: 120,
            action: 'escalate_to_executive'
          }
        }
      },
      sla: {
        tracking: {
          enabled: true,
          alertThreshold: 0.8, // 80% of SLA time
          criticalThreshold: 0.9 // 90% of SLA time
        }
      }
    };
    
    this.activeIncidents = new Map();
    this.slaTimers = new Map();
    this.escalationTimers = new Map();
    this.isRunning = false;
    this.triageInterval = null;
    
    this.initializeService();
  }

  /**
   * Initialize incident triage service
   */
  async initializeService() {
    try {
      loggingService.logInfo('Incident triage service initialized', {
        prometheusEnabled: this.config.prometheus.enabled,
        grafanaEnabled: this.config.grafana.enabled,
        alertmanagerEnabled: this.config.alertmanager.enabled,
        teamsCount: Object.keys(this.config.routing.teams).length
      });
      
      // Start triage processing
      this.startTriage();
      
    } catch (error) {
      loggingService.logError('Failed to initialize incident triage service', error);
      throw error;
    }
  }

  /**
   * Start incident triage processing
   */
  startTriage() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Start triage interval
    this.triageInterval = setInterval(async () => {
      try {
        await this.processTriage();
      } catch (error) {
        loggingService.logError('Incident triage processing failed', error);
      }
    }, 10000); // Every 10 seconds
    
    loggingService.logInfo('Incident triage processing started');
  }

  /**
   * Stop incident triage processing
   */
  stopTriage() {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    if (this.triageInterval) {
      clearInterval(this.triageInterval);
      this.triageInterval = null;
    }
    
    // Clear all timers
    this.slaTimers.forEach(timer => clearTimeout(timer));
    this.escalationTimers.forEach(timer => clearTimeout(timer));
    this.slaTimers.clear();
    this.escalationTimers.clear();
    
    loggingService.logInfo('Incident triage processing stopped');
  }

  /**
   * Process incident triage
   */
  async processTriage() {
    try {
      // Get all incidents from detection service
      const incidents = incidentDetectionService.getAllIncidents();
      
      // Process each incident
      for (const incident of incidents) {
        if (!this.activeIncidents.has(incident.id)) {
          await this.triageIncident(incident);
        }
      }
      
      // Check SLA compliance
      await this.checkSLACompliance();
      
      // Check escalation requirements
      await this.checkEscalationRequirements();
      
    } catch (error) {
      loggingService.logError('Incident triage processing failed', error);
    }
  }

  /**
   * Triage individual incident
   */
  async triageIncident(incident) {
    try {
      // Determine routing
      const routing = await this.determineRouting(incident);
      
      // Assign team
      const assignment = await this.assignTeam(incident, routing);
      
      // Set SLA timer
      await this.setSLATimer(incident, assignment);
      
      // Set escalation timer
      await this.setEscalationTimer(incident, assignment);
      
      // Update incident
      incident.routing = routing;
      incident.assignment = assignment;
      incident.status = 'assigned';
      incident.assignedAt = new Date();
      
      // Store incident
      this.activeIncidents.set(incident.id, incident);
      
      // Notify assigned team
      await this.notifyAssignedTeam(incident, assignment);
      
      // Log triage
      loggingService.logInfo('Incident triaged and assigned', {
        incidentId: incident.id,
        category: incident.category,
        severity: incident.severity,
        assignedTeam: assignment.team,
        sla: assignment.sla
      });
      
    } catch (error) {
      loggingService.logError('Failed to triage incident', error);
    }
  }

  /**
   * Determine incident routing
   */
  async determineRouting(incident) {
    try {
      const category = incident.category;
      const severity = incident.severity;
      
      // Get routing rules for category
      const rules = this.config.routing.rules[category];
      if (!rules) {
        return {
          team: 'ops',
          priority: 'medium',
          confidence: 0.5
        };
      }
      
      // Check if incident matches patterns
      const matchesPattern = rules.patterns.some(pattern => 
        incident.message.toLowerCase().includes(pattern.toLowerCase()) ||
        incident.pattern === pattern
      );
      
      if (matchesPattern) {
        return {
          team: rules.team,
          priority: rules.priority,
          confidence: 0.9
        };
      }
      
      // Default routing based on severity
      let team = 'ops';
      let priority = 'medium';
      
      if (severity === 'critical') {
        team = 'ops';
        priority = 'critical';
      } else if (severity === 'high') {
        if (category === 'security') {
          team = 'security';
        } else {
          team = 'ops';
        }
        priority = 'high';
      } else if (severity === 'medium') {
        team = 'ops';
        priority = 'medium';
      } else {
        team = 'ops';
        priority = 'low';
      }
      
      return {
        team,
        priority,
        confidence: 0.7
      };
      
    } catch (error) {
      loggingService.logError('Failed to determine routing', error);
      return {
        team: 'ops',
        priority: 'medium',
        confidence: 0.5
      };
    }
  }

  /**
   * Assign team to incident
   */
  async assignTeam(incident, routing) {
    try {
      const teamName = routing.team;
      const team = this.config.routing.teams[teamName];
      
      if (!team) {
        throw new Error(`Unknown team: ${teamName}`);
      }
      
      const severity = incident.severity;
      const sla = team.sla[severity] || team.sla.medium;
      
      return {
        team: teamName,
        teamName: team.name,
        teamEmail: team.email,
        teamPhone: team.phone,
        escalationEmail: team.escalation,
        sla: sla,
        assignedAt: new Date(),
        priority: routing.priority,
        confidence: routing.confidence
      };
      
    } catch (error) {
      loggingService.logError('Failed to assign team', error);
      return {
        team: 'ops',
        teamName: 'Operations Team',
        teamEmail: 'ops@securegate.com',
        teamPhone: '+254-700-000-002',
        escalationEmail: 'ops-lead@securegate.com',
        sla: 480,
        assignedAt: new Date(),
        priority: 'medium',
        confidence: 0.5
      };
    }
  }

  /**
   * Set SLA timer for incident
   */
  async setSLATimer(incident, assignment) {
    try {
      const slaMinutes = assignment.sla;
      const slaMs = slaMinutes * 60 * 1000;
      
      const timer = setTimeout(async () => {
        await this.handleSLAViolation(incident);
      }, slaMs);
      
      this.slaTimers.set(incident.id, timer);
      
      loggingService.logInfo(`SLA timer set for incident ${incident.id}`, {
        sla: slaMinutes,
        team: assignment.team
      });
      
    } catch (error) {
      loggingService.logError('Failed to set SLA timer', error);
    }
  }

  /**
   * Set escalation timer for incident
   */
  async setEscalationTimer(incident, assignment) {
    try {
      const escalationLevel = 1;
      const escalationConfig = this.config.escalation.levels[escalationLevel];
      const escalationMs = escalationConfig.timeout * 60 * 1000;
      
      const timer = setTimeout(async () => {
        await this.handleEscalation(incident, escalationLevel);
      }, escalationMs);
      
      this.escalationTimers.set(incident.id, timer);
      
      loggingService.logInfo(`Escalation timer set for incident ${incident.id}`, {
        level: escalationLevel,
        timeout: escalationConfig.timeout
      });
      
    } catch (error) {
      loggingService.logError('Failed to set escalation timer', error);
    }
  }

  /**
   * Handle SLA violation
   */
  async handleSLAViolation(incident) {
    try {
      loggingService.logWarn(`SLA violation for incident ${incident.id}`, {
        incidentId: incident.id,
        team: incident.assignment.team,
        sla: incident.assignment.sla
      });
      
      // Notify management
      await notificationService.sendSystemNotification({
        type: 'sla_violation',
        title: 'SLA Violation Alert',
        message: `Incident ${incident.id} has exceeded SLA of ${incident.assignment.sla} minutes`,
        severity: 'critical',
        data: {
          incidentId: incident.id,
          team: incident.assignment.team,
          sla: incident.assignment.sla,
          assignedAt: incident.assignedAt
        }
      });
      
      // Escalate incident
      await this.escalateIncident(incident, 'sla_violation');
      
    } catch (error) {
      loggingService.logError('Failed to handle SLA violation', error);
    }
  }

  /**
   * Handle escalation
   */
  async handleEscalation(incident, level) {
    try {
      const escalationConfig = this.config.escalation.levels[level];
      
      loggingService.logWarn(`Escalating incident ${incident.id} to level ${level}`, {
        incidentId: incident.id,
        level: level,
        action: escalationConfig.action
      });
      
      // Execute escalation action
      switch (escalationConfig.action) {
        case 'assign_to_team':
          // Already assigned, no action needed
          break;
        case 'escalate_to_lead':
          await this.escalateToLead(incident);
          break;
        case 'escalate_to_management':
          await this.escalateToManagement(incident);
          break;
        case 'escalate_to_executive':
          await this.escalateToExecutive(incident);
          break;
      }
      
      // Set next escalation timer
      const nextLevel = level + 1;
      if (this.config.escalation.levels[nextLevel]) {
        await this.setEscalationTimer(incident, incident.assignment);
      }
      
    } catch (error) {
      loggingService.logError('Failed to handle escalation', error);
    }
  }

  /**
   * Escalate to team lead
   */
  async escalateToLead(incident) {
    try {
      const team = incident.assignment.team;
      const escalationEmail = incident.assignment.escalationEmail;
      
      await notificationService.sendSystemNotification({
        type: 'incident_escalation',
        title: 'Incident Escalated to Team Lead',
        message: `Incident ${incident.id} has been escalated to ${team} team lead`,
        severity: 'high',
        data: {
          incidentId: incident.id,
          team: team,
          escalationEmail: escalationEmail,
          level: 'team_lead'
        }
      });
      
    } catch (error) {
      loggingService.logError('Failed to escalate to team lead', error);
    }
  }

  /**
   * Escalate to management
   */
  async escalateToManagement(incident) {
    try {
      await notificationService.sendSystemNotification({
        type: 'incident_escalation',
        title: 'Incident Escalated to Management',
        message: `Incident ${incident.id} has been escalated to management`,
        severity: 'critical',
        data: {
          incidentId: incident.id,
          team: incident.assignment.team,
          level: 'management'
        }
      });
      
    } catch (error) {
      loggingService.logError('Failed to escalate to management', error);
    }
  }

  /**
   * Escalate to executive
   */
  async escalateToExecutive(incident) {
    try {
      await notificationService.sendSystemNotification({
        type: 'incident_escalation',
        title: 'Incident Escalated to Executive',
        message: `Incident ${incident.id} has been escalated to executive team`,
        severity: 'critical',
        data: {
          incidentId: incident.id,
          team: incident.assignment.team,
          level: 'executive'
        }
      });
      
    } catch (error) {
      loggingService.logError('Failed to escalate to executive', error);
    }
  }

  /**
   * Escalate incident
   */
  async escalateIncident(incident, reason) {
    try {
      incident.escalated = true;
      incident.escalationReason = reason;
      incident.escalatedAt = new Date();
      
      // Update stored incident
      this.activeIncidents.set(incident.id, incident);
      
      loggingService.logInfo(`Incident ${incident.id} escalated`, {
        reason: reason,
        escalatedAt: incident.escalatedAt
      });
      
    } catch (error) {
      loggingService.logError('Failed to escalate incident', error);
    }
  }

  /**
   * Notify assigned team
   */
  async notifyAssignedTeam(incident, assignment) {
    try {
      await notificationService.sendSystemNotification({
        type: 'incident_assigned',
        title: 'New Incident Assigned',
        message: `Incident ${incident.id} has been assigned to ${assignment.teamName}`,
        severity: incident.severity,
        data: {
          incidentId: incident.id,
          category: incident.category,
          severity: incident.severity,
          team: assignment.team,
          teamEmail: assignment.teamEmail,
          teamPhone: assignment.teamPhone,
          sla: assignment.sla,
          priority: assignment.priority
        }
      });
      
    } catch (error) {
      loggingService.logError('Failed to notify assigned team', error);
    }
  }

  /**
   * Check SLA compliance
   */
  async checkSLACompliance() {
    try {
      const now = new Date();
      
      for (const [incidentId, incident] of this.activeIncidents) {
        if (incident.status === 'resolved') {
          continue;
        }
        
        const assignedAt = new Date(incident.assignedAt);
        const elapsedMinutes = (now - assignedAt) / (1000 * 60);
        const slaMinutes = incident.assignment.sla;
        const slaProgress = elapsedMinutes / slaMinutes;
        
        // Check if approaching SLA threshold
        if (slaProgress >= this.config.sla.tracking.alertThreshold) {
          await this.handleSLAAlert(incident, slaProgress);
        }
        
        // Check if critical SLA threshold
        if (slaProgress >= this.config.sla.tracking.criticalThreshold) {
          await this.handleSLACritical(incident, slaProgress);
        }
      }
      
    } catch (error) {
      loggingService.logError('Failed to check SLA compliance', error);
    }
  }

  /**
   * Handle SLA alert
   */
  async handleSLAAlert(incident, slaProgress) {
    try {
      if (incident.slaAlerted) {
        return;
      }
      
      incident.slaAlerted = true;
      
      await notificationService.sendSystemNotification({
        type: 'sla_alert',
        title: 'SLA Alert',
        message: `Incident ${incident.id} is approaching SLA threshold (${Math.round(slaProgress * 100)}%)`,
        severity: 'warning',
        data: {
          incidentId: incident.id,
          slaProgress: slaProgress,
          team: incident.assignment.team
        }
      });
      
    } catch (error) {
      loggingService.logError('Failed to handle SLA alert', error);
    }
  }

  /**
   * Handle SLA critical
   */
  async handleSLACritical(incident, slaProgress) {
    try {
      if (incident.slaCritical) {
        return;
      }
      
      incident.slaCritical = true;
      
      await notificationService.sendSystemNotification({
        type: 'sla_critical',
        title: 'SLA Critical Alert',
        message: `Incident ${incident.id} is at critical SLA threshold (${Math.round(slaProgress * 100)}%)`,
        severity: 'critical',
        data: {
          incidentId: incident.id,
          slaProgress: slaProgress,
          team: incident.assignment.team
        }
      });
      
    } catch (error) {
      loggingService.logError('Failed to handle SLA critical', error);
    }
  }

  /**
   * Check escalation requirements
   */
  async checkEscalationRequirements() {
    try {
      // This would check if incidents need escalation
      // For now, just log the action
      loggingService.logInfo('Checking escalation requirements');
      
    } catch (error) {
      loggingService.logError('Failed to check escalation requirements', error);
    }
  }

  /**
   * Resolve incident
   */
  async resolveIncident(incidentId, resolution) {
    try {
      const incident = this.activeIncidents.get(incidentId);
      if (!incident) {
        throw new Error(`Incident not found: ${incidentId}`);
      }
      
      // Update incident
      incident.status = 'resolved';
      incident.resolvedAt = new Date();
      incident.resolution = resolution;
      
      // Clear timers
      if (this.slaTimers.has(incidentId)) {
        clearTimeout(this.slaTimers.get(incidentId));
        this.slaTimers.delete(incidentId);
      }
      
      if (this.escalationTimers.has(incidentId)) {
        clearTimeout(this.escalationTimers.get(incidentId));
        this.escalationTimers.delete(incidentId);
      }
      
      // Notify resolution
      await notificationService.sendSystemNotification({
        type: 'incident_resolved',
        title: 'Incident Resolved',
        message: `Incident ${incidentId} has been resolved`,
        severity: 'info',
        data: {
          incidentId: incidentId,
          resolution: resolution,
          resolvedAt: incident.resolvedAt
        }
      });
      
      loggingService.logInfo(`Incident ${incidentId} resolved`, {
        resolution: resolution,
        resolvedAt: incident.resolvedAt
      });
      
    } catch (error) {
      loggingService.logError('Failed to resolve incident', error);
      throw error;
    }
  }

  /**
   * Get incident by ID
   */
  getIncident(incidentId) {
    return this.activeIncidents.get(incidentId);
  }

  /**
   * Get all active incidents
   */
  getActiveIncidents() {
    return Array.from(this.activeIncidents.values());
  }

  /**
   * Get incidents by team
   */
  getIncidentsByTeam(team) {
    return Array.from(this.activeIncidents.values()).filter(incident => 
      incident.assignment?.team === team
    );
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: true,
      running: this.isRunning,
      activeIncidents: this.activeIncidents.size,
      slaTimers: this.slaTimers.size,
      escalationTimers: this.escalationTimers.size,
      config: this.config
    };
  }
}

// Create singleton instance
const incidentTriageService = new IncidentTriageService();

export default incidentTriageService;
