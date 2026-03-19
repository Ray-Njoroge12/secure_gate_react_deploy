const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadModule(relativePath) {
  const absolutePath = path.resolve(__dirname, relativePath);
  return import(pathToFileURL(absolutePath).href);
}

test('extractUpSql stops at active down marker case-insensitively', async () => {
  const { extractUpSql } = await loadModule('../../scripts/migration-down-marker.js');
  const sql = `
    -- Migration: test
    CREATE TABLE test_a(id INT);
    -- DoWn MiGrAtIoN
    DROP TABLE test_a;
  `;

  const upSql = extractUpSql(sql);
  assert.match(upSql, /CREATE TABLE test_a/i);
  assert.doesNotMatch(upSql, /DROP TABLE test_a/i);
});

test('extractUpSql ignores marker text embedded inside another comment line', async () => {
  const { extractUpSql } = await loadModule('../../scripts/migration-down-marker.js');
  const sql = `
    CREATE TABLE test_b(id INT);
    -- note: -- down migration is documented here, not active marker
    INSERT INTO test_b VALUES (1);
  `;

  const upSql = extractUpSql(sql);
  assert.match(upSql, /CREATE TABLE test_b/i);
  assert.match(upSql, /INSERT INTO test_b VALUES \(1\)/i);
});

test('format checker flags destructive SQL when no down marker exists', async () => {
  const { findExecutableSqlAfterDownMarker } = await loadModule('../../scripts/migration-format-check.js');
  const sql = `
    CREATE TABLE test_c(id INT);
    DROP TABLE test_c;
  `;

  const violations = findExecutableSqlAfterDownMarker(sql);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].content, 'DROP TABLE test_c;');
  assert.match(violations[0].reason, /without "-- down migration" marker/i);
});

test('format checker ignores rollback SQL after down marker', async () => {
  const { findExecutableSqlAfterDownMarker } = await loadModule('../../scripts/migration-format-check.js');
  const sql = `
    CREATE TABLE test_c(id INT);
    -- down migration
    DROP TABLE test_c;
  `;

  const violations = findExecutableSqlAfterDownMarker(sql);
  assert.equal(violations.length, 0);
});

test('format checker allows comments and blank lines after down marker', async () => {
  const { findExecutableSqlAfterDownMarker } = await loadModule('../../scripts/migration-format-check.js');
  const sql = `
    CREATE TABLE test_d(id INT);
    -- DOWN MIGRATION
    -- DROP TABLE test_d;

    /* rollback intentionally disabled
       DROP TABLE test_d;
    */
  `;

  const violations = findExecutableSqlAfterDownMarker(sql);
  assert.equal(violations.length, 0);
});
