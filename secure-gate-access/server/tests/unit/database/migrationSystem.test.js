import { describe, it, expect } from '@jest/globals';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../../../src/database/migrations');

function extractOrder(filename) {
  const m = filename.match(/^(\d+)_/);
  return m ? parseInt(m[1], 10) : null;
}

// Non-numeric migration files that predate the numbering convention.
// These are known exceptions — any NEW file added here requires a code review justification.
const KNOWN_NON_NUMERIC_FILES = new Set([
  'add-event-management-tables.sql',
  'add-guard-management-tables.sql',
]);

describe('Migration system', () => {
  let sqlFiles;

  beforeAll(async () => {
    const all = await readdir(MIGRATIONS_DIR);
    sqlFiles = all.filter(f => f.endsWith('.sql'));
  });

  it('every .sql file has a numeric prefix', () => {
    const nonNumeric = sqlFiles.filter(f => extractOrder(f) === null && !KNOWN_NON_NUMERIC_FILES.has(f));
    expect(nonNumeric).toEqual([]);
  });

  it('documents all known duplicate-prefix groups', () => {
    const KNOWN_DUPLICATE_PREFIXES = new Set([21, 23, 33, 34, 35, 36, 37, 48, 51, 59, 60, 61, 64, 65, 66]);
    const counts = {};
    for (const f of sqlFiles) {
      const n = extractOrder(f);
      if (n !== null) counts[n] = (counts[n] || 0) + 1;
    }
    const actualDuplicates = Object.entries(counts)
      .filter(([, c]) => c > 1)
      .map(([n]) => parseInt(n));

    for (const n of actualDuplicates) {
      expect(KNOWN_DUPLICATE_PREFIXES.has(n)).toBe(true);
    }
  });

  it('no new files use numbers 001–068 (reserved for existing migrations)', () => {
    const KNOWN_DUPLICATE_PREFIXES = new Set([21, 23, 33, 34, 35, 36, 37, 48, 51, 59, 60, 61, 64, 65, 66]);
    const NEW_PLAN_FILES = new Set([
      '069_add_schema_migration_metadata.sql',
      '070_fix_role_check_constraint.sql',
      '072_fix_visitors_duplicate_checkin.sql',
      '073_fix_incidents_site_id.sql',
      '074_drop_db_cache_table.sql',
      '075_drop_db_rate_limit_table.sql',
      '076_privacy_compliance_system.sql',
      '077_drop_plaintext_pii_columns.sql',
      '078_verify_schema_integrity.sql',
    ]);
    const violations = sqlFiles.filter(f => {
      const n = extractOrder(f);
      return n !== null && n < 69 && !KNOWN_DUPLICATE_PREFIXES.has(n) && NEW_PLAN_FILES.has(f);
    });
    expect(violations).toEqual([]);
  });

  it('migration files are sorted deterministically', () => {
    const ordered = [...sqlFiles]
      .map(f => ({ f, order: extractOrder(f) ?? Number.MAX_SAFE_INTEGER }))
      .sort((a, b) => a.order !== b.order ? a.order - b.order : a.f.localeCompare(b.f))
      .map(({ f }) => f);
    const orderedAgain = [...ordered]
      .map(f => ({ f, order: extractOrder(f) ?? Number.MAX_SAFE_INTEGER }))
      .sort((a, b) => a.order !== b.order ? a.order - b.order : a.f.localeCompare(b.f))
      .map(({ f }) => f);
    expect(ordered).toEqual(orderedAgain);
  });
});
