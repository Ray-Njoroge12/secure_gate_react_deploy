# Performance & Scalability Test Plan (k6)

Date: 2025-10-07

## Objectives
- Validate SLOs from project plan: p95 < 500ms, p99 < 1000ms, error rate < 0.1% under 50 concurrent users (baseline).
- Stress hot paths: login, registration, visitor lifecycle, OTP endpoints, and general API smoke.
- Identify bottlenecks (edge, backend, DB, cache) and provide targeted optimizations.

## Environment
- Base URL: configurable via `BASE_URL` (default `http://localhost:5001` or `http://localhost:5000` depending on stack).
- Data: use test accounts; avoid production data.
- Rate limits: respect Nginx limits (auth/otp endpoints have stricter limits). Use moderate VUs or ramping.

## How to Run
```
# From repo root, with k6 installed
export BASE_URL=http://localhost:5001

# Smoke
k6 run secure-gate-access/server/tests/performance/k6/smoke.test.js

# Auth flows
k6 run -e BASE_URL=$BASE_URL secure-gate-access/server/tests/performance/k6/login.test.js
k6 run -e BASE_URL=$BASE_URL secure-gate-access/server/tests/performance/k6/registration.test.js

# Visitor flows
k6 run -e BASE_URL=$BASE_URL secure-gate-access/server/tests/performance/k6/visitor_flow.test.js

# OTP endpoints (watch rate limits!)
k6 run -e BASE_URL=$BASE_URL secure-gate-access/server/tests/performance/k6/otp.test.js
```

## Thresholds (default in scripts)
- http_req_failed: rate<0.001 (0.1%)
- http_req_duration: p(95)<500ms, p(99)<1000ms

## Scenarios
- Smoke: 1→10 VUs, quick sanity.
- Login: ramping 1→25 VUs; duration 3–5 min; concurrent <= Nginx rate.
- Registration: ramping 1→10 VUs; uses randomized emails.
- Visitor lifecycle: create→get→report flows under admin/resident auth where applicable.
- OTP: keep very low RPS (respect rate limits) to avoid 429 noise.

## Outputs
- k6 summary in console; consider `--out json=results.json` for trend analysis.

## Bottleneck Triage
- Edge (Nginx): check rate-limit hits and upstream timings.
- Backend: inspect slow endpoints and error spikes.
- DB: EXPLAIN/indices for heavy queries (residents/visitors search, reports).
- Cache: validate hit rate; add caching where appropriate.




