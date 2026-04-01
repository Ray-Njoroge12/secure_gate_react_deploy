import { startSpan } from '../utils/tracing.js';

/**
 * traceRoute middleware: starts a dd-trace span for the request and finishes on response
 * name: logical operation name
 * tagsProvider: optional function (req) => ({ tagKey: tagValue })
 */
export const traceRoute = (name, tagsProvider = () => ({})) => {
  return async (req, res, next) => {
    let span = null;
    try {
      span = await startSpan(name, {
        service: process.env.DD_SERVICE || process.env.npm_package_name || 'secure-gate-server',
        resource: `${req.method} ${req.path}`,
        tags: {
          route: req.path,
          method: req.method,
          estate_id: req.user?.estate_id || process.env.ESTATE_ID || 'unknown',
          ...(typeof tagsProvider === 'function' ? tagsProvider(req) : {})
        }
      });
    } catch (e) {
      span = null;
    }

    // Finish span when response completes
    if (span) {
      res.on('finish', () => {
        try { span.setTag('http.status_code', res.statusCode); } catch (e) {}
        try { span.finish(); } catch (e) {}
      });
      res.on('error', () => {
        try { span.setTag('error', true); } catch (e) {}
        try { span.finish(); } catch (e) {}
      });
    }

    return next();
  };
};
