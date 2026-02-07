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

async function tableExists(tableName) {
  const res = await dbManager.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_name = $1
     LIMIT 1`,
    [tableName]
  );
  return res.rows.length > 0;
}

async function getUniqueConstraints(tableName) {
  const res = await dbManager.query(
    `SELECT tc.constraint_name,
            array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS columns
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     WHERE tc.table_schema = 'public'
       AND tc.table_name = $1
       AND tc.constraint_type = 'UNIQUE'
     GROUP BY tc.constraint_name`,
    [tableName]
  );

  return res.rows.map(row => row.columns);
}

async function getDefaultEstateId() {
  const hasEstatesTable = await tableExists('estates');
  if (!hasEstatesTable) return null;

  const result = await dbManager.query(
    `SELECT id
     FROM estates
     ORDER BY id ASC
     LIMIT 1`
  );

  return result.rows[0]?.id ?? null;
}

let cachedUserConflictTarget = null;

async function resolveUserConflictTarget(hasEstateId) {
  if (cachedUserConflictTarget !== null) {
    return cachedUserConflictTarget;
  }

  const uniqueConstraints = await getUniqueConstraints('users');
  const hasEstateEmailUnique = uniqueConstraints.some(columns =>
    columns?.length === 2 && columns.includes('estate_id') && columns.includes('email')
  );
  const hasEmailUnique = uniqueConstraints.some(columns =>
    columns?.length === 1 && columns[0] === 'email'
  );

  if (hasEstateId && hasEstateEmailUnique) {
    cachedUserConflictTarget = '(estate_id, email)';
  } else if (hasEmailUnique) {
    cachedUserConflictTarget = '(email)';
  } else {
    cachedUserConflictTarget = null;
  }

  return cachedUserConflictTarget;
}

async function upsertUser(user) {
  const passwordHash = await argon2.hash(user.password);

  const hasVerificationToken = await columnExists('users', 'verification_token');
  const hasVerificationExpires = await columnExists('users', 'verification_expires');
  const hasEstateId = await columnExists('users', 'estate_id');
  const hasMfaEnabled = await columnExists('users', 'mfa_enabled');
  const hasMfaSecret = await columnExists('users', 'mfa_secret');
  const hasBackupCodes = await columnExists('users', 'backup_codes');
  const defaultEstateId = hasEstateId ? await getDefaultEstateId() : null;
  const conflictTarget = await resolveUserConflictTarget(hasEstateId);

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

  if (hasEstateId) {
    columns.push('estate_id');
    values.push(user.estate_id ?? defaultEstateId);
  }

  if (hasVerificationToken) {
    columns.push('verification_token');
    values.push(null);
  }

  if (hasVerificationExpires) {
    columns.push('verification_expires');
    values.push(null);
  }

  // MFA-001 FIX: Add MFA columns if they exist
  // For admin/guard roles, set mfa_enabled to false (they must set it up on first login)
  // For other roles, also set to false as it's optional
  if (hasMfaEnabled) {
    columns.push('mfa_enabled');
    values.push(false);
  }

  if (hasMfaSecret) {
    columns.push('mfa_secret');
    values.push(null);
  }

  if (hasBackupCodes) {
    columns.push('backup_codes');
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
    ...(hasEstateId ? ['estate_id = EXCLUDED.estate_id'] : []),
    'updated_at = NOW()'
  ].join(', ');

  if (conflictTarget) {
    const res = await dbManager.query(
      `INSERT INTO users (${insertColsSql}, created_at, updated_at)
       VALUES (${insertPlaceholders}, NOW(), NOW())
       ON CONFLICT ${conflictTarget} DO UPDATE SET ${updateSetSql}
       RETURNING id, username, email, role, verified`,
      values
    );

    return res.rows[0];
  }

  const lookupParams = hasEstateId
    ? [user.email, defaultEstateId]
    : [user.email];
  const lookupQuery = hasEstateId
    ? 'SELECT id FROM users WHERE email = $1 AND estate_id = $2 LIMIT 1'
    : 'SELECT id FROM users WHERE email = $1 LIMIT 1';
  const lookupRes = await dbManager.query(lookupQuery, lookupParams);

  if (lookupRes.rows.length > 0) {
    const updateParams = [
      user.username,
      passwordHash,
      user.role,
      user.verified ?? true,
      user.phone || null,
      user.house || null,
      user.area || null,
      user.notifyEmail ?? true,
      user.notifySms ?? false
    ];

    let updateQuery = `
      UPDATE users SET
        username = $1,
        password_hash = $2,
        role = $3,
        verified = $4,
        phone = $5,
        house = $6,
        area = $7,
        notify_email = $8,
        notify_sms = $9,
        mfa_enabled = COALESCE(mfa_enabled, $10),
        updated_at = NOW()
      WHERE id = $11
      RETURNING id, username, email, role, verified
    `;

    updateParams.push(false); // mfa_enabled default
    updateParams.push(lookupRes.rows[0].id);
    const updateRes = await dbManager.query(updateQuery, updateParams);
    return updateRes.rows[0];
  }

  const insertRes = await dbManager.query(
    `INSERT INTO users (${insertColsSql}, created_at, updated_at)
     VALUES (${insertPlaceholders}, NOW(), NOW())
     RETURNING id, username, email, role, verified`,
    values
  );

  return insertRes.rows[0];
}

async function run() {
  await dbManager.initializeAsync();

  const superAdmin = await upsertUser({
    username: 'superadmin',
    email: 'superadmin@securegate.com',
    password: 'SuperAdmin123!',
    role: 'super_admin',
    verified: true,
    phone: '+254799999999',
    area: 'General',
    house: 'SUPERADMIN',
    notifyEmail: true,
    notifySms: false
  });

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
  console.log('[db:seed] Super Admin:', superAdmin);
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
