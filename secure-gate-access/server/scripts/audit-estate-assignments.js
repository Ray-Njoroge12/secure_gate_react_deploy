import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { dbManager } from '../src/database/db.enhanced.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const exportArgIndex = args.indexOf('--export');
const exportPath = exportArgIndex !== -1 ? args[exportArgIndex + 1] : null;

async function run() {
  await dbManager.initializeAsync();

  const result = await dbManager.query(
    `SELECT id, email, role, estate_id, created_at
     FROM users
     WHERE estate_id IS NULL
     ORDER BY created_at DESC`
  );

  const missing = result.rows || [];
  console.log(`Found ${missing.length} users without estate_id.`);

  if (missing.length > 0) {
    console.table(missing.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      estate_id: user.estate_id,
      created_at: user.created_at
    })));
  }

  if (exportPath) {
    const fs = await import('fs');
    const header = 'id,email,role,estate_id,created_at\n';
    const rows = missing
      .map((user) => [
        user.id,
        user.email,
        user.role,
        user.estate_id ?? '',
        user.created_at?.toISOString?.() ?? user.created_at
      ].join(','))
      .join('\n');
    fs.writeFileSync(exportPath, header + rows + (rows ? '\n' : ''));
    console.log(`Exported report to ${exportPath}`);
  }

  await dbManager.close();
}

run().catch(async (error) => {
  console.error('Failed to audit estate assignments:', error);
  try {
    await dbManager.close();
  } catch (closeError) {
    console.error('Failed to close database connection:', closeError);
  }
  process.exit(1);
});
