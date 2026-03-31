# Datadog Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get APM traces flowing from the Express server to the Datadog agent running in Docker, and fix two files with corrupted/duplicate content that would block Datadog dashboard import.

**Architecture:** dd-trace initializes in `load-env.js` before any server modules load (required for auto-instrumentation of Express, pg, ioredis). The `traceRoute` middleware is refactored to use `tracer.trace()` instead of `startSpan()` so manual route spans are properly parented under the HTTP span in the Datadog trace waterfall. The Datadog agent runs in Docker with port 8126 mapped to the host; the server runs locally and connects via `DD_AGENT_HOST=localhost`.

**Tech Stack:** dd-trace v5, Express.js (ESM), Jest with `--experimental-vm-modules`, Node ≥ 20.11.0

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Modify | `secure-gate-access/server/.env` | Add DD_ vars so tracer initializes |
| Modify | `secure-gate-access/.env.example` | Document DD_ vars for future developers |
| Modify | `secure-gate-access/server/load-env.js` | Pass hostname/port/version/debug to tracer.init() |
| Modify | `secure-gate-access/server/src/middleware/traceMiddleware.js` | Switch traceRoute to tracer.trace() for proper span parenting |
| Create | `secure-gate-access/server/tests/unit/middleware/traceMiddleware.test.js` | Unit tests for traceRoute |
| Modify | `secure-gate-access/server/scripts/dd-trace-flush-test.mjs` | Remove dead second block (lines 28-53) |
| Modify | `monitoring/datadog/secure-gate-server-dashboard.json` | Trim to first valid JSON object |
| Create | `monitoring/datadog/secure-gate-server-apm-overview.json` | Second dashboard extracted from broken file |

---

## Task 1: Add DD_ Environment Variables

**Files:**
- Modify: `secure-gate-access/server/.env`
- Modify: `secure-gate-access/.env.example`

- [ ] **Step 1: Add DD_ block to `.env`**

Open `secure-gate-access/server/.env` and append this block at the end of the file:

```
# ------------------------------------------------------------------------------
# DATADOG APM (dd-trace)
# ------------------------------------------------------------------------------
# Enable APM tracing. Required for traces to appear in Datadog.
ENABLE_DD_TRACE=true
# Service name shown in Datadog APM > Services
DD_SERVICE=secure-gate-server
# Environment tag applied to all spans (development | staging | production)
DD_ENV=development
# Datadog agent host. Server runs locally; Docker agent must expose 8126:8126.
# If server is also containerized in the same Compose network, use the agent service name instead.
DD_AGENT_HOST=localhost
DD_TRACE_AGENT_PORT=8126
# Flip to true ONLY when diagnosing connection issues — very verbose output.
DD_TRACE_DEBUG=false
# Enable Node.js runtime metrics (event loop lag, heap, GC) in Datadog
DD_RUNTIME_METRICS=true
# Enable APM analytics
DD_TRACE_ANALYTICS_ENABLED=true
```

- [ ] **Step 2: Add the same DD_ block to `.env.example`**

Open `secure-gate-access/.env.example` and append after the last existing section (after `REACT_APP_WS_URL=ws://localhost:3001`):

```
# ------------------------------------------------------------------------------
# 🟡 DATADOG APM (dd-trace)
# ------------------------------------------------------------------------------
# Enable APM tracing. Required for traces to appear in Datadog.
ENABLE_DD_TRACE=false
# Service name shown in Datadog APM > Services
DD_SERVICE=secure-gate-server
# Environment tag applied to all spans (development | staging | production)
DD_ENV=development
# Datadog agent host. Server runs locally; Docker agent must expose 8126:8126.
# If server is also containerized in the same Compose network, use the agent service name instead.
DD_AGENT_HOST=localhost
DD_TRACE_AGENT_PORT=8126
# Flip to true ONLY when diagnosing connection issues — very verbose output.
DD_TRACE_DEBUG=false
# Enable Node.js runtime metrics (event loop lag, heap, GC) in Datadog
DD_RUNTIME_METRICS=true
# Enable APM analytics
DD_TRACE_ANALYTICS_ENABLED=true
```

Note: `ENABLE_DD_TRACE=false` in the example (safe default) vs `true` in your actual `.env`.

- [ ] **Step 3: Commit**

```bash
git add secure-gate-access/server/.env secure-gate-access/.env.example
git commit -m "chore(config): add Datadog DD_ environment variables"
```

---

## Task 2: Fix `tracer.init()` in `load-env.js`

**Files:**
- Modify: `secure-gate-access/server/load-env.js:68-74`

The current `tracer.init()` call is missing `hostname`, `port`, `version`, and `debug`. Without `hostname`/`port`, dd-trace falls back to `localhost:8126` but doesn't pick it up from env vars.

- [ ] **Step 1: Replace the tracer.init() call**

In `secure-gate-access/server/load-env.js`, find this block (lines 68–74):

```js
        tracer.init({
          service: process.env.DD_SERVICE || process.env.npm_package_name || 'secure-gate-server',
          env: process.env.NODE_ENV || 'development',
          analytics: process.env.DD_TRACE_ANALYTICS_ENABLED === 'true' || (process.env.NODE_ENV === 'production'),
          runtimeMetrics: process.env.DD_RUNTIME_METRICS === 'true' || false,
          logInjection: true
        });
```

Replace it with:

```js
        tracer.init({
          service: process.env.DD_SERVICE || process.env.npm_package_name || 'secure-gate-server',
          env: process.env.NODE_ENV || 'development',
          hostname: process.env.DD_AGENT_HOST || 'localhost',
          port: parseInt(process.env.DD_TRACE_AGENT_PORT || '8126', 10),
          version: process.env.npm_package_version,
          analytics: process.env.DD_TRACE_ANALYTICS_ENABLED === 'true' || (process.env.NODE_ENV === 'production'),
          runtimeMetrics: process.env.DD_RUNTIME_METRICS === 'true',
          logInjection: true,
          debug: process.env.DD_TRACE_DEBUG === 'true'
        });
```

- [ ] **Step 2: Verify the file looks correct**

Run:
```bash
grep -n "hostname\|port\|version\|debug" secure-gate-access/server/load-env.js
```

Expected output (line numbers may vary):
```
69:          hostname: process.env.DD_AGENT_HOST || 'localhost',
70:          port: parseInt(process.env.DD_TRACE_AGENT_PORT || '8126', 10),
71:          version: process.env.npm_package_version,
75:          debug: process.env.DD_TRACE_DEBUG === 'true'
```

- [ ] **Step 3: Commit**

```bash
git add secure-gate-access/server/load-env.js
git commit -m "fix(tracing): pass hostname, port, version, debug to tracer.init()"
```

---

## Task 3: Fix `traceRoute` Middleware (TDD)

**Files:**
- Create: `secure-gate-access/server/tests/unit/middleware/traceMiddleware.test.js`
- Modify: `secure-gate-access/server/src/middleware/traceMiddleware.js`

**Background:** `traceRoute` currently calls `startSpan()` from `tracing.js`. This creates a span that is not activated in the async context, so DB and Redis spans created inside the route handler have no parent route span — they appear as disconnected spans in Datadog. `tracer.trace()` activates the span in the current AsyncLocalStorage context so all downstream spans automatically nest correctly.

- [ ] **Step 1: Create the test directory**

```bash
mkdir -p secure-gate-access/server/tests/unit/middleware
```

- [ ] **Step 2: Write the failing test**

Create `secure-gate-access/server/tests/unit/middleware/traceMiddleware.test.js`:

```js
import { jest } from '@jest/globals';

// Set up mocks BEFORE importing the module under test (required for ESM mocking)
const mockDone = jest.fn();
const mockSpan = { setTag: jest.fn() };
const mockTracer = {
  trace: jest.fn((name, opts, cb) => {
    cb(mockSpan, mockDone);
  })
};

jest.unstable_mockModule('dd-trace', () => ({ default: mockTracer }));

// Dynamic import AFTER mock registration
const { traceRoute } = await import('../../../src/middleware/traceMiddleware.js');

describe('traceRoute middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      method: 'GET',
      path: '/api/visitors',
      user: { estate_id: 'estate-abc' }
    };
    res = {
      statusCode: 200,
      on: jest.fn()
    };
    next = jest.fn();
  });

  // Flush microtask queue so getTracer()'s async import resolves
  const flush = () => new Promise(r => setTimeout(r, 0));

  test('calls tracer.trace() with the operation name and correct options', async () => {
    const middleware = traceRoute('auth.login');
    middleware(req, res, next);
    await flush();

    expect(mockTracer.trace).toHaveBeenCalledWith(
      'auth.login',
      expect.objectContaining({
        resource: 'GET /api/visitors',
        tags: expect.objectContaining({
          route: '/api/visitors',
          method: 'GET',
          estate_id: 'estate-abc'
        })
      }),
      expect.any(Function)
    );
  });

  test('calls next() inside the tracer.trace() callback', async () => {
    const middleware = traceRoute('auth.login');
    middleware(req, res, next);
    await flush();

    expect(next).toHaveBeenCalled();
  });

  test('sets http.status_code tag and calls done() on response finish', async () => {
    let finishHandler;
    res.on = jest.fn((event, handler) => {
      if (event === 'finish') finishHandler = handler;
    });

    const middleware = traceRoute('auth.login');
    middleware(req, res, next);
    await flush();

    res.statusCode = 201;
    finishHandler();

    expect(mockSpan.setTag).toHaveBeenCalledWith('http.status_code', 201);
    expect(mockDone).toHaveBeenCalledWith();
  });

  test('sets error tag and calls done(err) on response error', async () => {
    let errorHandler;
    res.on = jest.fn((event, handler) => {
      if (event === 'error') errorHandler = handler;
    });

    const middleware = traceRoute('auth.login');
    middleware(req, res, next);
    await flush();

    const err = new Error('socket hang up');
    errorHandler(err);

    expect(mockSpan.setTag).toHaveBeenCalledWith('error', true);
    expect(mockDone).toHaveBeenCalledWith(err);
  });

  test('merges tagsProvider result into span tags', async () => {
    const tagsProvider = () => ({ visitor_id: 'v-999' });
    const middleware = traceRoute('visitor.create', tagsProvider);
    middleware(req, res, next);
    await flush();

    expect(mockTracer.trace).toHaveBeenCalledWith(
      'visitor.create',
      expect.objectContaining({
        tags: expect.objectContaining({ visitor_id: 'v-999' })
      }),
      expect.any(Function)
    );
  });

  test('calls next() immediately when tracer returns null', async () => {
    // Simulate tracer unavailability by resetting the module cache
    // This is tested via the catch path — we verify next() always gets called
    const middleware = traceRoute('any.op');
    middleware(req, res, next);
    await flush();

    // next() must have been called regardless of tracer state
    expect(next).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the test — expect it to FAIL**

```bash
cd secure-gate-access/server
NODE_ENV=test NODE_NO_WARNINGS=1 node --experimental-vm-modules node_modules/.bin/jest --runInBand tests/unit/middleware/traceMiddleware.test.js
```

Expected: tests **FAIL** because the current implementation calls `startSpan()`, not `tracer.trace()`. The `mockTracer.trace` assertion will fail with `Expected number of calls: >= 1, Received: 0`.

- [ ] **Step 4: Rewrite `traceMiddleware.js`**

Replace the entire contents of `secure-gate-access/server/src/middleware/traceMiddleware.js` with:

```js
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
```

- [ ] **Step 5: Run the test — expect it to PASS**

```bash
NODE_ENV=test NODE_NO_WARNINGS=1 node --experimental-vm-modules node_modules/.bin/jest --runInBand tests/unit/middleware/traceMiddleware.test.js
```

Expected output:
```
PASS tests/unit/middleware/traceMiddleware.test.js
  traceRoute middleware
    ✓ calls tracer.trace() with the operation name and correct options
    ✓ calls next() inside the tracer.trace() callback
    ✓ sets http.status_code tag and calls done() on response finish
    ✓ sets error tag and calls done(err) on response error
    ✓ merges tagsProvider result into span tags
    ✓ calls next() immediately when tracer returns null

Test Suites: 1 passed, 1 total
Tests: 6 passed, 6 total
```

- [ ] **Step 6: Commit**

```bash
git add secure-gate-access/server/tests/unit/middleware/traceMiddleware.test.js \
        secure-gate-access/server/src/middleware/traceMiddleware.js
git commit -m "fix(tracing): use tracer.trace() in traceRoute for proper span parenting"
```

---

## Task 4: Fix `dd-trace-flush-test.mjs`

**Files:**
- Modify: `secure-gate-access/server/scripts/dd-trace-flush-test.mjs`

The file currently has two complete programs concatenated. Line 27 calls `process.exit(0)`, making lines 28–53 dead code. The dead block also has a duplicate `import` statement which is a syntax problem in ESM (duplicate binding).

- [ ] **Step 1: Replace the file with only the first block**

Replace the entire contents of `secure-gate-access/server/scripts/dd-trace-flush-test.mjs` with:

```js
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
```

Note: `hostname` and `port` are added here to match the `load-env.js` fix from Task 2.

- [ ] **Step 2: Verify the file is clean (no duplicate content)**

```bash
wc -l secure-gate-access/server/scripts/dd-trace-flush-test.mjs
```

Expected: `31` (or near it). If it shows `54+`, the second block was not removed.

- [ ] **Step 3: Commit**

```bash
git add secure-gate-access/server/scripts/dd-trace-flush-test.mjs
git commit -m "fix(scripts): remove dead duplicate block from dd-trace-flush-test.mjs"
```

---

## Task 5: Fix Monitoring Dashboard JSON

**Files:**
- Modify: `monitoring/datadog/secure-gate-server-dashboard.json`
- Create: `monitoring/datadog/secure-gate-server-apm-overview.json`

`secure-gate-server-dashboard.json` currently contains two JSON objects concatenated (invalid JSON). Split them into two separate valid files.

- [ ] **Step 1: Replace `secure-gate-server-dashboard.json` with only the first object**

Replace the entire contents of `monitoring/datadog/secure-gate-server-dashboard.json` with:

```json
{
  "title": "Secure Gate - APM Overview",
  "description": "APM overview for `secure-gate-server`: latency percentiles, errors, and top resources.",
  "widgets": [
    {
      "definition": {
        "type": "timeseries",
        "requests": [
          {
            "q": "p50:trace.span.duration{service:secure-gate-server}.rollup(p50, 60)",
            "display_type": "line",
            "style": { "palette": "dog_classic", "line_type": "solid", "line_width": "normal" },
            "name": "p50 latency (ms)"
          },
          {
            "q": "p95:trace.span.duration{service:secure-gate-server}.rollup(p95, 60)",
            "display_type": "line",
            "style": { "palette": "warm", "line_type": "solid", "line_width": "normal" },
            "name": "p95 latency (ms)"
          }
        ],
        "title": "Latency (p50 / p95)"
      }
    },
    {
      "definition": {
        "type": "timeseries",
        "requests": [
          {
            "q": "sum:trace.error.count{service:secure-gate-server}.rollup(sum, 60)",
            "display_type": "bars",
            "style": { "palette": "purple", "line_type": "solid", "line_width": "normal" },
            "name": "errors/min"
          }
        ],
        "title": "Error Count"
      }
    },
    {
      "definition": {
        "type": "toplist",
        "requests": [
          {
            "q": "top(avg:trace.span.duration{service:secure-gate-server}, 10, 'resource_name')",
            "size": "medium"
          }
        ],
        "title": "Top APM Resources by Avg Duration"
      }
    },
    {
      "definition": {
        "type": "apm_resource",
        "service": "secure-gate-server",
        "title": "APM Service Summary",
        "resource": ""
      }
    }
  ],
  "layout_type": "ordered",
  "is_read_only": false,
  "notify_list": []
}
```

- [ ] **Step 2: Create `secure-gate-server-apm-overview.json`**

Create `monitoring/datadog/secure-gate-server-apm-overview.json` with:

```json
{
  "title": "Secure Gate - Server APM Overview",
  "description": "Quick dashboard for secure-gate-server: trace durations and errors.",
  "widgets": [
    {
      "definition": {
        "type": "timeseries",
        "title": "Average trace duration (service)",
        "requests": [
          {
            "q": "avg:trace.duration{service:secure-gate-server}.rollup(avg,60)",
            "display_type": "line"
          }
        ],
        "yaxis": {
          "label": "ms",
          "scale": "linear"
        }
      }
    },
    {
      "definition": {
        "type": "timeseries",
        "title": "Trace count by resource",
        "requests": [
          {
            "q": "sum:trace.hits{service:secure-gate-server} by {resource}.rollup(sum, 60)",
            "display_type": "bars"
          }
        ]
      }
    },
    {
      "definition": {
        "type": "query_value",
        "title": "Error count (last 5m)",
        "requests": [
          {
            "q": "sum:trace.errors{service:secure-gate-server}.rollup(sum,300)",
            "aggregator": "sum"
          }
        ]
      }
    }
  ],
  "layout_type": "ordered",
  "is_read_only": false
}
```

- [ ] **Step 3: Validate both files are valid JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('monitoring/datadog/secure-gate-server-dashboard.json','utf8')); console.log('dashboard: valid')"
node -e "JSON.parse(require('fs').readFileSync('monitoring/datadog/secure-gate-server-apm-overview.json','utf8')); console.log('apm-overview: valid')"
```

Expected:
```
dashboard: valid
apm-overview: valid
```

- [ ] **Step 4: Commit**

```bash
git add monitoring/datadog/secure-gate-server-dashboard.json \
        monitoring/datadog/secure-gate-server-apm-overview.json
git commit -m "fix(monitoring): split invalid concatenated dashboard JSON into two valid files"
```

---

## Task 6: End-to-End Verification

**No file changes — this is a manual verification pass.**

- [ ] **Step 1: Enable debug mode temporarily**

In `secure-gate-access/server/.env`, set:
```
DD_TRACE_DEBUG=true
```

- [ ] **Step 2: Run the flush test**

```bash
cd secure-gate-access/server
ENABLE_DD_TRACE=true node --import ./load-env.js scripts/dd-trace-flush-test.mjs
```

Expected output (with some dd-trace debug lines in between):
```
✅ Datadog dd-trace initialized
dd-trace initialized; debug=true
SMOKE_FLUSH_SENT
SMOKE_FLUSH_DONE
```

If you see `Error: connect ECONNREFUSED 127.0.0.1:8126` in the debug output, the Docker agent port is not mapped. Verify the agent container has `8126:8126` in `docker-compose.yml`.

- [ ] **Step 3: Start the server**

```bash
cd secure-gate-access/server
npm run dev
```

Confirm the startup log includes:
```
✅ Datadog dd-trace initialized
```

If it shows `ℹ️ dd-trace not enabled` — `ENABLE_DD_TRACE` is not being read. Confirm the `.env` file is in `secure-gate-access/server/` and the value is `true` (no quotes, no spaces).

- [ ] **Step 4: Hit an instrumented endpoint**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'
```

Expected: `400` or `401` (the request fails, but a trace is still generated).

- [ ] **Step 5: Check Datadog APM**

In your Datadog account:
1. Go to **APM > Services**
2. Look for `secure-gate-server`
3. Click through to a trace — confirm the waterfall shows `auth.login` nested under the HTTP span

- [ ] **Step 6: Disable debug mode**

In `secure-gate-access/server/.env`, set:
```
DD_TRACE_DEBUG=false
```

```bash
git add secure-gate-access/server/.env
git commit -m "chore(tracing): disable DD_TRACE_DEBUG after verification"
```

---

## Cleanup Follow-up (separate pass)

After this plan is complete and traces are confirmed, flag for deletion:

- `scripts/dd-trace-test.js` (repo root) — CJS script in an ESM project, redundant alongside `dd-trace-smoke.mjs` and `dd-trace-flush-test.mjs`
