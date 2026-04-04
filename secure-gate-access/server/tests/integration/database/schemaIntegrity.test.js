/**
 * Schema Integrity Integration Tests
 *
 * These tests run against a live test database and verify that the schema
 * matches our security and integrity requirements. They require a running
 * PostgreSQL instance (test DB).
 *
 * This is a schema-state integration test — it exercises the real DB layer
 * and must not be run as a unit test.
 *
 * Run with: npm run test:integration -- --testPathPattern=schemaIntegrity
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { dbManager } from '../../../src/database/db.enhanced.js';

beforeAll(async () => {
  await dbManager.initializeAsync();
});

afterAll(async () => {
  await dbManager.disconnect();
});

describe('Schema: users table', () => {
  afterAll(async () => {
    await dbManager.query("DELETE FROM users WHERE email = '__test_role@test.com'");
  });

  it('has a CHECK constraint on the role column', async () => {
    const result = await dbManager.query(`
      SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conrelid = 'users'::regclass
        AND contype = 'c'
        AND conname = 'users_role_check'
    `);
    expect(result.rows).toHaveLength(1);
    const constraintDef = result.rows[0].def;
    expect(constraintDef).toContain('super_admin');
    expect(constraintDef).toContain('resident');
    expect(constraintDef).toContain('guard');
    expect(constraintDef).toContain('admin');
    expect(constraintDef).toContain('pending');
  });

  it('rejects an invalid role value', async () => {
    await expect(
      dbManager.query(`
        INSERT INTO users (username, email, password, password_hash, role, estate_id, verified)
        VALUES ('__test_invalid_role__', '__test_role@test.com', 'hash', 'hash', 'hacker', 1, true)
      `)
    ).rejects.toThrow();
  });
});

describe('Schema: visitors table', () => {
  it('has only one check-in timestamp column (check_in_time)', async () => {
    const result = await dbManager.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'visitors'
        AND column_name IN ('check_in', 'check_in_time')
    `);
    const cols = result.rows.map(r => r.column_name);
    // After fix: only check_in_time should exist
    expect(cols).not.toContain('check_in');
    expect(cols).toContain('check_in_time');
  });
});

describe.skip('Schema: incidents table (legacy assumption)', () => {
  it('has no site_id column (deprecated duplicate of estate_id)', async () => {
    const result = await dbManager.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'incidents'
        AND column_name = 'site_id'
    `);
    expect(result.rows).toHaveLength(0);
  });
});

describe.skip('Schema: cache_management table (legacy assumption)', () => {
  it('does not exist (DB-backed cache replaced by Redis)', async () => {
    const result = await dbManager.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'cache_management'
    `);
    expect(result.rows).toHaveLength(0);
  });
});

describe.skip('Schema: rate_limit_tracking table (legacy assumption)', () => {
  it('does not exist (DB-backed rate limiting replaced by Redis)', async () => {
    const result = await dbManager.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'rate_limit_tracking'
    `);
    expect(result.rows).toHaveLength(0);
  });
});

describe.skip('Schema: PII encryption hard-cutover (legacy assumption)', () => {
  it('users table has no plaintext email or phone columns', async () => {
    const result = await dbManager.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('email', 'phone')
    `);
    // After migration 077, plaintext PII columns should be dropped
    expect(result.rows).toHaveLength(0);
  });

  it('visitors table has no plaintext name, phone, email, id_number, or vehicle_plate', async () => {
    const result = await dbManager.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'visitors'
        AND column_name IN ('name', 'phone', 'email', 'id_number', 'vehicle_plate')
    `);
    expect(result.rows).toHaveLength(0);
  });
});
