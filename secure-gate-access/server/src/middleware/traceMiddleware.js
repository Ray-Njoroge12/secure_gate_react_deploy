import { getTracer } from '../utils/tracing.js';

/**
 * traceRoute middleware: wraps a route in a dd-trace span using tracer.trace().
 *
 * Uses tracer.trace() (not startSpan) so the span is activated in the current
 * AsyncLocalStorage context — downstream db.query and redis.command spans
 * automatically become children of this route span in the Datadog waterfall.
 *
 * @param {string} name - Operation name shown in Datadog (e.g. 'auth.login')
 * @param {function} tagsProvider - Optional (req) => ({ key: value }) for extra tags
 */
export const traceRoute = (name, tagsProvider = () => ({})) => {
  return (req, res, next) => {
    getTracer()
      .then(tracer => {
        if (!tracer) return next();

        const opts = {
          service: process.env.DD_SERVICE || process.env.npm_package_name || 'secure-gate-server',
          resource: `${req.method} ${req.path}`,
          tags: {
            route: req.path,
            method: req.method,
            estate_id: req.user?.estate_id || process.env.ESTATE_ID || 'unknown',
            ...(typeof tagsProvider === 'function' ? tagsProvider(req) : {})
          }
        };

        tracer.trace(name, opts, (span, done) => {
          res.on('finish', () => {
            try { span.setTag('http.status_code', res.statusCode); } catch (e) {}
            done();
          });
          res.on('error', (err) => {
            try { span.setTag('error', true); } catch (e) {}
            done(err);
          });
          next();
        });
      })
      .catch(() => next());
  };
};
