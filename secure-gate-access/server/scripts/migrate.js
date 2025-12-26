import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, readFile } from 'fs/promises';
import { dbManager } from '../src/database/db.enhanced.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env (db.enhanced loads its own .env too, but db:migrate is run directly)
dotenv.config({ path: join(__dirname, '..', '.env') });

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

function extractUpSql(fullSql) {
  const lines = fullSql.split(/\r?\n/);
  const downIndex = lines.findIndex((line) => line.trim().toLowerCase().startsWith('-- down migration'));
  const upLines = downIndex === -1 ? lines : lines.slice(0, downIndex);
  return upLines.join('\n').trim();
}

async function run() {
  const migrationsDir = join(__dirname, '..', 'src', 'database', 'migrations');

  await dbManager.initializeAsync();

  await dbManager.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );`
  );

  const appliedRes = await dbManager.query('SELECT filename FROM schema_migrations');
  const applied = new Set(appliedRes.rows.map((r) => r.filename));

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .map(extractMigrationMeta)
    .sort(sortMigrations);

  let appliedCount = 0;

  for (const { filename } of files) {
    if (applied.has(filename)) continue;

    const fullPath = join(migrationsDir, filename);
    const fullSql = await readFile(fullPath, 'utf8');
    const upSql = extractUpSql(fullSql);

    if (!upSql) {
      console.warn(`[db:migrate] Skipping empty migration: ${filename}`);
      continue;
    }

    console.log(`[db:migrate] Applying ${filename}...`);

    await dbManager.transaction(async (client) => {
      await client.query(upSql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    });

    appliedCount++;
  }

  console.log(`[db:migrate] Done. Applied ${appliedCount} migration(s).`);
  await dbManager.disconnect();
}

run().catch(async (error) => {
  console.error('[db:migrate] Failed:', error);
  try {
    await dbManager.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
