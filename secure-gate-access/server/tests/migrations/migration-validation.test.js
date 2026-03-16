/**
 * Migration Validation Test Suite (Simplified)
 * Tests migration file structure without requiring database connection
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { KNOWN_HISTORICAL_GAPS } from '../../src/database/migrations/migrationNumbering.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Migration File Validation', () => {
  const MIGRATIONS_DIR = path.join(__dirname, '../../src/database/migrations');
  let migrationFiles;
  let sortedMigrations;

  const migrationSort = (a, b) => {
    const matchA = a.match(/^(\d+)_/);
    const matchB = b.match(/^(\d+)_/);
    const orderA = matchA ? parseInt(matchA[1], 10) : Number.MAX_SAFE_INTEGER;
    const orderB = matchB ? parseInt(matchB[1], 10) : Number.MAX_SAFE_INTEGER;
    const isInitialA = a.includes('initial_schema');
    const isInitialB = b.includes('initial_schema');

    if (orderA !== orderB) return orderA - orderB;
    if (isInitialA !== isInitialB) return isInitialA ? -1 : 1;
    return a.localeCompare(b);
  };

  beforeAll(async () => {
    const files = await fs.readdir(MIGRATIONS_DIR);
    migrationFiles = files.filter(f => f.endsWith('.sql')).sort();
    sortedMigrations = [...migrationFiles].sort(migrationSort);
  });

  describe('File Structure', () => {
    test('should have at least 25 migration files', () => {
      expect(migrationFiles.length).toBeGreaterThanOrEqual(25);
    });

    test('should include numeric and named migrations', () => {
      const numeric = migrationFiles.filter(f => /^\d+_/.test(f));
      const named = migrationFiles.filter(f => !/^\d+_/.test(f));

      expect(numeric.length).toBeGreaterThan(0);
      expect(named.length).toBeGreaterThan(0);
    });

    test('numeric migrations should use 3-digit prefixes', () => {
      const numeric = migrationFiles.filter(f => /^\d+_/.test(f));
      const invalid = numeric.filter(f => !/^\d{3}_/.test(f));

      expect(invalid).toHaveLength(0);
    });

    test('should start with 001_initial_schema.sql', () => {
      expect(sortedMigrations[0]).toBe('001_initial_schema.sql');
    });

    test('should include 025_security_fixes.sql', () => {
      expect(migrationFiles).toContain('025_security_fixes.sql');
    });

    test('critical migrations should be in correct order', () => {
      const criticalMigrations = [
        '001_initial_schema.sql',           // Must be first
        '002_compliance_tables.sql',         // After users table exists
        '008_missing_core_tables.sql',       // Gates and sessions
        '010_dpa_compliance_enhancements.sql' // After compliance tables
      ];

      criticalMigrations.forEach(migration => {
        expect(sortedMigrations).toContain(migration);
      });

      // Verify initial_schema is first
      expect(sortedMigrations[0]).toBe('001_initial_schema.sql');

      // Verify compliance_tables comes after initial_schema
      const initialIdx = sortedMigrations.indexOf('001_initial_schema.sql');
      const complianceIdx = sortedMigrations.indexOf('002_compliance_tables.sql');
      expect(complianceIdx).toBeGreaterThan(initialIdx);
    });
  });

  describe('Naming Conflicts Resolution', () => {
    test('should NOT have any files with duplicate 001 prefix', () => {
      const files001 = migrationFiles.filter(f => f.startsWith('001_'));
      expect(files001).toHaveLength(1);
      expect(files001[0]).toBe('001_initial_schema.sql');
    });

    test('should preserve only the documented historical sequence gaps', () => {
      const numericPrefixes = migrationFiles
        .filter(f => /^\d{3}_/.test(f))
        .map(f => Number.parseInt(f.slice(0, 3), 10));
      const uniqueSorted = [...new Set(numericPrefixes)].sort((a, b) => a - b);
      const missing = [];

      for (let n = uniqueSorted[0]; n <= uniqueSorted[uniqueSorted.length - 1]; n++) {
        if (!uniqueSorted.includes(n)) {
          missing.push(n);
        }
      }

      expect(missing).toEqual(KNOWN_HISTORICAL_GAPS);
    });

    test('should NOT have any files with duplicate 007 prefix', () => {
      const files007 = migrationFiles.filter(f => f.startsWith('007_'));
      expect(files007).toHaveLength(1);
      expect(files007[0]).toBe('007_refresh_tokens_user_enhancements.sql');
    });

    test('previously conflicting files should be renumbered correctly', () => {
      const renamedFiles = {
        '002_compliance_tables.sql': true,           // was 001
        '005_performance_optimizations.sql': true,   // was 003
        '010_dpa_compliance_enhancements.sql': true  // was 007
      };

      Object.keys(renamedFiles).forEach(filename => {
        expect(migrationFiles).toContain(filename);
      });
    });
  });

  describe('File Content Validation', () => {
    test('each migration should be readable', async () => {
      for (const file of migrationFiles.slice(0, 5)) { // Test first 5
        const filePath = path.join(MIGRATIONS_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');

        expect(content).toBeTruthy();
        expect(content.length).toBeGreaterThan(0);
      }
    });

    test('migrations should contain SQL statements', async () => {
      const samples = [
        '001_initial_schema.sql',
        '002_compliance_tables.sql',
        '008_missing_core_tables.sql'
      ];

      for (const file of samples) {
        const filePath = path.join(MIGRATIONS_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');

        // Should contain CREATE TABLE statements
        expect(content).toMatch(/CREATE TABLE/i);
      }
    });

    test('active migrations should cover estates and tenant scoping changes', async () => {
      const estatesMigration = await fs.readFile(
        path.join(MIGRATIONS_DIR, '033_00_add_estates_table.sql'),
        'utf8'
      );
      const tenantScopingMigration = await fs.readFile(
        path.join(MIGRATIONS_DIR, '033_01_add_estate_id_to_users_visitors.sql'),
        'utf8'
      );

      expect(estatesMigration).toMatch(/CREATE TABLE IF NOT EXISTS estates/i);
      expect(tenantScopingMigration).toMatch(/ALTER TABLE users[\s\S]*?ADD COLUMN IF NOT EXISTS estate_id/i);
      expect(tenantScopingMigration).toMatch(/ALTER TABLE visitors[\s\S]*?ADD COLUMN IF NOT EXISTS estate_id/i);
    });

    test('initial_schema should create core tables', async () => {
      const content = await fs.readFile(
        path.join(MIGRATIONS_DIR, '001_initial_schema.sql'),
        'utf8'
      );

      // Check for core tables
      expect(content).toMatch(/CREATE TABLE.*users/i);
      expect(content).toMatch(/CREATE TABLE.*visitors/i);
      expect(content).toMatch(/CREATE TABLE.*passes/i);
    });
  });

  describe('Performance - File Size Check', () => {
    test('migration files should not be excessively large', async () => {
      for (const file of migrationFiles) {
        const filePath = path.join(MIGRATIONS_DIR, file);
        const stats = await fs.stat(filePath);

        // No single migration should be larger than 100KB
        expect(stats.size).toBeLessThan(100 * 1024);
      }
    });
  });

  describe('Execution Order Validation', () => {
    test('files should sort correctly by migration runner order', () => {
      const numericCount = sortedMigrations.filter(f => /^\d+_/.test(f)).length;
      const named = sortedMigrations.filter(f => !/^\d+_/.test(f));

      expect(sortedMigrations[0]).toBe('001_initial_schema.sql');
      expect(sortedMigrations.slice(numericCount)).toEqual(named);
    });

    test('migration order should match expected dependency chain', () => {
      const expectedOrder = [
        '001_initial_schema',            // Foundation
        '002_compliance_tables',         // Compliance (depends on users)
        '005_performance_optimizations', // Performance
        '006_logging_monitoring',        // Monitoring
        '007_refresh_tokens',            // Auth enhancement
        '008_missing_core_tables',       // Additional core tables
        '009_add_visitor_consent',       // Visitor enhancements
        '010_dpa_compliance'             // Compliance enhancements
      ];

      const indices = expectedOrder.map(prefix =>
        sortedMigrations.findIndex(f => f.toLowerCase().includes(prefix.split('_').slice(1).join('_')))
      );

      indices.forEach((idx, i) => {
        expect(idx).toBeGreaterThanOrEqual(0);
        if (i > 0) {
          expect(idx).toBeGreaterThan(indices[i - 1]);
        }
      });
    });
  });
});
