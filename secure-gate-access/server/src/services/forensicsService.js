/**
 * Forensics & Evidence Collection Service for Secure Gate Access Control System
 * 
 * Provides automated forensics data collection and evidence management
 * Features:
 * - Automated evidence collection
 * - Encrypted storage in Vault
 * - Immutable evidence repository
 * - Compliance tracking
 */

import loggingService from './loggingService.js';
import notificationService from './notificationService.js';
import vaultService from './vaultService.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class ForensicsService {
  constructor() {
    this.config = {
      evidence: {
        directory: process.env.EVIDENCE_DIR || '/app/evidence',
        vaultPath: process.env.EVIDENCE_VAULT_PATH || 'evidence',
        encryption: {
          algorithm: 'aes-256-gcm',
          keyLength: 32,
          ivLength: 16
        },
        retention: {
          days: parseInt(process.env.EVIDENCE_RETENTION_DAYS) || 2555, // 7 years
          immutable: true
        }
      },
      collection: {
        enabled: true,
        timeout: parseInt(process.env.FORENSICS_TIMEOUT) || 300, // 5 minutes
        retryAttempts: parseInt(process.env.FORENSICS_RETRY_ATTEMPTS) || 3,
        parallel: parseInt(process.env.FORENSICS_PARALLEL) || 5
      },
      dataSources: {
        logs: {
          enabled: true,
          paths: [
            '/var/log/secure-gate/',
            '/var/log/postgresql/',
            '/var/log/redis/',
            '/var/log/vault/',
            '/var/log/nginx/',
            '/var/log/syslog'
          ],
          patterns: [
            '*.log',
            '*.audit',
            '*.trace'
          ]
        },
        memory: {
          enabled: true,
          dumpPath: '/tmp/memory_dumps',
          tools: ['gcore', 'gdb', 'volatility']
        },
        network: {
          enabled: true,
          capturePath: '/tmp/network_captures',
          tools: ['tcpdump', 'wireshark', 'netstat']
        },
        filesystem: {
          enabled: true,
          paths: [
            '/etc/secure-gate/',
            '/var/lib/secure-gate/',
            '/home/secure-gate/'
          ],
          patterns: [
            '*.conf',
            '*.key',
            '*.cert',
            '*.pem'
          ]
        },
        database: {
          enabled: true,
          dumpPath: '/tmp/database_dumps',
          tables: [
            'users',
            'visitors',
            'access_logs',
            'audit_logs',
            'security_events'
          ]
        }
      },
      compliance: {
        kenya_dpa: {
          enabled: true,
          requirements: [
            'data_breach_evidence',
            'audit_trail_preservation',
            'forensic_investigation'
          ]
        },
        gdpr: {
          enabled: true,
          requirements: [
            'data_breach_evidence',
            'audit_trail_preservation',
            'forensic_investigation'
          ]
        },
        iso27001: {
          enabled: true,
          requirements: [
            'incident_evidence',
            'forensic_analysis',
            'evidence_preservation'
          ]
        }
      }
    };
    
    this.activeCollections = new Map();
    this.evidenceRepository = new Map();
    this.isRunning = false;
    
    this.initializeService();
  }

  /**
   * Initialize forensics service
   */
  async initializeService() {
    try {
      loggingService.logInfo('Forensics service initialized', {
        evidenceDirectory: this.config.evidence.directory,
        collectionEnabled: this.config.collection.enabled,
        dataSourcesCount: Object.keys(this.config.dataSources).length
      });
      
      // Initialize evidence directory
      await this.initializeEvidenceDirectory();
      
      // Initialize Vault evidence path
      await this.initializeVaultEvidencePath();
      
    } catch (error) {
      loggingService.logError('Failed to initialize forensics service', error);
      throw error;
    }
  }

  /**
   * Initialize evidence directory
   */
  async initializeEvidenceDirectory() {
    try {
      // Create evidence directory
      await fs.mkdir(this.config.evidence.directory, { recursive: true });
      
      // Create subdirectories
      const subdirs = ['logs', 'memory', 'network', 'filesystem', 'database', 'reports'];
      for (const subdir of subdirs) {
        await fs.mkdir(path.join(this.config.evidence.directory, subdir), { recursive: true });
      }
      
      // Set permissions
      await execAsync(`chmod 750 ${this.config.evidence.directory}`);
      await execAsync(`chown -R secure-gate:secure-gate ${this.config.evidence.directory}`);
      
      loggingService.logInfo('Evidence directory initialized');
      
    } catch (error) {
      loggingService.logError('Failed to initialize evidence directory', error);
      throw error;
    }
  }

  /**
   * Initialize Vault evidence path
   */
  async initializeVaultEvidencePath() {
    try {
      // Enable KV secrets engine for evidence
      await vaultService.writeSecret(`${this.config.evidence.vaultPath}/config`, {
        enabled: true,
        description: 'Evidence storage for forensics'
      });
      
      loggingService.logInfo('Vault evidence path initialized');
      
    } catch (error) {
      loggingService.logError('Failed to initialize Vault evidence path', error);
      throw error;
    }
  }

  /**
   * Collect evidence for incident
   */
  async collectEvidence(incident) {
    try {
      const incidentId = incident.id;
      const category = incident.category;
      const severity = incident.severity;
      
      loggingService.logInfo(`Starting evidence collection for incident ${incidentId}`, {
        category: category,
        severity: severity
      });
      
      // Create evidence collection record
      const collection = {
        id: this.generateCollectionId(),
        incidentId: incidentId,
        category: category,
        severity: severity,
        status: 'running',
        startedAt: new Date(),
        evidence: [],
        errors: []
      };
      
      // Store collection
      this.activeCollections.set(collection.id, collection);
      
      // Collect evidence from all sources
      await this.collectFromAllSources(collection);
      
      // Encrypt and store evidence
      await this.encryptAndStoreEvidence(collection);
      
      // Generate evidence report
      await this.generateEvidenceReport(collection);
      
      // Update collection status
      collection.status = 'completed';
      collection.completedAt = new Date();
      
      // Move to repository
      this.evidenceRepository.set(collection.id, collection);
      this.activeCollections.delete(collection.id);
      
      // Notify completion
      await this.notifyEvidenceCollection(incident, collection);
      
      loggingService.logInfo(`Evidence collection completed for incident ${incidentId}`, {
        collectionId: collection.id,
        evidenceCount: collection.evidence.length,
        duration: collection.completedAt - collection.startedAt
      });
      
      return collection;
      
    } catch (error) {
      loggingService.logError('Failed to collect evidence', error);
      throw error;
    }
  }

  /**
   * Collect evidence from all sources
   */
  async collectFromAllSources(collection) {
    try {
      const sources = Object.keys(this.config.dataSources);
      const promises = [];
      
      // Collect from each source in parallel
      for (const source of sources) {
        if (this.config.dataSources[source].enabled) {
          promises.push(this.collectFromSource(collection, source));
        }
      }
      
      // Wait for all collections to complete
      await Promise.allSettled(promises);
      
    } catch (error) {
      loggingService.logError('Failed to collect from all sources', error);
      throw error;
    }
  }

  /**
   * Collect evidence from specific source
   */
  async collectFromSource(collection, source) {
    try {
      const sourceConfig = this.config.dataSources[source];
      
      switch (source) {
        case 'logs':
          await this.collectLogEvidence(collection, sourceConfig);
          break;
        case 'memory':
          await this.collectMemoryEvidence(collection, sourceConfig);
          break;
        case 'network':
          await this.collectNetworkEvidence(collection, sourceConfig);
          break;
        case 'filesystem':
          await this.collectFilesystemEvidence(collection, sourceConfig);
          break;
        case 'database':
          await this.collectDatabaseEvidence(collection, sourceConfig);
          break;
        default:
          loggingService.logWarn(`Unknown evidence source: ${source}`);
      }
      
    } catch (error) {
      loggingService.logError(`Failed to collect evidence from source: ${source}`, error);
      collection.errors.push({
        source: source,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Collect log evidence
   */
  async collectLogEvidence(collection, config) {
    try {
      const evidenceId = this.generateEvidenceId();
      const evidencePath = path.join(this.config.evidence.directory, 'logs', `${collection.incidentId}_${evidenceId}.tar.gz`);
      
      // Collect logs from all configured paths
      const logPaths = config.paths.join(' ');
      const command = `tar -czf ${evidencePath} ${logPaths} 2>/dev/null || true`;
      
      await execAsync(command, { timeout: this.config.collection.timeout * 1000 });
      
      // Verify collection
      const stats = await fs.stat(evidencePath);
      
      const evidence = {
        id: evidenceId,
        type: 'logs',
        source: 'logs',
        path: evidencePath,
        size: stats.size,
        checksum: await this.calculateChecksum(evidencePath),
        collectedAt: new Date(),
        metadata: {
          paths: config.paths,
          patterns: config.patterns
        }
      };
      
      collection.evidence.push(evidence);
      
      loggingService.logInfo(`Log evidence collected for incident ${collection.incidentId}`, {
        evidenceId: evidenceId,
        size: stats.size
      });
      
    } catch (error) {
      loggingService.logError('Failed to collect log evidence', error);
      throw error;
    }
  }

  /**
   * Collect memory evidence
   */
  async collectMemoryEvidence(collection, config) {
    try {
      const evidenceId = this.generateEvidenceId();
      const evidencePath = path.join(this.config.evidence.directory, 'memory', `${collection.incidentId}_${evidenceId}.dump`);
      
      // Create memory dump directory
      await fs.mkdir(path.dirname(evidencePath), { recursive: true });
      
      // Collect memory dump
      const command = `gcore -o ${evidencePath} $(pgrep -f secure-gate) 2>/dev/null || true`;
      
      await execAsync(command, { timeout: this.config.collection.timeout * 1000 });
      
      // Verify collection
      const stats = await fs.stat(evidencePath);
      
      const evidence = {
        id: evidenceId,
        type: 'memory',
        source: 'memory',
        path: evidencePath,
        size: stats.size,
        checksum: await this.calculateChecksum(evidencePath),
        collectedAt: new Date(),
        metadata: {
          tools: config.tools,
          dumpPath: config.dumpPath
        }
      };
      
      collection.evidence.push(evidence);
      
      loggingService.logInfo(`Memory evidence collected for incident ${collection.incidentId}`, {
        evidenceId: evidenceId,
        size: stats.size
      });
      
    } catch (error) {
      loggingService.logError('Failed to collect memory evidence', error);
      throw error;
    }
  }

  /**
   * Collect network evidence
   */
  async collectNetworkEvidence(collection, config) {
    try {
      const evidenceId = this.generateEvidenceId();
      const evidencePath = path.join(this.config.evidence.directory, 'network', `${collection.incidentId}_${evidenceId}.pcap`);
      
      // Create network capture directory
      await fs.mkdir(path.dirname(evidencePath), { recursive: true });
      
      // Collect network capture
      const command = `timeout 60 tcpdump -i any -w ${evidencePath} 2>/dev/null || true`;
      
      await execAsync(command, { timeout: this.config.collection.timeout * 1000 });
      
      // Verify collection
      const stats = await fs.stat(evidencePath);
      
      const evidence = {
        id: evidenceId,
        type: 'network',
        source: 'network',
        path: evidencePath,
        size: stats.size,
        checksum: await this.calculateChecksum(evidencePath),
        collectedAt: new Date(),
        metadata: {
          tools: config.tools,
          capturePath: config.capturePath
        }
      };
      
      collection.evidence.push(evidence);
      
      loggingService.logInfo(`Network evidence collected for incident ${collection.incidentId}`, {
        evidenceId: evidenceId,
        size: stats.size
      });
      
    } catch (error) {
      loggingService.logError('Failed to collect network evidence', error);
      throw error;
    }
  }

  /**
   * Collect filesystem evidence
   */
  async collectFilesystemEvidence(collection, config) {
    try {
      const evidenceId = this.generateEvidenceId();
      const evidencePath = path.join(this.config.evidence.directory, 'filesystem', `${collection.incidentId}_${evidenceId}.tar.gz`);
      
      // Collect filesystem evidence
      const paths = config.paths.join(' ');
      const command = `tar -czf ${evidencePath} ${paths} 2>/dev/null || true`;
      
      await execAsync(command, { timeout: this.config.collection.timeout * 1000 });
      
      // Verify collection
      const stats = await fs.stat(evidencePath);
      
      const evidence = {
        id: evidenceId,
        type: 'filesystem',
        source: 'filesystem',
        path: evidencePath,
        size: stats.size,
        checksum: await this.calculateChecksum(evidencePath),
        collectedAt: new Date(),
        metadata: {
          paths: config.paths,
          patterns: config.patterns
        }
      };
      
      collection.evidence.push(evidence);
      
      loggingService.logInfo(`Filesystem evidence collected for incident ${collection.incidentId}`, {
        evidenceId: evidenceId,
        size: stats.size
      });
      
    } catch (error) {
      loggingService.logError('Failed to collect filesystem evidence', error);
      throw error;
    }
  }

  /**
   * Collect database evidence
   */
  async collectDatabaseEvidence(collection, config) {
    try {
      const evidenceId = this.generateEvidenceId();
      const evidencePath = path.join(this.config.evidence.directory, 'database', `${collection.incidentId}_${evidenceId}.sql`);
      
      // Create database dump directory
      await fs.mkdir(path.dirname(evidencePath), { recursive: true });
      
      // Collect database dump
      const command = `pg_dump -h localhost -U postgres secure_gate_db > ${evidencePath} 2>/dev/null || true`;
      
      await execAsync(command, { timeout: this.config.collection.timeout * 1000 });
      
      // Verify collection
      const stats = await fs.stat(evidencePath);
      
      const evidence = {
        id: evidenceId,
        type: 'database',
        source: 'database',
        path: evidencePath,
        size: stats.size,
        checksum: await this.calculateChecksum(evidencePath),
        collectedAt: new Date(),
        metadata: {
          tables: config.tables,
          dumpPath: config.dumpPath
        }
      };
      
      collection.evidence.push(evidence);
      
      loggingService.logInfo(`Database evidence collected for incident ${collection.incidentId}`, {
        evidenceId: evidenceId,
        size: stats.size
      });
      
    } catch (error) {
      loggingService.logError('Failed to collect database evidence', error);
      throw error;
    }
  }

  /**
   * Encrypt and store evidence
   */
  async encryptAndStoreEvidence(collection) {
    try {
      for (const evidence of collection.evidence) {
        // Encrypt evidence file
        const encryptedPath = await this.encryptEvidence(evidence);
        
        // Store in Vault
        await this.storeEvidenceInVault(collection, evidence, encryptedPath);
        
        // Update evidence with encrypted path
        evidence.encryptedPath = encryptedPath;
        evidence.storedAt = new Date();
      }
      
      loggingService.logInfo(`Evidence encrypted and stored for incident ${collection.incidentId}`, {
        evidenceCount: collection.evidence.length
      });
      
    } catch (error) {
      loggingService.logError('Failed to encrypt and store evidence', error);
      throw error;
    }
  }

  /**
   * Encrypt evidence file
   */
  async encryptEvidence(evidence) {
    try {
      const key = crypto.randomBytes(this.config.evidence.encryption.keyLength);
      const iv = crypto.randomBytes(this.config.evidence.encryption.ivLength);
      const cipher = crypto.createCipher(this.config.evidence.encryption.algorithm, key);
      
      const input = await fs.readFile(evidence.path);
      const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
      
      const encryptedPath = `${evidence.path}.enc`;
      await fs.writeFile(encryptedPath, encrypted);
      
      // Store encryption key in Vault
      await vaultService.writeSecret(`${this.config.evidence.vaultPath}/keys/${evidence.id}`, {
        key: key.toString('hex'),
        iv: iv.toString('hex'),
        algorithm: this.config.evidence.encryption.algorithm
      });
      
      return encryptedPath;
      
    } catch (error) {
      loggingService.logError('Failed to encrypt evidence', error);
      throw error;
    }
  }

  /**
   * Store evidence in Vault
   */
  async storeEvidenceInVault(collection, evidence, encryptedPath) {
    try {
      const evidenceData = await fs.readFile(encryptedPath);
      
      await vaultService.writeSecret(`${this.config.evidence.vaultPath}/incidents/${collection.incidentId}/${evidence.id}`, {
        incidentId: collection.incidentId,
        evidenceId: evidence.id,
        type: evidence.type,
        source: evidence.source,
        size: evidence.size,
        checksum: evidence.checksum,
        collectedAt: evidence.collectedAt,
        metadata: evidence.metadata,
        data: evidenceData.toString('base64')
      });
      
    } catch (error) {
      loggingService.logError('Failed to store evidence in Vault', error);
      throw error;
    }
  }

  /**
   * Generate evidence report
   */
  async generateEvidenceReport(collection) {
    try {
      const reportPath = path.join(this.config.evidence.directory, 'reports', `${collection.incidentId}_evidence_report.md`);
      
      let report = `# Evidence Collection Report
**Incident ID:** ${collection.incidentId}
**Collection ID:** ${collection.id}
**Category:** ${collection.category}
**Severity:** ${collection.severity}
**Started At:** ${collection.startedAt.toISOString()}
**Completed At:** ${collection.completedAt.toISOString()}
**Duration:** ${collection.completedAt - collection.startedAt}ms

## Evidence Summary
- **Total Evidence Items:** ${collection.evidence.length}
- **Total Size:** ${collection.evidence.reduce((sum, e) => sum + e.size, 0)} bytes
- **Collection Errors:** ${collection.errors.length}

## Evidence Details
`;

      for (const evidence of collection.evidence) {
        report += `
### ${evidence.type.toUpperCase()} Evidence
- **ID:** ${evidence.id}
- **Source:** ${evidence.source}
- **Size:** ${evidence.size} bytes
- **Checksum:** ${evidence.checksum}
- **Collected At:** ${evidence.collectedAt.toISOString()}
- **Stored At:** ${evidence.storedAt.toISOString()}
- **Encrypted Path:** ${evidence.encryptedPath}
- **Metadata:** ${JSON.stringify(evidence.metadata, null, 2)}
`;
      }

      if (collection.errors.length > 0) {
        report += `
## Collection Errors
`;
        for (const error of collection.errors) {
          report += `- **Source:** ${error.source}
- **Error:** ${error.error}
- **Timestamp:** ${error.timestamp.toISOString()}
`;
        }
      }

      report += `
## Compliance
- **Kenya DPA:** ${this.config.compliance.kenya_dpa.enabled ? 'Enabled' : 'Disabled'}
- **GDPR:** ${this.config.compliance.gdpr.enabled ? 'Enabled' : 'Disabled'}
- **ISO 27001:** ${this.config.compliance.iso27001.enabled ? 'Enabled' : 'Disabled'}

## Next Steps
1. Review collected evidence
2. Conduct forensic analysis
3. Preserve evidence chain of custody
4. Generate incident report
5. Archive evidence for compliance

---
**Report Generated:** ${new Date().toISOString()}
**System:** Secure Gate Access Control System
`;

      await fs.writeFile(reportPath, report);
      
      // Store report in Vault
      await vaultService.writeSecret(`${this.config.evidence.vaultPath}/reports/${collection.incidentId}`, {
        incidentId: collection.incidentId,
        collectionId: collection.id,
        reportPath: reportPath,
        generatedAt: new Date()
      });
      
      collection.evidenceReport = reportPath;
      
      loggingService.logInfo(`Evidence report generated for incident ${collection.incidentId}`, {
        reportPath: reportPath
      });
      
    } catch (error) {
      loggingService.logError('Failed to generate evidence report', error);
      throw error;
    }
  }

  /**
   * Calculate file checksum
   */
  async calculateChecksum(filePath) {
    try {
      const data = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      loggingService.logError('Failed to calculate checksum', error);
      return null;
    }
  }

  /**
   * Notify evidence collection
   */
  async notifyEvidenceCollection(incident, collection) {
    try {
      await notificationService.sendSystemNotification({
        type: 'evidence_collected',
        title: 'Evidence Collection Completed',
        message: `Evidence collection completed for incident ${incident.id}`,
        severity: 'info',
        data: {
          incidentId: incident.id,
          collectionId: collection.id,
          evidenceCount: collection.evidence.length,
          totalSize: collection.evidence.reduce((sum, e) => sum + e.size, 0),
          duration: collection.completedAt - collection.startedAt
        }
      });
      
    } catch (error) {
      loggingService.logError('Failed to notify evidence collection', error);
    }
  }

  /**
   * Generate collection ID
   */
  generateCollectionId() {
    return `COLL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate evidence ID
   */
  generateEvidenceId() {
    return `EVID-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Get collection by ID
   */
  getCollection(collectionId) {
    return this.activeCollections.get(collectionId) || 
           this.evidenceRepository.get(collectionId);
  }

  /**
   * Get collections by incident ID
   */
  getCollectionsByIncident(incidentId) {
    const collections = [];
    
    // Check active collections
    for (const collection of this.activeCollections.values()) {
      if (collection.incidentId === incidentId) {
        collections.push(collection);
      }
    }
    
    // Check repository
    for (const collection of this.evidenceRepository.values()) {
      if (collection.incidentId === incidentId) {
        collections.push(collection);
      }
    }
    
    return collections;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: true,
      activeCollections: this.activeCollections.size,
      evidenceRepository: this.evidenceRepository.size,
      config: this.config
    };
  }
}

// Create singleton instance
const forensicsService = new ForensicsService();

export default forensicsService;
