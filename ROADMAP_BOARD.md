## Roadmap board

### Now (P0) — Ship blockers and stop production breakage

**1) Estate lifecycle enforcement**

* **Goal:** no “login works but app is forbidden” for legitimate users
* **Deliverables**

  * Ensure every user who should use the app has an `estate_id` at creation/provisioning
  * Add an **onboarding / estate selection** path for users without `estate_id`
  * Standardize the UI state for `ESTATE_REQUIRED` (single screen + clear CTA)
* **Exit criteria**

  * Estate-less user hits protected route → consistent `403 ESTATE_REQUIRED`
  * UI shows “No estate assigned” view instead of broken dashboards

**2) CSRF bootstrapping & stability**

* **Goal:** first POST/PUT/DELETE never fails due to missing CSRF token
* **Deliverables**

  * Confirm CSRF token is fetched on app bootstrap and/or harvested from first response header
  * CSRF retry guard confirmed (no infinite retry loops)
* **Exit criteria**

  * Fresh session → first mutation succeeds
  * Forced CSRF mismatch → one recovery attempt then success/fail cleanly

**3) Refresh limiter split (login strict, refresh lenient)**

* **Goal:** no refresh-based lockouts (429 loops) under normal multi-tab usage
* **Deliverables**

  * Separate limiter for `/api/auth/refresh` (higher threshold than `/login`)
  * Add server logging for refresh 429 events
* **Exit criteria**

  * Expired access token under bursty traffic → refresh succeeds without 429
  * Login brute-force remains rate-limited

---

### Next (P1) — Consistency, security hardening, and long-tail failures

**4) Estate middleware alignment across modules**

* **Goal:** same semantics everywhere (status + code + message)
* **Deliverables**

  * Ensure all estate-scoped modules use the same middleware behavior
  * Document estate requirements per role
* **Exit criteria**

  * Visitors/Resident/QR/Events behave identically for missing/invalid estate

**5) Authorization consistency (roles + protected routes)**

* **Goal:** eliminate “one endpoint behaves differently” and prevent privilege gaps
* **Deliverables**

  * Confirm every sensitive endpoint uses `authenticateToken` + estate + role checks
  * Create a policy map: endpoint group → required role(s)
* **Exit criteria**

  * Guard/admin-only endpoints correctly deny non-privileged users
  * No route uses optional auth for privileged actions

**6) Observability pack**

* **Goal:** know exactly why users fail in production
* **Deliverables**

  * Structured logs for: auth failures, refresh failures, CSRF failures, estate failures
  * Correlation/request ID propagated to client-visible errors
* **Exit criteria**

  * Support can triage “why did this fail” from logs in minutes

---

### Later (P2) — Quality, maintainability, and operational excellence

**7) Frontend UX hardening**

* **Goal:** reduce jarring redirects and improve recovery
* **Deliverables**

  * Replace `window.location.href` redirects with centralized auth state transitions
  * Graceful offline/network retry handling for refresh
* **Exit criteria**

  * No redirect loops during app bootstrap
  * Better user messaging for session expiry

**8) Security review follow-ups**

* **Goal:** minimize attack surface and tighten policies
* **Deliverables**

  * Re-evaluate CORS “no-origin” policy and tighten for production
  * Confirm cookie domain/path policies are uniform everywhere
  * Validate token revocation persistence in prod (Redis health checks)
* **Exit criteria**

  * Security posture documented, verified, and monitored

---

## Test lane (attach to each column)

## Implementation analysis (current state)

### Completed vs in-progress

**P0: Estate lifecycle enforcement**
- **Implemented:** New estate onboarding endpoints (`GET /api/estates/available`, `POST /api/estates/select`), estate selection UI, and estate selection entrypoint from the estate-required screen. ✅
- **Implemented:** Registration now requires `estate_id`, and guard creation inherits the admin estate. ✅
- **Implemented:** Estate-required and invalid-estate errors route to a single CTA screen for recovery. ✅

**P0: CSRF bootstrapping & stability**
- **Implemented:** Client bootstraps CSRF by calling `/api/auth/csrf-token` on app mount, and axios response interceptor harvests `x-csrf-token`. ✅
- **Implemented:** CSRF failures emit structured security logs with request IDs (observability baseline). ✅
- **Implemented:** CSRF token is returned on first auth response headers; bootstrap path documented for web + mobile clients. ✅
- **Implemented:** Integration coverage added for CSRF mismatch handling to guard retry behavior. ✅

**P0: Refresh limiter split**
- **Implemented:** Separate refresh limiter with higher threshold and structured 429 logging. ✅
- **Implemented:** Integration tests verify refresh bursts trigger limiter and login limiter remains strict. ✅

**P1: Estate middleware alignment**
- **Implemented:** `requireEstate`/`estateContextMiddleware` now align on `ESTATE_REQUIRED` messaging and consistent invalid estate status codes. ✅

**P1: Authorization consistency**
- **Implemented:** Shared role policy helper now standardizes per-route checks, policy map refreshed, and enforcement tests cover guard management, resident features, visitor management, event management, and admin-only monitoring/metrics/reporting endpoints (including delivery stats). ✅

**P1: Observability**
- **Partially implemented:** Logging service and audit middleware exist; CSRF/session failures emit structured security logs with request IDs and user/estate context, rate-limit events are logged with structured context, auth/refresh logs now emit structured `event` + `request_id` fields, legacy 401/403 payloads were standardized for requestId propagation (including data minimization access denials), and duplicate request tracing/logging middleware was removed so a single canonical request ID path remains (app-level `requestIdMiddleware` + `requestLogger`). Staging requestId validation is still pending. ⚠️

**P2: Frontend UX hardening**
- **Implemented:** Centralized auth transitions with a shared state machine, removed remaining `window.location.href` navigation from guard/resident dashboards and error boundaries, and aligned session-expiry messaging across handlers. ✅ (closed)

**P2: Security review follow-ups**
- **Implemented:** CORS allowlist now documents staging/prod rules, cookie flags are surfaced for audit in admin health checks, and Redis-backed token revocation health checks report persistence status with fallback alerts. ✅ (closed)

## Remaining work plan (edits to complete tasks)

### Production-readiness completion plan (operational)

**Milestone 1 — Staging correlation validation (P0)**

* **Goal:** prove one request ID links response headers, error payloads, request logs, and security logs.
* **Tasks**
  * Confirm only one request tracing middleware path is active (app-level `requestIdMiddleware` + `requestLogger`), and no duplicate request logging occurs at server bootstrap.
  * Send a request with `X-Request-ID: stage-corr-001` to a known failure endpoint (e.g., `ESTATE_REQUIRED` or CSRF failure).
  * Confirm response header echoes `X-Request-ID`, error payload includes `error.requestId`, and request/security logs contain the same ID.
  * Verify the log aggregator query on that ID returns request-start, request-end, error, and security events.
* **Acceptance criteria**
  * A single bundle (screenshot/snippet) shows response headers + payload + log query with the same request id.
* **Completion record (staging run)**
  * **Status:** On hold (staging validation pending).
  * **Request sent:** `STAGING_BASE_URL=https://staging.example.com KNOWN_FAILURE_PATH=/api/estates/requirement-check ./scripts/run-staging-correlation-validation.sh`
  * **Evidence bundle:** `staging-correlation/response-headers.txt`, `staging-correlation/response-body.json`, and log query screenshots/snippets for `stage-corr-001`.
  * **Verified fields:** `X-Request-ID` echoed, `error.requestId` present, request/security logs contain the same `request_id`.

**Milestone 2 — Log field normalization (P0 → P1)**

* **Goal:** consistent correlation queries across request, error, and security logs.
* **Tasks**
  * Select a canonical field (`request_id`).
  * Ensure request start/end, error handler, and security logs emit that field.
  * Keep aliases if needed, but standardize dashboards and queries on `request_id`.
* **Acceptance criteria**
  * One query template works for all log sources.
* **Completion record (implementation)**
  * **Status:** Completed (code changes merged).
  * **Updates:** normalized request id fields in logging service + logger to emit `request_id` consistently.
  * **Verification:** run a local/staging request and confirm request-start, request-end, error, and security logs include `request_id`.
  * **Query template:** `request_id="<REQUEST_ID>"`

**Milestone 3 — Error system consolidation (P1)**

* **Goal:** one error contract, one code path, consistent logging.
* **Tasks**
  * Pick a single error system (the standardized handler).
  * Deprecate the alternate error module and block new usage via CI/lint checks.
  * Ensure status/code/message are always present; `requestId` injected by handler.
* **Acceptance criteria**
  * CI rule confirms a single error import path and consistent error shape.
* **Completion record (implementation)**
  * **Status:** Completed (code changes merged).
  * **Updates:** consolidated error helpers/constants and request-id middleware into standardized handler, removed legacy handlers/tests, and added a lint gate to block deprecated error modules.
  * **Verification:** run `npm --prefix secure-gate-access/server run lint:error-handlers`.

**Milestone 4 — Estate lifecycle completion (P1)**

* **Goal:** legitimate users never hit `ESTATE_REQUIRED` unexpectedly.
* **Tasks**
  * Enforce estate assignment during provisioning or add onboarding/estate selection flow.
  * Migrate or disable users with missing `estate_id`.
  * Provide a stable “Estate required” UI with next steps.
* **Acceptance criteria**
  * Estate-less test user always lands on the correct UI with guidance.
* **Completion record (implementation)**
  * **Status:** Completed (operational scripts + UI in place).
  * **Updates:** added estate assignment audit + assignment scripts, ensured seed data includes `estate_id` when the column exists, and the estate-required UI directs users to estate selection/support.
  * **Verification:** run `npm --prefix secure-gate-access/server run audit:estate` and, if needed, `npm --prefix secure-gate-access/server run assign:estate -- --use-default` or `--estate-id <id>`.

**Milestone 5 — Staging parity + hardening (P1 → P2)**

* **Goal:** staging mirrors production for CSRF, rate limiting, cookies, and CORS.
* **Tasks**
  * Enforce staging flags: CSRF on, rate limiting on, prod-grade CORS.
  * Verify cookie attributes (`SameSite=None; Secure`) for staging domain.
  * Simulate multi-tab refresh behavior to avoid 429 loops.
* **Acceptance criteria**
  * Login → mutation → refresh flow matches production config without surprises.
* **Completion record (implementation)**
  * **Status:** Completed (implementation).
  * **Updates:** staging parity script now reports cookie/proxy flags, staging defaults match production for cookie attributes and transport security, staging env validation enforces CSRF/rate limiting expectations, and refresh flow includes a short reuse window for multi-tab refresh collisions.
  * **Next check:** run `npm --prefix secure-gate-access/server run check:staging-parity` and validate staging config + multi-tab refresh behavior.

### Remaining implementations
- **Milestone 1 — Staging correlation validation:** run the correlation validation script and capture evidence bundle. ⚠️
- **P1 Observability pack:** validate requestId propagation in staging. ⚠️

### Remaining tasks (current focus)
- Validate requestId propagation in staging by running `./scripts/run-staging-correlation-validation.sh` and capturing the evidence bundle (ensure only the app-level request tracing/logging middleware is active). ⚠️

### Remaining tasks snapshot
- **P1 Observability pack:** Validate requestId propagation in staging. ⚠️

### Improvement guidance (to complete remaining work efficiently)

**Cross-cutting execution tips**
- Define a single “source of truth” for error payloads (status, code, message, requestId) and update middleware to use it to avoid drift.
- Pair each backend change with the smallest possible test (unit/integration) so regressions are detected early.
- When adding tests, add a short “why it exists” comment to improve maintainability.

**P0 focus: unblock production**
- Keep estate-required flows “single-path”: always land on the same UI and CTA regardless of the protected route.
- Treat CSRF bootstrap and refresh handling as “app bootstrap invariants,” and explicitly test the cold-start path.
- Make refresh limit logging structured and measurable (error codes + request IDs) to identify loops.

### CSRF bootstrap path (documented)
- **Web client:** `App.js` triggers `refreshCSRFToken()` on bootstrap, and the axios response interceptor harvests `x-csrf-token` headers from subsequent responses.
- **Mobile/API clients:** Call `/api/auth/csrf-token` before the first mutation, or use the `x-csrf-token` header emitted by the first authenticated response.
- **Server guarantee:** `generateCSRFToken` middleware sets `X-CSRF-Token` on responses whenever session middleware is available.

### P0 follow-ups
- No remaining P0 follow-ups currently tracked.

### P1 tasks
1. **Authorization policy map**
   - Produce a table mapping endpoint group → required role(s).
   - Add tests for guard-only/admin-only endpoints.
   - **Improvements implemented:**
     - Shared role policy helper standardizes per-route checks to reduce drift.
   - **Coverage gaps closed:**
     - Guard management (`/api/guards/*`) beyond dashboard coverage.
     - Resident features (`/api/resident/*`) beyond profile coverage.
     - Visitor management (`/api/visitors/*`) estate-scoped routes beyond approval/check-in coverage.
     - Event management (`/api/events/*`) role-specific access beyond event creation coverage.
     - Notification webhooks/public flows where auth should be enforced.

#### Authorization policy map (current)
| Endpoint group | Example routes | Required auth | Required roles |
| --- | --- | --- | --- |
| Auth | `/api/auth/login`, `/api/auth/refresh`, `/api/auth/me` | Mixed | Public for login/register, authenticated for `/me`, `/logout` |
| Estate onboarding | `/api/estates/available`, `/api/estates/select` | Mixed | Public list, authenticated select |
| Admin core | `/api/admin/users`, `/api/admin/guards`, `/api/admin/visitors` | Yes | `admin` |
| Admin analytics | `/api/admin/analytics/*` | Yes | `admin` |
| Guard management | `/api/guards/*` | Yes | `admin`/`guard` per route |
| Resident features | `/api/resident/*` | Yes | `resident`/`admin` |
| Visitor management | `/api/visitors/*` | Yes | Estate-scoped + role by route (`resident`/`admin` for invites, `guard` for check-in, `admin` for reports) |
| Event management | `/api/events/*` | Yes | `admin`/`resident` for host actions, `guard` for check-in/out |
| Notification queue | `/api/admin/notification-queue/*` | Yes | `admin` |
| Monitoring | `/api/monitoring/*` | Yes | `admin`/`super_admin` |
| Notification webhooks (provider callbacks) | `/api/webhooks/*` | No | Signature/API key validation |
| Notification webhooks (delivery stats) | `/api/webhooks/delivery/stats` | Yes | `admin`/`super_admin` |
| Public visitor | `/api/public/visitors/*` | No | Public |
| Directions | `/api/directions/estate` (GET) | No | Public |
| Directions (mutations) | `/api/directions/estate` (PUT) | Yes | `admin` |

2. **Observability pack**
   - Add structured logs for auth, refresh, CSRF, estate failures.
   - Propagate request/correlation IDs to client-visible error payloads.
   - **Improvements to implement:**
     - Ensure every 401/403/429 includes a consistent error code and requestId.
     - Add log context fields: user_id, estate_id, route, method, status.
   - **Remaining gaps to close:**
     - Structured refresh-failure logs for `/api/auth/refresh` recovery paths.
     - Standardized 401/403 payloads on legacy endpoints still returning ad-hoc errors.
     - End-to-end log correlation validation in staging (requestId propagation).

### P2 tasks
1. **Frontend UX hardening**
   - Centralize auth transitions; remove `window.location.href` where possible.
   - Add offline retry handling and user messaging for session expiry.
   - **Improvements implemented:**
     - Created a single auth state machine for login/refresh/estate-required.
     - Added a “recover from offline” banner and retry logic with backoff.
   - **Gaps closed:**
     - Replaced remaining `window.location.href` navigation in guard/resident dashboards, quick actions, and error boundaries.
     - Aligned session-expiry messaging across error handlers and toasts.

2. **Security review follow-ups**
   - Tighten CORS policy.
   - Verify cookie domain/path consistency.
   - Verify refresh token revocation persistence in production.
   - **Improvements implemented:**
     - Documented current CORS allowlist and added staging/prod-specific rules.
     - Audited cookie flags (Secure, SameSite, Domain, Path) across auth flows.
     - Added a Redis health check to confirm token revocation persistence.
     - Validated Redis-backed revocation health checks and emit fallback alerts for operators.

### P0 test suite (must pass before ship)

**Frontend unit**

* Axios client:

  * CSRF header injected
  * CSRF harvested from response
  * 401 refresh + retry once
  * 403 CSRF refresh + retry once (guarded)

**Backend integration**

* `/api/auth/login` sets cookies
* `/api/auth/me` works with cookies
* `/api/auth/refresh` rotates refresh token + resets cookies
* `/api/auth/csrf-token` returns token + header
* Protected mutation fails without CSRF then succeeds with CSRF
* Protected estate route returns `403 ESTATE_REQUIRED` for estate-less user

**E2E smoke**

* Login → dashboard loads
* First mutation succeeds
* Force expired access token → refresh + retry works
* Logout → `/me` returns 401
* Estate-less user → “estate required” UI shown

### P1 test suite (additions)

* Role matrix tests:

  * guard-only endpoints deny resident
  * admin-only endpoints deny guard/resident
* Cross-module consistency tests for estate-required behavior

### P2 test suite (ops)

* Rate limit behavior tests (refresh doesn’t 429 under normal concurrency)
* Logging verification (error codes appear as expected)
