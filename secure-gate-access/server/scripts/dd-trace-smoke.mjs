import { startSpan } from '../src/utils/tracing.js';

(async () => {
  try {
    const span = await startSpan('smoke.test', {
      service: process.env.DD_SERVICE || 'secure-gate-server',
      resource: 'smoke'
    });
    if (!span) {
      console.log('TRACER_NOT_AVAILABLE');
      process.exit(0);
    }
    console.log('SPAN_STARTED');
    try { span.finish(); } catch (e) {}
    process.exit(0);
  } catch (error) {
    console.error('SMOKE_ERROR', error && error.message ? error.message : error);
    process.exit(2);
  }
})();
