// Auto-migration service for database schema management
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, readFile } from 'fs/promises';
import { dbManager } from '../database/db.enhanced.js';

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

function extractUpSql(fullSql) {
  const lines = fullSql.split(/\r?\n/);
  const downIndex = lines.findIndex((line) => line.trim().toLowerCase().startsWith('-- down migration'));
  const upLines = downIndex === -1 ? lines : lines.slice(0, downIndex);
  return upLines.join('\n').trim();
}

/**
 * Run database migrations automatically on server startup
 * @returns {Promise<{success: boolean, applied: number, error?: string}>}
 */
export async function runMigrations() {
  const migrationsDir = join(__dirname, '..', 'database', 'migrations');

  try {
    console.log('🔄 Running database migrations...');
    
    // Ensure migrations tracking table exists
    await dbManager.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );`
    );

    // Get already applied migrations
    const appliedRes = await dbManager.query('SELECT filename FROM schema_migrations');
    const applied = new Set(appliedRes.rows.map((r) => r.filename));

    // Read and sort migration files
    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql') && !f.endsWith('.disabled'))
      .map(extractMigrationMeta)
      .sort(sortMigrations);

    let appliedCount = 0;
    let errors = [];

    for (const { filename } of files) {
      if (applied.has(filename)) continue;

      const fullPath = join(migrationsDir, filename);
      const fullSql = await readFile(fullPath, 'utf8');
      const upSql = extractUpSql(fullSql);

      if (!upSql) {
        console.warn(`⚠️ [migration] Skipping empty migration: ${filename}`);
        continue;
      }

      console.log(`📝 [migration] Applying ${filename}...`);

      try {
        await dbManager.transaction(async (client) => {
          await client.query(upSql);
          await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        });
        appliedCount++;
        console.log(`✅ [migration] Applied ${filename}`);
      } catch (migrationError) {
        // Log the error but continue with other migrations if possible
        console.error(`❌ [migration] Failed to apply ${filename}:`, migrationError.message);
        errors.push({ filename, error: migrationError.message });
        
        // For critical schema migrations (001-010), we should stop
        const meta = extractMigrationMeta(filename);
        if (meta.order <= 10) {
          console.error('🚨 Critical migration failed - stopping');
          throw migrationError;
        }
      }
    }

    if (appliedCount > 0) {
      console.log(`✅ [migration] Done. Applied ${appliedCount} migration(s).`);
    } else {
      console.log('✅ [migration] Database schema is up to date.');
    }

    if (errors.length > 0) {
      console.warn(`⚠️ [migration] ${errors.length} non-critical migration(s) failed`);
      return { success: true, applied: appliedCount, warnings: errors };
    }

    return { success: true, applied: appliedCount };
  } catch (error) {
    console.error('❌ [migration] Migration failed:', error.message);
    return { success: false, applied: 0, error: error.message };
  }
}

export default { runMigrations };
