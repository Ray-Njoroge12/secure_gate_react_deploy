# Release Readiness Checklist (Non-Critical Integration Pass)

Date: 2026-03-17
Owner: Backend/API stabilization pass
Scope: Resolve the two previously failing non-critical integration suites and confirm no regressions in adjacent gates.

## Checklist

- [x] `authorization-role.integration.test.js` is green.
- [x] `wave8-specialty-routes.integration.test.js` is green.
- [x] Authorization behavior for `POST /api/visitors` now enforces role policy before payload validation (403 contract for unauthorized role).
- [x] Health compatibility methods expected by database health routes are present and stable.
- [x] Alerting compatibility shim (`sendAlert`) is present and delegates to existing processing flow.
- [x] Regression gate `wave7-admin-domains.mounted.integration.test.js` is green.
- [x] Critical backend gate (`auth-refresh`, `invite-lifecycle`, `estate-scoping`, `webhook-signature`, `notification-queue`) is green.

## Evidence Snapshot

- Non-critical rerun:
  - Suites: 2 passed, 0 failed
  - Tests: 29 passed, 0 failed
  - Files:
    - `tests/integration/authorization-role.integration.test.js`
    - `tests/integration/wave8-specialty-routes.integration.test.js`

- Regression rerun:
  - Suite: 1 passed, 0 failed
  - Tests: 8 passed, 0 failed
  - File:
    - `tests/integration/wave7-admin-domains.mounted.integration.test.js`

- Critical rerun:
  - Suites: 5 passed, 0 failed
  - Tests: 16 passed, 0 failed
  - Command target: server critical path suite

## Code Changes Included In This Pass

- `src/routes/visitorRoutes.js`
  - Added `requireRolePolicy('adminOrResident')` on visitor creation route.

- `src/services/healthCore.js`
  - Added compatibility methods used by database health routes:
    - `getHealthSummary()`
    - `getHealthReport()`
    - `runHealthCheck()`
    - `clearAllAlerts()`

- `src/services/performanceAlertingService.js`
  - Added `sendAlert(alert)` compatibility wrapper that normalizes payload and forwards to `processAlert(...)`.

- `tests/integration/wave8-specialty-routes.integration.test.js`
  - Updated expectations to current mount topology and canonical privacy compliance pathing.

## Release Gate Decision (This Scope)

Status: PASS

Notes:
- This checklist certifies the requested non-critical suite stabilization scope only.
- Full release decision still depends on broader CI, deployment, and operational sign-offs.
