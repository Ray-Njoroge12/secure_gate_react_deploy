export const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  const sameSite = isProduction ? 'none' : 'lax';
  const secure = isProduction;

  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: '/'
  };

  if (domain) {
    options.domain = domain;
  }

  return options;
};
