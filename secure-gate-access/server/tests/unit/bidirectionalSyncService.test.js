/**
 * Unit Tests for Bidirectional Sync Service
 * Tests bidirectional sync with conflict resolution and audit logging
 */

import { jest } from '@jest/globals';
import crypto from 'crypto';
import { bidirectionalSyncService } from '../../src/services/bidirectionalSyncService.js';

// Mock dependencies
const mockDb = {
  query: jest.fn(),
  transaction: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockConflictResolver = {
  resolveConflict: jest.fn(),
  getResolutionStrategy: jest.fn()
};

const mockAuditService = {
  logSyncEvent: jest.fn(),
  logConflictResolution: jest.fn(),
  logDataChange: jest.fn()
};

jest.mock('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDb
}));

jest.mock('../../src/services/loggingService.js', () => ({
  loggingService: mockLogger
}));

jest.mock('../../src/services/conflictResolverService.js', () => ({
  conflictResolverService: mockConflictResolver
}));

jest.mock('../../src/services/auditService.js', () => ({
  auditService: mockAuditService
}));

describe('Bidirectional Sync Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sync Package Generation', () => {
    test('should generate offline package with version tracking', async () => {
      const mockVisitors = [
        {
          id: 1,
          name: 'John Doe',
          status: 'PENDING',
          updated_at: '2025-01-01T10:00:00.000Z',
          version: 1
        },
        {
          id: 2,
          name: 'Jane Smith',
          status: 'APPROVED',
          updated_at: '2025-01-01T11:00:00.000Z',
          version: 2
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({
          rows: mockVisitors,
          rowCount: mockVisitors.length
        })
        .mockResolvedValueOnce({
          rows: [{ count: '2' }],
          rowCount: 1
        });

      const result = await bidirectionalSyncService.generateOfflinePackage(
        1, // userId
        'guard',
        1 // estateId
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM visitors'),
        [1] // estateId
      );

      expect(result).toMatchObject({
        packageId: expect.any(String),
        userId: 1,
        userRole: 'guard',
        estateId: 1,
        generatedAt: expect.any(String),
        expiresAt: expect.any(String),
        data: {
          visitors: mockVisitors
        },
        versions: expect.any(Object),
        integrityHash: expect.any(String)
      });

      expect(result.versions).toHaveProperty('visitor_1', 1);
      expect(result.versions).toHaveProperty('visitor_2', 2);

      expect(mockAuditService.logSyncEvent).toHaveBeenCalledWith({
        userId: 1,
        estateId: 1,
        eventType: 'package_generated',
        packageId: result.packageId,
        metadata: {
          userRole: 'guard',
          dataCount: 2,
          packageSize: expect.any(Number)
        }
      });
    });

    test('should generate role-specific data packages', async () => {
      // Test resident package (limited data)
      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            name: 'My Visitor',
            status: 'PENDING',
            host_id: 1 // Same as userId
          }
        ],
        rowCount: 1
      });

      const residentPackage = await bidirectionalSyncService.generateOfflinePackage(
        1, // userId
        'resident',
        1 // estateId
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE host_id = $1 AND estate_id = $2'),
        [1, 1] // userId, estateId - residents only see their own visitors
      );

      expect(residentPackage.data.visitors).toHaveLength(1);
      expect(residentPackage.data.visitors[0].host_id).toBe(1);
    });

    test('should include integrity hash for package validation', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Test Visitor' }],
        rowCount: 1
      });

      const package1 = await bidirectionalSyncService.generateOfflinePackage(1, 'guard', 1);
      const package2 = await bidirectionalSyncService.generateOfflinePackage(1, 'guard', 1);

      // Same data should produce same hash
      expect(package1.integrityHash).toBe(package2.integrityHash);

      // Verify hash calculation
      const expectedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(package1.data))
        .digest('hex');
      
      expect(package1.integrityHash).toBe(expectedHash);
    });
  });

  describe('Bidirectional Sync Processing', () => {
    test('should process client changes without conflicts', async () => {
      const clientPackage = {
        packageId: 'pkg_123',
        userId: 1,
        estateId: 1,
        versions: {
          'visitor_1': 1,
          'visitor_2': 1
        },
        changes: [
          {
            entity: 'visitor',
            entityId: 1,
            action: 'update_status',
            data: { status: 'APPROVED' },
            timestamp: '2025-01-01T12:00:00.000Z',
            idempotencyKey: 'change_1'
          },
          {
            entity: 'visitor',
            entityId: 2,
            action: 'check_in',
            data: { status: 'CHECKED_IN', notes: 'Arrived on time' },
            timestamp: '2025-01-01T12:05:00.000Z',
            idempotencyKey: 'change_2'
          }
        ]
      };

      const serverChanges = [];

      // Mock current server state (no conflicts)
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            { id: 1, status: 'PENDING', version: 1, updated_at: '2025-01-01T10:00:00.000Z' },
            { id: 2, status: 'APPROVED', version: 1, updated_at: '2025-01-01T11:00:00.000Z' }
          ],
          rowCount: 2
        })
        // Mock idempotency checks (no duplicates)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        // Mock update operations
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 })
        // Mock idempotency logging
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await bidirectionalSyncService.processBidirectionalSync(
        clientPackage,
        serverChanges
      );

      expect(result).toMatchObject({
        processed: 2,
        conflicts: [],
        errors: [],
        duplicates: [],
        serverChanges: [],
        clientChanges: expect.arrayContaining([
          expect.objectContaining({
            processed: true,
            entity: 'visitor',
            entityId: 1,
            action: 'update_status'
          }),
          expect.objectContaining({
            processed: true,
            entity: 'visitor',
            entityId: 2,
            action: 'check_in'
          })
        ])
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE visitors SET status = $1'),
        ['APPROVED', expect.any(String), 1]
      );

      expect(mockAuditService.logDataChange).toHaveBeenCalledTimes(2);
    });

    test('should detect and resolve conflicts', async () => {
      const clientPackage = {
        packageId: 'pkg_123',
        userId: 1,
        estateId: 1,
        versions: {
          'visitor_1': 1 // Client has old version
        },
        changes: [
          {
            entity: 'visitor',
            entityId: 1,
            action: 'update_status',
            data: { status: 'APPROVED' },
            timestamp: '2025-01-01T10:30:00.000Z',
            idempotencyKey: 'change_1'
          }
        ]
      };

      // Mock server state (newer version - conflict)
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              status: 'REJECTED', // Different status
              version: 2, // Newer version
              updated_at: '2025-01-01T11:00:00.000Z' // Later timestamp
            }
          ],
          rowCount: 1
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // No duplicate

      // Mock conflict resolution
      mockConflictResolver.getResolutionStrategy.mockReturnValue('timestamp_based');
      mockConflictResolver.resolveConflict.mockResolvedValue({
        action: 'no_change',
        data: { status: 'REJECTED' },
        reason: 'server_timestamp_newer'
      });

      const result = await bidirectionalSyncService.processBidirectionalSync(
        clientPackage,
        []
      );

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({
        conflict: true,
        entity: 'visitor',
        entityId: 1,
        clientData: { status: 'APPROVED' },
        serverData: expect.objectContaining({ status: 'REJECTED' }),
        clientVersion: 1,
        serverVersion: 2
      });

      expect(mockConflictResolver.resolveConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: 'visitor',
          entityId: 1,
          clientData: { status: 'APPROVED' },
          serverData: expect.objectContaining({ status: 'REJECTED' })
        }),
        'timestamp_based'
      );

      expect(mockAuditService.logConflictResolution).toHaveBeenCalledWith({
        entity: 'visitor',
        entityId: 1,
        strategy: 'timestamp_based',
        clientData: { status: 'APPROVED' },
        serverData: expect.objectContaining({ status: 'REJECTED' }),
        resolution: {
          action: 'no_change',
          data: { status: 'REJECTED' },
          reason: 'server_timestamp_newer'
        },
        userId: 1,
        estateId: 1
      });
    });

    test('should handle duplicate changes with idempotency keys', async () => {
      const clientPackage = {
        packageId: 'pkg_123',
        userId: 1,
        estateId: 1,
        changes: [
          {
            entity: 'visitor',
            entityId: 1,
            action: 'update_status',
            data: { status: 'APPROVED' },
            timestamp: '2025-01-01T12:00:00.000Z',
            idempotencyKey: 'duplicate_change_123'
          }
        ]
      };

      // Mock idempotency check (duplicate found)
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 1,
              idempotency_key: 'duplicate_change_123',
              entity: 'visitor',
              action: 'update_status',
              created_at: '2025-01-01T11:00:00.000Z'
            }
          ],
          rowCount: 1
        });

      const result = await bidirectionalSyncService.processBidirectionalSync(
        clientPackage,
        []
      );

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0]).toMatchObject({
        duplicate: true,
        change: expect.objectContaining({
          idempotencyKey: 'duplicate_change_123'
        }),
        reason: 'idempotency_key_already_processed'
      });

      expect(result.processed).toBe(0);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Duplicate change detected and skipped',
        expect.objectContaining({
          idempotencyKey: 'duplicate_change_123',
          userId: 1
        })
      );
    });

    test('should process server changes', async () => {
      const clientPackage = {
        packageId: 'pkg_123',
        userId: 1,
        estateId: 1,
        changes: []
      };

      const serverChanges = [
        {
          entity: 'visitor',
          entityId: 3,
          action: 'admin_override',
          data: { status: 'EXPIRED', reason: 'Administrative decision' },
          timestamp: '2025-01-01T13:00:00.000Z'
        }
      ];

      mockDb.query.mockResolvedValue({ rowCount: 1 });

      const result = await bidirectionalSyncService.processBidirectionalSync(
        clientPackage,
        serverChanges
      );

      expect(result.serverChanges).toHaveLength(1);
      expect(result.serverChanges[0]).toMatchObject({
        processed: true,
        entity: 'visitor',
        entityId: 3,
        action: 'admin_override',
        source: 'server'
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE visitors'),
        expect.arrayContaining(['EXPIRED', expect.any(String), 3])
      );
    });
  });

  describe('Conflict Resolution Strategies', () => {
    test('should use server wins strategy', async () => {
      const conflict = {
        entity: 'visitor',
        entityId: 1,
        clientData: { status: 'APPROVED' },
        serverData: { status: 'REJECTED' },
        clientTimestamp: '2025-01-01T10:00:00.000Z',
        serverTimestamp: '2025-01-01T11:00:00.000Z'
      };

      const resolution = await bidirectionalSyncService.resolveConflict(conflict, 'server_wins');

      expect(resolution).toMatchObject({
        action: 'no_change',
        data: { status: 'REJECTED' },
        reason: 'server_wins_policy'
      });
    });

    test('should use client wins strategy', async () => {
      const conflict = {
        entity: 'visitor',
        entityId: 1,
        clientData: { status: 'APPROVED' },
        serverData: { status: 'REJECTED' },
        clientTimestamp: '2025-01-01T10:00:00.000Z',
        serverTimestamp: '2025-01-01T11:00:00.000Z'
      };

      const resolution = await bidirectionalSyncService.resolveConflict(conflict, 'client_wins');

      expect(resolution).toMatchObject({
        action: 'update',
        data: { status: 'APPROVED' },
        reason: 'client_wins_policy'
      });
    });

    test('should use timestamp-based strategy', async () => {
      const conflict = {
        entity: 'visitor',
        entityId: 1,
        clientData: { status: 'APPROVED' },
        serverData: { status: 'REJECTED' },
        clientTimestamp: '2025-01-01T12:00:00.000Z', // Newer
        serverTimestamp: '2025-01-01T11:00:00.000Z'  // Older
      };

      const resolution = await bidirectionalSyncService.resolveConflict(conflict, 'timestamp_based');

      expect(resolution).toMatchObject({
        action: 'update',
        data: { status: 'APPROVED' },
        reason: 'client_timestamp_newer'
      });
    });

    test('should use merge strategy for non-conflicting fields', async () => {
      const conflict = {
        entity: 'visitor',
        entityId: 1,
        clientData: { status: 'APPROVED', notes: 'Client notes' },
        serverData: { status: 'APPROVED', purpose: 'Server purpose' },
        clientTimestamp: '2025-01-01T10:00:00.000Z',
        serverTimestamp: '2025-01-01T11:00:00.000Z'
      };

      const resolution = await bidirectionalSyncService.resolveConflict(conflict, 'merge');

      expect(resolution).toMatchObject({
        action: 'update',
        data: {
          status: 'APPROVED',
          purpose: 'Server purpose',
          notes: 'Client notes'
        },
        reason: 'field_level_merge'
      });
    });
  });

  describe('Package Integrity', () => {
    test('should verify package integrity', () => {
      const packageData = {
        visitors: [
          { id: 1, name: 'Test Visitor' }
        ]
      };

      const integrityHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(packageData))
        .digest('hex');

      const clientPackage = {
        data: packageData,
        integrityHash
      };

      const isValid = bidirectionalSyncService.verifyPackageIntegrity(clientPackage);
      expect(isValid).toBe(true);
    });

    test('should reject tampered packages', () => {
      const packageData = {
        visitors: [
          { id: 1, name: 'Test Visitor' }
        ]
      };

      const originalHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(packageData))
        .digest('hex');

      // Tamper with data
      packageData.visitors[0].name = 'Tampered Visitor';

      const clientPackage = {
        data: packageData,
        integrityHash: originalHash // Original hash doesn't match tampered data
      };

      const isValid = bidirectionalSyncService.verifyPackageIntegrity(clientPackage);
      expect(isValid).toBe(false);
    });

    test('should reject packages without integrity hash', () => {
      const clientPackage = {
        data: { visitors: [] }
        // Missing integrityHash
      };

      const isValid = bidirectionalSyncService.verifyPackageIntegrity(clientPackage);
      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      const clientPackage = {
        packageId: 'pkg_123',
        userId: 1,
        estateId: 1,
        changes: [
          {
            entity: 'visitor',
            entityId: 1,
            action: 'update_status',
            data: { status: 'APPROVED' },
            idempotencyKey: 'change_1'
          }
        ]
      };

      mockDb.query.mockRejectedValue(new Error('Database connection lost'));

      await expect(
        bidirectionalSyncService.processBidirectionalSync(clientPackage, [])
      ).rejects.toThrow('Database connection lost');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Bidirectional sync failed',
        expect.objectContaining({
          error: 'Database connection lost',
          packageId: 'pkg_123',
          userId: 1
        })
      );
    });

    test('should handle invalid entity types', async () => {
      const clientPackage = {
        packageId: 'pkg_123',
        userId: 1,
        estateId: 1,
        changes: [
          {
            entity: 'invalid_entity',
            entityId: 1,
            action: 'update',
            data: { field: 'value' },
            idempotencyKey: 'change_1'
          }
        ]
      };

      const result = await bidirectionalSyncService.processBidirectionalSync(
        clientPackage,
        []
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        change: expect.objectContaining({
          entity: 'invalid_entity'
        }),
        error: expect.stringContaining('Unsupported entity type'),
        type: 'client_change_error'
      });
    });

    test('should handle sync logging failures gracefully', async () => {
      const clientPackage = {
        packageId: 'pkg_123',
        userId: 1,
        estateId: 1,
        changes: []
      };

      // Mock successful sync but failed logging
      mockAuditService.logSyncEvent.mockRejectedValue(new Error('Logging service unavailable'));

      const result = await bidirectionalSyncService.processBidirectionalSync(
        clientPackage,
        []
      );

      // Sync should complete despite logging failure
      expect(result).toBeDefined();
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'logging_error',
          error: 'Logging service unavailable'
        })
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Sync completed but logging failed',
        expect.objectContaining({
          packageId: 'pkg_123',
          error: 'Logging service unavailable'
        })
      );
    });
  });

  describe('Performance and Optimization', () => {
    test('should batch database operations', async () => {
      const clientPackage = {
        packageId: 'pkg_123',
        userId: 1,
        estateId: 1,
        changes: Array.from({ length: 10 }, (_, i) => ({
          entity: 'visitor',
          entityId: i + 1,
          action: 'update_status',
          data: { status: 'APPROVED' },
          timestamp: new Date().toISOString(),
          idempotencyKey: `change_${i + 1}`
        }))
      };

      // Mock successful batch operations
      mockDb.query
        .mockResolvedValueOnce({
          rows: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            status: 'PENDING',
            version: 1
          })),
          rowCount: 10
        })
        .mockResolvedValue({ rows: [], rowCount: 0 }); // No duplicates

      // Mock batch update
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback({
          query: jest.fn().mockResolvedValue({ rowCount: 1 })
        });
      });

      const result = await bidirectionalSyncService.processBidirectionalSync(
        clientPackage,
        []
      );

      expect(result.processed).toBe(10);
      expect(mockDb.transaction).toHaveBeenCalled();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Batch sync operation completed',
        expect.objectContaining({
          batchSize: 10,
          processed: 10
        })
      );
    });

    test('should limit package size for performance', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        name: `Visitor ${i + 1}`,
        status: 'PENDING'
      }));

      mockDb.query.mockResolvedValue({
        rows: largeDataset,
        rowCount: largeDataset.length
      });

      const result = await bidirectionalSyncService.generateOfflinePackage(1, 'guard', 1);

      // Should limit data size
      expect(result.data.visitors.length).toBeLessThanOrEqual(1000);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Large dataset truncated for offline package',
        expect.objectContaining({
          totalRecords: 10000,
          includedRecords: expect.any(Number),
          limit: 1000
        })
      );
    });
  });
});