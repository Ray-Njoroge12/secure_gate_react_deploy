import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import argon2 from 'argon2';
import { dbManager } from '../src/database/db.enhanced.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env files in the same priority order as server.js
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

async function columnExists(tableName, columnName) {
  const res = await dbManager.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );
  return res.rows.length > 0;
}

async function upsertUser(user) {
  const passwordHash = await argon2.hash(user.password);

  const hasVerificationToken = await columnExists('users', 'verification_token');
  const hasVerificationExpires = await columnExists('users', 'verification_expires');

  const columns = [
    'username',
    'email',
    'password_hash',
    'role',
    'verified',
    'phone',
    'house',
    'area',
    'notify_email',
    'notify_sms'
  ];

  const values = [
    user.username,
    user.email,
    passwordHash,
    user.role,
    user.verified ?? true,
    user.phone || null,
    user.house || null,
    user.area || null,
    user.notifyEmail ?? true,
    user.notifySms ?? false
  ];

  if (hasVerificationToken) {
    columns.push('verification_token');
    values.push(null);
  }

  if (hasVerificationExpires) {
    columns.push('verification_expires');
    values.push(null);
  }

  const insertColsSql = columns.join(', ');
  const insertPlaceholders = columns
    .map((_, idx) => `$${idx + 1}`)
    .join(', ');

  const updateSetSql = [
    'username = EXCLUDED.username',
    'password_hash = EXCLUDED.password_hash',
    'role = EXCLUDED.role',
    'verified = EXCLUDED.verified',
    'phone = EXCLUDED.phone',
    'house = EXCLUDED.house',
    'area = EXCLUDED.area',
    'notify_email = EXCLUDED.notify_email',
    'notify_sms = EXCLUDED.notify_sms',
    'updated_at = NOW()'
  ].join(', ');

  const res = await dbManager.query(
    `INSERT INTO users (${insertColsSql}, created_at, updated_at)
     VALUES (${insertPlaceholders}, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET ${updateSetSql}
     RETURNING id, username, email, role, verified`,
    values
  );

  return res.rows[0];
}

async function run() {
  await dbManager.initializeAsync();

  const admin = await upsertUser({
    username: 'admin',
    email: 'admin@securegate.com',
    password: 'AdminPass123!',
    role: 'admin',
    verified: true,
    phone: '+254700000000',
    area: 'General',
    house: 'ADMIN',
    notifyEmail: true,
    notifySms: false
  });

  const resident = await upsertUser({
    username: 'resident1',
    email: 'resident1@securegate.com',
    password: 'ResidentPass123!',
    role: 'resident',
    verified: true,
    phone: '+254711111111',
    area: 'General',
    house: 'A-101',
    notifyEmail: true,
    notifySms: true
  });

  const guard = await upsertUser({
    username: 'guard1',
    email: 'guard1@securegate.com',
    password: 'GuardPass123!',
    role: 'guard',
    verified: true,
    phone: '+254722222222',
    area: 'Gate 1',
    house: 'SECURITY',
    notifyEmail: true,
    notifySms: true
  });

  console.log('[db:seed] Seed complete');
  console.log('[db:seed] Admin:', admin);
  console.log('[db:seed] Resident:', resident);
  console.log('[db:seed] Guard:', guard);

  await dbManager.disconnect();
}

run().catch(async (error) => {
  console.error('[db:seed] Failed:', error);
  try {
    await dbManager.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
