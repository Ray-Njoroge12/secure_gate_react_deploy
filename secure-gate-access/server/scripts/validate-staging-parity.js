import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const bool = (value) => String(value).toLowerCase() === 'true';

const runtimeEnv = process.env.NODE_ENV || 'development';
const isStaging = runtimeEnv === 'staging';

const report = {
  NODE_ENV: runtimeEnv,
  ENABLE_CSRF: process.env.ENABLE_CSRF ?? '(unset)',
  ENABLE_RATE_LIMIT: process.env.ENABLE_RATE_LIMIT ?? '(unset)',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? '(unset)',
  STAGING_CLIENT_ORIGIN: process.env.STAGING_CLIENT_ORIGIN ?? '(unset)',
  STAGING_ADDITIONAL_ORIGINS: process.env.STAGING_ADDITIONAL_ORIGINS ?? '(unset)',
  CORS_ALLOW_NO_ORIGIN: process.env.CORS_ALLOW_NO_ORIGIN ?? '(unset)',
  SECURE_COOKIES: process.env.SECURE_COOKIES ?? '(unset)',
  SESSION_COOKIE_SAMESITE: process.env.SESSION_COOKIE_SAMESITE ?? '(unset)'
};

console.log('Staging parity checklist');
console.table(report);

if (!isStaging) {
  console.warn('⚠️  NODE_ENV is not "staging". Update staging environment variables before validating parity.');
}

const csrfEnabled = runtimeEnv !== 'development' || bool(process.env.ENABLE_CSRF);
const rateLimitEnabled = runtimeEnv !== 'development' || bool(process.env.ENABLE_RATE_LIMIT);

console.log(`CSRF enabled: ${csrfEnabled ? 'yes' : 'no'}`);
console.log(`Rate limiting enabled: ${rateLimitEnabled ? 'yes' : 'no'}`);
console.log('Ensure cookies use SameSite=None; Secure for cross-site auth flows in staging.');
