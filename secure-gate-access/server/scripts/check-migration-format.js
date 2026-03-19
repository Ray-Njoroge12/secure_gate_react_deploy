#!/usr/bin/env node

import { readdir, readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { findExecutableSqlAfterDownMarker } from './migration-format-check.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const migrationsDir = join(__dirname, '../src/database/migrations');
async function run() {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql') && !file.endsWith('.disabled'))
    .sort();

  const violations = [];

  for (const file of files) {
    const content = await readFile(join(migrationsDir, file), 'utf8');
    const fileViolations = findExecutableSqlAfterDownMarker(content);
    violations.push(...fileViolations.map((violation) => ({ ...violation, file })));
  }

  if (violations.length > 0) {
    console.error('[migration-format-check] Found migration format violations:');
    for (const violation of violations) {
      const reason = violation.reason ? ` [${violation.reason}]` : '';
      console.error(`  - ${violation.file}:${violation.line} ${violation.content}${reason}`);
    }
    process.exit(1);
  }

  console.log(`[migration-format-check] OK: ${files.length} migration file(s) validated.`);
}

run().catch((error) => {
  console.error('[migration-format-check] Failed:', error.message);
  process.exit(1);
});
