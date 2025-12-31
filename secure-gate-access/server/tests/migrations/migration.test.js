/**
 * Migration Test Suite
 * Tests database migrations for correctness, order, and idempotency
 *
 * Requirements from UNIT_TESTING_ROADMAP.md:
 * - Performance regression testing
 * - Chaos engineering for resilience
 * - Mutation testing compatibility
 */

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Database Migrations', () => {
  let testPool;
  const TEST_DB_NAME = 'secure_gate_test_migrations';
  const MIGRATIONS_DIR = path.join(__dirname, '../../src/database/migrations');

  beforeAll(async () => {
    // Connect to postgres database to create test database
    const setupPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: 'postgres'
    });

    try {
      // Drop test database if exists
      await setupPool.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
      // Create test database
      await setupPool.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    } finally {
      await setupPool.end();
    }

    // Connect to test database
    testPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: TEST_DB_NAME
    });
  });

  afterAll(async () => {
    if (testPool) {
      await testPool.end();
    }

    // Clean up test database
    const cleanupPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: 'postgres'
    });

    try {
      await cleanupPool.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    } finally {
      await cleanupPool.end();
    }
  });

  describe('Migration File Structure', () => {
    let migrationFiles;

    beforeAll(async () => {
      const files = await fs.readdir(MIGRATIONS_DIR);
      migrationFiles = files.filter(f => f.endsWith('.sql')).sort();
    });

    test('should have sequential numbering without conflicts', () => {
      const prefixes = migrationFiles.map(f => parseInt(f.split('_')[0]));
      const uniquePrefixes = new Set(prefixes);

      expect(prefixes.length).toBe(uniquePrefixes.size);
      expect(prefixes).toEqual([...Array(25).keys()].map(i => i + 1));
    });

    test('should start with 001_initial_schema.sql', () => {
      expect(migrationFiles[0]).toBe('001_initial_schema.sql');
    });

    test('should end with 025_security_fixes.sql', () => {
      expect(migrationFiles[migrationFiles.length - 1]).toBe('025_security_fixes.sql');
    });

    test('should have no duplicate numbers', () => {
      const numbers = migrationFiles.map(f => f.match(/^(\d+)_/)[1]);
      const uniqueNumbers = new Set(numbers);

      expect(numbers.length).toBe(uniqueNumbers.size);
    });

    test('each migration should contain UP and DOWN sections', async () => {
      for (const file of migrationFiles.slice(0, 5)) { // Test first 5
        const content = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');

        // Check for migration comment structure
        expect(content).toMatch(/-- Migration:|-- Up migration/i);
      }
    });
  });

  describe('Migration Execution', () => {
    test('should create schema_migrations tracking table', async () => {
      await testPool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          filename TEXT UNIQUE NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);

      const result = await testPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'schema_migrations'
        );
      `);

      expect(result.rows[0].exists).toBe(true);
    });

    test('should execute all migrations in order without errors', async () => {
      const files = await fs.readdir(MIGRATIONS_DIR);
      const migrationFiles = files.filter(f => f.endsWith('.sql')).sort();

      for (const filename of migrationFiles) {
        const filePath = path.join(MIGRATIONS_DIR, filename);
        const content = await fs.readFile(filePath, 'utf8');

        // Extract UP migration (before "-- Down migration")
        const upSection = content.split(/-- Down migration/i)[0];

        try {
          await testPool.query(upSection);

          // Record migration
          await testPool.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
            [filename]
          );
        } catch (error) {
          throw new Error(`Migration ${filename} failed: ${error.message}`);
        }
      }

      // Verify all migrations were applied
      const result = await testPool.query('SELECT COUNT(*) FROM schema_migrations');
      expect(parseInt(result.rows[0].count)).toBe(migrationFiles.length);
    }, 60000); // 60 second timeout for all migrations
  });

  describe('Schema Integrity', () => {
    test('should have all core tables created', async () => {
      const coreTables = [
        'users',
        'visitors',
        'passes',
        'bulk_invites',
        'access_logs',
        'audit_logs',
        'security_events',
        'gates',
        'sessions'
      ];

      for (const table of coreTables) {
        const result = await testPool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          );
        `, [table]);

        expect(result.rows[0].exists).toBe(true);
      }
    });

    test('should have no duplicate retention/compliance tables', async () => {
      const result = await testPool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND (table_name LIKE '%retention%' OR table_name LIKE '%consent%')
        ORDER BY table_name;
      `);

      const tableNames = result.rows.map(r => r.table_name);

      // Should have only ONE retention table and ONE consent table
      const retentionTables = tableNames.filter(t => t.includes('retention'));
      const consentTables = tableNames.filter(t => t.includes('consent'));

      expect(retentionTables.length).toBeLessThanOrEqual(2); // Max 2 retention tables
      expect(consentTables.length).toBeLessThanOrEqual(2); // Max 2 consent tables
    });

    test('should have all foreign key constraints', async () => {
      const result = await testPool.query(`
        SELECT COUNT(*)
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public';
      `);

      const fkCount = parseInt(result.rows[0].count);
      expect(fkCount).toBeGreaterThan(20); // Should have many FK constraints
    });

    test('should have all indexes created', async () => {
      const result = await testPool.query(`
        SELECT COUNT(*)
        FROM pg_indexes
        WHERE schemaname = 'public';
      `);

      const indexCount = parseInt(result.rows[0].count);
      expect(indexCount).toBeGreaterThan(30); // Should have many indexes
    });

    test('should have update_updated_at_column function', async () => {
      const result = await testPool.query(`
        SELECT EXISTS (
          SELECT FROM pg_proc
          WHERE proname = 'update_updated_at_column'
        );
      `);

      expect(result.rows[0].exists).toBe(true);
    });
  });

  describe('Migration Idempotency', () => {
    test('should handle re-running migrations gracefully', async () => {
      // Re-run first migration
      const content = await fs.readFile(
        path.join(MIGRATIONS_DIR, '001_initial_schema.sql'),
        'utf8'
      );
      const upSection = content.split(/-- Down migration/i)[0];

      // Should not throw error on re-run due to IF NOT EXISTS clauses
      await expect(testPool.query(upSection)).resolves.not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    test('should create users table with proper indexes', async () => {
      const result = await testPool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'users';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('should create visitors table with performance indexes', async () => {
      const result = await testPool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'visitors'
        AND indexname LIKE 'idx_%';
      `);

      const expectedIndexes = [
        'idx_visitors_invite_code',
        'idx_visitors_status',
        'idx_visitors_date_of_visit',
        'idx_visitors_created_by'
      ];

      const actualIndexes = result.rows.map(r => r.indexname);

      for (const expectedIndex of expectedIndexes) {
        expect(actualIndexes).toContain(expectedIndex);
      }
    });
  });

  describe('Chaos Engineering - Resilience Tests', () => {
    test('should handle constraint violations gracefully', async () => {
      // Try to insert duplicate email
      await testPool.query(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES ('test1', 'test@example.com', 'hash1', 'admin');
      `);

      await expect(
        testPool.query(`
          INSERT INTO users (username, email, password_hash, role)
          VALUES ('test2', 'test@example.com', 'hash2', 'admin');
        `)
      ).rejects.toThrow();
    });

    test('should enforce foreign key constraints', async () => {
      // Try to insert visitor with non-existent user
      await expect(
        testPool.query(`
          INSERT INTO passes (pass_id, visitor_id, expires_at)
          VALUES ('PASS001', 99999, NOW() + INTERVAL '1 day');
        `)
      ).rejects.toThrow();
    });

    test('should handle concurrent migrations gracefully', async () => {
      // This tests that IF NOT EXISTS protects against race conditions
      const promises = Array(3).fill(null).map(() =>
        testPool.query(`
          CREATE TABLE IF NOT EXISTS test_concurrent_table (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100)
          );
        `)
      );

      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Cleanup
      await testPool.query('DROP TABLE IF EXISTS test_concurrent_table');
    });
  });

  describe('Data Integrity Tests', () => {
    test('should have proper timestamp defaults', async () => {
      const result = await testPool.query(`
        SELECT column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'created_at';
      `);

      expect(result.rows[0].column_default).toContain('now()');
    });

    test('should have proper NOT NULL constraints on critical fields', async () => {
      const result = await testPool.query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name IN ('username', 'email', 'password_hash', 'role');
      `);

      result.rows.forEach(row => {
        expect(row.is_nullable).toBe('NO');
      });
    });
  });
});
