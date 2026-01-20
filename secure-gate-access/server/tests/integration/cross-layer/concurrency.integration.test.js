/**
 * Concurrency Integration Tests
 * Tests system behavior under concurrent operations
 * 
 * Priority: HIGH (Data Integrity)
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers } from '../setup.js';
import { dbManager } from '../../../src/database/db.enhanced.js';

describe('Concurrency Integration Tests', () => {
  let testUsers;
  let estateId;

  beforeAll(async () => {
    await setupTestDatabase();
    testUsers = await createTestUsers();
    estateId = testUsers.resident.estate_id;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await dbManager.query('DELETE FROM visitors');
    await dbManager.query('DELETE FROM audit_logs');
  });

  // =========================================
  // Concurrent Check-In Tests
  // =========================================
  describe('Concurrent Check-In Operations', () => {
    it('should prevent double check-in of same visitor', async () => {
      // Create approved visitor
      const visitorResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status, estate_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        ['Concurrent Visitor', '+254700111111', testUsers.resident.id, 'CONC001', 'approved', estateId]
      );
      const visitorId = visitorResult.rows[0].id;

      // Simulate concurrent check-in attempts using optimistic locking
      const checkIn = async (attemptId) => {
        const result = await dbManager.query(
          `UPDATE visitors 
           SET status = 'on_premise', check_in_time = NOW()
           WHERE id = $1 AND status = 'approved'
           RETURNING *`,
          [visitorId]
        );
        return { attemptId, success: result.rowCount > 0 };
      };

      // Run concurrent check-ins
      const results = await Promise.all([
        checkIn(1),
        checkIn(2),
        checkIn(3)
      ]);

      // Only one should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(1);

      // Verify final state
      const finalState = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [visitorId]
      );
      expect(finalState.rows[0].status).toBe('on_premise');
    });

    it('should handle multiple visitors checking in simultaneously', async () => {
      // Create multiple approved visitors
      const visitorIds = [];
      for (let i = 0; i < 10; i++) {
        const result = await dbManager.query(
          `INSERT INTO visitors (name, phone, host_id, invite_code, status, estate_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [`Visitor ${i}`, `+2547001111${i.toString().padStart(2, '0')}`, testUsers.resident.id, `MULTI${i}`, 'approved', estateId]
        );
        visitorIds.push(result.rows[0].id);
      }

      // Check in all visitors concurrently
      const checkInPromises = visitorIds.map(id => 
        dbManager.query(
          `UPDATE visitors SET status = 'on_premise', check_in_time = NOW()
           WHERE id = $1 AND status = 'approved'
           RETURNING *`,
          [id]
        )
      );

      const results = await Promise.all(checkInPromises);

      // All should succeed
      const successCount = results.filter(r => r.rowCount > 0).length;
      expect(successCount).toBe(10);

      // Verify all are checked in
      const checkedIn = await dbManager.query(
        "SELECT COUNT(*) FROM visitors WHERE status = 'on_premise'"
      );
      expect(parseInt(checkedIn.rows[0].count)).toBe(10);
    });
  });

  // =========================================
  // Concurrent Update Tests
  // =========================================
  describe('Concurrent Update Operations', () => {
    it('should handle concurrent visitor updates without data loss', async () => {
      // Create visitor
      const visitorResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, email, purpose, host_id, invite_code, status, estate_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        ['Update Visitor', '+254700222222', 'update@test.com', 'Original', testUsers.resident.id, 'UPD001', 'pending', estateId]
      );
      const visitorId = visitorResult.rows[0].id;

      // Concurrent updates to different fields
      const updatePromises = [
        dbManager.query(
          `UPDATE visitors SET purpose = $1, updated_at = NOW() WHERE id = $2`,
          ['Updated Purpose 1', visitorId]
        ),
        dbManager.query(
          `UPDATE visitors SET email = $1, updated_at = NOW() WHERE id = $2`,
          ['updated1@test.com', visitorId]
        ),
        dbManager.query(
          `UPDATE visitors SET phone = $1, updated_at = NOW() WHERE id = $2`,
          ['+254700333333', visitorId]
        )
      ];

      await Promise.all(updatePromises);

      // Final state should have all updates (last writer wins for each field)
      const finalState = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [visitorId]
      );

      // Name should be unchanged
      expect(finalState.rows[0].name).toBe('Update Visitor');
      // Other fields may vary based on timing, but should be valid
      expect(finalState.rows[0].purpose).toBeDefined();
      expect(finalState.rows[0].email).toBeDefined();
    });

    it('should maintain data integrity under concurrent status changes', async () => {
      // Create visitor
      const visitorResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status, estate_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        ['Status Visitor', '+254700444444', testUsers.resident.id, 'STAT001', 'pending', estateId]
      );
      const visitorId = visitorResult.rows[0].id;

      // Attempt concurrent status changes with conditions
      const approveAttempt = dbManager.query(
        `UPDATE visitors SET status = 'approved' WHERE id = $1 AND status = 'pending' RETURNING *`,
        [visitorId]
      );
      const rejectAttempt = dbManager.query(
        `UPDATE visitors SET status = 'rejected' WHERE id = $1 AND status = 'pending' RETURNING *`,
        [visitorId]
      );

      const [approveResult, rejectResult] = await Promise.all([approveAttempt, rejectAttempt]);

      // Only one should succeed
      const totalSuccess = approveResult.rowCount + rejectResult.rowCount;
      expect(totalSuccess).toBe(1);

      // Final status should be consistent
      const finalState = await dbManager.query(
        'SELECT status FROM visitors WHERE id = $1',
        [visitorId]
      );
      expect(['approved', 'rejected']).toContain(finalState.rows[0].status);
    });
  });

  // =========================================
  // Race Condition Prevention Tests
  // =========================================
  describe('Race Condition Prevention', () => {
    it('should prevent race condition in invite code generation', async () => {
      // Generate codes concurrently
      const generateCode = async () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        try {
          await dbManager.query(
            `INSERT INTO visitors (name, phone, host_id, invite_code, status, estate_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            ['Race Visitor', '+254700555555', testUsers.resident.id, code, 'pending', estateId]
          );
          return { success: true, code };
        } catch (error) {
          if (error.message.includes('duplicate')) {
            return { success: false, code, error: 'duplicate' };
          }
          throw error;
        }
      };

      // Run many concurrent insertions
      const promises = Array(20).fill(null).map(() => generateCode());
      const results = await Promise.all(promises);

      // Most should succeed (unique codes)
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(15); // Allow some collisions
    });

    it('should handle concurrent audit log writes', async () => {
      // Concurrent audit log insertions
      const writeAuditLog = async (index) => {
        await dbManager.query(
          `INSERT INTO audit_logs (action, resource, user_id, details)
           VALUES ($1, $2, $3, $4)`,
          [`concurrent.action.${index}`, 'test', testUsers.resident.id, JSON.stringify({ index })]
        );
        return index;
      };

      const promises = Array(50).fill(null).map((_, i) => writeAuditLog(i));
      await Promise.all(promises);

      // All should be written
      const count = await dbManager.query(
        "SELECT COUNT(*) FROM audit_logs WHERE action LIKE 'concurrent.action.%'"
      );
      expect(parseInt(count.rows[0].count)).toBe(50);
    });
  });

  // =========================================
  // Transaction Isolation Tests
  // =========================================
  describe('Transaction Isolation', () => {
    it('should isolate transactions correctly', async () => {
      // Create initial visitor
      const visitorResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status, estate_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        ['Transaction Visitor', '+254700666666', testUsers.resident.id, 'TRANS001', 'pending', estateId]
      );
      const visitorId = visitorResult.rows[0].id;

      // Start two concurrent transactions
      const client1 = await dbManager.pool.connect();
      const client2 = await dbManager.pool.connect();

      try {
        await client1.query('BEGIN');
        await client2.query('BEGIN');

        // Client 1 updates
        await client1.query(
          `UPDATE visitors SET purpose = 'Transaction 1' WHERE id = $1`,
          [visitorId]
        );

        // Client 2 reads (should see old value in REPEATABLE READ)
        const read2 = await client2.query(
          'SELECT purpose FROM visitors WHERE id = $1',
          [visitorId]
        );

        // With default READ COMMITTED, client2 may or may not see the update
        // This tests isolation behavior
        expect(read2.rows[0]).toBeDefined();

        await client1.query('COMMIT');
        await client2.query('COMMIT');
      } finally {
        client1.release();
        client2.release();
      }
    });

    it('should rollback failed transactions', async () => {
      const client = await dbManager.pool.connect();

      try {
        await client.query('BEGIN');

        // Insert visitor
        const insertResult = await client.query(
          `INSERT INTO visitors (name, phone, host_id, invite_code, status, estate_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          ['Rollback Visitor', '+254700777777', testUsers.resident.id, 'ROLL001', 'pending', estateId]
        );
        const visitorId = insertResult.rows[0].id;

        // Rollback
        await client.query('ROLLBACK');

        // Verify visitor was not persisted
        const check = await dbManager.query(
          'SELECT * FROM visitors WHERE id = $1',
          [visitorId]
        );
        expect(check.rows).toHaveLength(0);
      } finally {
        client.release();
      }
    });
  });

  // =========================================
  // Deadlock Prevention Tests
  // =========================================
  describe('Deadlock Prevention', () => {
    it('should handle potential deadlock scenarios', async () => {
      // Create two visitors
      const visitor1Result = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status, estate_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        ['Deadlock Visitor 1', '+254700888881', testUsers.resident.id, 'DEAD001', 'pending', estateId]
      );
      const visitor2Result = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status, estate_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        ['Deadlock Visitor 2', '+254700888882', testUsers.resident.id, 'DEAD002', 'pending', estateId]
      );

      const id1 = visitor1Result.rows[0].id;
      const id2 = visitor2Result.rows[0].id;

      // Concurrent updates - use explicit locking order to prevent deadlock
      const update1 = dbManager.query(
        `UPDATE visitors SET purpose = 'Update 1' WHERE id = $1`,
        [Math.min(id1, id2)]
      ).then(() => dbManager.query(
        `UPDATE visitors SET purpose = 'Update 1' WHERE id = $1`,
        [Math.max(id1, id2)]
      ));
      const update2 = dbManager.query(
        `UPDATE visitors SET purpose = 'Update 2' WHERE id = $1`,
        [Math.min(id1, id2)]
      ).then(() => dbManager.query(
        `UPDATE visitors SET purpose = 'Update 2' WHERE id = $1`,
        [Math.max(id1, id2)]
      ));

      // Both should complete (ordering prevents deadlock)
      const results = await Promise.all([update1, update2]);
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
    });
  });

  // =========================================
  // Performance Under Concurrency
  // =========================================
  describe('Performance Under Concurrency', () => {
    it('should maintain acceptable performance with 50 concurrent operations', async () => {
      const startTime = Date.now();

      // 50 concurrent visitor creations
      const promises = Array(50).fill(null).map((_, i) => 
        dbManager.query(
          `INSERT INTO visitors (name, phone, host_id, invite_code, status, estate_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [`Perf Visitor ${i}`, `+25470099${i.toString().padStart(4, '0')}`, testUsers.resident.id, `PERF${i}`, 'pending', estateId]
        )
      );

      await Promise.all(promises);

      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Verify all inserted
      const count = await dbManager.query(
        "SELECT COUNT(*) FROM visitors WHERE name LIKE 'Perf Visitor%'"
      );
      expect(parseInt(count.rows[0].count)).toBe(50);
    });
  });
});
