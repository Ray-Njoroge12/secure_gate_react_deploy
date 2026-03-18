# Backend Deep-Dive Analysis (First-Principles)

Date: 2026-03-18  
Scope: secure-gate-access/server only  
Mode: Analysis only (no implementation changes made)

## 1. Executive Summary

This backend is feature-rich and operationally mature in several core controls (JWT auth, role policies, CSRF stack, estate-aware middleware, audit hooks, broad test inventory), but there are concentrated high-risk gaps in sensitive endpoint protection and tenancy consistency.

The most urgent risks are:

1. Setup endpoints are mounted without authentication and protected by a predictable fallback secret.
2. Public QR regeneration allows ID-based access and returns visitor token material.
3. Admin bulk user operations are not consistently estate-context enforced at route level.
4. Token revocation has a fallback-path defect that can break revocation handling under error conditions.
5. CI migration execution semantics diverge from runtime migration semantics.

## 2. Methodology and Verification Approach

This assessment was run as a fresh, first-principles backend review and did not rely on prior overview analyses.

Analysis techniques used:

1. CAST-style structural discovery: entrypoints, layered route-domain architecture, dependency boundaries, and control-plane mapping.
2. Journey tracing: resident, guard, admin, and super_admin path tracing through routes, middleware, controllers, and services.
3. Security control-plane review: authn/authz/tenancy/CSRF/rate-limit/secrets/audit controls and exception paths.
4. Data-plane review: migration orchestration, schema evolution, startup DB bootstrap behavior, and integration surfaces.
5. Verification discipline: each high-severity claim was validated with direct source evidence links.

Verification status:

- Static code analysis only.
- No runtime endpoint execution in this pass.
- No code changes applied.

## 3. Backend Inventory Snapshot

Observed backend scale:

- JS source files under server src: 254
- Route files: 68
- Controller files: 27
- Service files: 71
- Middleware files: 26
- SQL migration files: 87

Observed route declaration surface:

- GET: 271
- POST: 202
- PUT: 33
- DELETE: 29
- PATCH: 6

Observed test inventory under server tests:

- Total: 236
- Unit: 112
- Integration: 44
- E2E: 11
- Security: 10
- Performance: 3

## 4. Architecture Deep Dive

### 4.1 Startup and Bootstrap Flow

Backend startup follows a clear sequence:

1. DB initialize.
2. Run migrations.
3. Start HTTP listener.
4. Initialize WebSocket service.

Evidence:

- [secure-gate-access/server/server.js](../../secure-gate-access/server/server.js#L277)
- [secure-gate-access/server/server.js](../../secure-gate-access/server/server.js#L282)
- [secure-gate-access/server/server.js](../../secure-gate-access/server/server.js#L328)
- [secure-gate-access/server/server.js](../../secure-gate-access/server/server.js#L342)

### 4.2 Domain-Oriented Route Composition

Route domains are mounted in a declarative structure:

- system
- auth
- visitor
- guard
- admin

Evidence:

- [secure-gate-access/server/src/app.js](../../secure-gate-access/server/src/app.js#L242)
- [secure-gate-access/server/src/app.js](../../secure-gate-access/server/src/app.js#L245)
- [secure-gate-access/server/src/app.js](../../secure-gate-access/server/src/app.js#L246)
- [secure-gate-access/server/src/app.js](../../secure-gate-access/server/src/app.js#L247)
- [secure-gate-access/server/src/app.js](../../secure-gate-access/server/src/app.js#L248)

Domain mappings are explicit and readable:

- Auth domain includes auth, MFA, sessions, preferences, and setup routes.
- Visitor domain includes visitor lifecycle, check-in/out, approvals, QR, recurring, rideshare, deliveries.
- Guard and admin domains split operational and governance concerns.

Evidence:

- [secure-gate-access/server/src/routes/domains/auth.domain.js](../../secure-gate-access/server/src/routes/domains/auth.domain.js#L1)
- [secure-gate-access/server/src/routes/domains/visitor.domain.js](../../secure-gate-access/server/src/routes/domains/visitor.domain.js#L1)
- [secure-gate-access/server/src/routes/domains/guard.domain.js](../../secure-gate-access/server/src/routes/domains/guard.domain.js#L1)
- [secure-gate-access/server/src/routes/domains/admin.domain.js](../../secure-gate-access/server/src/routes/domains/admin.domain.js#L1)
- [secure-gate-access/server/src/routes/domains/system.domain.js](../../secure-gate-access/server/src/routes/domains/system.domain.js#L1)

## 5. User and Journey Deep Dive

### 5.1 Resident Journeys

Primary backend journeys validated:

1. Resident profile and preferences.
2. Favorite visitors management.
3. Resident stats.
4. Visitor invite creation and invite completion.

Evidence:

- [secure-gate-access/server/src/routes/residentRoutes.js](../../secure-gate-access/server/src/routes/residentRoutes.js#L27)
- [secure-gate-access/server/src/routes/residentRoutes.js](../../secure-gate-access/server/src/routes/residentRoutes.js#L30)
- [secure-gate-access/server/src/routes/residentRoutes.js](../../secure-gate-access/server/src/routes/residentRoutes.js#L33)
- [secure-gate-access/server/src/routes/residentRoutes.js](../../secure-gate-access/server/src/routes/residentRoutes.js#L42)
- [secure-gate-access/server/src/routes/visitorRoutes.js](../../secure-gate-access/server/src/routes/visitorRoutes.js#L259)
- [secure-gate-access/server/src/routes/visitorRoutes.js](../../secure-gate-access/server/src/routes/visitorRoutes.js#L287)

Control posture:

- Resident routes use authenticate + estate context + role policy wrapper.
- Visitor invite path is feature-complete and integrated with completion flow.

### 5.2 Guard Journeys

Primary backend journeys validated:

1. Visitor history and resident lookup.
2. Check-in by QR and by visitor ID.
3. Check-out by QR and by visitor ID.

Evidence:

- [secure-gate-access/server/src/routes/guardRoutes.js](../../secure-gate-access/server/src/routes/guardRoutes.js#L27)
- [secure-gate-access/server/src/routes/guardRoutes.js](../../secure-gate-access/server/src/routes/guardRoutes.js#L38)
- [secure-gate-access/server/src/routes/checkInRoutes.js](../../secure-gate-access/server/src/routes/checkInRoutes.js#L18)
- [secure-gate-access/server/src/routes/checkInRoutes.js](../../secure-gate-access/server/src/routes/checkInRoutes.js#L28)
- [secure-gate-access/server/src/routes/checkOutRoutes.js](../../secure-gate-access/server/src/routes/checkOutRoutes.js#L21)
- [secure-gate-access/server/src/routes/checkOutRoutes.js](../../secure-gate-access/server/src/routes/checkOutRoutes.js#L89)

Control posture:

- Check-in routes globally enforce estate context via router middleware.
- Check-out routes enforce auth/role and apply estate filters inside handlers.

### 5.3 Admin and Super Admin Journeys

Primary backend journeys validated:

1. Admin metrics, settings, user management.
2. Super-admin platform overview, estate lifecycle, global search, system metrics.

Evidence:

- [secure-gate-access/server/src/routes/adminRoutes.js](../../secure-gate-access/server/src/routes/adminRoutes.js#L218)
- [secure-gate-access/server/src/routes/adminRoutes.js](../../secure-gate-access/server/src/routes/adminRoutes.js#L479)
- [secure-gate-access/server/src/routes/adminRoutes.js](../../secure-gate-access/server/src/routes/adminRoutes.js#L81)
- [secure-gate-access/server/src/routes/adminRoutes.js](../../secure-gate-access/server/src/routes/adminRoutes.js#L88)
- [secure-gate-access/server/src/routes/adminRoutes.js](../../secure-gate-access/server/src/routes/adminRoutes.js#L95)
- [secure-gate-access/server/src/routes/adminRoutes.js](../../secure-gate-access/server/src/routes/adminRoutes.js#L123)
- [secure-gate-access/server/src/routes/adminRoutes.js](../../secure-gate-access/server/src/routes/adminRoutes.js#L137)

Control posture:

- Super-admin routes are strongly wrapped with auth + super_admin role + MFA.
- Admin endpoints are broad, but estate-context enforcement is not uniformly applied.

## 6. Security Deep Dive

## 6.1 High-Priority Findings

| Severity | Finding | Why It Matters | Evidence |
|---|---|---|---|
| Critical | Setup routes are unauthenticated and rely on fallback static secret | Enables sensitive migration/seed actions through HTTP if secret remains default or is guessed | [secure-gate-access/server/src/routes/domains/auth.domain.js](../../secure-gate-access/server/src/routes/domains/auth.domain.js#L16), [secure-gate-access/server/src/routes/setup.routes.js](../../secure-gate-access/server/src/routes/setup.routes.js#L18), [secure-gate-access/server/src/routes/setup.routes.js](../../secure-gate-access/server/src/routes/setup.routes.js#L44), [secure-gate-access/server/src/routes/setup.routes.js](../../secure-gate-access/server/src/routes/setup.routes.js#L146) |
| Critical | Public QR regeneration endpoint is ID-based and returns visitor token | Enables unauthorized regeneration attempts and token material disclosure | [secure-gate-access/server/src/routes/visitorRoutes.js](../../secure-gate-access/server/src/routes/visitorRoutes.js#L594), [secure-gate-access/server/src/controllers/qrCodeController.js](../../secure-gate-access/server/src/controllers/qrCodeController.js#L166), [secure-gate-access/server/src/controllers/qrCodeController.js](../../secure-gate-access/server/src/controllers/qrCodeController.js#L173), [secure-gate-access/server/src/controllers/qrCodeController.js](../../secure-gate-access/server/src/controllers/qrCodeController.js#L210) |
| High | QR analytics and cleanup endpoints are auth-only, not role/estate constrained | Any authenticated user can hit analytics/cleanup; controller invokes service without estate filter | [secure-gate-access/server/src/routes/qrCodeRoutes.js](../../secure-gate-access/server/src/routes/qrCodeRoutes.js#L67), [secure-gate-access/server/src/routes/qrCodeRoutes.js](../../secure-gate-access/server/src/routes/qrCodeRoutes.js#L78), [secure-gate-access/server/src/services/qrCodeService.js](../../secure-gate-access/server/src/services/qrCodeService.js#L492), [secure-gate-access/server/src/services/qrCodeService.js](../../secure-gate-access/server/src/services/qrCodeService.js#L513) |
| High | Admin bulk approve/reject routes skip explicit estate context middleware | Policy inconsistency on sensitive governance operations | [secure-gate-access/server/src/routes/adminRoutes.js](../../secure-gate-access/server/src/routes/adminRoutes.js#L489), [secure-gate-access/server/src/routes/adminRoutes.js](../../secure-gate-access/server/src/routes/adminRoutes.js#L502), [secure-gate-access/server/src/routes/adminRoutes.js](../../secure-gate-access/server/src/routes/adminRoutes.js#L516) |
| High | Bulk-approve and bulk-reject controller logic can run outside strict estate scoping depending on caller context | Cross-tenant governance risk if super_admin has no estate context or caller supplies estate in body | [secure-gate-access/server/src/controllers/adminController.js](../../secure-gate-access/server/src/controllers/adminController.js#L403), [secure-gate-access/server/src/controllers/adminController.js](../../secure-gate-access/server/src/controllers/adminController.js#L415), [secure-gate-access/server/src/controllers/adminController.js](../../secure-gate-access/server/src/controllers/adminController.js#L445) |
| High | Token revocation catch path references decoded variable outside scope | Revocation fallback path may fail when an error occurs in revoke flow | [secure-gate-access/server/src/services/tokenService.js](../../secure-gate-access/server/src/services/tokenService.js#L327), [secure-gate-access/server/src/services/tokenService.js](../../secure-gate-access/server/src/services/tokenService.js#L330), [secure-gate-access/server/src/services/tokenService.js](../../secure-gate-access/server/src/services/tokenService.js#L354) |
| High | Dev routes mount in all non-production environments and expose message logs/demo credentials | Non-production environments still carry sensitive operational surfaces | [secure-gate-access/server/src/app.js](../../secure-gate-access/server/src/app.js#L251), [secure-gate-access/server/src/app.js](../../secure-gate-access/server/src/app.js#L252), [secure-gate-access/server/src/routes/devRoutes.js](../../secure-gate-access/server/src/routes/devRoutes.js#L22), [secure-gate-access/server/src/routes/devRoutes.js](../../secure-gate-access/server/src/routes/devRoutes.js#L163), [secure-gate-access/server/src/routes/devRoutes.js](../../secure-gate-access/server/src/routes/devRoutes.js#L165) |
| Medium | MFA disable flow likely broken due verifyPassword argument mismatch | Security-sensitive action may fail unpredictably and block expected MFA lifecycle | [secure-gate-access/server/src/routes/mfaRoutes.js](../../secure-gate-access/server/src/routes/mfaRoutes.js#L238), [secure-gate-access/server/src/routes/mfaRoutes.js](../../secure-gate-access/server/src/routes/mfaRoutes.js#L252), [secure-gate-access/server/src/services/userService.js](../../secure-gate-access/server/src/services/userService.js#L343), [secure-gate-access/server/src/services/userService.js](../../secure-gate-access/server/src/services/userService.js#L382) |
| Medium | Public OTP verify/resend keyed by sequential visitor ID | Enumeration and abuse surface remains, even with rate limits | [secure-gate-access/server/src/routes/visitorRoutes.js](../../secure-gate-access/server/src/routes/visitorRoutes.js#L580), [secure-gate-access/server/src/routes/visitorRoutes.js](../../secure-gate-access/server/src/routes/visitorRoutes.js#L586) |
| Medium | Public email existence endpoint returns deterministic existence signal | Account enumeration vector | [secure-gate-access/server/src/routes/authRoutes.js](../../secure-gate-access/server/src/routes/authRoutes.js#L63), [secure-gate-access/server/src/controllers/authController.js](../../secure-gate-access/server/src/controllers/authController.js#L385), [secure-gate-access/server/src/controllers/authController.js](../../secure-gate-access/server/src/controllers/authController.js#L388) |
| Medium | Internal error messages are exposed in API payloads | Increases information disclosure and attack utility | [secure-gate-access/server/src/routes/setup.routes.js](../../secure-gate-access/server/src/routes/setup.routes.js#L137), [secure-gate-access/server/src/routes/setup.routes.js](../../secure-gate-access/server/src/routes/setup.routes.js#L202), [secure-gate-access/server/src/routes/setup.routes.js](../../secure-gate-access/server/src/routes/setup.routes.js#L248), [secure-gate-access/server/src/controllers/adminController.js](../../secure-gate-access/server/src/controllers/adminController.js#L427) |

## 6.2 Security Strengths

Confirmed strengths:

1. Authentication middleware resolves token identity against database and estate claims.
2. Estate context middleware has explicit super_admin handling and estate attachment.
3. CSRF middleware exists and enforces token/session checks for non-exempt state-changing requests.
4. Cookie defaults are security-conscious for httpOnly, secure, and sameSite.
5. Role policy abstraction centralizes role bundles.

Evidence:

- [secure-gate-access/server/src/middleware/authMiddleware.js](../../secure-gate-access/server/src/middleware/authMiddleware.js#L109)
- [secure-gate-access/server/src/middleware/authMiddleware.js](../../secure-gate-access/server/src/middleware/authMiddleware.js#L129)
- [secure-gate-access/server/src/middleware/estateContextMiddleware.js](../../secure-gate-access/server/src/middleware/estateContextMiddleware.js#L97)
- [secure-gate-access/server/src/middleware/securityStack.js](../../secure-gate-access/server/src/middleware/securityStack.js#L99)
- [secure-gate-access/server/src/middleware/securityStack.js](../../secure-gate-access/server/src/middleware/securityStack.js#L113)
- [secure-gate-access/server/src/utils/cookies.js](../../secure-gate-access/server/src/utils/cookies.js#L11)
- [secure-gate-access/server/src/utils/cookies.js](../../secure-gate-access/server/src/utils/cookies.js#L32)
- [secure-gate-access/server/src/middleware/rolePolicy.js](../../secure-gate-access/server/src/middleware/rolePolicy.js#L4)

## 7. Database and Integration Deep Dive

### 7.1 Migration Semantics and Delivery Risk

Runtime migration service extracts and applies only the up section before down markers.

Evidence:

- [secure-gate-access/server/src/services/migrationService.js](../../secure-gate-access/server/src/services/migrationService.js#L24)
- [secure-gate-access/server/src/services/migrationService.js](../../secure-gate-access/server/src/services/migrationService.js#L26)
- [secure-gate-access/server/src/services/migrationService.js](../../secure-gate-access/server/src/services/migrationService.js#L68)

CI workflow applies full SQL files directly through psql in a loop.

Evidence:

- [.github/workflows/ci.yml](../../.github/workflows/ci.yml#L107)
- [.github/workflows/ci.yml](../../.github/workflows/ci.yml#L114)

Migration files contain explicit down sections with destructive statements.

Evidence:

- [secure-gate-access/server/src/database/migrations/001_initial_schema.sql](../../secure-gate-access/server/src/database/migrations/001_initial_schema.sql#L234)
- [secure-gate-access/server/src/database/migrations/001_initial_schema.sql](../../secure-gate-access/server/src/database/migrations/001_initial_schema.sql#L250)

Assessment:

- There is a semantic mismatch risk between runtime and CI migration behavior.

### 7.2 DB Bootstrap and Schema Drift Pressure

Database manager still includes essential table bootstrap creation logic in application startup path.

Evidence:

- [secure-gate-access/server/src/database/db.enhanced.js](../../secure-gate-access/server/src/database/db.enhanced.js#L223)
- [secure-gate-access/server/src/database/db.enhanced.js](../../secure-gate-access/server/src/database/db.enhanced.js#L254)
- [secure-gate-access/server/src/database/db.enhanced.js](../../secure-gate-access/server/src/database/db.enhanced.js#L262)
- [secure-gate-access/server/src/database/db.enhanced.js](../../secure-gate-access/server/src/database/db.enhanced.js#L281)

Assessment:

- Operational resilience is improved for partially initialized environments.
- Long-term maintainability risk is increased because schema authority is split between migration files and bootstrap code.

### 7.3 External Integration Surfaces

The backend integrates AWS Secrets Manager, Redis, notification channels, and webhooks.

Evidence:

- [secure-gate-access/server/src/config/environment.js](../../secure-gate-access/server/src/config/environment.js#L26)
- [secure-gate-access/server/src/services/secretsManagerService.js](../../secure-gate-access/server/src/services/secretsManagerService.js#L1)
- [secure-gate-access/server/src/services/messagingGateway.js](../../secure-gate-access/server/src/services/messagingGateway.js#L19)
- [secure-gate-access/server/src/routes/notificationWebhooks.js](../../secure-gate-access/server/src/routes/notificationWebhooks.js#L1)

## 8. Backend Cleanliness and Code Quality

### 8.1 Complexity Hotspots

Largest active files indicate concentration risk:

- adminRoutes.js: 2000 lines
- visitorInviteController.js: 1530 lines
- bulkOperationsService.js: 1504 lines
- collaborationService.js: 1489 lines
- kenyaDPAAuditService.js: 1390 lines
- guardManagementRoutes.js: 946 lines
- db.enhanced.js: 860 lines

Assessment:

- Large files increase cognitive load, change risk, and regression probability.

### 8.2 Legacy and Duplication Signals

Notification stack shows overlapping legacy and modern paths:

- Legacy notification exports remain active and marked backward compatibility.
- MessagingGateway exists as unified channel abstraction.

Evidence:

- [secure-gate-access/server/src/services/notificationService.js](../../secure-gate-access/server/src/services/notificationService.js#L68)
- [secure-gate-access/server/src/services/notificationService.js](../../secure-gate-access/server/src/services/notificationService.js#L81)
- [secure-gate-access/server/src/services/notificationService.js](../../secure-gate-access/server/src/services/notificationService.js#L98)
- [secure-gate-access/server/src/services/notificationService.js](../../secure-gate-access/server/src/services/notificationService.js#L213)
- [secure-gate-access/server/src/services/messagingGateway.js](../../secure-gate-access/server/src/services/messagingGateway.js#L19)
- [secure-gate-access/server/src/services/messagingGateway.js](../../secure-gate-access/server/src/services/messagingGateway.js#L28)

Archived zombie-services remain in source tree, signaling codebase drift pressure:

- [secure-gate-access/server/src/archive/zombie-services/auditLogger.js](../../secure-gate-access/server/src/archive/zombie-services/auditLogger.js)
- [secure-gate-access/server/src/archive/zombie-services/gdprComplianceService.js](../../secure-gate-access/server/src/archive/zombie-services/gdprComplianceService.js)
- [secure-gate-access/server/src/archive/zombie-services/intelligentNotificationManager.js](../../secure-gate-access/server/src/archive/zombie-services/intelligentNotificationManager.js)

### 8.3 Error Handling and Logging Consistency

Observed inconsistencies:

1. Console logging is still heavily used in some services instead of centralized logger.
2. Silent catch exists in OTP search enhancement block.
3. Multiple response helper systems are active, increasing response contract variability.

Evidence:

- [secure-gate-access/server/src/services/secretsManagerService.js](../../secure-gate-access/server/src/services/secretsManagerService.js#L54)
- [secure-gate-access/server/src/services/secretsManagerService.js](../../secure-gate-access/server/src/services/secretsManagerService.js#L81)
- [secure-gate-access/server/src/services/memoryCacheService.js](../../secure-gate-access/server/src/services/memoryCacheService.js#L26)
- [secure-gate-access/server/src/services/memoryCacheService.js](../../secure-gate-access/server/src/services/memoryCacheService.js#L69)
- [secure-gate-access/server/src/controllers/visitorInviteController.js](../../secure-gate-access/server/src/controllers/visitorInviteController.js#L500)
- [secure-gate-access/server/src/utils/responseUtils.js](../../secure-gate-access/server/src/utils/responseUtils.js#L1)
- [secure-gate-access/server/src/utils/responseFormatter.js](../../secure-gate-access/server/src/utils/responseFormatter.js#L1)
- [secure-gate-access/server/src/utils/respond.js](../../secure-gate-access/server/src/utils/respond.js#L1)

## 9. Testing Deep Dive

### 9.1 What Is Covered Well

Critical integration test strategy is explicit in package scripts and includes:

- auth-refresh
- invite-lifecycle
- estate-scoping
- webhook-signature
- notification-queue

Evidence:

- [secure-gate-access/server/package.json](../../secure-gate-access/server/package.json#L19)
- [secure-gate-access/server/tests/integration/auth-refresh.integration.test.js](../../secure-gate-access/server/tests/integration/auth-refresh.integration.test.js#L1)
- [secure-gate-access/server/tests/integration/invite-lifecycle.integration.test.js](../../secure-gate-access/server/tests/integration/invite-lifecycle.integration.test.js#L1)
- [secure-gate-access/server/tests/integration/estate-scoping.integration.test.js](../../secure-gate-access/server/tests/integration/estate-scoping.integration.test.js#L1)
- [secure-gate-access/server/tests/integration/webhook-signature.integration.test.js](../../secure-gate-access/server/tests/integration/webhook-signature.integration.test.js#L1)

### 9.2 Confirmed Coverage Gaps for High-Risk Endpoints

A repository-wide search in server tests found no direct test references for several high-risk endpoints and error paths, including:

- setup migrate and seed endpoints
- QR analytics and cleanup endpoints
- public regenerate-qr endpoint
- MFA disable flow
- admin bulk-approve and bulk-reject endpoints

Assessment:

- Broad test volume exists.
- Critical-path hardening tests are incomplete for several currently exposed high-risk surfaces.

## 10. CAST-Style Impact and Blast Radius Map

| Hotspot | Upstream Dependencies | Downstream Impact | Blast Radius if Regressed |
|---|---|---|---|
| Setup route surface | Route mount, environment secret config, DB manager, migration service | Full DB schema lifecycle actions | Platform-wide availability and integrity |
| Visitor QR and OTP public paths | Visitor route layer, QR controller/service, visitor table state machine | Gate entry workflow integrity | Gate operations and visitor trust |
| Admin bulk user governance | Admin route policies, estate middleware, admin controller update queries | User lifecycle approvals/rejections | Multi-tenant data governance and account safety |
| Token revoke pipeline | Auth routes, token service revoke/blacklist paths, refresh lifecycle | Session invalidation and logout guarantees | Security posture under incident response |
| Migration and startup path | server startup, migration service, CI workflow semantics, SQL corpus | Environment consistency and deploy reliability | Release integrity and recovery confidence |

## 11. Prioritized Risk Register

Immediate priority order for remediation planning (analysis-level):

1. Lock down setup routes and remove default secret fallback behavior.
2. Protect regenerate-qr with ownership or authenticated tenancy checks and remove visitor token from response payloads.
3. Enforce estate context uniformly for admin bulk operations at route and controller layers.
4. Correct token revocation catch-path defect and validate fallback behavior under Redis failures.
5. Align CI migration execution semantics with runtime migration strategy.
6. Add direct tests for setup, QR analytics/cleanup, bulk approve/reject, regenerate-qr, and MFA disable paths.

## 12. Confidence and Constraints

Confidence by area:

- Architecture mapping: High
- Security findings: High for endpoint exposure and policy inconsistencies
- Database/migration semantics: High
- Code-quality complexity findings: High
- Test-gap findings: High (static inspection plus targeted dynamic verification)

Constraints:

- This pass combines static analysis with targeted dynamic verification.
- Dynamic verification used in-memory and test-database execution via supertest/Jest.
- No external-network black-box penetration test (DAST scanner from outside the runtime perimeter) was executed in this pass.

## 13. Final Note

This document is intentionally backend-only and first-principles. It is suitable as the baseline artifact for a subsequent remediation planning workshop or scoped deep-dive reviews per domain (Auth, Visitor Entry, Admin Governance, Data Platform, and Operational Reliability).

## 14. Dynamic Verification Execution (2026-03-18 Update)

### 14.1 Commands Executed

1. Unit verification bundle:
	- `npm run test:unit -- --runTestsByPath tests/unit/setupRoutes.security.dynamic.test.js tests/unit/mfaRoutes.test.js tests/unit/tokenService.test.js tests/unit/adminBulkEstateScope.dynamic.test.js`
	- Result: `4` suites passed, `76` tests passed.

2. Integration verification bundle:
	- `npm run test:integration -- --runTestsByPath tests/integration/backend-deep-dive.dynamic-verification.integration.test.js`
	- Result: `1` suite passed, `5` tests passed.

3. Total targeted dynamic verification run:
	- `5` suites passed, `81` tests passed.

### 14.2 Dynamic Test Artifacts Added

- [secure-gate-access/server/tests/integration/backend-deep-dive.dynamic-verification.integration.test.js](../../secure-gate-access/server/tests/integration/backend-deep-dive.dynamic-verification.integration.test.js#L1)
- [secure-gate-access/server/tests/unit/setupRoutes.security.dynamic.test.js](../../secure-gate-access/server/tests/unit/setupRoutes.security.dynamic.test.js#L1)
- [secure-gate-access/server/tests/unit/adminBulkEstateScope.dynamic.test.js](../../secure-gate-access/server/tests/unit/adminBulkEstateScope.dynamic.test.js#L1)

### 14.3 Existing Unit Suites Extended for Defect Reproduction

- [secure-gate-access/server/tests/unit/tokenService.test.js](../../secure-gate-access/server/tests/unit/tokenService.test.js#L364)
- [secure-gate-access/server/tests/unit/mfaRoutes.test.js](../../secure-gate-access/server/tests/unit/mfaRoutes.test.js#L1)

## 15. Dynamic Validation Matrix

| Finding | Static Status | Dynamic Verification Outcome | Evidence |
|---|---|---|---|
| Setup routes mounted without auth | Confirmed | Unauthenticated callers can reach secret gate on `/api/setup/migrate` and `/api/setup/seed` (403 on invalid secret, not 401) | [secure-gate-access/server/tests/integration/backend-deep-dive.dynamic-verification.integration.test.js](../../secure-gate-access/server/tests/integration/backend-deep-dive.dynamic-verification.integration.test.js#L92), [secure-gate-access/server/tests/unit/setupRoutes.security.dynamic.test.js](../../secure-gate-access/server/tests/unit/setupRoutes.security.dynamic.test.js#L61) |
| Setup secret fallback default | Confirmed | Default fallback secret accepted when `SETUP_SECRET` is unset (mocked DB/FS safety harness) | [secure-gate-access/server/tests/unit/setupRoutes.security.dynamic.test.js](../../secure-gate-access/server/tests/unit/setupRoutes.security.dynamic.test.js#L72) |
| Public regenerate-qr exposure | Confirmed | Endpoint callable without auth and response includes visitor token material | [secure-gate-access/server/tests/integration/backend-deep-dive.dynamic-verification.integration.test.js](../../secure-gate-access/server/tests/integration/backend-deep-dive.dynamic-verification.integration.test.js#L113) |
| QR analytics/cleanup auth-only scope gap | Confirmed | Resident token can invoke analytics and cleanup endpoints without role-based denial | [secure-gate-access/server/tests/integration/backend-deep-dive.dynamic-verification.integration.test.js](../../secure-gate-access/server/tests/integration/backend-deep-dive.dynamic-verification.integration.test.js#L137) |
| Admin bulk scoping fallback risk | Confirmed | Controller accepts caller-provided `estateId` and can execute without estate filter when estate context is absent in request user object | [secure-gate-access/server/tests/unit/adminBulkEstateScope.dynamic.test.js](../../secure-gate-access/server/tests/unit/adminBulkEstateScope.dynamic.test.js#L45), [secure-gate-access/server/tests/unit/adminBulkEstateScope.dynamic.test.js](../../secure-gate-access/server/tests/unit/adminBulkEstateScope.dynamic.test.js#L62) |
| Token revoke catch-path defect | Confirmed | Redis blacklist failure path surfaces `decoded is not defined` scope defect | [secure-gate-access/server/tests/unit/tokenService.test.js](../../secure-gate-access/server/tests/unit/tokenService.test.js#L388) |
| MFA disable password verification mismatch | Confirmed | Route invokes `verifyPassword` with `(password, stored_hash)` argument order instead of `(userId, password)` | [secure-gate-access/server/tests/unit/mfaRoutes.test.js](../../secure-gate-access/server/tests/unit/mfaRoutes.test.js#L117), [secure-gate-access/server/src/services/userService.js](../../secure-gate-access/server/src/services/userService.js#L343) |

## 16. Updated Testing Coverage Statement

### 16.1 High-Risk Endpoint Coverage Delta

Previously unverified high-risk surfaces that are now dynamically exercised:

1. Setup migrate and seed routes.
2. Public regenerate-qr route behavior.
3. QR analytics and cleanup authorization behavior.
4. Admin bulk approval/rejection estate-scoping logic (controller-level behavior).
5. Token revocation fallback error path.
6. MFA disable password verification call contract.

### 16.2 Residual Dynamic Testing Gaps

Still not covered in this pass:

1. External perimeter DAST (outside-in scanning with authenticated and unauthenticated agents).
2. Full production-like attack simulation against deployed infrastructure controls (WAF, LB, CDN, TLS termination chain).
3. High-volume abuse simulation for OTP, QR regenerate, and setup surfaces under distributed source patterns.

## 17. Companion Roadmap

The remediation roadmap derived from this validated static + dynamic evidence is provided in:

- [documentation/guides/backend-remediation-roadmap-2026-03-18.md](backend-remediation-roadmap-2026-03-18.md)