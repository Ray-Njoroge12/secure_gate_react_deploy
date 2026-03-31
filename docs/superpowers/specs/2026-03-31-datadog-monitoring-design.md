# Datadog Monitoring — Implementation Design

**Date:** 2026-03-31
**Status:** Approved

---

## Problem Statement

The Datadog agent is running in Docker and is detected in the Datadog account, but zero APM traces appear. Root cause: `ENABLE_DD_TRACE` is not set in `.env`, so `load-env.js` never calls `tracer.init()`. Secondary issues: `traceRoute` middleware creates orphaned spans, and two files have corrupted content from merged implementation iterations.

---

## Architecture

dd-trace initializes in `load-env.js` before any server modules load — this is the correct pattern for auto-instrumentation (Express routes, pg, ioredis are patched at import time). Manual spans via `traceRoute`, `db.enhanced.js`, and `redisService.js` add business context (estate_id, custom operation names) on top of the auto-generated HTTP spans.

```
Docker Datadog Agent (port 8126)
        ▲
        │ spans via TCP (localhost:8126)
        │
Node.js Server (load-env.js → tracer.init())
  ├── Auto-instrumented: Express HTTP, pg, ioredis
  ├── Manual spans: traceRoute middleware (auth, visitor, checkin routes)
  ├── Manual spans: db.enhanced.js (db.query)
  └── Manual spans: redisService.js (redis.command)
```

Span hierarchy after the fix:
```
[HTTP GET /api/visitors]          ← dd-trace auto-instrumentation
  └── [controller.visitor.getMyVisitors]  ← traceRoute (activated via tracer.trace)
        ├── [db.query]            ← db.enhanced.js
        └── [redis.command]       ← redisService.js
```

---

## Components

### 1. Environment Variables (`.env` + `.env.example`)

Variables added to `.env`:

| Variable | Value | Purpose |
|---|---|---|
| `ENABLE_DD_TRACE` | `true` | Gates tracer initialization in `load-env.js` |
| `DD_SERVICE` | `secure-gate-server` | Service name shown in Datadog APM |
| `DD_ENV` | `development` | Environment tag on all spans |
| `DD_AGENT_HOST` | `localhost` | Docker agent host (server runs locally, agent port 8126 mapped to host) |
| `DD_TRACE_AGENT_PORT` | `8126` | Agent trace intake port |
| `DD_TRACE_DEBUG` | `false` | Verbose tracer logs — flip to `true` only to diagnose connection |
| `DD_RUNTIME_METRICS` | `true` | Node.js runtime metrics (event loop lag, heap, GC) |
| `DD_TRACE_ANALYTICS_ENABLED` | `true` | APM analytics |

Same block added to `.env.example` with comments explaining each variable.

**Docker note:** the Datadog agent container must expose `8126:8126`. If the server is ever containerized in the same Compose network, change `DD_AGENT_HOST` to the agent's service name.

### 2. `load-env.js` — tracer.init() agent config

Add `hostname`, `port`, `version`, and `debug` to the existing `tracer.init()` call:

```js
tracer.init({
  service: process.env.DD_SERVICE || process.env.npm_package_name || 'secure-gate-server',
  env: process.env.NODE_ENV || 'development',
  hostname: process.env.DD_AGENT_HOST || 'localhost',
  port: parseInt(process.env.DD_TRACE_AGENT_PORT || '8126', 10),
  version: process.env.npm_package_version,
  analytics: process.env.DD_TRACE_ANALYTICS_ENABLED === 'true' || process.env.NODE_ENV === 'production',
  runtimeMetrics: process.env.DD_RUNTIME_METRICS === 'true',
  logInjection: true,
  debug: process.env.DD_TRACE_DEBUG === 'true'
});
```

No other changes to `load-env.js`.

### 3. `src/middleware/traceMiddleware.js` — context-aware spans

**Problem:** `traceRoute` calls `startSpan()` from `tracing.js`, which creates a span but does not activate it in the async context. DB and Redis spans created inside the route handler therefore have no route-level parent — they float as unparented spans in Datadog.

**Fix:** switch to `tracer.trace()`, which activates the span in the current AsyncLocalStorage context so downstream operations automatically nest under it.

The tracer is obtained via a module-level async cache (same pattern as `tracing.js`). Because `load-env.js` runs before any route file loads, `dd-trace` is already initialized when the first request arrives — the async import resolves immediately from Node's module cache on all subsequent calls.

```js
// module-level cache
let _tracer = null;
let _tracerReady = false;
async function getTracer() {
  if (_tracerReady) return _tracer;
  _tracerReady = true;
  try { const m = await import('dd-trace'); _tracer = m.default || m; } catch (e) {}
  return _tracer;
}

// traceRoute restructured:
export const traceRoute = (name, tagsProvider = () => ({})) => {
  return (req, res, next) => {
    getTracer().then(tracer => {
      if (!tracer) return next();

    const opts = {
      service: process.env.DD_SERVICE || 'secure-gate-server',
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
    }).catch(() => next());
  };
};
```

If the tracer is unavailable, `next()` is called immediately — no request is blocked.

**What is not changed:** `tracing.js` (`startSpan`, `traceAsync`) — these are used in non-middleware contexts (e.g., `bulkInvite`) where manual span management is correct. `db.enhanced.js` and `redisService.js` span creation is also unchanged.

### 4. `scripts/dd-trace-flush-test.mjs` — remove dead second block

The file currently contains two complete programs concatenated. `process.exit(0)` on line 27 makes lines 28–53 unreachable dead code.

**Fix:** delete lines 28–53. Keep only the first block (top-level-await version). The resulting file is a clean, runnable flush test:

```
Usage: ENABLE_DD_TRACE=true DD_TRACE_DEBUG=true node --import ./load-env.js scripts/dd-trace-flush-test.mjs
Expected output: dd-trace initialized → SMOKE_FLUSH_SENT → SMOKE_FLUSH_DONE
```

### 5. `monitoring/datadog/` — fix invalid JSON

`secure-gate-server-dashboard.json` contains two raw JSON objects concatenated — invalid JSON that Datadog's API will reject.

**Fix:** split into two valid files:

| File | Content |
|---|---|
| `secure-gate-server-dashboard.json` | First object: p50/p95 latency timeseries, error count bars, top resources toplist, APM service summary widget |
| `secure-gate-server-apm-overview.json` | Second object: avg trace duration timeseries, trace count by resource bars, error count query value |

`secure-gate-latency-monitors.json` is already valid JSON — no change.

---

## File Surface Area

| Action | File |
|---|---|
| **Modify** | `secure-gate-access/server/.env` |
| **Modify** | `secure-gate-access/.env.example` |
| **Modify** | `secure-gate-access/server/load-env.js` |
| **Modify** | `secure-gate-access/server/src/middleware/traceMiddleware.js` |
| **Modify** | `secure-gate-access/server/scripts/dd-trace-flush-test.mjs` |
| **Modify** | `monitoring/datadog/secure-gate-server-dashboard.json` |
| **Create** | `monitoring/datadog/secure-gate-server-apm-overview.json` |
| **Untouched** | `src/utils/tracing.js`, `db.enhanced.js`, `redisService.js`, `visitorInviteController.js`, `scripts/dd-trace-smoke.mjs`, `monitoring/datadog/secure-gate-latency-monitors.json` |

**Cleanup follow-up (separate pass):** `scripts/dd-trace-test.js` at the repo root is CJS in an ESM project and is redundant alongside the `.mjs` smoke/flush tests — candidate for deletion.

---

## Error Handling

- All tracer calls wrapped in try/catch — if dd-trace is missing or the agent is unreachable, the server starts and handles requests normally
- `traceRoute` falls back to `next()` immediately if the tracer is unavailable
- `DD_TRACE_DEBUG=true` reveals connection errors in server logs without code changes

---

## Verification

After implementation, confirm traces are flowing:

1. Set `DD_TRACE_DEBUG=true` temporarily in `.env`
2. Run flush test: `ENABLE_DD_TRACE=true node --import ./load-env.js scripts/dd-trace-flush-test.mjs`
3. Confirm output: `dd-trace initialized` → `SMOKE_FLUSH_SENT` → `SMOKE_FLUSH_DONE`
4. Check Datadog APM → Services for `secure-gate-server`
5. Start the server, hit `/api/auth/login`, confirm trace appears with `auth.login` child span nested under the HTTP span
6. Set `DD_TRACE_DEBUG=false` once confirmed
