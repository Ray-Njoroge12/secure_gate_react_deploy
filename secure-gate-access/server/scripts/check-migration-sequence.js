#!/usr/bin/env node

import { readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { KNOWN_HISTORICAL_GAPS } from '../src/database/migrations/migrationNumbering.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const migrationsDir = join(__dirname, '../src/database/migrations');
const knownHistoricalGaps = new Set(KNOWN_HISTORICAL_GAPS);

function parseNumericPrefix(filename) {
  const match = filename.match(/^(\d{3})_/);
  return match ? Number.parseInt(match[1], 10) : null;
}

async function run() {
  const files = await readdir(migrationsDir);
  const sqlFiles = files.filter((file) => file.endsWith('.sql'));
  const numericValues = sqlFiles
    .map(parseNumericPrefix)
    .filter((num) => Number.isInteger(num));

  if (numericValues.length === 0) {
    console.log('[migration-sequence-check] No numeric migration files found.');
    return;
  }

  const uniqueSortedNumbers = [...new Set(numericValues)].sort((a, b) => a - b);
  const unexpectedGaps = [];

  for (let n = uniqueSortedNumbers[0]; n <= uniqueSortedNumbers[uniqueSortedNumbers.length - 1]; n++) {
    if (!uniqueSortedNumbers.includes(n) && !knownHistoricalGaps.has(n)) {
      unexpectedGaps.push(n);
    }
  }

  if (unexpectedGaps.length > 0) {
    console.log(`::warning::Unexpected migration number gaps detected: ${unexpectedGaps.join(', ')}`);
    console.log('[migration-sequence-check] Warnings are non-blocking to allow investigation without breaking CI.');
  } else {
    console.log('[migration-sequence-check] No unexpected migration number gaps detected.');
  }
}

run().catch((error) => {
  console.error('[migration-sequence-check] Failed:', error);
  process.exit(1);
});
