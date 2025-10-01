/**
 * Threat Intelligence Service for Secure Gate Access Control System
 * 
 * Provides integration with open-source and commercial threat intelligence feeds
 * Features:
 * - Malicious IP address feeds
 * - Malicious domain feeds
 * - File hash feeds
 * - Auto-blocking for flagged entities
 * - False positive detection and rollback
 */

import loggingService from './loggingService.js';
import centralizedLoggingService from './centralizedLoggingService.js';
import auditTraceabilityService from './auditTraceabilityService.js';
import rollbackAlertingService from './rollbackAlertingService.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

const execAsync = promisify(exec);

class ThreatIntelligenceService {
  constructor() {
    this.config = {
      threat_intel: {
        enabled: true,
        update_frequency: 'hourly',
        auto_blocking: true,
        false_positive_detection: true,
        reporting: {
          format: 'json',
          recipients: ['security@securegate.com', 'soc@securegate.com'],
          outputDirectory: '/app/threat_intelligence'
        }
      },
      feeds: {
        malicious_ips: {
          enabled: true,
          sources: [
            {
              name: 'AbuseIPDB',
              url: 'https://api.abuseipdb.com/api/v2/blacklist',
              api_key: process.env.ABUSEIPDB_API_KEY || '',
              format: 'json',
              update_interval: 3600000 // 1 hour
            },
            {
              name: 'BlocklistDE',
              url: 'https://lists.blocklist.de/lists/all.txt',
              api_key: '',
              format: 'text',
              update_interval: 3600000 // 1 hour
            },
            {
              name: 'FireHOL',
              url: 'https://iplists.firehol.org/files/firehol_level1.netset',
              api_key: '',
              format: 'netset',
              update_interval: 3600000 // 1 hour
            }
          ]
        },
        malicious_domains: {
          enabled: true,
          sources: [
            {
              name: 'Malware Domain List',
              url: 'https://www.malwaredomainlist.com/hostslist/hosts.txt',
              api_key: '',
              format: 'hosts',
              update_interval: 3600000 // 1 hour
            },
            {
              name: 'PhishTank',
              url: 'https://data.phishtank.com/data/online-valid.csv',
              api_key: process.env.PHISHTANK_API_KEY || '',
              format: 'csv',
              update_interval: 3600000 // 1 hour
            },
            {
              name: 'URLHaus',
              url: 'https://urlhaus.abuse.ch/downloads/csv_recent/',
              api_key: '',
              format: 'csv',
              update_interval: 3600000 // 1 hour
            }
          ]
        },
        file_hashes: {
          enabled: true,
          sources: [
            {
              name: 'VirusTotal',
              url: 'https://www.virustotal.com/vtapi/v2/file/report',
              api_key: process.env.VIRUSTOTAL_API_KEY || '',
              format: 'json',
              update_interval: 3600000 // 1 hour
            },
            {
              name: 'MalwareBazaar',
              url: 'https://bazaar.abuse.ch/export/csv/recent/',
              api_key: '',
              format: 'csv',
              update_interval: 3600000 // 1 hour
            },
            {
              name: 'Hybrid Analysis',
              url: 'https://www.hybrid-analysis.com/api/v2/feed/hash',
              api_key: process.env.HYBRID_ANALYSIS_API_KEY || '',
              format: 'json',
              update_interval: 3600000 // 1 hour
            }
          ]
        }
      },
      auto_blocking: {
        enabled: true,
        ip_blocking: {
          enabled: true,
          action: 'block',
          duration: 86400000, // 24 hours
          whitelist: ['127.0.0.1', '::1'] // Localhost
        },
        domain_blocking: {
          enabled: true,
          action: 'block',
          duration: 86400000, // 24 hours
          whitelist: ['localhost', 'securegate.com']
        },
        file_blocking: {
          enabled: true,
          action: 'quarantine',
          duration: 604800000 // 7 days
        }
      },
      false_positive_detection: {
        enabled: true,
        confidence_threshold: 0.8,
        review_period: 3600000, // 1 hour
        auto_rollback: true
      },
      monitoring: {
        enabled: true,
        interval: 30000, // 30 seconds
        metrics: [
          'feeds_updated',
          'threats_detected',
          'auto_blocks_applied',
          'false_positives_detected',
          'rollbacks_executed'
        ]
      }
    };
    
    this.threatData = {
      malicious_ips: new Set(),
      malicious_domains: new Set(),
      malicious_hashes: new Set()
    };
    
    this.blockedEntities = {
      ips: new Map(),
      domains: new Map(),
      files: new Map()
    };
    
    this.falsePositives = [];
    this.feedUpdateHistory = [];
    this.isRunning = false;
    
    this.initializeService();
  }

  /**
   * Initialize threat intelligence service
   */
  async initializeService() {
    try {
      loggingService.logInfo('Threat intelligence service initialized', {
        enabled: this.config.threat_intel.enabled,
        auto_blocking: this.config.auto_blocking.enabled,
        false_positive_detection: this.config.false_positive_detection.enabled,
        ip_feeds: this.config.feeds.malicious_ips.sources.length,
        domain_feeds: this.config.feeds.malicious_domains.sources.length,
        hash_feeds: this.config.feeds.file_hashes.sources.length
      });
      
      // Create threat intelligence directory
      await this.createThreatIntelligenceDirectory();
      
      // Load initial threat data
      await this.loadInitialThreatData();
      
      // Start monitoring
      this.startThreatIntelligenceMonitoring();
      
    } catch (error) {
      loggingService.logError('Failed to initialize threat intelligence service', error);
      throw error;
    }
  }

  /**
   * Create threat intelligence directory
   */
  async createThreatIntelligenceDirectory() {
    try {
      await fs.mkdir(this.config.threat_intel.reporting.outputDirectory, { recursive: true });
      loggingService.logInfo(`Created threat intelligence directory: ${this.config.threat_intel.reporting.outputDirectory}`);
    } catch (error) {
      loggingService.logError('Failed to create threat intelligence directory', error);
      throw error;
    }
  }

  /**
   * Load initial threat data
   */
  async loadInitialThreatData() {
    try {
      // Load malicious IPs
      if (this.config.feeds.malicious_ips.enabled) {
        await this.updateMaliciousIPFeeds();
      }
      
      // Load malicious domains
      if (this.config.feeds.malicious_domains.enabled) {
        await this.updateMaliciousDomainFeeds();
      }
      
      // Load malicious hashes
      if (this.config.feeds.file_hashes.enabled) {
        await this.updateMaliciousHashFeeds();
      }
      
    } catch (error) {
      loggingService.logError('Failed to load initial threat data', error);
    }
  }

  /**
   * Start threat intelligence monitoring
   */
  startThreatIntelligenceMonitoring() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Monitor threat intelligence every 30 seconds
    setInterval(async () => {
      try {
        await this.collectThreatIntelligenceMetrics();
      } catch (error) {
        loggingService.logError('Threat intelligence monitoring failed', error);
      }
    }, this.config.monitoring.interval);
    
    // Schedule feed updates
    this.scheduleFeedUpdates();
    
    loggingService.logInfo('Threat intelligence monitoring started');
  }

  /**
   * Schedule feed updates
   */
  scheduleFeedUpdates() {
    // Update malicious IP feeds
    if (this.config.feeds.malicious_ips.enabled) {
      setInterval(async () => {
        try {
          await this.updateMaliciousIPFeeds();
        } catch (error) {
          loggingService.logError('Failed to update malicious IP feeds', error);
        }
      }, this.config.feeds.malicious_ips.sources[0].update_interval);
    }
    
    // Update malicious domain feeds
    if (this.config.feeds.malicious_domains.enabled) {
      setInterval(async () => {
        try {
          await this.updateMaliciousDomainFeeds();
        } catch (error) {
          loggingService.logError('Failed to update malicious domain feeds', error);
        }
      }, this.config.feeds.malicious_domains.sources[0].update_interval);
    }
    
    // Update malicious hash feeds
    if (this.config.feeds.file_hashes.enabled) {
      setInterval(async () => {
        try {
          await this.updateMaliciousHashFeeds();
        } catch (error) {
          loggingService.logError('Failed to update malicious hash feeds', error);
        }
      }, this.config.feeds.file_hashes.sources[0].update_interval);
    }
  }

  /**
   * Collect threat intelligence metrics
   */
  async collectThreatIntelligenceMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        feeds_updated: this.feedUpdateHistory.length,
        threats_detected: this.threatData.malicious_ips.size + this.threatData.malicious_domains.size + this.threatData.malicious_hashes.size,
        auto_blocks_applied: this.blockedEntities.ips.size + this.blockedEntities.domains.size + this.blockedEntities.files.size,
        false_positives_detected: this.falsePositives.length,
        rollbacks_executed: this.falsePositives.filter(fp => fp.rollback_executed).length
      };
      
      // Log to centralized logging
      await centralizedLoggingService.logEvent({
        trace_id: this.generateTraceId(),
        actor: 'threat_intelligence_service',
        action: 'collect_threat_intelligence_metrics',
        status: 'success',
        metadata: metrics
      });
      
    } catch (error) {
      loggingService.logError('Failed to collect threat intelligence metrics', error);
    }
  }

  /**
   * Update malicious IP feeds
   */
  async updateMaliciousIPFeeds() {
    try {
      const sources = this.config.feeds.malicious_ips.sources;
      let totalIPs = 0;
      
      for (const source of sources) {
        try {
          const ips = await this.fetchMaliciousIPs(source);
          ips.forEach(ip => this.threatData.malicious_ips.add(ip));
          totalIPs += ips.length;
          
          loggingService.logInfo(`Updated malicious IPs from ${source.name}`, {
            source: source.name,
            ips_count: ips.length
          });
          
        } catch (error) {
          loggingService.logError(`Failed to update malicious IPs from ${source.name}`, error);
        }
      }
      
      // Record feed update
      this.feedUpdateHistory.push({
        timestamp: new Date().toISOString(),
        feed_type: 'malicious_ips',
        total_ips: totalIPs,
        cumulative_ips: this.threatData.malicious_ips.size
      });
      
      // Log feed update event
      await this.logThreatIntelligenceEvent('feed_updated', {
        feed_type: 'malicious_ips',
        total_ips: totalIPs,
        cumulative_ips: this.threatData.malicious_ips.size
      });
      
    } catch (error) {
      loggingService.logError('Failed to update malicious IP feeds', error);
    }
  }

  /**
   * Fetch malicious IPs from source
   */
  async fetchMaliciousIPs(source) {
    try {
      const response = await axios.get(source.url, {
        headers: source.api_key ? { 'Authorization': `Bearer ${source.api_key}` } : {},
        timeout: 30000
      });
      
      let ips = [];
      
      switch (source.format) {
        case 'json':
          ips = this.parseJSONIPs(response.data);
          break;
        case 'text':
          ips = this.parseTextIPs(response.data);
          break;
        case 'netset':
          ips = this.parseNetsetIPs(response.data);
          break;
        default:
          loggingService.logWarn(`Unknown IP feed format: ${source.format}`);
      }
      
      return ips;
      
    } catch (error) {
      loggingService.logError(`Failed to fetch malicious IPs from ${source.name}`, error);
      return [];
    }
  }

  /**
   * Parse JSON IPs
   */
  parseJSONIPs(data) {
    try {
      if (Array.isArray(data)) {
        return data.map(item => item.ip || item).filter(ip => this.isValidIP(ip));
      } else if (data.data && Array.isArray(data.data)) {
        return data.data.map(item => item.ip || item).filter(ip => this.isValidIP(ip));
      }
      return [];
    } catch (error) {
      loggingService.logError('Failed to parse JSON IPs', error);
      return [];
    }
  }

  /**
   * Parse text IPs
   */
  parseTextIPs(data) {
    try {
      return data.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .filter(ip => this.isValidIP(ip));
    } catch (error) {
      loggingService.logError('Failed to parse text IPs', error);
      return [];
    }
  }

  /**
   * Parse netset IPs
   */
  parseNetsetIPs(data) {
    try {
      return data.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#') && !line.startsWith('['))
        .filter(ip => this.isValidIP(ip));
    } catch (error) {
      loggingService.logError('Failed to parse netset IPs', error);
      return [];
    }
  }

  /**
   * Update malicious domain feeds
   */
  async updateMaliciousDomainFeeds() {
    try {
      const sources = this.config.feeds.malicious_domains.sources;
      let totalDomains = 0;
      
      for (const source of sources) {
        try {
          const domains = await this.fetchMaliciousDomains(source);
          domains.forEach(domain => this.threatData.malicious_domains.add(domain));
          totalDomains += domains.length;
          
          loggingService.logInfo(`Updated malicious domains from ${source.name}`, {
            source: source.name,
            domains_count: domains.length
          });
          
        } catch (error) {
          loggingService.logError(`Failed to update malicious domains from ${source.name}`, error);
        }
      }
      
      // Record feed update
      this.feedUpdateHistory.push({
        timestamp: new Date().toISOString(),
        feed_type: 'malicious_domains',
        total_domains: totalDomains,
        cumulative_domains: this.threatData.malicious_domains.size
      });
      
      // Log feed update event
      await this.logThreatIntelligenceEvent('feed_updated', {
        feed_type: 'malicious_domains',
        total_domains: totalDomains,
        cumulative_domains: this.threatData.malicious_domains.size
      });
      
    } catch (error) {
      loggingService.logError('Failed to update malicious domain feeds', error);
    }
  }

  /**
   * Fetch malicious domains from source
   */
  async fetchMaliciousDomains(source) {
    try {
      const response = await axios.get(source.url, {
        headers: source.api_key ? { 'Authorization': `Bearer ${source.api_key}` } : {},
        timeout: 30000
      });
      
      let domains = [];
      
      switch (source.format) {
        case 'hosts':
          domains = this.parseHostsDomains(response.data);
          break;
        case 'csv':
          domains = this.parseCSVDomains(response.data);
          break;
        default:
          loggingService.logWarn(`Unknown domain feed format: ${source.format}`);
      }
      
      return domains;
      
    } catch (error) {
      loggingService.logError(`Failed to fetch malicious domains from ${source.name}`, error);
      return [];
    }
  }

  /**
   * Parse hosts domains
   */
  parseHostsDomains(data) {
    try {
      return data.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => line.split(/\s+/)[1])
        .filter(domain => domain && this.isValidDomain(domain));
    } catch (error) {
      loggingService.logError('Failed to parse hosts domains', error);
      return [];
    }
  }

  /**
   * Parse CSV domains
   */
  parseCSVDomains(data) {
    try {
      const lines = data.split('\n');
      const domains = [];
      
      for (let i = 1; i < lines.length; i++) { // Skip header
        const columns = lines[i].split(',');
        if (columns.length > 0) {
          const domain = columns[0].trim().replace(/"/g, '');
          if (domain && this.isValidDomain(domain)) {
            domains.push(domain);
          }
        }
      }
      
      return domains;
    } catch (error) {
      loggingService.logError('Failed to parse CSV domains', error);
      return [];
    }
  }

  /**
   * Update malicious hash feeds
   */
  async updateMaliciousHashFeeds() {
    try {
      const sources = this.config.feeds.file_hashes.sources;
      let totalHashes = 0;
      
      for (const source of sources) {
        try {
          const hashes = await this.fetchMaliciousHashes(source);
          hashes.forEach(hash => this.threatData.malicious_hashes.add(hash));
          totalHashes += hashes.length;
          
          loggingService.logInfo(`Updated malicious hashes from ${source.name}`, {
            source: source.name,
            hashes_count: hashes.length
          });
          
        } catch (error) {
          loggingService.logError(`Failed to update malicious hashes from ${source.name}`, error);
        }
      }
      
      // Record feed update
      this.feedUpdateHistory.push({
        timestamp: new Date().toISOString(),
        feed_type: 'malicious_hashes',
        total_hashes: totalHashes,
        cumulative_hashes: this.threatData.malicious_hashes.size
      });
      
      // Log feed update event
      await this.logThreatIntelligenceEvent('feed_updated', {
        feed_type: 'malicious_hashes',
        total_hashes: totalHashes,
        cumulative_hashes: this.threatData.malicious_hashes.size
      });
      
    } catch (error) {
      loggingService.logError('Failed to update malicious hash feeds', error);
    }
  }

  /**
   * Fetch malicious hashes from source
   */
  async fetchMaliciousHashes(source) {
    try {
      const response = await axios.get(source.url, {
        headers: source.api_key ? { 'Authorization': `Bearer ${source.api_key}` } : {},
        timeout: 30000
      });
      
      let hashes = [];
      
      switch (source.format) {
        case 'json':
          hashes = this.parseJSONHashes(response.data);
          break;
        case 'csv':
          hashes = this.parseCSVHashes(response.data);
          break;
        default:
          loggingService.logWarn(`Unknown hash feed format: ${source.format}`);
      }
      
      return hashes;
      
    } catch (error) {
      loggingService.logError(`Failed to fetch malicious hashes from ${source.name}`, error);
      return [];
    }
  }

  /**
   * Parse JSON hashes
   */
  parseJSONHashes(data) {
    try {
      if (Array.isArray(data)) {
        return data.map(item => item.hash || item.sha256 || item).filter(hash => this.isValidHash(hash));
      } else if (data.data && Array.isArray(data.data)) {
        return data.data.map(item => item.hash || item.sha256 || item).filter(hash => this.isValidHash(hash));
      }
      return [];
    } catch (error) {
      loggingService.logError('Failed to parse JSON hashes', error);
      return [];
    }
  }

  /**
   * Parse CSV hashes
   */
  parseCSVHashes(data) {
    try {
      const lines = data.split('\n');
      const hashes = [];
      
      for (let i = 1; i < lines.length; i++) { // Skip header
        const columns = lines[i].split(',');
        if (columns.length > 0) {
          const hash = columns[0].trim().replace(/"/g, '');
          if (hash && this.isValidHash(hash)) {
            hashes.push(hash);
          }
        }
      }
      
      return hashes;
    } catch (error) {
      loggingService.logError('Failed to parse CSV hashes', error);
      return [];
    }
  }

  /**
   * Check if entity is malicious
   */
  async checkEntity(entity, entityType) {
    try {
      const traceId = this.generateTraceId();
      
      let isMalicious = false;
      let confidence = 0;
      
      switch (entityType) {
        case 'ip':
          isMalicious = this.threatData.malicious_ips.has(entity);
          confidence = isMalicious ? 0.9 : 0.1;
          break;
        case 'domain':
          isMalicious = this.threatData.malicious_domains.has(entity);
          confidence = isMalicious ? 0.9 : 0.1;
          break;
        case 'hash':
          isMalicious = this.threatData.malicious_hashes.has(entity);
          confidence = isMalicious ? 0.9 : 0.1;
          break;
        default:
          loggingService.logWarn(`Unknown entity type: ${entityType}`);
          return { isMalicious: false, confidence: 0 };
      }
      
      // Log threat check event
      await this.logThreatIntelligenceEvent('entity_checked', {
        entity,
        entity_type: entityType,
        is_malicious: isMalicious,
        confidence,
        trace_id: traceId
      });
      
      // Auto-block if malicious and auto-blocking is enabled
      if (isMalicious && this.config.auto_blocking.enabled) {
        await this.autoBlockEntity(entity, entityType, confidence);
      }
      
      return { isMalicious, confidence, traceId };
      
    } catch (error) {
      loggingService.logError(`Failed to check entity: ${entity}`, error);
      return { isMalicious: false, confidence: 0, error: error.message };
    }
  }

  /**
   * Auto-block malicious entity
   */
  async autoBlockEntity(entity, entityType, confidence) {
    try {
      const blockId = this.generateBlockId();
      const blockDuration = this.getBlockDuration(entityType);
      
      const blockRecord = {
        id: blockId,
        entity,
        entity_type: entityType,
        confidence,
        blocked_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + blockDuration).toISOString(),
        action: this.getBlockAction(entityType),
        auto_blocked: true
      };
      
      // Store block record
      this.blockedEntities[entityType + 's'].set(entity, blockRecord);
      
      // Execute blocking action
      await this.executeBlockAction(blockRecord);
      
      // Log block event
      await this.logThreatIntelligenceEvent('entity_blocked', {
        block_id: blockId,
        entity,
        entity_type: entityType,
        confidence,
        action: blockRecord.action
      });
      
      loggingService.logWarn(`Entity auto-blocked: ${entity} (${entityType})`, {
        block_id: blockId,
        confidence,
        action: blockRecord.action
      });
      
    } catch (error) {
      loggingService.logError(`Failed to auto-block entity: ${entity}`, error);
    }
  }

  /**
   * Get block duration for entity type
   */
  getBlockDuration(entityType) {
    switch (entityType) {
      case 'ip':
        return this.config.auto_blocking.ip_blocking.duration;
      case 'domain':
        return this.config.auto_blocking.domain_blocking.duration;
      case 'hash':
        return this.config.auto_blocking.file_blocking.duration;
      default:
        return 86400000; // 24 hours default
    }
  }

  /**
   * Get block action for entity type
   */
  getBlockAction(entityType) {
    switch (entityType) {
      case 'ip':
        return this.config.auto_blocking.ip_blocking.action;
      case 'domain':
        return this.config.auto_blocking.domain_blocking.action;
      case 'hash':
        return this.config.auto_blocking.file_blocking.action;
      default:
        return 'block';
    }
  }

  /**
   * Execute block action
   */
  async executeBlockAction(blockRecord) {
    try {
      switch (blockRecord.action) {
        case 'block':
          await this.blockEntity(blockRecord);
          break;
        case 'quarantine':
          await this.quarantineEntity(blockRecord);
          break;
        default:
          loggingService.logWarn(`Unknown block action: ${blockRecord.action}`);
      }
      
    } catch (error) {
      loggingService.logError(`Failed to execute block action: ${blockRecord.action}`, error);
    }
  }

  /**
   * Block entity
   */
  async blockEntity(blockRecord) {
    try {
      // This would implement actual blocking logic
      // For now, log the action
      loggingService.logWarn(`Entity blocked: ${blockRecord.entity} (${blockRecord.entity_type})`);
      
    } catch (error) {
      loggingService.logError(`Failed to block entity: ${blockRecord.entity}`, error);
    }
  }

  /**
   * Quarantine entity
   */
  async quarantineEntity(blockRecord) {
    try {
      // This would implement actual quarantine logic
      // For now, log the action
      loggingService.logWarn(`Entity quarantined: ${blockRecord.entity} (${blockRecord.entity_type})`);
      
    } catch (error) {
      loggingService.logError(`Failed to quarantine entity: ${blockRecord.entity}`, error);
    }
  }

  /**
   * Detect false positive
   */
  async detectFalsePositive(entity, entityType, reason) {
    try {
      const falsePositive = {
        id: this.generateFalsePositiveId(),
        entity,
        entity_type: entityType,
        reason,
        detected_at: new Date().toISOString(),
        confidence: this.config.false_positive_detection.confidence_threshold,
        rollback_executed: false
      };
      
      // Store false positive
      this.falsePositives.push(falsePositive);
      
      // Auto-rollback if enabled
      if (this.config.false_positive_detection.auto_rollback) {
        await this.rollbackFalsePositive(falsePositive);
      }
      
      // Log false positive event
      await this.logThreatIntelligenceEvent('false_positive_detected', {
        false_positive_id: falsePositive.id,
        entity,
        entity_type: entityType,
        reason
      });
      
      loggingService.logWarn(`False positive detected: ${entity} (${entityType})`, {
        false_positive_id: falsePositive.id,
        reason
      });
      
    } catch (error) {
      loggingService.logError(`Failed to detect false positive: ${entity}`, error);
    }
  }

  /**
   * Rollback false positive
   */
  async rollbackFalsePositive(falsePositive) {
    try {
      // Remove from blocked entities
      this.blockedEntities[falsePositive.entity_type + 's'].delete(falsePositive.entity);
      
      // Remove from threat data
      switch (falsePositive.entity_type) {
        case 'ip':
          this.threatData.malicious_ips.delete(falsePositive.entity);
          break;
        case 'domain':
          this.threatData.malicious_domains.delete(falsePositive.entity);
          break;
        case 'hash':
          this.threatData.malicious_hashes.delete(falsePositive.entity);
          break;
      }
      
      // Mark rollback as executed
      falsePositive.rollback_executed = true;
      
      // Log rollback event
      await this.logThreatIntelligenceEvent('false_positive_rollback', {
        false_positive_id: falsePositive.id,
        entity: falsePositive.entity,
        entity_type: falsePositive.entity_type
      });
      
      loggingService.logInfo(`False positive rollback executed: ${falsePositive.entity}`, {
        false_positive_id: falsePositive.id
      });
      
    } catch (error) {
      loggingService.logError(`Failed to rollback false positive: ${falsePositive.entity}`, error);
    }
  }

  /**
   * Validate IP address
   */
  isValidIP(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Validate domain
   */
  isValidDomain(domain) {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return domainRegex.test(domain);
  }

  /**
   * Validate hash
   */
  isValidHash(hash) {
    const hashRegex = /^[a-fA-F0-9]{32,64}$/;
    return hashRegex.test(hash);
  }

  /**
   * Log threat intelligence event
   */
  async logThreatIntelligenceEvent(eventType, metadata) {
    try {
      const event = {
        trace_id: this.generateTraceId(),
        actor: 'threat_intelligence_service',
        action: `threat_intel_${eventType}`,
        status: 'info',
        metadata
      };
      
      // Log to centralized logging
      await centralizedLoggingService.logEvent(event);
      
      // Log audit event
      await auditTraceabilityService.logAuditEvent(event);
      
    } catch (error) {
      loggingService.logError('Failed to log threat intelligence event', error);
    }
  }

  /**
   * Generate block ID
   */
  generateBlockId() {
    return `BLOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate false positive ID
   */
  generateFalsePositiveId() {
    return `FP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate trace ID
   */
  generateTraceId() {
    return `TRACE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Get threat intelligence status
   */
  getThreatIntelligenceStatus() {
    return {
      initialized: true,
      running: this.isRunning,
      threat_data: {
        malicious_ips: this.threatData.malicious_ips.size,
        malicious_domains: this.threatData.malicious_domains.size,
        malicious_hashes: this.threatData.malicious_hashes.size
      },
      blocked_entities: {
        ips: this.blockedEntities.ips.size,
        domains: this.blockedEntities.domains.size,
        files: this.blockedEntities.files.size
      },
      false_positives: this.falsePositives.length,
      feed_updates: this.feedUpdateHistory.length,
      config: this.config
    };
  }

  /**
   * Get blocked entities
   */
  getBlockedEntities() {
    return this.blockedEntities;
  }

  /**
   * Get false positives
   */
  getFalsePositives() {
    return this.falsePositives;
  }

  /**
   * Get feed update history
   */
  getFeedUpdateHistory() {
    return this.feedUpdateHistory;
  }
}

// Create singleton instance
const threatIntelligenceService = new ThreatIntelligenceService();

export default threatIntelligenceService;
