// Flush-friendly tracer smoke test
// Usage: ENABLE_DD_TRACE=true DD_TRACE_DEBUG=true node --import ./load-env.js scripts/dd-trace-flush-test.mjs

const ddTraceMod = await import('dd-trace');
const tracer = ddTraceMod.default || ddTraceMod;

tracer.init({
  service: process.env.DD_SERVICE || 'secure-gate-server',
  env: process.env.NODE_ENV || 'development',
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
import ddTrace from 'dd-trace'

// Initialize tracer. Respect DD_TRACE_DEBUG env var for tracer debug.
ddTrace.init({
  service: 'secure-gate-server',
  env: process.env.NODE_ENV || 'development',
  debug: process.env.DD_TRACE_DEBUG === 'true',
})

// Create a parent span and wait so the tracer has time to export
async function runFlushTest () {
  ddTrace.trace('test.smoke.flush', { resource: 'flush-test' }, async (span) => {
    span.setTag('test', 'flush')
    // simulate work long enough for exporter to flush
    await new Promise((resolve) => setTimeout(resolve, 4000))
  })

  console.log('SMOKE_FLUSH_SENT')
  // give tracer a short moment to flush
  await new Promise((resolve) => setTimeout(resolve, 1500))
}

runFlushTest().then(() => process.exit(0)).catch((err) => {
  console.error('SMOKE_FLUSH_ERROR', err)
  process.exit(1)
})
