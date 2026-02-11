const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      ws: true,
      changeOrigin: true,
      secure: false,
      logLevel: 'debug'
    })
  );

  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      ws: true,
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      // Cookie handling for httpOnly cookies
      cookieDomainRewrite: 'localhost',
      cookiePathRewrite: '/',
      // Ensure credentials are forwarded
      onProxyReq: (proxyReq, req, res) => {
        // Forward cookies
        if (req.headers.cookie) {
          proxyReq.setHeader('Cookie', req.headers.cookie);
        }
      },
      onProxyRes: (proxyRes, req, res) => {
        // Remove secure flag from cookies in development
        const setCookie = proxyRes.headers['set-cookie'];
        if (setCookie) {
          const modifiedCookies = setCookie.map(cookie => {
            return cookie
              .replace(/;\s*Secure/gi, '')
              .replace(/;\s*SameSite=strict/gi, '; SameSite=Lax');
          });
          proxyRes.headers['set-cookie'] = modifiedCookies;
        }
      }
    })
  );
};
