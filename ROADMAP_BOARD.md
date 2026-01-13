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
- **Partially implemented:** Most routes use `authenticateToken` + role checks; policy map added and enforcement tests now cover guard/admin/resident gates plus admin-only notification queue and directions updates, but more endpoints still need coverage. ⚠️

**P1: Observability**
- **Partially implemented:** Logging service and audit middleware exist; CSRF failures emit structured security logs with request IDs, auth rate-limit events are logged, and auth/estate logs include estate context, but coverage is still incomplete. ⚠️

**P2: Frontend UX hardening**
- **Not started:** Replace redirect-based auth transitions and add offline retry handling. ⛔

**P2: Security review follow-ups**
- **Not started:** CORS tightening, cookie policy consistency, and refresh token persistence verification in prod. ⛔

## Remaining work plan (edits to complete tasks)

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
   - **Improvements to implement:**
     - Add a shared helper for role checks to reduce per-route drift.

#### Authorization policy map (current)
| Endpoint group | Example routes | Required auth | Required roles |
| --- | --- | --- | --- |
| Auth | `/api/auth/login`, `/api/auth/refresh`, `/api/auth/me` | Mixed | Public for login/register, authenticated for `/me`, `/logout` |
| Estate onboarding | `/api/estates/available`, `/api/estates/select` | Mixed | Public list, authenticated select |
| Admin core | `/api/admin/users`, `/api/admin/guards`, `/api/admin/visitors` | Yes | `admin` |
| Admin analytics | `/api/admin/analytics/*` | Yes | `admin` |
| Guard management | `/api/guards/*` | Yes | `admin`/`guard` per route |
| Resident features | `/api/resident/*` | Yes | `resident`/`admin` |
| Visitor management | `/api/visitors/*` | Yes | Estate-scoped + role by route |
| Event management | `/api/events/*` | Yes | `admin`/`guard`/`resident` per route |
| Notification queue | `/api/admin/notification-queue/*` | Yes | `admin` |
| Monitoring | `/api/monitoring/*` | Yes | `admin`/`super_admin` |
| Public visitor | `/api/public/visitors/*` | No | Public |
| Directions | `/api/directions/estate` (GET) | No | Public |
| Directions (mutations) | `/api/directions/estate` (PUT) | Yes | `admin` |

2. **Observability pack**
   - Add structured logs for auth, refresh, CSRF, estate failures.
   - Propagate request/correlation IDs to client-visible error payloads.
   - **Improvements to implement:**
     - Ensure every 401/403/429 includes a consistent error code and requestId.
     - Add log context fields: user_id, estate_id, route, method, status.

### P2 tasks
1. **Frontend UX hardening**
   - Centralize auth transitions; remove `window.location.href` where possible.
   - Add offline retry handling and user messaging for session expiry.
   - **Improvements to implement:**
     - Create a single auth state machine for login/refresh/estate-required.
     - Add a “recover from offline” banner and retry logic with backoff.

2. **Security review follow-ups**
   - Tighten CORS policy.
   - Verify cookie domain/path consistency.
   - Verify refresh token revocation persistence in production.
   - **Improvements to implement:**
     - Document current CORS allowlist and add staging/prod-specific rules.
     - Audit cookie flags (Secure, SameSite, Domain, Path) across auth flows.
     - Add a Redis health check to confirm token revocation persistence.

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
