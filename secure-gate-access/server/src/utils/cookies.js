export const getCookieOptions = (overrides = {}) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  const path = process.env.COOKIE_PATH || '/';
  const sameSite = process.env.COOKIE_SAMESITE || (isProduction ? 'none' : 'lax');
  const secure = isProduction || sameSite === 'none';

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
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    secure: isProduction || (process.env.COOKIE_SAMESITE || '').toLowerCase() === 'none',
    sameSite: process.env.COOKIE_SAMESITE || (isProduction ? 'none' : 'lax'),
    domain: process.env.COOKIE_DOMAIN || null,
    path: process.env.COOKIE_PATH || '/'
  };
};
