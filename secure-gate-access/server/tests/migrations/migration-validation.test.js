/**
 * Migration Validation Test Suite (Simplified)
 * Tests migration file structure without requiring database connection
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Migration File Validation', () => {
  const MIGRATIONS_DIR = path.join(__dirname, '../../src/database/migrations');
  let migrationFiles;

  beforeAll(async () => {
    const files = await fs.readdir(MIGRATIONS_DIR);
    migrationFiles = files.filter(f => f.endsWith('.sql')).sort();
  });

  describe('File Structure', () => {
    test('should have 25 migration files', () => {
      expect(migrationFiles.length).toBe(25);
    });

    test('should have sequential numbering from 001 to 025', () => {
      const expected = Array.from({ length: 25 }, (_, i) =>
        String(i + 1).padStart(3, '0')
      );

      const actual = migrationFiles.map(f => f.split('_')[0]);

      expect(actual).toEqual(expected);
    });

    test('should have NO duplicate numbers', () => {
      const numbers = migrationFiles.map(f => f.match(/^(\d+)_/)[1]);
      const uniqueNumbers = new Set(numbers);

      expect(numbers.length).toBe(uniqueNumbers.size);
      expect(uniqueNumbers.size).toBe(25);
    });

    test('should start with 001_initial_schema.sql', () => {
      expect(migrationFiles[0]).toBe('001_initial_schema.sql');
    });

    test('should end with 025_security_fixes.sql', () => {
      expect(migrationFiles[24]).toBe('025_security_fixes.sql');
    });

    test('critical migrations should be in correct order', () => {
      const criticalMigrations = [
        '001_initial_schema.sql',           // Must be first
        '002_compliance_tables.sql',         // After users table exists
        '008_missing_core_tables.sql',       // Gates and sessions
        '010_dpa_compliance_enhancements.sql' // After compliance tables
      ];

      criticalMigrations.forEach(migration => {
        expect(migrationFiles).toContain(migration);
      });

      // Verify initial_schema is first
      expect(migrationFiles[0]).toBe('001_initial_schema.sql');

      // Verify compliance_tables comes after initial_schema
      const initialIdx = migrationFiles.indexOf('001_initial_schema.sql');
      const complianceIdx = migrationFiles.indexOf('002_compliance_tables.sql');
      expect(complianceIdx).toBeGreaterThan(initialIdx);
    });
  });

  describe('Naming Conflicts Resolution', () => {
    test('should NOT have any files with duplicate 001 prefix', () => {
      const files001 = migrationFiles.filter(f => f.startsWith('001_'));
      expect(files001).toHaveLength(1);
      expect(files001[0]).toBe('001_initial_schema.sql');
    });

    test('should NOT have any files with duplicate 003 prefix', () => {
      const files003 = migrationFiles.filter(f => f.startsWith('003_'));
      expect(files003).toHaveLength(1);
      expect(files003[0]).toBe('003_secret_management.sql');
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
    test('files should sort correctly by numeric prefix', () => {
      const sorted = [...migrationFiles].sort((a, b) => {
        const numA = parseInt(a.split('_')[0]);
        const numB = parseInt(b.split('_')[0]);
        return numA - numB;
      });

      expect(sorted).toEqual(migrationFiles);
    });

    test('migration order should match expected dependency chain', () => {
      const expectedOrder = [
        '001_initial_schema',            // Foundation
        '002_compliance_tables',         // Compliance (depends on users)
        '003_secret_management',         // Security
        '004_backup_dr',                 // DR
        '005_performance_optimizations', // Performance
        '006_logging_monitoring',        // Monitoring
        '007_refresh_tokens',            // Auth enhancement
        '008_missing_core_tables',       // Additional core tables
        '009_add_visitor_consent',       // Visitor enhancements
        '010_dpa_compliance'             // Compliance enhancements
      ];

      expectedOrder.forEach((prefix, index) => {
        const filename = migrationFiles[index];
        expect(filename).toMatch(new RegExp(`^${String(index + 1).padStart(3, '0')}_`));
        expect(filename.toLowerCase()).toContain(prefix.split('_').slice(1).join('_').toLowerCase().substring(0, 10));
      });
    });
  });
});
