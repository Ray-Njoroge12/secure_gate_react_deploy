# Backend Cleanup Tracking Plan

Date: 2026-03-22
Status: In Progress

## Phase Status Snapshot

- Phase 1: Completed
- Phase 2: Completed
- Phase 3: In Progress (continued hardening)
- Phase 4: Completed
- Phase 5: Completed
- Phase 6: Pending

## Phase 3 Continuation (2026-03-22)

### Completed in this slice

1. Removed hardcoded admin credential defaults from:
- `secure-gate-access/server/scripts/reset-admin-password.js`
- `secure-gate-access/server/scripts/setup-admin.js`

2. Hardened super-admin setup/provisioning scripts by replacing static credentials with:
- CLI argument override
- Environment variable override
- Generated one-time strong fallback

Files:
- `secure-gate-access/server/scripts/setup-super-admin.js`
- `secure-gate-access/server/scripts/create-super-admin.js`

3. Removed hardcoded local DB password from:
- `secure-gate-access/server/scripts/create-db-setup.js`

4. Validation:
- `node --check` passed for all hardened scripts
- `npm run test:critical` passed (5 suites, 16 tests)

### Remaining for Phase 3 closure

1. Medium-risk non-test debug/demo scripts still contain static test credentials (not production secrets, but undesirable literals):
- `secure-gate-access/server/scripts/comprehensive-demo.js`
- `secure-gate-access/server/scripts/verify-masking.js`
- `secure-gate-access/server/scripts/verify-reveal.js`
- `secure-gate-access/server/scripts/verify-privacy.js`
- `secure-gate-access/server/scripts/verify-resident-reveal.js`
- `secure-gate-access/server/scripts/debug-guard-data.js`
- `secure-gate-access/server/scripts/debug_guard_history_live.js`
- `secure-gate-access/server/scripts/debug-manual-check.js`
- `secure-gate-access/server/scripts/repro_revoke.js`
- `secure-gate-access/server/scripts/performance-benchmark.js`
- `secure-gate-access/server/scripts/verify_guard_features.js`

2. Environment hardening warnings remain in local/test profile:
- Weak `JWT_SECRET`
- Weak `JWT_REFRESH_SECRET`
- Missing SMTP auth vars when SMTP is enabled

## Next Actions

1. Convert medium-risk debug/demo scripts to env/CLI credential injection.
2. Re-run targeted secret-pattern sweep after remediations.
3. Re-run gates:
- `npm run validate:env`
- `npm run test:critical`
- `npm run test:security:audit`
