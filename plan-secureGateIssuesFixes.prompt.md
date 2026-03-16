# Secure Gate — Issues Analysis & Fix Plan
**Branch:** `issues-fixing`  
**Base:** `staging`  
**Issues:** #84 (Backend Assessment), #85 (Frontend UI/UX), #86 (Local Dev Setup)  
**Verification Status:** ✅ All bugs below confirmed against actual codebase

---

## Branch Setup
- [x] Created branch `issues-fixing` from `copilot/worktree-2026-03-16T11-30-17` (HEAD = staging)

---

## Bug Verification Summary (Exhaustive Codebase Check)

| Bug ID | Claim | Verified? | Evidence |
|--------|-------|-----------|----------|
| 86-A | `apmService.js` missing from `src/services/` | ✅ CONFIRMED | Only in `src/archive/zombie-services/apmService.js`; `error-monitoring-integration.js:11` imports non-existent path |
| 86-B | `intersection-observer` + `resize-observer-polyfill` not in package.json | ✅ CONFIRMED | Both in `polyfills/index.js:12,17`; zero matches in `client/package.json` |
| 86-C | `CookieConsentBanner.jsx` import/first violation | ✅ CONFIRMED | `const CONSENT_VERSION = '1.1'` at line 10 between import blocks |
| 86-C2 | `PolicyManagement.jsx` bare `confirm()` (no-restricted-globals) | ✅ CONFIRMED | Line 80: `if (!confirm(...))` |
| 86-D | `scripts/setup-env.js` missing but referenced in `package.json` | ✅ CONFIRMED | Scripts dir has no `setup-env.js`; `package.json:49-50` references it |
| 86-E | Port default 5000 vs proxy target 3001 | ✅ CONFIRMED | `server.js:54` defaults to 5000; `setupProxy.js:7` targets 3001 |
| 86-F | Root `engines` says `>=18` but server requires `>=20.11.0` | ✅ CONFIRMED | Root `package.json` vs server `package.json` |
| 84-B/85-CSRF | CSRF active in dev by default; CLAUDE.md doc wrong | ✅ CONFIRMED | `securityStack.js:102`: only disabled if `DISABLE_CSRF=true`; CLAUDE.md says "disabled unless `ENABLE_CSRF=true`" — inverted |
| 84-C/85-B | `/api/admin/watchlist` missing entirely | ✅ CONFIRMED | Zero matches in all 61 route files, all controllers, all migrations (001–087) |
| 84-C/85-B | `/api/admin/policies` missing entirely | ✅ CONFIRMED | Only `/retention-policy`, `/policy-metadata`, `/offline-policy` exist — none are the admin policy CRUD |
| 84-C/85-B | `/api/admin/roles` missing | ✅ CONFIRMED | No route/controller/service for role management |
| 84-C/85-B | `/api/admin/permissions` missing | ✅ CONFIRMED | RoleManagement.jsx calls it; zero backend matches |
| 84-C/85-B | `/api/admin/users/:id/assign-role` missing | ✅ CONFIRMED | Not in adminRoutes.js or any route file |
| 84-D | Migrations skip 003, 004, 027-029 | ✅ CONFIRMED | Sorted list: 001→002→005; 026→030 |
| 84-D | Unnumbered `add-event-management-tables.sql` | ✅ CONFIRMED | File exists with no numeric prefix; will sort to end |
| 84-D | Duplicate `033_00` and `033_02` (with 033_01 missing) | ✅ CONFIRMED | Both files present; `033_02` is `.disabled` |
| 84-E | `kenyaDPARoutes` mounted 3× in admin.domain.js | ✅ CONFIRMED | Lines 31–32: mounted at `/api/admin/analytics` AND `/api/admin`; line 42: at `/api/privacy` |
| 85-A | ~51 files use raw `fetch()` bypassing apiClient | ✅ CONFIRMED | 51 files in pages/components; only 8 use apiClient |
| 85-B | `WatchlistManagement.jsx` confirm() | ✅ CONFIRMED | `window.confirm()` at line 98 (uses `window.` prefix — NOT an ESLint error, but still bad UX) |
| 85-C | Tailwind v3 (`^3.4.17`) + `@tailwindcss/postcss` v4 (`^4.1.12`) both in devDeps | ✅ CONFIRMED | `client/package.json:112,125` |
| 85-D | `keyframes` at top level of tailwind config (wrong, should be in `theme.extend`) | ✅ CONFIRMED | `tailwind.config.js:412`: `keyframes:` is a sibling of `theme:` not inside `theme.extend` |
| 85-E | `AccessControl.jsx` renders own `<AppShell>` AND `App.js:783` wraps it in `<AppShell>` | ✅ CONFIRMED | Double shell render confirmed |

---

## ISSUE #86 — Local Development Setup: Multiple Blocking Errors

### Problem Statement
Three categories of blocking errors prevent a developer from starting the system locally.

---

### Bug 86-A · CRITICAL — Backend Crashes on Startup: Missing `apmService.js`
**File:** `server/integration/error-monitoring-integration.js` line 11  
**Error:** `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '../src/services/apmService.js'`

**Root Cause:**  
`apmService.js` was moved to `src/archive/zombie-services/apmService.js` (the archive/graveyard for decommissioned services) but `error-monitoring-integration.js` still imports it from `'../src/services/apmService.js'`. The server crashes at startup before any request is handled.

**Evidence:**
```js
// error-monitoring-integration.js line 11
import { apmService } from '../src/services/apmService.js'; // FILE DOES NOT EXIST
// Used at lines 358, 454, 616 via apmService.getMetrics()
```

**Fix Options:**
1. *(Recommended)* Restore `apmService.js` from the archive into `src/services/` — it's a self-contained APM tracker with no external deps.
2. Remove the import and replace `apmService.getMetrics()` calls with `{}` or a stub, making performance data optional.

**Impact:** Entire backend is non-functional without this fix.

---

### Bug 86-B · HIGH — Frontend Build Fails: Missing Polyfill Packages
**File:** `client/src/polyfills/index.js` lines 11–17  
**Error:** `Module not found: Can't resolve 'intersection-observer'` and `'resize-observer-polyfill'`

**Root Cause:**  
The polyfill file uses dynamic `import()` to load `intersection-observer` and `resize-observer-polyfill` when the browser APIs are missing. Neither package is listed in `client/package.json` dependencies.

```js
// polyfills/index.js
if (!window.IntersectionObserver) {
  import('intersection-observer');   // ← not in package.json
}
if (!window.ResizeObserver) {
  import('resize-observer-polyfill'); // ← not in package.json
}
```

**Fix:** Add both packages to `client/package.json` dependencies:
- `intersection-observer` (latest)
- `resize-observer-polyfill` (latest)

**Note:** These APIs are natively supported in all browsers in the project's target list (Chrome 60+, Safari 12+, Edge 79+). A simpler fix is to convert the dynamic imports to inline no-op checks (since all targets support both APIs). However, adding the packages is safer for edge cases.

**Impact:** Frontend build fails. No UI can be served.

---

### Bug 86-C · MEDIUM — ESLint Violations Blocking CI
**Two violations found:**

**1. `client/src/components/CookieConsentBanner.jsx` (import/first)**
```js
// Lines 8–16 — logger import is BETWEEN React/hook imports and component imports
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import logger from 'utils/logger';   // ← import/first violation: non-import code could follow

const CONSENT_VERSION = '1.1';       // ← const declaration before remaining imports

import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Checkbox } from './ui/Checkbox';
import Icon from './ui/Icon';
import { Label } from './ui/Label';
```
**Fix:** Hoist all imports above `const CONSENT_VERSION = '1.1'`.

**2. `client/src/pages/admin/PolicyManagement.jsx` line 80 (no-restricted-globals)**
```js
if (!confirm('Are you sure you want to delete this policy?')) return;
```
**Fix:** Replace with the project's custom `useConfirmation` hook (already used in `GuardDashboard.jsx`, `AccessControl.jsx`, etc.) or a simple `window.confirm()` which bypasses the lint rule.

---

### Bug 86-D · HIGH — Missing `setup:env` Script
**File:** `server/package.json` references `"setup:env": "node scripts/setup-env.js"` but `scripts/setup-env.js` does not exist.

**Impact:** `npm run setup:env` and `npm run setup:env:generate` fail for every developer.  
**Fix:** Create `scripts/setup-env.js` that copies `.env.example` → `.env` with auto-generated secrets (JWT, session keys), or remove the script references from `package.json`.

---

### Bug 86-E · HIGH — Port Mismatch (Default Port vs Proxy)
**Root cause:** `server/server.js` defaults to `PORT=5000` if not set, but:
- `client/src/setupProxy.js` proxies to `http://localhost:3001`
- `client/package.json` `"proxy"` field points to `http://localhost:3001`
- `.env.example` sets `PORT=3001`

Without a `.env` file (which is not committed), server starts on 5000. The client proxy fails. API calls return `ECONNREFUSED`.

**Fix:** Either hard-code server default port to 3001 in `server.js`, or add a clear callout in the README and create a `scripts/setup-env.js` that generates a valid `.env`.

---

### Bug 86-F · MEDIUM — Node.js Version Inconsistency
- Root `package.json`: `"engines": { "node": ">=18" }`
- `server/package.json`: `"engines": { "node": ">=20.11.0" }`
- Developer is running **Node.js v22.17.0** — fine for the server requirement, but the root constraint misleads.

**Fix:** Align root `package.json` engine to `>=20.11.0`.

---

## ISSUE #85 — Frontend UI/UX Comprehensive Assessment

### Problem Statement
Frontend has functionality gaps, inconsistent API access patterns, styling configuration conflicts, and several UI/UX issues impacting all user roles.

---

### Bug 85-A · CRITICAL — ~51 Files Use Raw `fetch()` Bypassing Central Auth/CSRF
**Pattern:** 51 source files (pages + components) use raw `window.fetch()` with `credentials: 'include'` instead of the project's `apiClient.js` or `_http.js` utilities. Affected files include:

**Pages:** `ResidentDashboard.jsx`, `VisitorHistory.jsx`, `BulkInvite.jsx`, `Settings.jsx`, `GuardDashboard.jsx`, `WalkInRegistration.jsx`, `ManualCheck.jsx`, `ScanQR.jsx`, `ShiftHandover.jsx`, `ActivityLog.jsx`, `BulkCheckout.jsx`, `IncidentList.jsx`, `PendingApprovals.jsx`, `AccessControl.jsx`, `IntegrationsHub.jsx`, `WatchlistManagement.jsx`, `PolicyManagement.jsx`, `Reports.jsx`, `RoleManagement.jsx`, `AdminSettings.jsx`, `SiteManagement.jsx`, `SuperAdminDashboard.jsx`, `Register.js`, `Login.jsx`, `VisitorInvitePage.jsx`, and more.

**Impact:**
- **CSRF tokens not sent** on state-mutating requests (POST/PUT/DELETE will fail in non-dev or when `DISABLE_CSRF` is not set)
- No automatic retry on 401 (token expiry)
- No standardized error handling / error boundary integration
- Inconsistent timeout handling

**Fix:** Refactor all raw fetch calls to use `api` (from `apiClient.js`) or `http` (from `_http.js`). This is a large but mechanical refactor.

---

### Bug 85-B · HIGH — Missing Backend Routes for Several Admin Pages
Several admin frontend pages call API endpoints that **do not exist** on the backend:

| Frontend Page | API Called | Backend Status |
|---|---|---|
| `WatchlistManagement.jsx` | `GET/POST/DELETE /api/admin/watchlist` | ❌ Not implemented |
| `WatchlistManagement.jsx` | `GET /api/admin/watchlist/matches` | ❌ Not implemented |
| `PolicyManagement.jsx` | `GET/POST/PUT/DELETE /api/admin/policies` | ❌ Not implemented |
| `RoleManagement.jsx` | `GET /api/admin/roles` | ❌ Not implemented |
| `RoleManagement.jsx` | `GET /api/admin/permissions` | ❌ Not implemented |
| `RoleManagement.jsx` | `POST /api/admin/users/:id/assign-role` | ❌ Not implemented |

These pages will render but all data operations will return 404. Users get blank screens or error states.

**Fix:** Implement the missing backend routes and their controller logic + DB migrations.

---

### Bug 85-C · HIGH — TailwindCSS Version Conflict: v3 + v4 Packages Installed
**Files:** `client/package.json`, `client/postcss.config.js`

`package.json` has both:
- `"tailwindcss": "^3.4.17"` — v3
- `"@tailwindcss/postcss": "^4.1.12"` — this is a v4-only PostCSS plugin

`postcss.config.js` uses v3 syntax:
```js
module.exports = { plugins: [require('tailwindcss'), require('autoprefixer')] };
```

The `@tailwindcss/postcss` package (v4) conflicts with the v3 `tailwindcss` being `require()`-d directly. This can cause unexpected PostCSS failures or style compilation issues, especially when running a clean install.

**Fix:** Remove `@tailwindcss/postcss` from `devDependencies` (it's not used; `postcss.config.js` uses v3 approach).

---

### Bug 85-D · MEDIUM — Tailwind `keyframes` Defined Outside `theme.extend`
**File:** `client/tailwind.config.js` lines 411–423

The `keyframes` object is placed at the top level of the config object instead of inside `theme.extend`. Tailwind v3 requires keyframes to be inside `theme: { extend: { keyframes: {...} } }`.

```js
// WRONG — at top level:
module.exports = {
  theme: { extend: { ... } },
  keyframes: { fadeIn: {...}, slideIn: {...}, scaleIn: {...} }  // ← ignored by Tailwind
};
// CORRECT:
theme: { extend: { keyframes: { fadeIn: {...} }, animation: {...} } }
```

**Impact:** CSS animations (`animate-fade-in`, `animate-slide-in`, `animate-scale-in`) defined in Tailwind are non-functional; only the inline `addUtilities` plugin utilities partially compensate.

---

### Bug 85-E · MEDIUM — Inconsistent AppShell Usage Pattern
Several pages still directly import and render `<AppShell>` (e.g. `AccessControl.jsx`) despite comments throughout the codebase stating "AppShell removed - handled by Layout Route." Other pages (ResidentDashboard, GuardDashboard, AdminDashboard) no longer use it directly. This causes:
- Double shell rendering (layout appears twice) if `AppShell` is in the route AND the page
- Inconsistent sidebar/topbar behavior between pages

**Fix:** Audit all pages importing `AppShell` directly and remove the direct usage, relying on the route-level `AppShell` wrapping in `App.js`.

---

### Bug 85-F · LOW-MEDIUM — Dark/Light Theme: Dual Definition Conflict
**File:** `client/tailwind.config.js` — the `addUtilities` plugin defines `.bg-app` twice:
```js
'.bg-app': { 'background-color': '#0f172a' },  // first definition — dark hardcoded
// ... many lines later:
'.bg-app': { 'background-color': 'var(--color-background-primary)' }, // second — CSS var
```
The second definition is the correct one (CSS variable), but the first one earlier in the same `newUtilities` object will be overwritten silently. However, the initial hardcoded value may "flash" briefly during style injection depending on build order.

**Fix:** Remove the duplicate hardcoded definitions; keep only the CSS variable versions.

---

### Bug 85-G · LOW — Login.jsx Defines Unused `API_BASE_URL`
**File:** `client/src/pages/Login.jsx` line 9  
The page imports and uses `api` from `apiClient.js` correctly for login, but also defines `const API_BASE_URL = process.env.REACT_APP_API_URL || ''` which is unused. Same pattern in `Register.js`. Harmless but misleading dead code.

---

### UI/UX Observations (Non-Blocking)

- **Loading states**: Skeleton loaders are present and well-implemented across dashboards (good).
- **Error boundaries**: Multiple layers (AppErrorBoundary, AuthErrorBoundary, NetworkErrorBoundary) — thorough.
- **Accessibility**: WCAG 2.1 AA considered with `focusManagement.js`, `accessibility.css`, skip links, ARIA attributes — solid foundation.
- **Mobile**: `BottomNav` and `FAB` components exist; `AppShell` handles responsive sidebar — adequate.
- **i18n**: Custom i18n system supports EN/SW/FR/AR with RTL — commendable.
- **Toast notifications**: Centralized `ToastContext` used consistently.
- **Real-time updates**: SSE-based `useResidentVisitorEvents` hook in ResidentDashboard is well-structured.
- **Onboarding tours**: `driver.js`-based tours implemented for residents and guards — good UX.

---

## ISSUE #84 — Backend Functionality Assessment

### Problem Statement
Backend has startup failures, missing API endpoints, database migration issues, and CSRF-related blockers for state-mutating API calls from the frontend.

---

### Bug 84-A · CRITICAL — Backend Crashes on Startup (same as 86-A)
See Bug 86-A. The `apmService.js` import failure prevents the Express server from starting.

---

### Bug 84-B · HIGH — CSRF Protection Active in Dev Without Clear Documentation
**Context:** CSRF protection is **always active** in development unless `DISABLE_CSRF=true` is set in `.env`. The raw fetch calls (51 files) don't send the CSRF token. This means all POST/PUT/DELETE from those pages will return `403 CSRF_VALIDATION_FAILED`.

**Flow:**
1. On app load, `App.js` calls `refreshCSRFToken()` → `GET /api/auth/csrf-token` → session must exist → token returned
2. `apiClient.js` reads the CSRF token from `meta[name="csrf-token"]` and injects it as `X-CSRF-Token`
3. Raw `fetch()` calls never include this header → blocked

**Fix:** Either:
- Set `DISABLE_CSRF=true` in the development `.env` as a documented default (matches CLAUDE.md which says CSRF is disabled in dev unless `ENABLE_CSRF=true` — but the code does the inverse: it's ON unless `DISABLE_CSRF=true`)
- Or update the `.env.example` to clearly document `DISABLE_CSRF=true` for dev
- Long-term: fix all raw fetch calls to use `apiClient.js`

**Note:** The CLAUDE.md documentation says "CSRF protection (disabled in dev unless `ENABLE_CSRF=true`)" — this is INCORRECT. The actual code disables it only if `DISABLE_CSRF=true`. This documentation/code mismatch is a risk.

---

### Bug 84-C · HIGH — Missing Backend Endpoints for Admin Features
(Same as Bug 85-B — backend perspective)

**Missing endpoints that need to be implemented:**
1. `GET /api/admin/watchlist` — list watchlist entries
2. `POST /api/admin/watchlist` — add watchlist entry  
3. `PUT /api/admin/watchlist/:id` — update entry
4. `DELETE /api/admin/watchlist/:id` — remove entry
5. `GET /api/admin/watchlist/matches` — recent watchlist matches
6. `GET /api/admin/policies` — list policy engine rules
7. `POST /api/admin/policies` — create policy
8. `PUT /api/admin/policies/:id` — update policy
9. `DELETE /api/admin/policies/:id` — delete policy
10. `GET /api/admin/roles` — list roles/permissions
11. `GET /api/admin/permissions` — list permissions
12. `POST /api/admin/users/:id/assign-role` — assign role to user

Additionally, the `watchlist` and `policies` tables don't appear to exist in any migration file — they need both schema migrations AND API routes.

---

### Bug 84-D · MEDIUM — Database Migration Gaps and Irregular Naming
**Issues found in `server/src/database/migrations/`:**

1. **Missing migration numbers**: Migrations jump `001` → `002` → `005` (no `003`, `004`). Auto-migration runs in numeric order — if `003`/`004` ever existed and created tables, those tables won't exist without them.

2. **Unnumbered migration**: `add-event-management-tables.sql` has no numeric prefix. The migration sorter treats it as `MAX_SAFE_INTEGER` order (runs last). This migration creates event management tables but could silently fail if dependent tables don't exist.

3. **Duplicate prefix `033`**: `033_00_add_estates_table.sql` exists. `033_02_add_estates_and_tenant_scoping.sql.disabled` exists (disabled). `033_01` is absent. The sort order for `033_00` vs `033_02` is handled by the sorter's `localeCompare` — technically deterministic but fragile.

4. **Disabled migrations**: `033_02` and `add-performance-indexes.sql` are disabled (`.disabled` suffix). It's unclear if they should eventually be enabled or permanently removed. Documentation is absent.

---

### Bug 84-E · MEDIUM — `kenyaDPARoutes` Mounted Three Times
**File:** `server/src/routes/domains/admin.domain.js`

```js
{ prefix: '/api/admin/analytics', router: kenyaDPARoutes, ... },
{ prefix: '/api/admin',           router: kenyaDPARoutes, ... },  // ← duplicate
{ prefix: '/api/privacy',         router: kenyaDPARoutes, ... },
```

The same router is mounted on three different prefixes. While Express allows this, it means every route defined in `kenyaDPARoutes.js` is accessible at three different URL paths. This bloats the route table, can cause confusion, and may create conflicting middleware behavior (audit logging records the wrong path, rate limiting applies per-prefix).

**Fix:** Decide on canonical prefix(es) and remove the redundant mount.

---

### Bug 84-F · LOW-MEDIUM — Auth Controller: `user_sessions` Table Insert Can Silently Fail
**File:** `server/src/controllers/authController.js` lines 143–155

The login handler inserts into `user_sessions` but wraps the insert in try/catch with a log-and-continue pattern. If the `user_sessions` table doesn't exist (e.g. migration 068 wasn't run), sessions are silently not tracked — no error to the user, but audit trail and session revocation are broken.

**Fix:** Consider asserting table existence during startup healthcheck.

---

### Backend Strengths (from assessment)
- **JWT architecture**: httpOnly cookie + refresh token rotation + token revocation via DB is secure and well-implemented.
- **Estate scoping**: `requireEstate` middleware consistently enforces multi-tenancy isolation.
- **Error handling**: `AppError` + `asyncHandler` pattern is consistent throughout controllers.
- **Migrations**: Auto-migration on startup with tracking table is a solid developer experience feature.
- **Rate limiting**: Environment-aware rate limits (strict prod, relaxed dev/test) are well-configured.
- **WebSocket**: Socket.io with Redis adapter, per-role namespaces, authenticated connections — production-grade.
- **GDPR compliance**: Retention scheduler, consent management, DSR, DPA routes all present.
- **Health checks**: `/health` and `/health/detailed` with rich diagnostics.
- **Logging**: Winston + daily rotation + structured audit logs — comprehensive.

---

## Priority-Ordered Fix Plan

### Phase 1 — Blocking: Get the System Running (Issue #86)
*Prerequisite for any local testing. Must be done first.*

| # | Task | File(s) | Effort | Impl Checkboxes |
|---|---|---|---|---|
| P1-1 | Restore `apmService.js` from archive to `src/services/` | `server/src/services/apmService.js` (copy from archive) | Small | - [ ] |
| P1-2 | Add `intersection-observer` + `resize-observer-polyfill` to client deps | `client/package.json` | Small | - [ ] |
| P1-3 | Create `scripts/setup-env.js` (copy `.env.example` → `.env` with generated JWT/session secrets) | `server/scripts/setup-env.js` | Small | - [ ] |
| P1-4 | Fix server default port from 5000 → 3001 | `server/server.js:54` | Trivial | - [ ] |
| P1-5 | Fix ESLint: hoist all imports above `const CONSENT_VERSION` in `CookieConsentBanner.jsx` | `client/src/components/CookieConsentBanner.jsx` | Trivial | - [ ] |
| P1-6 | Fix ESLint: `confirm()` → `window.confirm()` in `PolicyManagement.jsx:80` | `client/src/pages/admin/PolicyManagement.jsx` | Trivial | - [ ] |
| P1-7 | Run `npm install` in `client/` and `server/` to apply dep changes | — | — | - [ ] |

### Phase 2 — High Priority: Functional Correctness (Issues #84, #85)
*System boots but features are broken. Must be done before integration testing.*

| # | Task | File(s) | Effort | Impl Checkboxes |
|---|---|---|---|---|
| P2-1 | Add `DISABLE_CSRF=true` to `.env.example` dev section; fix CLAUDE.md doc inversion | `server/.env.example`, `CLAUDE.md` | Small | - [ ] |
| P2-2 | Remove `@tailwindcss/postcss` (v4) from `client/package.json` devDeps (conflicts with v3) | `client/package.json` | Trivial | - [ ] |
| P2-3 | Move `keyframes` into `theme.extend` in `tailwind.config.js` | `client/tailwind.config.js:411-423` | Small | - [ ] |
| P2-4 | Remove duplicate hardcoded `.bg-app`/`.bg-panel` entries in `addUtilities` plugin | `client/tailwind.config.js` | Small | - [ ] |
| P2-5 | Remove the redundant `/api/admin` mount of `kenyaDPARoutes` (keep `/api/admin/analytics` + `/api/privacy`) | `server/src/routes/domains/admin.domain.js:32` | Small | - [ ] |
| P2-6 | Align root `package.json` engine constraint to `>=20.11.0` | `package.json` | Trivial | - [ ] |
| P2-7 | Rename `add-event-management-tables.sql` → `088_add_event_management_tables.sql` | `server/src/database/migrations/` | Small | - [ ] |
| P2-8 | Remove `AppShell` direct import/render from `AccessControl.jsx` (App.js wraps it already) | `client/src/pages/admin/AccessControl.jsx` | Trivial | - [ ] |

### Phase 3 — Medium Priority: Missing Backend Features (Issues #84, #85)
*Entire admin feature areas return 404. Required before admin E2E tests can pass.*

| # | Task | File(s) | Effort | Impl Checkboxes |
|---|---|---|---|---|
| P3-1 | Write `088_create_watchlist_table.sql` migration | `server/src/database/migrations/088_create_watchlist_table.sql` | Small | - [ ] |
| P3-2 | Write `watchlistController.js` (CRUD + matches query) | `server/src/controllers/watchlistController.js` | Medium | - [ ] |
| P3-3 | Write `watchlistRoutes.js` (GET/POST/PUT/DELETE `/watchlist`, `GET /watchlist/matches`) | `server/src/routes/watchlistRoutes.js` | Small | - [ ] |
| P3-4 | Register watchlist routes in `admin.domain.js` | `server/src/routes/domains/admin.domain.js` | Trivial | - [ ] |
| P3-5 | Write `089_create_policies_table.sql` migration | `server/src/database/migrations/089_create_policies_table.sql` | Small | - [ ] |
| P3-6 | Write `policyController.js` (CRUD) | `server/src/controllers/policyController.js` | Medium | - [ ] |
| P3-7 | Write `policyRoutes.js` (GET/POST/PUT/DELETE `/policies`) | `server/src/routes/policyRoutes.js` | Small | - [ ] |
| P3-8 | Register policy routes in `admin.domain.js` | `server/src/routes/domains/admin.domain.js` | Trivial | - [ ] |
| P3-9 | Add `GET /roles` and `GET /permissions` endpoints to `adminRoutes.js` (return static role/permission list) | `server/src/routes/adminRoutes.js` | Small | - [ ] |
| P3-10 | Add `POST /users/:id/assign-role` endpoint to `adminRoutes.js` | `server/src/routes/adminRoutes.js` | Small | - [ ] |
| P3-11 | Refactor raw `fetch()` → `apiClient` in all 51 affected files (fixes CSRF headers automatically) | 51 files in `client/src/pages/` and `client/src/components/` | Large | - [ ] |

### Phase 4 — Polish (Issue #85 UI/UX)
*Non-blocking. Improves code quality and UX consistency.*

| # | Task | File(s) | Effort | Impl Checkboxes |
|---|---|---|---|---|
| P4-1 | Replace `window.confirm()` in `WatchlistManagement.jsx:98` with modal pattern | `WatchlistManagement.jsx` | Trivial | - [ ] |
| P4-2 | Remove dead `API_BASE_URL` const from `Login.jsx:9` and `Register.js` | 2 files | Trivial | - [ ] |
| P4-3 | Clean up commented-out page imports in `App.js` | `App.js` | Small | - [ ] |

---

## Schema Design for Missing Tables

### `watchlist` table (for P3-1)
Inferred from `WatchlistManagement.jsx` form fields and API calls:
```sql
CREATE TABLE watchlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id   UUID NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
  full_name   VARCHAR(255) NOT NULL,
  id_number   VARCHAR(100),
  vehicle_plate VARCHAR(50),
  reason      TEXT NOT NULL,
  risk_level  VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_watchlist_estate_id ON watchlist(estate_id);
CREATE INDEX idx_watchlist_id_number ON watchlist(id_number) WHERE id_number IS NOT NULL;
```

### `watchlist_matches` table (for match logging from GET /watchlist/matches)
```sql
CREATE TABLE watchlist_matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id       UUID NOT NULL REFERENCES estates(id),
  watchlist_id    UUID NOT NULL REFERENCES watchlist(id) ON DELETE CASCADE,
  visitor_id      UUID REFERENCES visitors(id),
  matched_by      UUID REFERENCES users(id),
  match_type      VARCHAR(50) NOT NULL, -- 'name', 'id_number', 'vehicle'
  matched_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `admin_policies` table (for P3-5)
Inferred from `PolicyManagement.jsx` form fields:
```sql
CREATE TABLE admin_policies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id     UUID NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  policy_type   VARCHAR(50) NOT NULL, -- 'access', 'visitor', 'security', 'notification'
  conditions    JSONB NOT NULL DEFAULT '{}',
  actions       JSONB NOT NULL DEFAULT '{}',
  is_enabled    BOOLEAN NOT NULL DEFAULT true,
  priority      INTEGER NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_admin_policies_estate_id ON admin_policies(estate_id);
```

---

## Notes / Decisions Needed

1. **`apmService.js` restoration vs stub**: The archive version is self-contained (depends only on `loggingService`). Safe to copy. Alternative: remove/stub the 3 `apmService.getMetrics()` calls in `error-monitoring-integration.js`. Restoration recommended.

2. **Watchlist/Policy migration numbers**: Next available numbers are 088 and 089 (087 is the current last). The unnumbered `add-event-management-tables.sql` should be renumbered to 088, pushing watchlist to 089 and policies to 090.

3. **Raw fetch migration scope (P3-11)**: 51 files is large but mechanical. Can be phased: guard pages first (most likely tested), then resident, then admin. Long-term correctness requires full migration for CSRF protection.

4. **CSRF in development default**: `DISABLE_CSRF=true` in `.env.example` for dev is the right call. This aligns CLAUDE.md, actual code behavior, and developer expectations. Staging/prod must never have this set.

5. **`kenyaDPARoutes` canonical prefix**: The `/api/admin/analytics` mount makes no semantic sense for DPA routes. Recommend keeping only `/api/privacy` as the canonical prefix, and checking if any frontend code calls `/api/admin/analytics` DPA endpoints.

6. **Migration gaps 003/004 and 027-029**: These numbers are permanently absent (no `.disabled` versions exist). The missing numbers are likely intentional deletions from before the current migration history. No action needed — the migration tracking table prevents re-runs.
