# Backend Remediation Roadmap (Validated by Dynamic Testing)

Date: 2026-03-18  
Scope: secure-gate-access/server  
Mode: Remediation planning only (no production fixes applied in this artifact)

## 1. Purpose

This roadmap translates the validated backend findings into a sequenced remediation plan with measurable completion criteria, test gates, and rollback controls.

Inputs used:

- Static + dynamic evidence in [documentation/guides/backend-deep-dive-analysis-2026-03-18.md](backend-deep-dive-analysis-2026-03-18.md)
- Dynamic verification suites:
  - [secure-gate-access/server/tests/integration/backend-deep-dive.dynamic-verification.integration.test.js](../../secure-gate-access/server/tests/integration/backend-deep-dive.dynamic-verification.integration.test.js#L1)
  - [secure-gate-access/server/tests/unit/setupRoutes.security.dynamic.test.js](../../secure-gate-access/server/tests/unit/setupRoutes.security.dynamic.test.js#L1)
  - [secure-gate-access/server/tests/unit/adminBulkEstateScope.dynamic.test.js](../../secure-gate-access/server/tests/unit/adminBulkEstateScope.dynamic.test.js#L1)
  - [secure-gate-access/server/tests/unit/tokenService.test.js](../../secure-gate-access/server/tests/unit/tokenService.test.js#L364)
  - [secure-gate-access/server/tests/unit/mfaRoutes.test.js](../../secure-gate-access/server/tests/unit/mfaRoutes.test.js#L1)

## 2. Remediation Objectives

1. Remove externally reachable high-impact control-plane attack paths.
2. Enforce tenant isolation consistently at route and controller boundaries.
3. Eliminate security-critical defect paths in token and MFA flows.
4. Align delivery pipelines and migration semantics to reduce release integrity risk.
5. Institutionalize permanent regression gates for all validated findings.

## 3. Prioritized Workstream Plan

## 3.1 Phase 0: Emergency Containment (0 to 24 hours)

Goal: Reduce immediate exploitability without waiting for broad refactors.

| ID | Action | Primary Files | Verification Gate | Rollback |
|---|---|---|---|---|
| P0-001 | Disable setup endpoints by default in non-bootstrap runtime | [secure-gate-access/server/src/routes/domains/auth.domain.js](../../secure-gate-access/server/src/routes/domains/auth.domain.js#L1), [secure-gate-access/server/src/routes/setup.routes.js](../../secure-gate-access/server/src/routes/setup.routes.js#L1) | `POST /api/setup/migrate` and `POST /api/setup/seed` return 404/403 without bootstrap flag | Re-enable flag only in controlled maintenance window |
| P0-002 | Remove static fallback for setup secret; require explicit high-entropy secret | [secure-gate-access/server/src/routes/setup.routes.js](../../secure-gate-access/server/src/routes/setup.routes.js#L18) | Dynamic test must fail when secret missing and pass only with configured secret | Revert to maintenance-only mode if bootstrap blocked |
| P0-003 | Temporarily gate public regenerate-qr endpoint behind auth + ownership guard | [secure-gate-access/server/src/routes/visitorRoutes.js](../../secure-gate-access/server/src/routes/visitorRoutes.js#L594), [secure-gate-access/server/src/controllers/qrCodeController.js](../../secure-gate-access/server/src/controllers/qrCodeController.js#L166) | Unauthenticated request receives 401/403 | Feature flag rollback to previous route in emergency only |
| P0-004 | Remove visitor token material from regenerate response payload | [secure-gate-access/server/src/controllers/qrCodeController.js](../../secure-gate-access/server/src/controllers/qrCodeController.js#L210) | Response schema check: no visitor token fields | Roll back payload change with security waiver and short TTL |
| P0-005 | Restrict `/api/qr/analytics` and `/api/qr/cleanup` to admin + estate context | [secure-gate-access/server/src/routes/qrCodeRoutes.js](../../secure-gate-access/server/src/routes/qrCodeRoutes.js#L67) | Resident token receives 403 | Route-level feature toggle to safe admin-only default |

Exit criteria:

1. All P0 actions merged and deployed to staging.
2. Dynamic verification rerun shows all former exposure paths blocked.
3. Security sign-off recorded with timestamp and release artifact.

## 3.2 Phase 1: Tenant and Identity Hardening (1 to 3 days)

Goal: Correct cross-tenant and auth lifecycle inconsistencies.

| ID | Action | Primary Files | Validation |
|---|---|---|---|
| P1-001 | Enforce `requireEstateContextForAdmin` on admin bulk approval/rejection routes | [secure-gate-access/server/src/routes/adminRoutes.js](../../secure-gate-access/server/src/routes/adminRoutes.js#L489) | Requests without estate context rejected before controller execution |
| P1-002 | Remove caller-provided `estateId` fallback path from bulk-approve/reject controller logic | [secure-gate-access/server/src/controllers/adminController.js](../../secure-gate-access/server/src/controllers/adminController.js#L403) | Controller queries always use trusted request estate context |
| P1-003 | Fix token revocation catch-path scope bug | [secure-gate-access/server/src/services/tokenService.js](../../secure-gate-access/server/src/services/tokenService.js#L327) | Redis failure simulation no longer throws `decoded is not defined` |
| P1-004 | Align MFA disable password verification contract | [secure-gate-access/server/src/routes/mfaRoutes.js](../../secure-gate-access/server/src/routes/mfaRoutes.js#L252), [secure-gate-access/server/src/services/userService.js](../../secure-gate-access/server/src/services/userService.js#L343) | Route passes correct arguments and negative/positive password checks are deterministic |
| P1-005 | Normalize sensitive error responses to avoid internal error leakage | [secure-gate-access/server/src/routes/setup.routes.js](../../secure-gate-access/server/src/routes/setup.routes.js#L137), [secure-gate-access/server/src/controllers/adminController.js](../../secure-gate-access/server/src/controllers/adminController.js#L427) | Error payloads do not expose raw internal exception messages |

Exit criteria:

1. All P1 items have unit and integration tests.
2. No high-severity findings remain reproducible in dynamic suite.
3. Threat model update approved by security reviewer.

## 3.3 Phase 2: Delivery and Data-Plane Integrity (3 to 7 days)

Goal: Remove migration and schema authority drift risks.

| ID | Action | Primary Files | Validation |
|---|---|---|---|
| P2-001 | Align CI migration execution with runtime up-only semantics | [.github/workflows/ci.yml](../../.github/workflows/ci.yml#L107), [secure-gate-access/server/src/services/migrationService.js](../../secure-gate-access/server/src/services/migrationService.js#L24) | CI migration job mirrors runtime parser behavior |
| P2-002 | Enforce migration lint rule blocking destructive down statements in CI forward path | [secure-gate-access/server/src/database/migrations/001_initial_schema.sql](../../secure-gate-access/server/src/database/migrations/001_initial_schema.sql#L234) | Pipeline fails when forward run would execute down SQL |
| P2-003 | Reduce startup schema bootstrap drift by consolidating authority into migration layer | [secure-gate-access/server/src/database/db.enhanced.js](../../secure-gate-access/server/src/database/db.enhanced.js#L223) | Startup no longer introduces schema beyond explicit migrations |

Exit criteria:

1. Staging and CI migration execution are semantically equivalent.
2. Recovery runbook tested from clean database snapshot.
3. No schema drift introduced in startup path.

## 3.4 Phase 3: Regression Shield and Operationalization (1 to 2 weeks)

Goal: Prevent reintroduction of fixed vulnerabilities.

| ID | Action | Primary Files | Validation |
|---|---|---|---|
| P3-001 | Promote dynamic verification suites to required CI checks | [secure-gate-access/server/package.json](../../secure-gate-access/server/package.json#L1), CI workflow files | Pull requests blocked on failing critical security suites |
| P3-002 | Add security contract tests for endpoint authz/tenant invariants | [secure-gate-access/server/tests/contracts](../../secure-gate-access/server/tests/contracts) | Contract violations fail CI |
| P3-003 | Add abuse-case performance tests for OTP/QR/setup surfaces | [secure-gate-access/server/tests/performance](../../secure-gate-access/server/tests/performance) | Rate-limit and abuse controls validated under load |
| P3-004 | Add release checklist gate requiring remediation verification evidence links | [production-readiness-tests](../../production-readiness-tests) | Release cannot proceed without signed evidence |

Exit criteria:

1. Security regression tests are mandatory in CI.
2. Release checklist includes tested security controls.
3. Security SLOs and alert thresholds are published.

## 4. Test and Verification Gates

## 4.1 Mandatory Commands

1. `npm run test:unit -- --runTestsByPath tests/unit/setupRoutes.security.dynamic.test.js tests/unit/mfaRoutes.test.js tests/unit/tokenService.test.js tests/unit/adminBulkEstateScope.dynamic.test.js`
2. `npm run test:integration -- --runTestsByPath tests/integration/backend-deep-dive.dynamic-verification.integration.test.js`

## 4.2 Acceptance Conditions

1. All remediation-related suites pass in CI and local validation.
2. Negative tests (unauthorized and cross-tenant attempts) fail closed.
3. Security-sensitive response payloads pass schema checks (no token leakage).
4. Redis failure-path tests show safe degradation, not unhandled exceptions.

## 5. Ownership and Sequencing

| Stream | Owner | Backup | Dependency |
|---|---|---|---|
| Setup endpoint hardening | Backend API lead | Security engineer | None |
| QR route hardening | Visitor workflow owner | Backend API lead | Setup hardening not required |
| Admin tenant controls | Admin domain owner | Platform security | Role policy and estate middleware consistency |
| Token/MFA fixes | Auth domain owner | Platform security | None |
| Migration/CI alignment | Platform/DevOps | DB engineer | Existing migration inventory |

Recommended sequence:

1. Phase 0 containment in one emergency branch.
2. Phase 1 auth/tenant fixes in small, independently deployable pull requests.
3. Phase 2 migration/CI alignment with dedicated release rehearsal.
4. Phase 3 governance hardening with CI policy enforcement.

## 6. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Containment changes break bootstrap operations | Deployment friction | Add explicit maintenance-mode bootstrap path and documented secret rotation |
| QR endpoint hardening impacts resident workflows | User-facing regressions | Add staged rollout with feature flag and telemetry watch |
| Estate enforcement changes block legitimate super_admin operations | Operational disruption | Add explicit super_admin estate selection flow and test matrix |
| Migration pipeline alignment surfaces latent SQL issues | Release delays | Dry-run migration validation in pre-merge and nightly jobs |

## 7. Completion Definition

Roadmap completion is achieved when:

1. All P0 and P1 items are deployed and verified in staging and production.
2. No validated high-risk finding remains reproducible by the dynamic verification suites.
3. CI has permanent required checks for the added security regression suites.
4. The release readiness checklist references evidence from this roadmap and the deep-dive analysis.
