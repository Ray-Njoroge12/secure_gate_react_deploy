// Flush-friendly tracer smoke test
// Usage: ENABLE_DD_TRACE=true DD_TRACE_DEBUG=true node --import ./load-env.js scripts/dd-trace-flush-test.mjs

const ddTraceMod = await import('dd-trace');
const tracer = ddTraceMod.default || ddTraceMod;

tracer.init({
  service: process.env.DD_SERVICE || 'secure-gate-server',
  env: process.env.NODE_ENV || 'development',
  hostname: process.env.DD_AGENT_HOST || 'localhost',
  port: parseInt(process.env.DD_TRACE_AGENT_PORT || '8126', 10),
  analytics: false,
  debug: process.env.DD_TRACE_DEBUG === 'true'
});

console.log('dd-trace initialized; debug=' + (process.env.DD_TRACE_DEBUG === 'true'));

// Use tracer.trace with an async callback so the span stays open until the work completes
await tracer.trace('smoke.flush', async (span) => {
  span.setTag('test', 'flush');
  // simulate a short workload and allow the tracer to export the span
  await new Promise((r) => setTimeout(r, 3000));
});

console.log('SMOKE_FLUSH_SENT');
// wait briefly to allow background exporter to flush
await new Promise((r) => setTimeout(r, 1500));
console.log('SMOKE_FLUSH_DONE');
process.exit(0);
