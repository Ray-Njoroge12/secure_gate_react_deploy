import { dbManager } from '../src/database/db.enhanced.js';
import mfaService from '../src/services/mfaService.js';

const DEFAULT_GUARD_EMAIL = 'guard1@securegate.com';
const DEFAULT_SECRET = 'JBSWY3DPEHPK3PXP';

function assertSafeLocalExecution() {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    throw new Error('Refusing to run in production. This script is local/test only.');
  }
}

function normalizeBase32(secret) {
  return String(secret || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/=+$/g, '');
}

function validateBase32(secret) {
  if (!/^[A-Z2-7]+$/.test(secret)) {
    throw new Error('PW_GUARD_MFA_SECRET must be a valid Base32 TOTP secret (A-Z, 2-7).');
  }
}

async function seedGuardMfa() {
  assertSafeLocalExecution();

  const guardEmail = String(process.env.GUARD_MFA_EMAIL || DEFAULT_GUARD_EMAIL).trim().toLowerCase();
  if (guardEmail !== DEFAULT_GUARD_EMAIL) {
    throw new Error(`Only ${DEFAULT_GUARD_EMAIL} is allowed for this local bootstrap script.`);
  }

  const normalizedSecret = normalizeBase32(process.env.PW_GUARD_MFA_SECRET || DEFAULT_SECRET);
  validateBase32(normalizedSecret);

  await dbManager.initializeAsync();

  try {
    const userResult = await dbManager.query(
      'SELECT id, email, role FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [guardEmail]
    );

    if (userResult.rows.length === 0) {
      throw new Error(`Guard test user not found: ${guardEmail}. Run npm run db:seed first.`);
    }

    const guardUser = userResult.rows[0];
    if (guardUser.role !== 'guard') {
      throw new Error(`Expected role=guard for ${guardEmail}, found role=${guardUser.role}`);
    }

    const encryptedSecret = mfaService.encryptSecret(normalizedSecret);

    await dbManager.query(
      `UPDATE users
       SET mfa_enabled = true,
           mfa_secret = $2,
           mfa_methods = $3,
           backup_codes = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [guardUser.id, encryptedSecret, JSON.stringify(['totp'])]
    );

    await dbManager.query(
      `UPDATE additional_auth_sessions
       SET status = 'expired'
       WHERE user_id = $1
         AND operation = 'login_mfa'
         AND status = 'pending'`,
      [guardUser.id]
    ).catch(() => {});

    console.log('✅ Guard MFA seeded for deterministic local testing');
    console.log(`email=${guardEmail}`);
    console.log(`secret_source=${process.env.PW_GUARD_MFA_SECRET ? 'env.PW_GUARD_MFA_SECRET' : 'default'}`);
    console.log('next: npm run mfa:token:guard-local');
  } finally {
    await dbManager.disconnect();
  }
}

seedGuardMfa()
  .then(() => {
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(`❌ ${error.message}`);
    try {
      await dbManager.disconnect();
    } catch {
      // ignore disconnect failures
    }
    process.exit(1);
  });
