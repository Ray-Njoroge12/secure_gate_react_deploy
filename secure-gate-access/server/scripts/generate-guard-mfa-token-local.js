import speakeasy from 'speakeasy';

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

function generateToken() {
  assertSafeLocalExecution();

  const normalizedSecret = normalizeBase32(process.env.PW_GUARD_MFA_SECRET || DEFAULT_SECRET);
  validateBase32(normalizedSecret);

  const periodSeconds = 30;
  const nowMs = Date.now();
  const token = speakeasy.totp({
    secret: normalizedSecret,
    encoding: 'base32',
    digits: 6,
    step: periodSeconds
  });

  const elapsedInWindow = Math.floor((nowMs / 1000) % periodSeconds);
  const validForSeconds = periodSeconds - elapsedInWindow;

  console.log(
    JSON.stringify(
      {
        token,
        validForSeconds,
        generatedAt: new Date(nowMs).toISOString()
      },
      null,
      2
    )
  );
}

generateToken();
