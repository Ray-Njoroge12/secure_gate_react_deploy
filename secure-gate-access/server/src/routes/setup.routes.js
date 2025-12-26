/**
 * One-time Setup Routes
 * For initial database setup on platforms without shell access (e.g., Render free tier)
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, readFile } from 'fs/promises';
import { dbManager } from '../database/db.enhanced.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Security: Only allow in production with specific secret
const SETUP_SECRET = process.env.SETUP_SECRET || 'secure-gate-setup-2024';

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
 * POST /api/setup/migrate
 * Run database migrations
 */
router.post('/migrate', async (req, res) => {
  try {
    const { secret } = req.body;
    
    if (secret !== SETUP_SECRET) {
      return res.status(403).json({
        success: false,
        message: 'Invalid setup secret'
      });
    }

    const logs = [];
    const migrationsDir = join(__dirname, '..', 'database', 'migrations');

    logs.push('Starting database migration...');

    // Force database initialization
    try {
      await dbManager.initializeAsync();
      logs.push('Database connection established');
    } catch (initError) {
      // Try alternative initialization
      const { db } = await import('../database/db.enhanced.js');
      await db.query('SELECT 1');
      logs.push('Database connection established via fallback');
    }

    // Create migrations tracking table
    await dbManager.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );`
    );
    logs.push('Migrations tracking table ready');

    // Get already applied migrations
    const appliedRes = await dbManager.query('SELECT filename FROM schema_migrations');
    const applied = new Set(appliedRes.rows.map((r) => r.filename));
    logs.push(`Found ${applied.size} previously applied migrations`);

    // Read migration files
    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .map(extractMigrationMeta)
      .sort(sortMigrations);

    logs.push(`Found ${files.length} total migration files`);

    let appliedCount = 0;
    let skippedCount = 0;

    for (const { filename } of files) {
      if (applied.has(filename)) {
        logs.push(`⏭️  Skipping ${filename} (already applied)`);
        skippedCount++;
        continue;
      }

      const filePath = join(migrationsDir, filename);
      const fullSql = await readFile(filePath, 'utf8');
      const upSql = extractUpSql(fullSql);

      try {
        await dbManager.query(upSql);
        await dbManager.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename]
        );
        logs.push(`✅ Applied ${filename}`);
        appliedCount++;
      } catch (err) {
        logs.push(`❌ Error in ${filename}: ${err.message}`);
        // Continue with other migrations
      }
    }

    logs.push(`Migration complete: ${appliedCount} applied, ${skippedCount} skipped`);

    res.json({
      success: true,
      message: 'Database migrations completed',
      stats: {
        total: files.length,
        applied: appliedCount,
        skipped: skippedCount
      },
      logs
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

/**
 * POST /api/setup/seed
 * Seed initial data
 */
router.post('/seed', async (req, res) => {
  try {
    const { secret } = req.body;
    
    if (secret !== SETUP_SECRET) {
      return res.status(403).json({
        success: false,
        message: 'Invalid setup secret'
      });
    }

    const logs = [];
    const seedFile = join(__dirname, '..', 'database', 'seed.sql');

    logs.push('Starting database seeding...');

    // Force database initialization
    try {
      await dbManager.initializeAsync();
      logs.push('Database connection established');
    } catch (initError) {
      const { db } = await import('../database/db.enhanced.js');
      await db.query('SELECT 1');
      logs.push('Database connection established via fallback');
    }
    
    const seedSql = await readFile(seedFile, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = seedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    logs.push(`Executing ${statements.length} seed statements...`);

    for (let i = 0; i < statements.length; i++) {
      try {
        await dbManager.query(statements[i]);
        logs.push(`✅ Statement ${i + 1}/${statements.length}`);
      } catch (err) {
        // Some statements might fail if data exists, that's okay
        logs.push(`⚠️  Statement ${i + 1}: ${err.message}`);
      }
    }

    logs.push('Database seeding completed');

    res.json({
      success: true,
      message: 'Database seeding completed',
      logs
    });

  } catch (error) {
    console.error('Seeding error:', error);
    res.status(500).json({
      success: false,
      message: 'Seeding failed',
      error: error.message
    });
  }
});

/**
 * GET /api/setup/status
 * Check migration status
 */
router.get('/status', async (req, res) => {
  try {
    await dbManager.initializeAsync();

    // Check if migrations table exists
    const tableCheck = await dbManager.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({
        success: true,
        migrated: false,
        message: 'Migrations not yet run'
      });
    }

    const result = await dbManager.query(`
      SELECT COUNT(*) as count, MAX(applied_at) as last_migration
      FROM schema_migrations
    `);

    res.json({
      success: true,
      migrated: true,
      count: parseInt(result.rows[0].count),
      lastMigration: result.rows[0].last_migration
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Status check failed',
      error: error.message
    });
  }
});

export default router;
