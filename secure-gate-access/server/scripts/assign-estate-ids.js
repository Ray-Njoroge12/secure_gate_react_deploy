import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { dbManager } from '../src/database/db.enhanced.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const estateArgIndex = args.indexOf('--estate-id');
const estateId = estateArgIndex !== -1 ? Number(args[estateArgIndex + 1]) : null;
const useDefault = args.includes('--use-default');

async function resolveDefaultEstateId() {
  const result = await dbManager.query(
    `SELECT id
     FROM estates
     ORDER BY id ASC
     LIMIT 1`
  );

  return result.rows[0]?.id ?? null;
}

async function run() {
  await dbManager.initializeAsync();

  const hasMissing = await dbManager.query(
    `SELECT COUNT(*)::int AS missing
     FROM users
     WHERE estate_id IS NULL`
  );

  const missingCount = hasMissing.rows[0]?.missing ?? 0;
  if (missingCount === 0) {
    console.log('No users missing estate_id.');
    await dbManager.close();
    return;
  }

  let targetEstateId = estateId;
  if (!targetEstateId && useDefault) {
    targetEstateId = await resolveDefaultEstateId();
  }

  if (!targetEstateId) {
    throw new Error('Provide --estate-id <id> or --use-default to assign missing estate_id values.');
  }

  const update = await dbManager.query(
    `UPDATE users
     SET estate_id = $1
     WHERE estate_id IS NULL
     RETURNING id, email, role`,
    [targetEstateId]
  );

  console.log(`Assigned estate_id=${targetEstateId} to ${update.rowCount} users.`);
  if (update.rowCount > 0) {
    console.table(update.rows.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      estate_id: targetEstateId
    })));
  }

  await dbManager.close();
}

run().catch(async (error) => {
  console.error('Failed to assign estate IDs:', error);
  try {
    await dbManager.close();
  } catch (closeError) {
    console.error('Failed to close database connection:', closeError);
  }
  process.exit(1);
});
