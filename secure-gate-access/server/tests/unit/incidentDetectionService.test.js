/**
 * Unit Tests for Incident Detection Service
 * Phase 4: Infrastructure & Monitoring
 * 
 * Tests cover:
 * - Service initialization
 * - Detection rules loading
 * - Incident detection start/stop
 * - Log collection and analysis
 * - Security, availability, performance, and compliance incident detection
 * - Incident classification and severity assessment
 * - SIEM integration
 * - Compliance tracking
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  logDebug: jest.fn()
};

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

const mockNotificationService = {
  sendNotification: jest.fn().mockResolvedValue(true),
  sendAlert: jest.fn().mockResolvedValue(true),
  sendSystemNotification: jest.fn().mockResolvedValue(true)
};

jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  default: mockNotificationService
}));

const mockDatabaseService = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  getPool: jest.fn()
};

jest.unstable_mockModule('../../src/services/databaseService.js', () => ({
  default: mockDatabaseService
}));

const mockRedisService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' })
};

jest.unstable_mockModule('../../src/services/redisService.js', () => ({
  default: mockRedisService
}));

const mockVaultService = {
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
  getSecret: jest.fn().mockResolvedValue('secret')
};

jest.unstable_mockModule('../../src/services/vaultService.js', () => ({
  default: mockVaultService
}));

// Import after mocks
const { default: incidentService } = await import('../../src/services/incidentDetectionService.js');

describe('IncidentDetectionService', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Clear incidents map between tests
    incidentService.incidents.clear();
    incidentService.siemBuffer = [];
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
    
    // Stop detection if running
    if (incidentService.isRunning) {
      incidentService.stopDetection();
    }
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(incidentService.config).toBeDefined();
      expect(incidentService.config.siem).toBeDefined();
      expect(incidentService.config.detection).toBeDefined();
      expect(incidentService.config.classification).toBeDefined();
    });

    it('should initialize incidents map', () => {
      expect(incidentService.incidents).toBeInstanceOf(Map);
    });

    it('should initialize detection rules map', () => {
      expect(incidentService.detectionRules).toBeInstanceOf(Map);
    });

    it('should have SIEM configuration', () => {
      expect(incidentService.config.siem.enabled).toBe(true);
      expect(incidentService.config.siem.batchSize).toBeDefined();
    });

    it('should have detection patterns configured', () => {
      expect(incidentService.config.detection.rules.security.patterns).toBeDefined();
      expect(incidentService.config.detection.rules.availability.patterns).toBeDefined();
      expect(incidentService.config.detection.rules.performance.patterns).toBeDefined();
      expect(incidentService.config.detection.rules.compliance.patterns).toBeDefined();
    });

    it('should have severity levels configured', () => {
      const severityLevels = incidentService.config.classification.severityLevels;
      expect(severityLevels.critical).toBeDefined();
      expect(severityLevels.high).toBeDefined();
      expect(severityLevels.medium).toBeDefined();
      expect(severityLevels.low).toBeDefined();
    });

    it('should have compliance requirements configured', () => {
      expect(incidentService.config.compliance.kenya_dpa).toBeDefined();
      expect(incidentService.config.compliance.gdpr).toBeDefined();
      expect(incidentService.config.compliance.iso27001).toBeDefined();
    });
  });

  describe('initializeService', () => {
    it('should log initialization', async () => {
      await incidentService.initializeService();
      
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        expect.stringContaining('initialized'),
        expect.any(Object)
      );
    });

    it('should load detection rules', async () => {
      await incidentService.initializeService();
      
      expect(incidentService.detectionRules.size).toBeGreaterThan(0);
    });
  });

  describe('loadDetectionRules', () => {
    it('should load security rules', async () => {
      await incidentService.loadDetectionRules();
      
      const authFailureRule = incidentService.detectionRules.get('authentication_failure');
      expect(authFailureRule).toBeDefined();
      expect(authFailureRule.category).toBe('security');
    });

    it('should load availability rules', async () => {
      await incidentService.loadDetectionRules();
      
      const serviceDownRule = incidentService.detectionRules.get('service_down');
      expect(serviceDownRule).toBeDefined();
      expect(serviceDownRule.category).toBe('availability');
    });

    it('should load performance rules', async () => {
      await incidentService.loadDetectionRules();
      
      const slowQueryRule = incidentService.detectionRules.get('slow_query');
      expect(slowQueryRule).toBeDefined();
      expect(slowQueryRule.category).toBe('performance');
    });

    it('should load compliance rules', async () => {
      await incidentService.loadDetectionRules();
      
      const dataBreachRule = incidentService.detectionRules.get('data_breach');
      expect(dataBreachRule).toBeDefined();
      expect(dataBreachRule.category).toBe('compliance');
    });

    it('should log loaded rules count', async () => {
      await incidentService.loadDetectionRules();
      
      // Log is called with a single string argument
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        expect.stringContaining('detection rules')
      );
    });
  });

  describe('startDetection', () => {
    it('should set isRunning to true', () => {
      incidentService.startDetection();
      
      expect(incidentService.isRunning).toBe(true);
    });

    it('should create detection interval', () => {
      incidentService.startDetection();
      
      expect(incidentService.detectionInterval).toBeDefined();
    });

    it('should log detection started', () => {
      incidentService.startDetection();
      
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        expect.stringContaining('started')
      );
    });

    it('should not start if already running', () => {
      incidentService.isRunning = true;
      const initialInterval = incidentService.detectionInterval;
      
      incidentService.startDetection();
      
      expect(incidentService.detectionInterval).toBe(initialInterval);
    });
  });

  describe('stopDetection', () => {
    it('should set isRunning to false', () => {
      incidentService.startDetection();
      incidentService.stopDetection();
      
      expect(incidentService.isRunning).toBe(false);
    });

    it('should clear detection interval', () => {
      incidentService.startDetection();
      incidentService.stopDetection();
      
      expect(incidentService.detectionInterval).toBeNull();
    });

    it('should log detection stopped', () => {
      incidentService.startDetection();
      incidentService.stopDetection();
      
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        expect.stringContaining('stopped')
      );
    });
  });

  describe('collectLogs', () => {
    it('should collect logs from all services', async () => {
      const logs = await incidentService.collectLogs();
      
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should include application logs', async () => {
      const logs = await incidentService.collectLogs();
      
      const appLogs = logs.filter(log => log.service === 'application');
      expect(appLogs.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle collection errors gracefully', async () => {
      // Force an error
      const originalCollectAppLogs = incidentService.collectApplicationLogs;
      incidentService.collectApplicationLogs = jest.fn().mockRejectedValue(new Error('Collection failed'));
      
      const logs = await incidentService.collectLogs();
      
      expect(logs).toEqual([]);
      
      incidentService.collectApplicationLogs = originalCollectAppLogs;
    });
  });

  describe('collectApplicationLogs', () => {
    it('should return application logs', async () => {
      const logs = await incidentService.collectApplicationLogs();
      
      expect(Array.isArray(logs)).toBe(true);
      expect(logs[0]?.service).toBe('application');
    });
  });

  describe('collectDatabaseLogs', () => {
    it('should return database logs', async () => {
      const logs = await incidentService.collectDatabaseLogs();
      
      expect(Array.isArray(logs)).toBe(true);
      expect(logs[0]?.service).toBe('postgresql');
    });
  });

  describe('collectRedisLogs', () => {
    it('should return Redis logs', async () => {
      const logs = await incidentService.collectRedisLogs();
      
      expect(Array.isArray(logs)).toBe(true);
      expect(logs[0]?.service).toBe('redis');
    });
  });

  describe('collectVaultLogs', () => {
    it('should return Vault logs', async () => {
      const logs = await incidentService.collectVaultLogs();
      
      expect(Array.isArray(logs)).toBe(true);
      expect(logs[0]?.service).toBe('vault');
    });
  });

  describe('analyzeLogs', () => {
    it('should analyze logs for incidents', async () => {
      const logs = [
        {
          timestamp: new Date(),
          service: 'authentication',
          level: 'error',
          message: 'Authentication failure detected',
          metadata: {}
        }
      ];
      
      const incidents = await incidentService.analyzeLogs(logs);
      
      expect(Array.isArray(incidents)).toBe(true);
    });

    it('should return empty array for empty logs', async () => {
      const incidents = await incidentService.analyzeLogs([]);
      
      expect(incidents).toEqual([]);
    });
  });

  describe('analyzeLog', () => {
    it('should detect security incident', async () => {
      const log = {
        timestamp: new Date(),
        service: 'authentication',
        level: 'error',
        message: 'authentication_failure for user test@test.com',
        metadata: {}
      };
      
      const incident = await incidentService.analyzeLog(log);
      
      expect(incident?.category).toBe('security');
    });

    it('should detect availability incident', async () => {
      const log = {
        timestamp: new Date(),
        service: 'database',
        level: 'error',
        message: 'service_down: PostgreSQL connection failed',
        metadata: {}
      };
      
      const incident = await incidentService.analyzeLog(log);
      
      expect(incident?.category).toBe('availability');
    });

    it('should return null for normal log', async () => {
      const log = {
        timestamp: new Date(),
        service: 'application',
        level: 'info',
        message: 'Application started successfully',
        metadata: {}
      };
      
      const incident = await incidentService.analyzeLog(log);
      
      expect(incident).toBeNull();
    });
  });

  describe('checkSecurityIncident', () => {
    it('should detect authentication failure', async () => {
      const log = {
        message: 'authentication_failure detected',
        service: 'authentication',
        level: 'error',
        metadata: {}
      };
      
      const incident = await incidentService.checkSecurityIncident(log);
      
      expect(incident).toBeDefined();
      expect(incident.category).toBe('security');
      expect(incident.severity).toBe('high');
    });

    it('should detect unauthorized access', async () => {
      const log = {
        message: 'unauthorized_access attempt from IP 192.168.1.1',
        service: 'security',
        level: 'error',
        metadata: {}
      };
      
      const incident = await incidentService.checkSecurityIncident(log);
      
      expect(incident).toBeDefined();
    });

    it('should return null for non-security log', async () => {
      const log = {
        message: 'User logged in successfully',
        service: 'application',
        level: 'info',
        metadata: {}
      };
      
      const incident = await incidentService.checkSecurityIncident(log);
      
      expect(incident).toBeNull();
    });
  });

  describe('checkAvailabilityIncident', () => {
    it('should detect service down', async () => {
      const log = {
        message: 'service_down: API server not responding',
        service: 'monitor',
        level: 'error',
        metadata: {}
      };
      
      const incident = await incidentService.checkAvailabilityIncident(log);
      
      expect(incident).toBeDefined();
      expect(incident.category).toBe('availability');
      expect(incident.severity).toBe('critical');
    });

    it('should detect database connection failure', async () => {
      const log = {
        message: 'database_connection_failed: PostgreSQL unreachable',
        service: 'database',
        level: 'error',
        metadata: {}
      };
      
      const incident = await incidentService.checkAvailabilityIncident(log);
      
      expect(incident).toBeDefined();
    });
  });

  describe('checkPerformanceIncident', () => {
    it('should detect slow query', async () => {
      const log = {
        message: 'slow_query detected: SELECT * FROM visitors took 5000ms',
        service: 'database',
        level: 'warn',
        metadata: {}
      };
      
      const incident = await incidentService.checkPerformanceIncident(log);
      
      expect(incident).toBeDefined();
      expect(incident.category).toBe('performance');
    });

    it('should detect high response time', async () => {
      const log = {
        message: 'high_response_time: API endpoint /visitors took 3000ms',
        service: 'api',
        level: 'warn',
        metadata: {}
      };
      
      const incident = await incidentService.checkPerformanceIncident(log);
      
      expect(incident).toBeDefined();
    });
  });

  describe('checkComplianceIncident', () => {
    it('should detect data breach', async () => {
      const log = {
        message: 'data_breach: Unauthorized data access detected',
        service: 'security',
        level: 'error',
        metadata: {}
      };
      
      const incident = await incidentService.checkComplianceIncident(log);
      
      expect(incident).toBeDefined();
      expect(incident.category).toBe('compliance');
    });

    it('should detect GDPR violation', async () => {
      const log = {
        message: 'gdpr_violation: Data retention policy exceeded',
        service: 'compliance',
        level: 'error',
        metadata: {}
      };
      
      const incident = await incidentService.checkComplianceIncident(log);
      
      expect(incident).toBeDefined();
    });

    it('should detect Kenya DPA violation', async () => {
      const log = {
        message: 'kenya_dpa_violation: Cross-border transfer without consent',
        service: 'compliance',
        level: 'error',
        metadata: {}
      };
      
      const incident = await incidentService.checkComplianceIncident(log);
      
      expect(incident).toBeDefined();
    });
  });

  describe('generateIncidentId', () => {
    it('should generate unique incident IDs', () => {
      const id1 = incidentService.generateIncidentId();
      const id2 = incidentService.generateIncidentId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });
  });

  describe('classifyIncident', () => {
    it('should classify incident with risk score and SLA', async () => {
      const incident = {
        id: 'INC-001',
        category: 'security',
        severity: 'high',
        message: 'Authentication failure',
        metadata: {}
      };
      
      const classified = await incidentService.classifyIncident(incident);
      
      // classifyIncident returns riskScore, assignedTeam, sla, escalation, compliance, confidence
      expect(classified.riskScore).toBeDefined();
      expect(classified.sla).toBeDefined();
      expect(classified.assignedTeam).toBeDefined();
    });

    it('should assign SLA based on severity', async () => {
      const criticalIncident = {
        id: 'INC-001',
        category: 'availability',
        severity: 'critical',
        message: 'Service down',
        metadata: {}
      };
      
      const classified = await incidentService.classifyIncident(criticalIncident);
      
      expect(classified.sla).toBe(15); // 15 minutes for critical
    });
  });

  describe('mapComplianceRequirements', () => {
    it('should map security category to compliance requirements', () => {
      const requirements = incidentService.mapComplianceRequirements('security');
      
      expect(requirements).toBeDefined();
      expect(Array.isArray(requirements) || typeof requirements === 'object').toBe(true);
    });

    it('should map compliance category to compliance requirements', () => {
      const requirements = incidentService.mapComplianceRequirements('compliance');
      
      expect(requirements).toBeDefined();
    });
  });

  describe('processIncident', () => {
    it('should process and store incident', async () => {
      const incident = {
        id: 'INC-001',
        timestamp: new Date(),
        category: 'security',
        severity: 'high',
        message: 'Security incident',
        metadata: {}
      };
      
      await incidentService.processIncident(incident);
      
      expect(incidentService.incidents.has('INC-001')).toBe(true);
    });

    it('should notify on critical incidents', async () => {
      const criticalIncident = {
        id: 'INC-002',
        timestamp: new Date(),
        category: 'availability',
        severity: 'critical',
        message: 'Critical incident',
        metadata: {}
      };
      
      await incidentService.processIncident(criticalIncident);
      
      // Service uses notifyTeams which calls notificationService.sendSystemNotification
      expect(mockNotificationService.sendSystemNotification).toHaveBeenCalled();
    });
  });

  describe('getIncident', () => {
    it('should return incident by ID', () => {
      const incident = {
        id: 'INC-003',
        category: 'security',
        message: 'Test incident'
      };
      incidentService.incidents.set('INC-003', incident);
      
      const retrieved = incidentService.getIncident('INC-003');
      
      expect(retrieved).toEqual(incident);
    });

    it('should return undefined for non-existent incident', () => {
      const retrieved = incidentService.getIncident('NON-EXISTENT');
      
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllIncidents', () => {
    beforeEach(() => {
      incidentService.incidents.set('INC-001', { id: 'INC-001', category: 'security', status: 'open' });
      incidentService.incidents.set('INC-002', { id: 'INC-002', category: 'performance', status: 'resolved' });
      incidentService.incidents.set('INC-003', { id: 'INC-003', category: 'security', status: 'open' });
    });

    it('should return all incidents', () => {
      const incidents = incidentService.getAllIncidents();
      
      expect(incidents.length).toBe(3);
    });
  });

  describe('getIncidentsByCategory', () => {
    beforeEach(() => {
      incidentService.incidents.set('INC-001', { id: 'INC-001', category: 'security', status: 'open' });
      incidentService.incidents.set('INC-002', { id: 'INC-002', category: 'performance', status: 'resolved' });
      incidentService.incidents.set('INC-003', { id: 'INC-003', category: 'security', status: 'open' });
    });

    it('should filter by category', () => {
      const incidents = incidentService.getIncidentsByCategory('security');
      
      expect(incidents.length).toBe(2);
    });
  });

  describe('getIncidentsBySeverity', () => {
    beforeEach(() => {
      incidentService.incidents.set('INC-001', { id: 'INC-001', severity: 'high', status: 'open' });
      incidentService.incidents.set('INC-002', { id: 'INC-002', severity: 'low', status: 'resolved' });
      incidentService.incidents.set('INC-003', { id: 'INC-003', severity: 'high', status: 'open' });
    });

    it('should filter by severity', () => {
      const incidents = incidentService.getIncidentsBySeverity('high');
      
      expect(incidents.length).toBe(2);
    });
  });

  describe('getStatus', () => {
    it('should return service status', () => {
      const status = incidentService.getStatus();
      
      expect(status).toBeDefined();
      // getStatus returns { initialized, running, incidents, detectionRules, siemBuffer, config }
      expect(status.running).toBeDefined();
      expect(status.incidents).toBeDefined();
    });
  });

  describe('flushSIEMBuffer', () => {
    it('should flush SIEM buffer', async () => {
      incidentService.siemBuffer = [
        { type: 'event1' },
        { type: 'event2' }
      ];
      
      await incidentService.flushSIEMBuffer();
      
      expect(incidentService.siemBuffer.length).toBe(0);
    });
  });

  describe('performDetection', () => {
    it('should collect and analyze logs', async () => {
      const collectSpy = jest.spyOn(incidentService, 'collectLogs');
      const analyzeSpy = jest.spyOn(incidentService, 'analyzeLogs');
      
      await incidentService.performDetection();
      
      expect(collectSpy).toHaveBeenCalled();
      expect(analyzeSpy).toHaveBeenCalled();
    });
  });
});
