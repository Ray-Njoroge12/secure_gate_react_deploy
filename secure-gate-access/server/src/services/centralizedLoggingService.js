/**
 * Centralized Logging Service for Secure Gate Access Control System
 * 
 * Provides structured and centralized logging capabilities
 * Features:
 * - JSON structured logging
 * - Centralized log aggregation (Grafana Loki/ELK)
 * - Retention policy management
 * - Audit traceability
 * - Compliance reporting
 */

import loggingService from './loggingService.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getCentralizedLoggingWarning } from '../utils/startupLogHygiene.js';

const execAsync = promisify(exec);

class CentralizedLoggingService {
  constructor() {
    this.config = {
      logging: {
        format: 'json',
        fields: [
          'timestamp',
          'trace_id',
          'actor',
          'action',
          'status',
          'rollback_status'
        ],
        level: process.env.LOG_LEVEL || 'info',
        enabled: true
      },
      centralization: {
        // Check if centralization is explicitly enabled or disabled
        enabled: process.env.LOGGING_CENTRALIZATION_ENABLED !== 'false' && 
                 (process.env.LOGGING_ENDPOINT ? true : false),
        endpoint: process.env.LOGGING_ENDPOINT || 'http://loki:3100',
        type: process.env.LOGGING_TYPE || 'loki', // loki, elk, fluentd
        batchSize: parseInt(process.env.LOGGING_BATCH_SIZE) || 100,
        flushInterval: parseInt(process.env.LOGGING_FLUSH_INTERVAL) || 5000,
        retryAttempts: parseInt(process.env.LOGGING_RETRY_ATTEMPTS) || 3,
        timeout: parseInt(process.env.LOGGING_TIMEOUT) || 30000
      },
      retention: {
        default: {
          period: '1_year',
          days: 365
        },
        financial_data: {
          period: '7_years',
          days: 2555
        },
        security_events: {
          period: '7_years',
          days: 2555
        },
        audit_logs: {
          period: '7_years',
          days: 2555
        },
        compliance_logs: {
          period: '7_years',
          days: 2555
        }
      },
      traceability: {
        enabled: true,
        traceIdGeneration: 'uuid',
        correlationIdEnabled: true,
        spanIdEnabled: true
      },
      compliance: {
        kenya_dpa: {
          enabled: true,
          requirements: [
            'audit_trail_maintenance',
            'data_processing_logs',
            'consent_management_logs',
            'data_subject_rights_logs'
          ]
        },
        gdpr: {
          enabled: true,
          requirements: [
            'audit_trail_maintenance',
            'data_processing_logs',
            'consent_management_logs',
            'data_subject_rights_logs'
          ]
        },
        iso27001: {
          enabled: true,
          requirements: [
            'security_event_logging',
            'access_control_logs',
            'incident_management_logs',
            'audit_trail_maintenance'
          ]
        }
      }
    };
    
    this.logBuffer = [];
    this.isRunning = false;
    this.flushInterval = null;
    this.traceIdMap = new Map();
    
    this.initializeService();
  }

  /**
   * Initialize centralized logging service
   */
  async initializeService() {
    try {
      const centralizedLoggingWarning = getCentralizedLoggingWarning({
        nodeEnv: process.env.NODE_ENV,
        loggingEndpoint: process.env.LOGGING_ENDPOINT,
        loggingCentralizationEnabled: process.env.LOGGING_CENTRALIZATION_ENABLED
      });

      // Log initialization status
      if (!this.config.centralization.enabled) {
        loggingService.logInfo('Centralized logging service initialized (centralization disabled)', {
          format: this.config.logging.format,
          centralizationEnabled: false,
          reason: process.env.LOGGING_CENTRALIZATION_ENABLED === 'true' && !process.env.LOGGING_ENDPOINT
            ? 'LOGGING_ENDPOINT not configured while LOGGING_CENTRALIZATION_ENABLED=true'
            : !process.env.LOGGING_ENDPOINT
              ? 'Centralization not configured'
              : 'Disabled via LOGGING_CENTRALIZATION_ENABLED',
          traceabilityEnabled: this.config.traceability.enabled
        });
        if (centralizedLoggingWarning) {
          console.log(centralizedLoggingWarning);
        }
        return;
      }

      loggingService.logInfo('Centralized logging service initialized', {
        format: this.config.logging.format,
        centralizationEnabled: this.config.centralization.enabled,
        endpoint: this.config.centralization.endpoint,
        traceabilityEnabled: this.config.traceability.enabled
      });
      
      // Start log processing only if centralization is enabled
      this.startLogProcessing();
      
    } catch (error) {
      loggingService.logError('Failed to initialize centralized logging service', error);
      throw error;
    }
  }

  /**
   * Start log processing
   */
  startLogProcessing() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Start flush interval
    this.flushInterval = setInterval(async () => {
      try {
        await this.flushLogs();
      } catch (error) {
        loggingService.logError('Log processing failed', error);
      }
    }, this.config.centralization.flushInterval);
    
    loggingService.logInfo('Centralized log processing started');
  }

  /**
   * Stop log processing
   */
  stopLogProcessing() {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush remaining logs
    this.flushLogs();
    
    loggingService.logInfo('Centralized log processing stopped');
  }

  /**
   * Log structured event
   */
  async logEvent(event) {
    try {
      const logEntry = await this.createLogEntry(event);
      
      // Add to buffer
      this.logBuffer.push(logEntry);
      
      // Flush if buffer is full
      if (this.logBuffer.length >= this.config.centralization.batchSize) {
        await this.flushLogs();
      }
      
    } catch (error) {
      loggingService.logError('Failed to log event', error);
    }
  }

  /**
   * Create structured log entry
   */
  async createLogEntry(event) {
    try {
      const traceId = this.generateTraceId();
      const timestamp = new Date().toISOString();
      
      const logEntry = {
        timestamp: timestamp,
        trace_id: traceId,
        actor: event.actor || 'system',
        action: event.action || 'unknown',
        status: event.status || 'info',
        rollback_status: event.rollback_status || 'none',
        level: event.level || this.config.logging.level,
        message: event.message || '',
        metadata: event.metadata || {},
        compliance: this.mapComplianceRequirements(event),
        retention: this.determineRetentionPolicy(event),
        correlation_id: event.correlation_id || this.generateCorrelationId(),
        span_id: event.span_id || this.generateSpanId()
      };
      
      // Store trace ID mapping
      this.traceIdMap.set(traceId, {
        timestamp: timestamp,
        actor: logEntry.actor,
        action: logEntry.action,
        status: logEntry.status
      });
      
      return logEntry;
      
    } catch (error) {
      loggingService.logError('Failed to create log entry', error);
      throw error;
    }
  }

  /**
   * Generate trace ID
   */
  generateTraceId() {
    if (this.config.traceability.traceIdGeneration === 'uuid') {
      return crypto.randomUUID();
    } else {
      return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Generate correlation ID
   */
  generateCorrelationId() {
    return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate span ID
   */
  generateSpanId() {
    return `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    
    // Financial data
    if (action.includes('financial') || action.includes('payment') || action.includes('transaction')) {
      return this.config.retention.financial_data;
    }
    
    // Security events
    if (action.includes('security') || action.includes('auth') || action.includes('access')) {
      return this.config.retention.security_events;
    }
    
    // Audit logs
    if (action.includes('audit') || action.includes('compliance') || action.includes('regulatory')) {
      return this.config.retention.audit_logs;
    }
    
    // Compliance logs
    if (action.includes('gdpr') || action.includes('kenya_dpa') || action.includes('iso27001')) {
      return this.config.retention.compliance_logs;
    }
    
    // Default retention
    return this.config.retention.default;
  }

  /**
   * Flush logs to centralized system
   */
  async flushLogs() {
    try {
      // Skip if centralization is disabled
      if (!this.config.centralization.enabled) {
        // Clear buffer to prevent memory buildup
        this.logBuffer = [];
        return;
      }

      if (this.logBuffer.length === 0) {
        return;
      }
      
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];
      
      // Send to centralized logging system
      await this.sendToCentralizedSystem(logsToFlush);
      
      loggingService.logInfo(`Flushed ${logsToFlush.length} log entries to centralized system`);
      
    } catch (error) {
      loggingService.logError('Failed to flush logs', error);
      
      // Re-add logs to buffer for retry
      this.logBuffer.unshift(...this.logBuffer);
    }
  }

  /**
   * Send logs to centralized system
   */
  async sendToCentralizedSystem(logs) {
    try {
      switch (this.config.centralization.type) {
        case 'loki':
          await this.sendToLoki(logs);
          break;
        case 'elk':
          await this.sendToELK(logs);
          break;
        case 'fluentd':
          await this.sendToFluentd(logs);
          break;
        default:
          await this.sendToLoki(logs);
      }
      
    } catch (error) {
      loggingService.logError('Failed to send logs to centralized system', error);
      throw error;
    }
  }

  /**
   * Send logs to Loki
   */
  async sendToLoki(logs) {
    try {
      const lokiEndpoint = `${this.config.centralization.endpoint}/loki/api/v1/push`;
      
      // Prepare Loki format
      const lokiLogs = logs.map(log => ({
        stream: {
          job: 'secure-gate-access',
          level: log.level,
          actor: log.actor,
          action: log.action,
          status: log.status,
          trace_id: log.trace_id
        },
        values: [
          [Date.now() * 1000000, JSON.stringify(log)]
        ]
      }));
      
      // Send to Loki
      const response = await fetch(lokiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ streams: lokiLogs })
      });
      
      if (!response.ok) {
        throw new Error(`Loki request failed: ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      loggingService.logError('Failed to send logs to Loki', error);
      throw error;
    }
  }

  /**
   * Send logs to ELK
   */
  async sendToELK(logs) {
    try {
      const elkEndpoint = `${this.config.centralization.endpoint}/secure-gate-access/_doc`;
      
      // Send each log individually
      for (const log of logs) {
        const response = await fetch(elkEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(log)
        });
        
        if (!response.ok) {
          throw new Error(`ELK request failed: ${response.status} ${response.statusText}`);
        }
      }
      
    } catch (error) {
      loggingService.logError('Failed to send logs to ELK', error);
      throw error;
    }
  }

  /**
   * Send logs to Fluentd
   */
  async sendToFluentd(logs) {
    try {
      const fluentdEndpoint = `${this.config.centralization.endpoint}/secure-gate-access`;
      
      // Send logs in batches
      const batchSize = 10;
      for (let i = 0; i < logs.length; i += batchSize) {
        const batch = logs.slice(i, i + batchSize);
        
        const response = await fetch(fluentdEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(batch)
        });
        
        if (!response.ok) {
          throw new Error(`Fluentd request failed: ${response.status} ${response.statusText}`);
        }
      }
      
    } catch (error) {
      loggingService.logError('Failed to send logs to Fluentd', error);
      throw error;
    }
  }

  /**
   * Query logs
   */
  async queryLogs(query) {
    try {
      switch (this.config.centralization.type) {
        case 'loki':
          return await this.queryLokiLogs(query);
        case 'elk':
          return await this.queryELKLogs(query);
        case 'fluentd':
          return await this.queryFluentdLogs(query);
        default:
          return await this.queryLokiLogs(query);
      }
      
    } catch (error) {
      loggingService.logError('Failed to query logs', error);
      throw error;
    }
  }

  /**
   * Query Loki logs
   */
  async queryLokiLogs(query) {
    try {
      const lokiEndpoint = `${this.config.centralization.endpoint}/loki/api/v1/query_range`;
      
      const response = await fetch(lokiEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(query)
      });
      
      if (!response.ok) {
        throw new Error(`Loki query failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      loggingService.logError('Failed to query Loki logs', error);
      throw error;
    }
  }

  /**
   * Query ELK logs
   */
  async queryELKLogs(query) {
    try {
      const elkEndpoint = `${this.config.centralization.endpoint}/secure-gate-access/_search`;
      
      const response = await fetch(elkEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(query)
      });
      
      if (!response.ok) {
        throw new Error(`ELK query failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      loggingService.logError('Failed to query ELK logs', error);
      throw error;
    }
  }

  /**
   * Query Fluentd logs
   */
  async queryFluentdLogs(query) {
    try {
      // Fluentd doesn't have built-in querying, would need to implement custom solution
      loggingService.logWarn('Fluentd querying not implemented');
      return { logs: [] };
      
    } catch (error) {
      loggingService.logError('Failed to query Fluentd logs', error);
      throw error;
    }
  }

  /**
   * Get trace information
   */
  getTraceInfo(traceId) {
    return this.traceIdMap.get(traceId);
  }

  /**
   * Get all traces
   */
  getAllTraces() {
    return Array.from(this.traceIdMap.entries()).map(([traceId, info]) => ({
      trace_id: traceId,
      ...info
    }));
  }

  /**
   * Get traces by actor
   */
  getTracesByActor(actor) {
    return this.getAllTraces().filter(trace => trace.actor === actor);
  }

  /**
   * Get traces by action
   */
  getTracesByAction(action) {
    return this.getAllTraces().filter(trace => trace.action === action);
  }

  /**
   * Get traces by status
   */
  getTracesByStatus(status) {
    return this.getAllTraces().filter(trace => trace.status === status);
  }

  /**
   * Clean up old traces
   */
  async cleanupOldTraces() {
    try {
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      
      for (const [traceId, info] of this.traceIdMap.entries()) {
        if (new Date(info.timestamp).getTime() < cutoffTime) {
          this.traceIdMap.delete(traceId);
        }
      }
      
      loggingService.logInfo(`Cleaned up old traces, remaining: ${this.traceIdMap.size}`);
      
    } catch (error) {
      loggingService.logError('Failed to cleanup old traces', error);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: true,
      running: this.isRunning,
      logBuffer: this.logBuffer.length,
      traces: this.traceIdMap.size,
      config: this.config
    };
  }
}

// Create singleton instance
const centralizedLoggingService = new CentralizedLoggingService();

export default centralizedLoggingService;
