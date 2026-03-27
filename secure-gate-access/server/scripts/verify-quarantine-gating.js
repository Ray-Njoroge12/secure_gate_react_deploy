import fs from 'fs';
import path from 'path';

const REQUIRED_FIELDS = [
  'id',
  'path',
  'status',
  'reason',
  'owner',
  'exit_criteria',
  'gating_impact',
  'introduced_on'
];

const CRITICAL_SUITES = [
  'auth-refresh.integration.test.js',
  'invite-lifecycle.integration.test.js',
  'estate-scoping.integration.test.js',
  'webhook-signature.integration.test.js',
  'notification-queue.integration.test.js'
];

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, 'package.json');
const manifestPath = path.join(rootDir, 'tests', 'quarantine', 'quarantine-manifest.json');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} missing at ${filePath}`);
  }
}

function main() {
  ensureFile(packageJsonPath, 'package.json');
  ensureFile(manifestPath, 'quarantine manifest');

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const scripts = pkg.scripts || {};
  const criticalCmd = scripts['test:critical'];
  const stableIntegrationCmd = scripts['test:integration:stable'];
  const quarantineIntegrationCmd = scripts['test:integration:quarantine'];

  if (!criticalCmd || !stableIntegrationCmd || !quarantineIntegrationCmd) {
    fail('required scripts missing: test:critical, test:integration:stable, test:integration:quarantine');
  }

  if (!criticalCmd.includes('tests/integration/')) {
    fail('test:critical must target tests/integration path');
  }

  if (criticalCmd.includes('tests/quarantine')) {
    fail('test:critical must not reference tests/quarantine path');
  }

  if (!stableIntegrationCmd.includes('testPathIgnorePatterns')) {
    fail('test:integration:stable should explicitly ignore quarantine-specific suites');
  }

  for (const suite of CRITICAL_SUITES) {
    const activePath = path.join(rootDir, 'tests', 'integration', suite);
    const quarantinePath = path.join(rootDir, 'tests', 'quarantine', suite);
    if (!fs.existsSync(activePath)) {
      fail(`critical suite missing from active integration path: tests/integration/${suite}`);
    }
    if (fs.existsSync(quarantinePath)) {
      fail(`critical suite found in quarantine path: tests/quarantine/${suite}`);
    }
  }

  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
  if (entries.length === 0) {
    fail('quarantine manifest has no entries');
  }

  for (const entry of entries) {
    for (const field of REQUIRED_FIELDS) {
      if (!(field in entry) || String(entry[field]).trim() === '') {
        fail(`manifest entry ${entry.id || '(unknown)'} is missing required field: ${field}`);
      }
    }

    const resolvedPath = path.join(rootDir, entry.path);
    if (!fs.existsSync(resolvedPath)) {
      fail(`manifest entry path not found: ${entry.path}`);
    }
  }

  console.log('PASS: Quarantine metadata and critical gating path checks passed.');
}

main();