const { createProxyMiddleware } = require('http-proxy-middleware');

const BACKEND_TARGET = 'http://localhost:3001';
const PROXY_ERROR_LOG_WINDOW_MS = 10000;
let lastProxyErrorLogAt = 0;

const logProxyError = (err, reqPath) => {
  const now = Date.now();
  if (now - lastProxyErrorLogAt < PROXY_ERROR_LOG_WINDOW_MS) {
    return;
  }
  lastProxyErrorLogAt = now;
  const code = err?.code || 'UNKNOWN';
  // Keep this concise because CRA proxy retries can be noisy while API is offline.
  console.warn(`[proxy] Backend unavailable at ${BACKEND_TARGET} for ${reqPath} (${code}). Start the server on port 3001.`);
};

const handleProxyError = (err, req, res) => {
  logProxyError(err, req?.url || 'unknown path');

  if (!res) {
    return;
  }

  const isApiRequest = (req?.url || '').startsWith('/api');
  const status = isApiRequest ? 503 : 502;
  const payload = {
    success: false,
    code: 'BACKEND_UNAVAILABLE',
    message: `Backend is unreachable at ${BACKEND_TARGET}. Start the API server and retry.`,
    details: err?.code || 'UNKNOWN_PROXY_ERROR'
  };

  // HTTP proxy errors expose a ServerResponse, WS proxy errors may expose a raw socket.
  if (typeof res.writeHead === 'function' && typeof res.end === 'function') {
    if (!res.headersSent) {
      res.writeHead(status, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify(payload));
    return;
  }

  if (typeof res.end === 'function') {
    res.end();
    return;
  }

  if (typeof res.destroy === 'function') {
    res.destroy();
  }
};

module.exports = function (app) {
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: BACKEND_TARGET,
      ws: true,
      changeOrigin: true,
      secure: false,
      logLevel: 'warn',
      onError: handleProxyError
    })
  );

  app.use(
    '/api',
    createProxyMiddleware({
      target: BACKEND_TARGET,
      ws: true,
      changeOrigin: true,
      secure: false,
      logLevel: 'warn',
      // Cookie handling for httpOnly cookies
      cookieDomainRewrite: 'localhost',
      cookiePathRewrite: '/',
      // Ensure credentials are forwarded
      onProxyReq: (proxyReq, req, _res) => {
        // Forward cookies
        if (req.headers.cookie) {
          proxyReq.setHeader('Cookie', req.headers.cookie);
        }
      },
      onProxyRes: (proxyRes, _req, _res) => {
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
      },
      onError: handleProxyError
    })
  );
};
