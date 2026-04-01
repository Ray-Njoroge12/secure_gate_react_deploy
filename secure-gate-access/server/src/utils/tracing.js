// Lightweight tracing helpers for dd-trace
let _tracerInitialized = false;
let _tracer = null;

export async function getTracer() {
  if (_tracerInitialized) return _tracer;
  _tracerInitialized = true;
  try {
    const mod = await import('dd-trace');
    _tracer = mod.default || mod;
  } catch (e) {
    _tracer = null;
  }
  return _tracer;
}

export async function traceAsync(name, opts = {}, fn) {
  const tracer = await getTracer();
  if (!tracer) return fn();

  // Use tracer.trace when available
  try {
    return await tracer.trace(name, opts, async (span) => {
      try {
        const result = await fn(span);
        return result;
      } finally {
        // tracer.trace finishes automatically when promise resolves
      }
    });
  } catch (e) {
    // Fallback to executing the function if tracing fails
    return fn();
  }
}

export async function startSpan(name, opts = {}) {
  const tracer = await getTracer();
  if (!tracer) return null;
  try {
    const span = tracer.startSpan(name, opts);
    return span;
  } catch (e) {
    return null;
  }
}
