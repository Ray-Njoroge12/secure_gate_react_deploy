#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, readFile } from 'fs/promises';
import pg from 'pg';
import { extractUpSql } from './migration-down-marker.js';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function extractMigrationMeta(filename) {
  const match = filename.match(/^(\d+)_/);
  const order = match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
  const isInitial = filename.includes('initial_schema');
  return { filename, order, isInitial };
}

function sortMigrations(a, b) {
  if (a.order !== b.order) return a.order - b.order;
  if (a.isInitial !== b.isInitial) return a.isInitial ? -1 : 1;
  return a.filename.localeCompare(b.filename);
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
  };
}

function assertRequiredPgEnv() {
  const required = ['PGHOST', 'PGPORT', 'PGUSER', 'PGDATABASE', 'PGPASSWORD'];
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required PostgreSQL environment variables: ${missing.join(', ')}`);
  }
}

async function listMigrations(migrationsDir) {
  return (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql') && !file.endsWith('.disabled'))
    .map(extractMigrationMeta)
    .sort(sortMigrations);
}

async function run() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const migrationsDir = join(__dirname, '..', 'src', 'database', 'migrations');
  const migrations = await listMigrations(migrationsDir);

  let applied = 0;
  let skippedEmpty = 0;

  console.log(`[db:migrate:ci] Found ${migrations.length} migration file(s).`);

  if (dryRun) {
    for (const { filename } of migrations) {
      const fullSql = await readFile(join(migrationsDir, filename), 'utf8');
      const upSql = extractUpSql(fullSql);

      if (!upSql) {
        skippedEmpty++;
        console.log(`[db:migrate:ci] SKIP (empty up): ${filename}`);
        continue;
      }

      applied++;
      console.log(`[db:migrate:ci] DRY-RUN apply: ${filename}`);
    }

    console.log(`[db:migrate:ci] Dry run complete. Would apply ${applied}, skip empty ${skippedEmpty}.`);
    return;
  }

  assertRequiredPgEnv();

  const client = new Client({
    host: process.env.PGHOST,
    port: Number.parseInt(process.env.PGPORT, 10),
    user: process.env.PGUSER,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
  });

  await client.connect();

  try {
    for (const { filename } of migrations) {
      const fullSql = await readFile(join(migrationsDir, filename), 'utf8');
      const upSql = extractUpSql(fullSql);

      if (!upSql) {
        skippedEmpty++;
        console.log(`[db:migrate:ci] SKIP (empty up): ${filename}`);
        continue;
      }

      console.log(`[db:migrate:ci] APPLY: ${filename}`);

      await client.query('BEGIN');
      try {
        await client.query(upSql);
        await client.query('COMMIT');
        applied++;
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration failed (${filename}): ${error.message}`);
      }
    }

    console.log(`[db:migrate:ci] Complete. Applied ${applied}, skipped empty ${skippedEmpty}.`);
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(`[db:migrate:ci] Failed: ${error.message}`);
  process.exit(1);
});
