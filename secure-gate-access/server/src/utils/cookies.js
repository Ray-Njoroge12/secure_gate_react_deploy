export const getCookieOptions = (overrides = {}) => {
  const runtimeEnv = process.env.NODE_ENV || 'development';
  const isProduction = runtimeEnv === 'production';
  const isStaging = runtimeEnv === 'staging';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  const path = process.env.COOKIE_PATH || '/';
  const sameSite = process.env.COOKIE_SAMESITE || ((isProduction || isStaging) ? 'none' : 'lax');
  const secure = isProduction || isStaging || sameSite === 'none';

  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path
  };

  if (domain) {
    options.domain = domain;
  }

  return {
    ...options,
    ...overrides
  };
};

export const getCookieAuditInfo = () => {
  const runtimeEnv = process.env.NODE_ENV || 'development';
  const isProduction = runtimeEnv === 'production';
  const isStaging = runtimeEnv === 'staging';
  return {
    secure: isProduction || isStaging || (process.env.COOKIE_SAMESITE || '').toLowerCase() === 'none',
    sameSite: process.env.COOKIE_SAMESITE || ((isProduction || isStaging) ? 'none' : 'lax'),
    domain: process.env.COOKIE_DOMAIN || null,
    path: process.env.COOKIE_PATH || '/'
  };
};
