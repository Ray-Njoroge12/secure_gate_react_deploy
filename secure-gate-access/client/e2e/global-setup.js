/**
 * Playwright Global Setup - Creates authenticated sessions for E2E tests
 * This runs once before all tests and saves auth state to storage files
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const API_URL = process.env.PW_API_URL || 'http://127.0.0.1:5001';
const APP_URL = process.env.PW_APP_URL || 'http://127.0.0.1:3000';
const VERBOSE_BOOTSTRAP = process.env.PW_AUTH_BOOTSTRAP_VERBOSE === '1';
const ENABLE_GUARD_MFA_BOOTSTRAP = process.env.PW_GUARD_MFA_BOOTSTRAP !== '0';
const SERVER_DIR = path.resolve(__dirname, '..', '..', 'server');

// User credentials matching seed data
const USERS = {
  resident: {
    email: 'resident1@securegate.com',
    password: 'ResidentPass123!',
    storageFile: 'resident-storage.json'
  },
  guard: {
    email: 'guard1@securegate.com', 
    password: 'GuardPass123!',
    storageFile: 'guard-storage.json'
  },
  admin: {
    email: 'admin@securegate.com',
    password: 'AdminPass123!',
    storageFile: 'admin-storage.json'
  }
};

function getStoragePath(storageFile) {
  return path.join(__dirname, '.auth', storageFile);
}

function writeFallbackStorageState(storageFile) {
  const storagePath = getStoragePath(storageFile);
  const emptyState = { cookies: [], origins: [] };
  fs.writeFileSync(storagePath, JSON.stringify(emptyState, null, 2));
}

function ensureFallbackStorageStates() {
  for (const user of Object.values(USERS)) {
    writeFallbackStorageState(user.storageFile);
  }
}

function logBootstrap(message, level = 'info') {
  if (!VERBOSE_BOOTSTRAP) {
    return;
  }
  const logger = level === 'warn' ? console.warn : console.log;
  logger(message);
}

function isNetworkError(error) {
  const message = String(error?.message || '');
  return (
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('EHOSTUNREACH') ||
    message.includes('ETIMEDOUT')
  );
}

function normalizeBase32(value = '') {
  return String(value).toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
}

function base32Decode(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = normalizeBase32(value);
  let bits = '';

  for (const char of normalized) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) {
      throw new Error('Invalid base32 character in MFA secret');
    }
    bits += idx.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

function generateTotp(secret, timeStepSeconds = 30, digits = 6, nowMs = Date.now()) {
  const key = base32Decode(secret);
  const counter = Math.floor(nowMs / 1000 / timeStepSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % (10 ** digits);
  return String(otp).padStart(digits, '0');
}

function reseedGuardMfaSecret(secret) {
  const env = {
    ...process.env,
    PW_GUARD_MFA_SECRET: secret,
    GUARD_MFA_EMAIL: USERS.guard.email
  };

  const result = spawnSync('npm', ['run', 'mfa:seed:guard-local'], {
    cwd: SERVER_DIR,
    env,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    logBootstrap(
      `⚠️ Guard MFA reseed failed: ${String(result.stderr || result.stdout || '').trim()}`,
      'warn'
    );
    return false;
  }

  return true;
}

async function getCsrfToken(context) {
  const response = await context.request.get(`${API_URL}/api/auth/csrf-token`, { timeout: 8000 });
  if (!response.ok()) {
    const responseBody = await response.text().catch(() => '');
    logBootstrap(
      `ℹ️ Failed to issue CSRF token (status=${response.status()}): ${responseBody.slice(0, 180)}`,
      'warn'
    );
    return null;
  }

  const payload = await response.json().catch(() => ({}));
  const headerToken = response.headers()['x-csrf-token'];
  const bodyToken = payload?.data?.csrfToken || payload?.csrfToken;
  return headerToken || bodyToken || null;
}

async function buildJsonHeaders(context) {
  const headers = { 'Content-Type': 'application/json' };
  const csrfToken = await getCsrfToken(context).catch(() => null);
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  return headers;
}

async function completeMfaChallenge(context, mfaSessionId, secret) {
  const timeOffsetsMs = [0, -30000, 30000];
  const headers = await buildJsonHeaders(context);

  for (const offset of timeOffsetsMs) {
    const token = generateTotp(secret, 30, 6, Date.now() + offset);
    const verifyResponse = await context.request.post(`${API_URL}/api/mfa/verify`, {
      data: { mfaSessionId, token },
      headers,
      timeout: 8000
    });

    if (verifyResponse.ok()) {
      return true;
    }

    const responseBody = await verifyResponse.text().catch(() => '');
    logBootstrap(
      `ℹ️ Guard MFA verify attempt failed (status=${verifyResponse.status()}, offset=${offset / 1000}s): ${responseBody.slice(0, 180)}`,
      'warn'
    );
  }

  return false;
}

async function bootstrapGuardMfa(context, credentials) {
  const seededSecret = process.env.PW_GUARD_MFA_SECRET;

  // Pre-seed deterministic MFA state before login to avoid stale/unknown secrets.
  if (ENABLE_GUARD_MFA_BOOTSTRAP && seededSecret) {
    reseedGuardMfaSecret(seededSecret);
  }

  const authHeaders = await buildJsonHeaders(context);

  const initialLoginResponse = await context.request.post(`${API_URL}/api/auth/login`, {
    data: { username: credentials.email, password: credentials.password },
    headers: authHeaders,
    timeout: 8000
  });

  if (!initialLoginResponse.ok()) {
    return { ok: false, reason: `http_${initialLoginResponse.status()}` };
  }

  const loginBody = await initialLoginResponse.json().catch(() => ({}));
  const initialRequiresMfa = Boolean(loginBody?.data?.requiresMFA);

  // If guard already requires MFA, try to complete challenge using seeded secret.
  if (initialRequiresMfa) {
    if (!seededSecret) {
      return { ok: false, reason: 'guard_mfa_required_secret_missing' };
    }

    const mfaOk = await completeMfaChallenge(context, loginBody.data.mfaSessionId, seededSecret);
    if (mfaOk) {
      return { ok: true };
    }

    if (!ENABLE_GUARD_MFA_BOOTSTRAP) {
      return { ok: false, reason: 'guard_mfa_verify_failed' };
    }

    // Recover from stale/unknown guard secret by reseeding deterministic local MFA, then retrying login challenge.
    const reseedOk = reseedGuardMfaSecret(seededSecret);
    if (!reseedOk) {
      return { ok: false, reason: 'guard_mfa_reseed_failed' };
    }

    const reloginResponse = await context.request.post(`${API_URL}/api/auth/login`, {
      data: { username: credentials.email, password: credentials.password },
      headers: authHeaders,
      timeout: 8000
    });

    if (!reloginResponse.ok()) {
      return { ok: false, reason: `guard_mfa_relogin_http_${reloginResponse.status()}` };
    }

    const reloginBody = await reloginResponse.json().catch(() => ({}));
    if (!reloginBody?.data?.requiresMFA || !reloginBody?.data?.mfaSessionId) {
      return { ok: false, reason: 'guard_mfa_relogin_session_missing' };
    }

    const retryMfaOk = await completeMfaChallenge(context, reloginBody.data.mfaSessionId, seededSecret);
    return retryMfaOk ? { ok: true } : { ok: false, reason: 'guard_mfa_verify_failed' };
  }

  // If guard does not require MFA yet, seed and enable it for this workflow.
  if (ENABLE_GUARD_MFA_BOOTSTRAP) {
    const setupResponse = await context.request.post(`${API_URL}/api/mfa/setup`, {
      headers: authHeaders,
      timeout: 8000
    });

    if (!setupResponse.ok()) {
      return { ok: false, reason: `guard_mfa_setup_http_${setupResponse.status()}` };
    }

    const setupBody = await setupResponse.json().catch(() => ({}));
    const manualEntryKey = setupBody?.data?.manualEntryKey;
    if (!manualEntryKey) {
      return { ok: false, reason: 'guard_mfa_setup_key_missing' };
    }

    const verifySetupResponse = await context.request.post(`${API_URL}/api/mfa/verify-setup`, {
      data: { token: generateTotp(manualEntryKey) },
      headers: authHeaders,
      timeout: 8000
    });

    if (!verifySetupResponse.ok()) {
      return { ok: false, reason: `guard_mfa_verify_setup_http_${verifySetupResponse.status()}` };
    }

    // Logout current session then login again to get MFA challenge and complete it.
    await context.request.post(`${API_URL}/api/auth/logout`, { headers: authHeaders, timeout: 5000 }).catch(() => {});

    const loginWithMfaResponse = await context.request.post(`${API_URL}/api/auth/login`, {
      data: { username: credentials.email, password: credentials.password },
      headers: authHeaders,
      timeout: 8000
    });

    if (!loginWithMfaResponse.ok()) {
      return { ok: false, reason: `guard_mfa_relogin_http_${loginWithMfaResponse.status()}` };
    }

    const mfaLoginBody = await loginWithMfaResponse.json().catch(() => ({}));
    if (!mfaLoginBody?.data?.requiresMFA || !mfaLoginBody?.data?.mfaSessionId) {
      return { ok: false, reason: 'guard_mfa_relogin_session_missing' };
    }

    const challengeOk = await completeMfaChallenge(context, mfaLoginBody.data.mfaSessionId, manualEntryKey);
    return challengeOk ? { ok: true } : { ok: false, reason: 'guard_mfa_verify_failed' };
  }

  return { ok: true };
}

async function isBackendReachable(browser) {
  const context = await browser.newContext();
  try {
    // /api/auth/me returns 401 when unauthenticated, which still proves backend reachability.
    await context.request.get(`${API_URL}/api/auth/me`, { timeout: 3000 });
    return true;
  } catch (error) {
    return !isNetworkError(error);
  } finally {
    await context.close();
  }
}

async function authenticateUser(browser, userKey) {
  const user = USERS[userKey];
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    if (userKey === 'guard') {
      const guardResult = await bootstrapGuardMfa(context, user);
      if (!guardResult.ok) {
        writeFallbackStorageState(user.storageFile);
        await context.close();
        return guardResult;
      }
    } else {
      // Login via API
      const authHeaders = await buildJsonHeaders(context);
      const response = await page.request.post(`${API_URL}/api/auth/login`, {
        data: { username: user.email, password: user.password },
        headers: authHeaders,
        timeout: 8000
      });

      if (!response.ok()) {
        writeFallbackStorageState(user.storageFile);
        await context.close();
        return { ok: false, reason: `http_${response.status()}` };
      }
    }
    
    // Navigate to app to ensure cookies are associated with the right domain
    await page.goto(APP_URL);
    await page.waitForTimeout(300);
    
    // Save storage state
    const storagePath = getStoragePath(user.storageFile);
    await context.storageState({ path: storagePath });
    
    await context.close();
    return { ok: true };
  } catch (error) {
    writeFallbackStorageState(user.storageFile);
    await context.close();
    return {
      ok: false,
      reason: isNetworkError(error) ? 'network_unreachable' : 'request_failed'
    };
  }
}

module.exports = async function globalSetup() {
  // Ensure auth directory exists
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  ensureFallbackStorageStates();
  
  const browser = await chromium.launch();

  const backendReachable = await isBackendReachable(browser);
  if (!backendReachable) {
    logBootstrap(`ℹ️ Playwright auth bootstrap skipped: backend unreachable at ${API_URL}`);
    await browser.close();
    logBootstrap('✅ Global setup complete (fallback auth state)');
    return;
  }

  const failed = [];
  let successCount = 0;

  // Authenticate all user types
  for (const userKey of Object.keys(USERS)) {
    const result = await authenticateUser(browser, userKey);
    if (result.ok) {
      successCount += 1;
    } else {
      failed.push(`${userKey}:${result.reason}`);
    }
  }
  
  await browser.close();
  if (failed.length > 0) {
    logBootstrap(
      `⚠️ Auth bootstrap partial: ${successCount}/${Object.keys(USERS).length} succeeded (${failed.join(', ')})`,
      'warn'
    );
  } else {
    logBootstrap(`✅ Auth bootstrap complete: ${successCount}/${Object.keys(USERS).length} sessions ready`);
  }
};
