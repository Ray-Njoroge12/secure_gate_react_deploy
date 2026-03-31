// Lazy-load dd-trace singleton. load-env.js initializes it before this module
// is ever imported, so by the time the first request arrives the tracer is
// already initialized and import('dd-trace') resolves from Node's module cache.
let _tracer = null;
let _tracerReady = false;

async function getTracer() {
  if (_tracerReady) return _tracer;
  _tracerReady = true;
  try {
    const m = await import('dd-trace');
    _tracer = m.default || m;
  } catch (e) {
    _tracer = null;
  }
  return _tracer;
}

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
