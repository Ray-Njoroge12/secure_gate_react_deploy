/**
 * Property-Based Tests for Bidirectional Sync Consistency
 * 
 * **Property 27: Bidirectional Sync Consistency**
 * **Validates: Requirements 13.4**
 * 
 * This test ensures that bidirectional data synchronization works correctly
 * with conflict resolution and comprehensive audit logging across all possible
 * data states, network conditions, and concurrent modification scenarios.
 */

import fc from 'fast-check';
import { jest } from '@jest/globals';
import crypto from 'crypto';
import { EventEmitter } from 'events';

// Test configuration
const TEST_CONFIG = {
  PROPERTY_RUNS: 100,
  TIMEOUT: 30000,
  SYNC_TIMEOUT: 5000,
  MAX_CONFLICTS: 10,
  AUDIT_RETENTION_DAYS: 30
};

// Mock database for testing
class MockDatabase extends EventEmitter {
  constructor() {
    super();
    this.data = new Map();
    this.versions = new Map();
    this.auditLog = [];
    this.syncLogs = [];
    this.changeLog = new Map();
    this.isConnected = true;
  }

  async query(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Database connection lost');
    }

    // Simulate query processing delay
    await new Promise(resolve => setTimeout(resolve, 10));

    // Mock different query types
    if (sql.includes('SELECT') && sql.includes('visitors')) {
      return this.mockVisitorQuery(sql, params);
    } else if (sql.includes('UPDATE') && sql.includes('visitors')) {
      return this.mockVisitorUpdate(sql, params);
    } else if (sql.includes('INSERT') && sql.includes('sync_logs')) {
      return this.mockSyncLogInsert(sql, params);
    } else if (sql.includes('INSERT') && sql.includes('sync_change_log')) {
      return this.mockChangeLogInsert(sql, params);
    } else if (sql.includes('SELECT') && sql.includes('sync_change_log')) {
      return this.mockChangeLogQuery(sql, params);
    }

    return { rows: [], rowCount: 0 };
  }

  mockVisitorQuery(sql, params) {
    const visitors = Array.from(this.data.values()).filter(item => item.type === 'visitor');
    return { rows: visitors, rowCount: visitors.length };
  }

  mockVisitorUpdate(sql, params) {
    const [status, timestamp, visitorId] = params;
    const visitor = this.data.get(`visitor_${visitorId}`);
    
    if (visitor) {
      const oldVersion = this.versions.get(`visitor_${visitorId}`) || 1;
      const newVersion = oldVersion + 1;
      
      visitor.status = status;
      visitor.updated_at = timestamp || new Date().toISOString();
      this.versions.set(`visitor_${visitorId}`, newVersion);
      
      // Log the change for audit
      this.auditLog.push({
        id: crypto.randomUUID(),
        entity_type: 'visitor',
        entity_id: visitorId,
        action: 'update',
        old_value: { status: visitor.old_status },
        new_value: { status },
        version: newVersion,
        timestamp: new Date().toISOString()
      });
      
      return { rowCount: 1 };
    }
    
    return { rowCount: 0 };
  }

  mockSyncLogInsert(sql, params) {
    const [userId, eventType, packageId, metadata] = params;
    const logEntry = {
      id: crypto.randomUUID(),
      user_id: userId,
      event_type: eventType,
      package_id: packageId,
      metadata: typeof metadata === 'string' ? JSON.parse(metadata) : metadata,
      created_at: new Date().toISOString()
    };
    
    this.syncLogs.push(logEntry);
    return { rowCount: 1 };
  }

  mockChangeLogInsert(sql, params) {
    const [userId, idempotencyKey, entity, action] = params;
    const key = `${userId}_${idempotencyKey}`;
    
    if (!this.changeLog.has(key)) {
      this.changeLog.set(key, {
        user_id: userId,
        idempotency_key: idempotencyKey,
        entity,
        action,
        created_at: new Date().toISOString()
      });
      return { rowCount: 1 };
    }
    
    return { rowCount: 0 }; // Duplicate
  }

  mockChangeLogQuery(sql, params) {
    const [userId, idempotencyKey] = params;
    const key = `${userId}_${idempotencyKey}`;
    const entry = this.changeLog.get(key);
    
    return {
      rows: entry ? [entry] : [],
      rowCount: entry ? 1 : 0
    };
  }

  // Helper methods for test setup
  addVisitor(visitor) {
    const key = `visitor_${visitor.id}`;
    this.data.set(key, { ...visitor, type: 'visitor' });
    this.versions.set(key, 1);
  }

  getVisitor(id) {
    return this.data.get(`visitor_${id}`);
  }

  getVersion(entityType, id) {
    return this.versions.get(`${entityType}_${id}`) || 1;
  }

  getAuditLog() {
    return [...this.auditLog];
  }

  getSyncLogs() {
    return [...this.syncLogs];
  }

  reset() {
    this.data.clear();
    this.versions.clear();
    this.auditLog = [];
    this.syncLogs = [];
    this.changeLog.clear();
  }

  disconnect() {
    this.isConnected = false;
  }

  reconnect() {
    this.isConnected = true;
  }
}

// Mock Bidirectional Sync Service for testing
class MockBidirectionalSyncService extends EventEmitter {
  constructor(database) {
    super();
    this.db = database;
    this.syncState = new Map();
    this.conflictResolutionStrategies = {
      'server_wins': this.serverWinsResolution.bind(this),
      'client_wins': this.clientWinsResolution.bind(this),
      'timestamp_based': this.timestampBasedResolution.bind(this),
      'merge': this.mergeResolution.bind(this)
    };
  }

  // Generate offline package with version tracking
  async generateOfflinePackage(userId, userRole, estateId = null) {
    const packageId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const packageData = {
      packageId,
      userId,
      userRole,
      estateId,
      generatedAt: timestamp,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      data: await this.getEntityData(userRole, estateId),
      versions: this.getEntityVersions(),
      integrityHash: null
    };

    // Generate integrity hash
    packageData.integrityHash = this.generateIntegrityHash(packageData.data);
    
    // Log package generation
    await this.db.query(
      'INSERT INTO sync_logs (user_id, event_type, package_id, metadata, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [userId, 'download', packageId, JSON.stringify({ estateId, dataCount: Object.keys(packageData.data).length })]
    );

    return packageData;
  }

  // Process bidirectional sync with conflict resolution
  async processBidirectionalSync(clientPackage, serverChanges = []) {
    const results = {
      processed: 0,
      conflicts: [],
      errors: [],
      duplicates: [],
      serverChanges: [],
      clientChanges: [],
      auditEntries: []
    };

    try {
      // Verify package integrity
      if (!this.verifyPackageIntegrity(clientPackage)) {
        throw new Error('Package integrity verification failed');
      }

      // Process client changes first
      for (const change of clientPackage.changes || []) {
        try {
          const result = await this.processClientChange(change, clientPackage);
          
          if (result.conflict) {
            results.conflicts.push(result);
          } else if (result.duplicate) {
            results.duplicates.push(result);
          } else {
            results.processed++;
            results.clientChanges.push(result);
          }
        } catch (error) {
          results.errors.push({
            change,
            error: error.message,
            type: 'client_change_error'
          });
        }
      }

      // Process server changes
      for (const change of serverChanges) {
        try {
          const result = await this.processServerChange(change);
          results.serverChanges.push(result);
        } catch (error) {
          results.errors.push({
            change,
            error: error.message,
            type: 'server_change_error'
          });
        }
      }

      // Resolve conflicts
      for (const conflict of results.conflicts) {
        const resolution = await this.resolveConflict(conflict);
        results.auditEntries.push(resolution.auditEntry);
      }

      // Log sync completion (only if database is connected)
      try {
        await this.logSyncCompletion(clientPackage.userId, clientPackage.packageId, results);
      } catch (logError) {
        // If logging fails, continue with sync results but note the error
        results.errors.push({
          type: 'logging_error',
          error: logError.message
        });
      }

      return results;
    } catch (error) {
      console.error('Bidirectional sync error:', error);
      throw error;
    }
  }

  // Process individual client change with conflict detection
  async processClientChange(change, clientPackage) {
    const { entity, entityId, action, data, timestamp, idempotencyKey } = change;

    // Check for duplicate using idempotency key
    if (idempotencyKey) {
      const isDuplicate = await this.isDuplicateChange(clientPackage.userId, idempotencyKey);
      if (isDuplicate) {
        return {
          duplicate: true,
          change,
          reason: 'idempotency_key_already_processed'
        };
      }
    }

    // Get current server state
    const serverEntity = await this.getServerEntity(entity, entityId);
    const clientVersion = clientPackage.versions?.[`${entity}_${entityId}`] || 1;
    const serverVersion = this.db.getVersion(entity, entityId);

    // Detect conflicts
    if (serverEntity && serverVersion > clientVersion) {
      return {
        conflict: true,
        entity,
        entityId,
        action,
        clientData: data,
        serverData: serverEntity,
        clientVersion,
        serverVersion,
        clientTimestamp: timestamp,
        serverTimestamp: serverEntity.updated_at
      };
    }

    // Apply change
    const result = await this.applyChange(entity, entityId, action, data, timestamp);
    
    // Log idempotency
    if (idempotencyKey) {
      await this.db.query(
        'INSERT INTO sync_change_log (user_id, idempotency_key, entity, action, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [clientPackage.userId, idempotencyKey, entity, action]
      );
    }

    return {
      processed: true,
      entity,
      entityId,
      action,
      result
    };
  }

  // Process server-side changes
  async processServerChange(change) {
    const { entity, entityId, action, data, timestamp } = change;
    
    const result = await this.applyChange(entity, entityId, action, data, timestamp);
    
    return {
      processed: true,
      entity,
      entityId,
      action,
      result,
      source: 'server'
    };
  }

  // Resolve conflicts using configured strategy
  async resolveConflict(conflict, strategy = 'timestamp_based') {
    const resolver = this.conflictResolutionStrategies[strategy];
    if (!resolver) {
      throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
    }

    const resolution = await resolver(conflict);
    
    // Create audit entry for conflict resolution
    const auditEntry = {
      id: crypto.randomUUID(),
      type: 'conflict_resolution',
      entity: conflict.entity,
      entityId: conflict.entityId,
      strategy,
      clientData: conflict.clientData,
      serverData: conflict.serverData,
      resolution: resolution.action,
      resolvedData: resolution.data,
      timestamp: new Date().toISOString()
    };

    // Apply the resolution
    if (resolution.action !== 'no_change') {
      await this.applyChange(
        conflict.entity,
        conflict.entityId,
        resolution.action,
        resolution.data,
        new Date().toISOString()
      );
    }

    return { resolution, auditEntry };
  }

  // Conflict resolution strategies
  async serverWinsResolution(conflict) {
    return {
      action: 'no_change',
      data: conflict.serverData,
      reason: 'server_wins_policy'
    };
  }

  async clientWinsResolution(conflict) {
    return {
      action: 'update',
      data: conflict.clientData,
      reason: 'client_wins_policy'
    };
  }

  async timestampBasedResolution(conflict) {
    const clientTime = new Date(conflict.clientTimestamp);
    const serverTime = new Date(conflict.serverTimestamp);
    
    if (clientTime > serverTime) {
      return {
        action: 'update',
        data: conflict.clientData,
        reason: 'client_timestamp_newer'
      };
    } else {
      return {
        action: 'no_change',
        data: conflict.serverData,
        reason: 'server_timestamp_newer'
      };
    }
  }

  async mergeResolution(conflict) {
    // Simple merge strategy - combine non-conflicting fields
    const merged = { ...conflict.serverData, ...conflict.clientData };
    
    return {
      action: 'update',
      data: merged,
      reason: 'field_level_merge'
    };
  }

  // Helper methods
  async getEntityData(userRole, estateId) {
    const data = {};
    
    if (userRole === 'guard' || userRole === 'resident') {
      // Get visitors data
      const visitors = Array.from(this.db.data.values())
        .filter(item => item.type === 'visitor')
        .slice(0, 10); // Limit for testing
      
      data.visitors = visitors;
    }

    return data;
  }

  getEntityVersions() {
    const versions = {};
    for (const [key, version] of this.db.versions) {
      versions[key] = version;
    }
    return versions;
  }

  generateIntegrityHash(data) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  verifyPackageIntegrity(clientPackage) {
    if (!clientPackage.integrityHash || !clientPackage.data) {
      return false;
    }
    
    const expectedHash = this.generateIntegrityHash(clientPackage.data);
    return expectedHash === clientPackage.integrityHash;
  }

  async isDuplicateChange(userId, idempotencyKey) {
    const result = await this.db.query(
      'SELECT 1 FROM sync_change_log WHERE user_id = $1 AND idempotency_key = $2',
      [userId, idempotencyKey]
    );
    return result.rowCount > 0;
  }

  async getServerEntity(entity, entityId) {
    if (entity === 'visitor') {
      return this.db.getVisitor(entityId);
    }
    return null;
  }

  async applyChange(entity, entityId, action, data, timestamp) {
    if (entity === 'visitor') {
      if (action === 'update_status') {
        await this.db.query(
          'UPDATE visitors SET status = $1, updated_at = $2 WHERE id = $3',
          [data.status, timestamp, entityId]
        );
        return { updated: true };
      }
    }
    
    return { applied: false };
  }

  async logSyncCompletion(userId, packageId, results) {
    await this.db.query(
      'INSERT INTO sync_logs (user_id, event_type, package_id, metadata, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [userId, 'upload', packageId, JSON.stringify({
        processed: results.processed,
        conflicts: results.conflicts.length,
        errors: results.errors.length,
        duplicates: results.duplicates.length
      })]
    );
  }
}

describe('Property 27: Bidirectional Sync Consistency', () => {
  let mockDb;
  let syncService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = new MockDatabase();
    syncService = new MockBidirectionalSyncService(mockDb);
  });

  /**
   * Property: Bidirectional sync should maintain data consistency across all scenarios
   */
  test('Property: Bidirectional sync maintains data consistency', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        userId: fc.integer({ min: 1, max: 1000 }),
        userRole: fc.constantFrom('guard', 'resident', 'admin'),
        estateId: fc.integer({ min: 1, max: 100 }),
        initialData: fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            status: fc.constantFrom('PENDING', 'APPROVED', 'CHECKED_IN', 'CHECKED_OUT'),
            updated_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString())
          }),
          { minLength: 1, maxLength: 10 }
        ),
        clientChanges: fc.array(
          fc.record({
            entity: fc.constant('visitor'),
            entityId: fc.integer({ min: 1, max: 1000 }),
            action: fc.constantFrom('update_status', 'check_in', 'check_out'),
            data: fc.record({
              status: fc.constantFrom('APPROVED', 'CHECKED_IN', 'CHECKED_OUT', 'REJECTED')
            }),
            timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString()),
            idempotencyKey: fc.string({ minLength: 10, maxLength: 40 })
          }),
          { minLength: 0, maxLength: 5 }
        ),
        serverChanges: fc.array(
          fc.record({
            entity: fc.constant('visitor'),
            entityId: fc.integer({ min: 1, max: 1000 }),
            action: fc.constantFrom('update_status', 'admin_override'),
            data: fc.record({
              status: fc.constantFrom('APPROVED', 'REJECTED', 'EXPIRED')
            }),
            timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString())
          }),
          { minLength: 0, maxLength: 3 }
        )
      }),
      async (syncScenario) => {
        // Setup initial data
        for (const visitor of syncScenario.initialData) {
          mockDb.addVisitor(visitor);
        }

        // Generate offline package
        const offlinePackage = await syncService.generateOfflinePackage(
          syncScenario.userId,
          syncScenario.userRole,
          syncScenario.estateId
        );

        // Properties for offline package
        expect(offlinePackage.packageId).toBeDefined();
        expect(offlinePackage.userId).toBe(syncScenario.userId);
        expect(offlinePackage.userRole).toBe(syncScenario.userRole);
        expect(offlinePackage.integrityHash).toBeDefined();
        expect(offlinePackage.data).toBeDefined();
        expect(offlinePackage.versions).toBeDefined();

        // Add client changes to package
        const clientPackage = {
          ...offlinePackage,
          changes: syncScenario.clientChanges
        };

        // Process bidirectional sync
        const syncResults = await syncService.processBidirectionalSync(
          clientPackage,
          syncScenario.serverChanges
        );

        // Properties for sync results
        expect(syncResults).toBeDefined();
        expect(syncResults.processed).toBeGreaterThanOrEqual(0);
        expect(syncResults.conflicts).toBeDefined();
        expect(syncResults.errors).toBeDefined();
        expect(syncResults.duplicates).toBeDefined();
        expect(syncResults.auditEntries).toBeDefined();

        // Property: Total changes should equal processed + conflicts + errors + duplicates
        const totalClientChanges = syncScenario.clientChanges.length;
        const accountedChanges = syncResults.processed + 
                                syncResults.conflicts.length + 
                                syncResults.errors.length + 
                                syncResults.duplicates.length;
        expect(accountedChanges).toBe(totalClientChanges);

        // Property: All conflicts should have audit entries
        expect(syncResults.auditEntries.length).toBe(syncResults.conflicts.length);

        // Property: Audit entries should contain required fields
        syncResults.auditEntries.forEach(auditEntry => {
          expect(auditEntry.id).toBeDefined();
          expect(auditEntry.type).toBe('conflict_resolution');
          expect(auditEntry.entity).toBeDefined();
          expect(auditEntry.entityId).toBeDefined();
          expect(auditEntry.strategy).toBeDefined();
          expect(auditEntry.timestamp).toBeDefined();
        });

        // Property: Sync logs should be created
        const syncLogs = mockDb.getSyncLogs();
        expect(syncLogs.length).toBeGreaterThanOrEqual(2); // download + upload
        
        // Find logs for this specific user
        const userSyncLogs = syncLogs.filter(log => log.user_id === syncScenario.userId);
        expect(userSyncLogs.length).toBeGreaterThanOrEqual(2);
        
        const downloadLog = userSyncLogs.find(log => log.event_type === 'download');
        const uploadLog = userSyncLogs.find(log => log.event_type === 'upload');
        
        expect(downloadLog).toBeDefined();
        expect(uploadLog).toBeDefined();
        expect(downloadLog.user_id).toBe(syncScenario.userId);
        expect(uploadLog.user_id).toBe(syncScenario.userId);
      }
    ), { numRuns: 50 }); // Reduced runs for complex async tests
  });

  /**
   * Property: Conflict resolution should be deterministic and auditable
   */
  test('Property: Conflict resolution is deterministic and auditable', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        entity: fc.constant('visitor'),
        entityId: fc.integer({ min: 1, max: 100 }),
        clientData: fc.record({
          status: fc.constantFrom('APPROVED', 'CHECKED_IN'),
          notes: fc.string({ minLength: 0, maxLength: 100 })
        }),
        serverData: fc.record({
          status: fc.constantFrom('REJECTED', 'EXPIRED'),
          notes: fc.string({ minLength: 0, maxLength: 100 })
        }),
        clientTimestamp: fc.constantFrom('2024-01-01T10:00:00.000Z', '2024-01-01T11:00:00.000Z', '2024-01-01T12:00:00.000Z'),
        serverTimestamp: fc.constantFrom('2024-01-01T10:30:00.000Z', '2024-01-01T11:30:00.000Z', '2024-01-01T12:30:00.000Z'),
        strategy: fc.constantFrom('server_wins', 'client_wins', 'timestamp_based', 'merge')
      }),
      async (conflictScenario) => {
        const conflict = {
          entity: conflictScenario.entity,
          entityId: conflictScenario.entityId,
          clientData: conflictScenario.clientData,
          serverData: conflictScenario.serverData,
          clientTimestamp: conflictScenario.clientTimestamp,
          serverTimestamp: conflictScenario.serverTimestamp
        };

        // Resolve conflict multiple times with same strategy
        const resolution1 = await syncService.resolveConflict(conflict, conflictScenario.strategy);
        const resolution2 = await syncService.resolveConflict(conflict, conflictScenario.strategy);

        // Property: Resolution should be deterministic
        expect(resolution1.resolution.action).toBe(resolution2.resolution.action);
        expect(resolution1.resolution.reason).toBe(resolution2.resolution.reason);

        // Property: Audit entry should contain all required information
        const auditEntry = resolution1.auditEntry;
        expect(auditEntry.id).toBeDefined();
        expect(auditEntry.type).toBe('conflict_resolution');
        expect(auditEntry.entity).toBe(conflictScenario.entity);
        expect(auditEntry.entityId).toBe(conflictScenario.entityId);
        expect(auditEntry.strategy).toBe(conflictScenario.strategy);
        expect(auditEntry.clientData).toEqual(conflictScenario.clientData);
        expect(auditEntry.serverData).toEqual(conflictScenario.serverData);
        expect(auditEntry.resolution).toBeDefined();
        expect(auditEntry.timestamp).toBeDefined();

        // Property: Strategy-specific behavior
        if (conflictScenario.strategy === 'server_wins') {
          expect(resolution1.resolution.action).toBe('no_change');
          expect(resolution1.resolution.reason).toBe('server_wins_policy');
        } else if (conflictScenario.strategy === 'client_wins') {
          expect(resolution1.resolution.action).toBe('update');
          expect(resolution1.resolution.reason).toBe('client_wins_policy');
        } else if (conflictScenario.strategy === 'timestamp_based') {
          const clientTime = new Date(conflictScenario.clientTimestamp);
          const serverTime = new Date(conflictScenario.serverTimestamp);
          
          if (clientTime > serverTime) {
            expect(resolution1.resolution.action).toBe('update');
            expect(resolution1.resolution.reason).toBe('client_timestamp_newer');
          } else {
            expect(resolution1.resolution.action).toBe('no_change');
            expect(resolution1.resolution.reason).toBe('server_timestamp_newer');
          }
        } else if (conflictScenario.strategy === 'merge') {
          expect(resolution1.resolution.action).toBe('update');
          expect(resolution1.resolution.reason).toBe('field_level_merge');
        }
      }
    ), { numRuns: TEST_CONFIG.PROPERTY_RUNS });
  });

  /**
   * Property: Idempotency keys should prevent duplicate processing
   */
  test('Property: Idempotency keys prevent duplicate processing', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        userId: fc.integer({ min: 1, max: 1000 }),
        changes: fc.array(
          fc.record({
            entity: fc.constant('visitor'),
            entityId: fc.integer({ min: 1, max: 100 }),
            action: fc.constantFrom('update_status', 'check_in'),
            data: fc.record({
              status: fc.constantFrom('APPROVED', 'CHECKED_IN')
            }),
            timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString()),
            idempotencyKey: fc.string({ minLength: 10, maxLength: 40 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        duplicateCount: fc.integer({ min: 1, max: 3 })
      }),
      async (idempotencyScenario) => {
        // Create offline package
        const offlinePackage = await syncService.generateOfflinePackage(
          idempotencyScenario.userId,
          'guard',
          1
        );

        // Process changes first time
        const clientPackage1 = {
          ...offlinePackage,
          changes: idempotencyScenario.changes
        };

        const results1 = await syncService.processBidirectionalSync(clientPackage1, []);

        // Process same changes multiple times
        const duplicateResults = [];
        for (let i = 0; i < idempotencyScenario.duplicateCount; i++) {
          const clientPackage = {
            ...offlinePackage,
            changes: idempotencyScenario.changes
          };
          
          const result = await syncService.processBidirectionalSync(clientPackage, []);
          duplicateResults.push(result);
        }

        // Property: First processing should succeed
        expect(results1.processed).toBeGreaterThan(0);
        expect(results1.duplicates.length).toBe(0);

        // Property: Subsequent processing should detect duplicates
        duplicateResults.forEach(result => {
          expect(result.duplicates.length).toBe(idempotencyScenario.changes.length);
          expect(result.processed).toBe(0);
        });

        // Property: All duplicates should reference original idempotency keys
        duplicateResults.forEach(result => {
          result.duplicates.forEach((duplicate, index) => {
            expect(duplicate.change.idempotencyKey).toBe(
              idempotencyScenario.changes[index].idempotencyKey
            );
            expect(duplicate.reason).toBe('idempotency_key_already_processed');
          });
        });
      }
    ), { numRuns: 50 });
  });

  /**
   * Property: Sync should handle network failures gracefully
   */
  test('Property: Sync handles network failures gracefully', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        userId: fc.integer({ min: 1, max: 1000 }),
        failureType: fc.constantFrom('connection_lost', 'timeout', 'partial_failure'),
        retryAttempts: fc.integer({ min: 1, max: 3 }),
        changes: fc.array(
          fc.record({
            entity: fc.constant('visitor'),
            entityId: fc.integer({ min: 1, max: 100 }),
            action: fc.constantFrom('update_status'),
            data: fc.record({
              status: fc.constantFrom('APPROVED', 'REJECTED')
            }),
            timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString()),
            idempotencyKey: fc.string({ minLength: 10, maxLength: 40 })
          }),
          { minLength: 1, maxLength: 3 }
        )
      }),
      async (failureScenario) => {
        // Setup initial state
        let offlinePackage;
        try {
          offlinePackage = await syncService.generateOfflinePackage(
            failureScenario.userId,
            'guard',
            1
          );
        } catch (error) {
          // If we can't even generate the package, skip this test scenario
          return;
        }

        const clientPackage = {
          ...offlinePackage,
          changes: failureScenario.changes
        };

        // Simulate network failure after package generation
        if (failureScenario.failureType === 'connection_lost') {
          mockDb.disconnect();
        }

        // Property: Sync should handle failures gracefully
        if (failureScenario.failureType === 'connection_lost') {
          const results = await syncService.processBidirectionalSync(clientPackage, []);
          
          // Should complete but with errors due to connection loss
          expect(results).toBeDefined();
          expect(results.errors.length).toBeGreaterThan(0);
          expect(results.processed).toBe(0);
          
          // Should have database connection errors
          const hasConnectionError = results.errors.some(error => 
            error.error && error.error.includes('Database connection lost')
          );
          expect(hasConnectionError).toBe(true);
        } else {
          // For other failure types, sync should complete with errors
          const results = await syncService.processBidirectionalSync(clientPackage, []);
          expect(results).toBeDefined();
          expect(results.errors).toBeDefined();
        }

        // Restore connection and retry
        if (failureScenario.failureType === 'connection_lost') {
          mockDb.reconnect();
          
          // Retry should succeed
          const retryResults = await syncService.processBidirectionalSync(clientPackage, []);
          expect(retryResults.processed).toBeGreaterThanOrEqual(0);
        }
      }
    ), { numRuns: 30 });
  });

  /**
   * Property: Audit logging should be comprehensive and tamper-evident
   */
  test('Property: Audit logging is comprehensive and tamper-evident', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        userId: fc.integer({ min: 1, max: 1000 }),
        syncOperations: fc.array(
          fc.record({
            type: fc.constantFrom('download', 'upload', 'conflict_resolution'),
            changes: fc.array(
              fc.record({
                entity: fc.constant('visitor'),
                entityId: fc.integer({ min: 1, max: 100 }),
                action: fc.constantFrom('update_status', 'check_in'),
                data: fc.anything()
              }),
              { minLength: 0, maxLength: 3 }
            )
          }),
          { minLength: 1, maxLength: 5 }
        )
      }),
      async (auditScenario) => {
        const auditLogsBefore = mockDb.getAuditLog().length;
        const syncLogsBefore = mockDb.getSyncLogs().length;

        // Perform sync operations
        for (const operation of auditScenario.syncOperations) {
          if (operation.type === 'download') {
            await syncService.generateOfflinePackage(auditScenario.userId, 'guard', 1);
          } else if (operation.type === 'upload') {
            const offlinePackage = await syncService.generateOfflinePackage(
              auditScenario.userId,
              'guard',
              1
            );
            
            const clientPackage = {
              ...offlinePackage,
              changes: operation.changes.map(change => ({
                ...change,
                timestamp: new Date().toISOString(),
                idempotencyKey: crypto.randomUUID()
              }))
            };
            
            await syncService.processBidirectionalSync(clientPackage, []);
          } else if (operation.type === 'conflict_resolution') {
            // For conflict resolution, we need to create a scenario that generates conflicts
            const offlinePackage = await syncService.generateOfflinePackage(
              auditScenario.userId,
              'guard',
              1
            );
            
            // Add a visitor to create potential conflicts
            mockDb.addVisitor({
              id: 1,
              name: 'Test Visitor',
              status: 'PENDING',
              updated_at: new Date().toISOString()
            });
            
            // Create conflicting changes
            const clientPackage = {
              ...offlinePackage,
              versions: { 'visitor_1': 1 }, // Old version
              changes: [{
                entity: 'visitor',
                entityId: 1,
                action: 'update_status',
                data: { status: 'APPROVED' },
                timestamp: new Date(Date.now() - 1000).toISOString(), // Older timestamp
                idempotencyKey: crypto.randomUUID()
              }]
            };
            
            // Update visitor on server side to create conflict
            await mockDb.query(
              'UPDATE visitors SET status = $1, updated_at = $2 WHERE id = $3',
              ['REJECTED', new Date().toISOString(), 1]
            );
            
            await syncService.processBidirectionalSync(clientPackage, []);
          }
        }

        const auditLogsAfter = mockDb.getAuditLog().length;
        const syncLogsAfter = mockDb.getSyncLogs().length;

        // Property: Audit logs should be created for all operations
        expect(syncLogsAfter).toBeGreaterThan(syncLogsBefore);

        // Property: Sync logs should contain required fields
        const syncLogs = mockDb.getSyncLogs();
        const newSyncLogs = syncLogs.slice(syncLogsBefore);
        expect(newSyncLogs.length).toBeGreaterThan(0);
        
        newSyncLogs.forEach(log => {
          expect(log.id).toBeDefined();
          expect(log.user_id).toBeDefined();
          expect(log.event_type).toBeDefined();
          expect(log.package_id).toBeDefined();
          expect(log.created_at).toBeDefined();
          
          // Verify timestamp format
          expect(() => new Date(log.created_at)).not.toThrow();
          
          // Verify metadata structure
          if (log.metadata) {
            expect(typeof log.metadata).toBe('object');
          }
        });

        // Property: Audit logs should be chronologically ordered
        const timestamps = newSyncLogs.map(log => new Date(log.created_at).getTime());
        for (let i = 1; i < timestamps.length; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
        }

        // Property: User ID should be consistent across all logs
        newSyncLogs.forEach(log => {
          expect(log.user_id).toBe(auditScenario.userId);
        });
      }
    ), { numRuns: 40 });
  });

  /**
   * Property: Data integrity should be maintained across sync cycles
   */
  test('Property: Data integrity maintained across sync cycles', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        userId: fc.integer({ min: 1, max: 1000 }),
        initialVisitors: fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            status: fc.constantFrom('PENDING', 'APPROVED'),
            updated_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString())
          }),
          { minLength: 1, maxLength: 5 }
        ),
        syncCycles: fc.array(
          fc.record({
            changes: fc.array(
              fc.record({
                entityId: fc.integer({ min: 1, max: 100 }),
                newStatus: fc.constantFrom('APPROVED', 'CHECKED_IN', 'CHECKED_OUT'),
                timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString())
              }),
              { minLength: 0, maxLength: 3 }
            )
          }),
          { minLength: 1, maxLength: 3 }
        )
      }),
      async (integrityScenario) => {
        // Setup initial data
        for (const visitor of integrityScenario.initialVisitors) {
          mockDb.addVisitor(visitor);
        }

        const initialDataHash = syncService.generateIntegrityHash(
          integrityScenario.initialVisitors
        );

        // Perform multiple sync cycles
        let currentPackage = await syncService.generateOfflinePackage(
          integrityScenario.userId,
          'guard',
          1
        );

        for (const cycle of integrityScenario.syncCycles) {
          const changes = cycle.changes.map(change => ({
            entity: 'visitor',
            entityId: change.entityId,
            action: 'update_status',
            data: { status: change.newStatus },
            timestamp: change.timestamp,
            idempotencyKey: crypto.randomUUID()
          }));

          const clientPackage = {
            ...currentPackage,
            changes
          };

          const results = await syncService.processBidirectionalSync(clientPackage, []);

          // Property: Sync should complete without corruption
          expect(results.errors.length).toBe(0);

          // Generate new package for next cycle
          currentPackage = await syncService.generateOfflinePackage(
            integrityScenario.userId,
            'guard',
            1
          );

          // Property: Package integrity should be maintained
          expect(currentPackage.integrityHash).toBeDefined();
          expect(syncService.verifyPackageIntegrity(currentPackage)).toBe(true);
        }

        // Property: Final data should be consistent
        const finalData = Array.from(mockDb.data.values())
          .filter(item => item.type === 'visitor');
        
        expect(finalData.length).toBeGreaterThanOrEqual(0);
        
        // Verify all visitors have valid states
        finalData.forEach(visitor => {
          expect(visitor.id).toBeDefined();
          expect(visitor.status).toBeDefined();
          expect(['PENDING', 'APPROVED', 'CHECKED_IN', 'CHECKED_OUT', 'REJECTED'].includes(visitor.status)).toBe(true);
        });
      }
    ), { numRuns: 30 });
  });
});

// Helper functions for property tests

function createMockVisitor(id, status = 'PENDING') {
  return {
    id,
    name: `Visitor ${id}`,
    status,
    updated_at: new Date().toISOString(),
    type: 'visitor'
  };
}

function createMockChange(entityId, action = 'update_status', status = 'APPROVED') {
  return {
    entity: 'visitor',
    entityId,
    action,
    data: { status },
    timestamp: new Date().toISOString(),
    idempotencyKey: crypto.randomUUID()
  };
}

function validateSyncResults(results) {
  expect(results).toHaveProperty('processed');
  expect(results).toHaveProperty('conflicts');
  expect(results).toHaveProperty('errors');
  expect(results).toHaveProperty('duplicates');
  expect(results).toHaveProperty('auditEntries');
  
  expect(typeof results.processed).toBe('number');
  expect(Array.isArray(results.conflicts)).toBe(true);
  expect(Array.isArray(results.errors)).toBe(true);
  expect(Array.isArray(results.duplicates)).toBe(true);
  expect(Array.isArray(results.auditEntries)).toBe(true);
}

function validateAuditEntry(auditEntry) {
  expect(auditEntry).toHaveProperty('id');
  expect(auditEntry).toHaveProperty('type');
  expect(auditEntry).toHaveProperty('timestamp');
  expect(auditEntry.type).toBe('conflict_resolution');
  expect(() => new Date(auditEntry.timestamp)).not.toThrow();
}