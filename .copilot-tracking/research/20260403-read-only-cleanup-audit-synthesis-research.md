<!-- markdownlint-disable-file -->

# Task Research Notes: Read-only Cleanup Audit Synthesis

## Research Executed

### File Analysis

- .gitignore
  - Ignores generated Playwright and test result artifacts, but several such files are currently tracked.
- package.json
  - Root scripts are minimal wrapper scripts; no root integration/e2e scripts exist, so cleanup must not assume root-level test command coverage.
- secure-gate-access/server/package.json
  - Authoritative backend integration and critical test scripts are defined here and include estate/auth/invite critical-path patterns.
- secure-gate-access/client/src/App.js
  - Role boundaries are enforced through ProtectedRoute across resident, guard, admin, super_admin, and company_admin paths.
- secure-gate-access/client/src/contexts/AuthContext.js
  - Session is cookie-based via /api/auth/me and explicit no-local-storage policy for auth tokens.
- secure-gate-access/client/src/hooks/useWebSocket.js
  - Frontend websocket connection is tied to auth context and cookie-auth fallback keying.
- secure-gate-access/server/src/app.js
  - Security middleware ordering and domain route mounting are explicit; protected websocket alias route includes auth/role/estate middleware sequence.
- secure-gate-access/server/src/middleware/authMiddleware.js
  - User lookup enforces estate-aware matching (estate_id IS NOT DISTINCT FROM payload estate).
- secure-gate-access/server/src/middleware/estateContextMiddleware.js
  - Estate context requirements and cross-estate blocking are explicit and security-relevant.
- secure-gate-access/server/src/routes/domains/visitor.domain.js
  - Visitor lifecycle and public visitor aliases are mounted centrally; route cleanup mistakes here can break invite/check-in flows.
- secure-gate-access/server/src/routes/visitorRoutes.js
  - /api/visitors and check-in/check-out flows combine auth, estate, and role policy middleware.
- secure-gate-access/server/src/services/websocketService.js
  - Estate-scoped room naming and subscription behavior are core multi-tenant websocket controls.
- e2e/playwright.config.js
  - References npm run test:server (missing script) and creates test-results output under root.
- e2e/run-tests.js
  - Also attempts to spawn npm run test:server from secure-gate-access/server.
- deployment/production-deployment-scripts.js
  - Launch script expects npm commands in cwd e2e, but no e2e/package.json exists.
- scripts/maintenance/task-19-3-deployment-readiness-orchestrator.js
  - Resolves deployment script from scripts/maintenance/deployment/... path that does not exist; root deployment path differs.
- docs/plan/cleanup-2026-04-01-1732/plan.yaml
  - Plan expectations conflict with current archive placement/content (revert_mfa_changes location and script count).
- archive/scripts/debug/README.md
  - Documents revert_mfa_changes in debug archive, contradicting plan expectation of legacy placement.
- archive/scripts/legacy/test-supademo-api.js
  - Contains a hardcoded API key and Authorization bearer usage in tracked repository content.

### Code Search Results

- 2026-04-02-resident-public-ui-audit
  - No matches in repository; requested path is absent while docs/plan contains 2026-04-02-figma-audit and other plan folders.
- archive/scripts/debug|archive/scripts/legacy
  - 14 matches in cleanup plan documenting intended archive actions and verification criteria.
- test:server
  - Present in e2e/playwright.config.js, e2e/run-tests.js, and e2e/utils/test-helpers.js; absent in all package.json scripts.
- production-deployment-scripts.js
  - Referenced by maintenance orchestrator and archive documentation; path resolution in orchestrator points to a non-existent subdirectory under scripts/maintenance.
- playwright.config.js|e2e/playwright.config.js
  - Multiple configs exist with materially different runtime assumptions and output/reporting targets.
- test-results/e2e-results.json|e2e-report
  - Server e2e Playwright config writes to root-level test-results paths via relative traversal.
- API_KEY|Authorization in archive/scripts/legacy/test-supademo-api.js
  - Hardcoded API_KEY literal and bearer header usage detected in tracked archive script.
- active script basenames vs archive script basenames
  - No duplicate basenames were returned by comm overlap check between scripts/ and archive/scripts/.

### External Research

- #githubRepo:"N/A"
  - External repository research was intentionally skipped because this task is a repository-internal cleanup synthesis.
- #fetch:N/A
  - External documentation fetch was intentionally skipped because all required evidence is available from workspace files and scripts.

### Project Conventions

- Standards referenced: Cleanup And Hygiene, Backend Estate Guardrails, Frontend Routing And Auth, Testing Execution Conventions, User Functionality And Journeys.
- Instructions followed: read-only research synthesis with protection of auth/estate/visitor/role/websocket/test/deploy flows.

## Key Discoveries

### Project Structure

- Monorepo has active runtime roots in secure-gate-access/client and secure-gate-access/server with orchestration wrappers at repository root.
- Protected behavior surfaces are concentrated in:
  - secure-gate-access/server/src/app.js (middleware and route composition)
  - secure-gate-access/server/src/middleware/authMiddleware.js and secure-gate-access/server/src/middleware/estateContextMiddleware.js (auth + estate isolation)
  - secure-gate-access/server/src/routes/domains/visitor.domain.js and secure-gate-access/server/src/routes/visitorRoutes.js (visitor lifecycle)
  - secure-gate-access/server/src/services/websocketService.js and secure-gate-access/server/src/middleware/websocketAuth.js (real-time estate isolation)
  - secure-gate-access/client/src/App.js, secure-gate-access/client/src/contexts/AuthContext.js, secure-gate-access/client/src/hooks/useWebSocket.js (role routing + session + client real-time)
- Cleanup-sensitive generated-output surfaces include top-level playwright-report and test-results plus nested secure-gate-access/client/playwright-report and secure-gate-access/test-results.

### Implementation Patterns

- Backend keeps explicit security-first middleware order (request ID/logging -> security stack -> parsing -> session -> audit/perf -> route domains -> standardized error handling).
- Visitor routes apply auth/estate/role checks per endpoint, with admin/guard operations gated by role policy and resident list access gated by requireEstate.
- Websocket infrastructure is estate-scoped by room naming convention estate:{estateId}:{roomType}, with role-aware subscriptions.
- Frontend role boundaries rely on ProtectedRoute + AppShell for each role segment rather than ad-hoc guards.
- Server test commands are package-scoped and ESM-safe; cleanup should not replace with ad-hoc root commands.

### Candidate Matrix

| Category | Candidate | Path Evidence | Protected-Flow Risk if Cleaned Wrong | Priority |
|---|---|---|---|---|
| Generated artifacts tracked in git | Remove tracked report outputs and keep ignored | playwright-report/index.html; secure-gate-access/client/playwright-report/index.html; secure-gate-access/client/playwright-results.json; secure-gate-access/test-results/e2e-report/index.html; .gitignore lines 102-106 | Low runtime risk, medium audit-history risk if reports are relied on for compliance evidence | High |
| Plan/archive drift | Reconcile archive placement + verification statements | docs/plan/cleanup-2026-04-01-1732/plan.yaml lines 249, 287, 293; archive/scripts/debug/README.md lines 33, 42; archive/scripts/legacy contents | Low runtime risk, medium governance risk (incorrect cleanup verification) | High |
| Archived secret-bearing script | Quarantine/rotate/remove hardcoded key material | archive/scripts/legacy/test-supademo-api.js line 3 and lines 10/23; file is tracked in git | High security risk if credential still active; low runtime dependency risk | Critical |
| E2E command drift | Align obsolete test startup command references | e2e/playwright.config.js line 154; e2e/run-tests.js line 181; e2e/utils/test-helpers.js line 362; no package script defines test:server | Medium test reliability risk; can hide real regressions in auth/visitor flows | High |
| Deployment orchestration drift | Fix path and cwd assumptions before any cleanup removal | scripts/maintenance/task-19-3-deployment-readiness-orchestrator.js line 98 path join; deployment/production-deployment-scripts.js lines 222 and 638 use cwd e2e; no e2e/package.json | Medium-high deployment readiness false-positive risk | High |
| Missing expected plan directory | Clarify naming/source for missing audit folder | docs/plan listing does not contain 2026-04-02-resident-public-ui-audit and repo search has zero matches | Low runtime risk, medium traceability risk during cleanup audits | Medium |

### Contradictions And Gaps

- Cleanup plan verification says archive/scripts/debug should contain 2 js files + README, but debug currently contains 3 js files + README (includes revert_mfa_changes.js).
- Cleanup plan expects archive/scripts/legacy/revert_mfa_changes.js, but file is in archive/scripts/debug and legacy holds different Supademo scripts.
- e2e toolchain refers to npm run test:server, but no package script provides that command.
- Deployment manager executes npm run test:e2e and npm run test:e2e:critical with cwd e2e, but e2e/package.json is absent.
- Deployment readiness orchestrator checks scripts/maintenance/deployment/production-deployment-scripts.js while canonical file lives at deployment/production-deployment-scripts.js.
- .gitignore excludes generated report paths, yet multiple report artifacts are already tracked and therefore continue to persist.
- Requested docs path docs/plan/2026-04-02-resident-public-ui-audit does not exist and has no repository references.

### Complete Examples

```javascript
// Protected websocket alias in server app keeps auth -> role -> estate ordering.
app.get('/api/ws/guards', authenticateToken, requireRole(['guard', 'admin', 'super_admin']), requireEstate, (req, res) => {
  const queryIndex = req.originalUrl.indexOf('?');
  const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
  return res.redirect(307, `/api/sse/guards${query}`);
});

// E2E config drift example: references a missing script.
webServer: process.env.CI ? undefined : [
  {
    command: 'cd secure-gate-access/server && npm run test:server',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
]
```

### API and Schema Documentation

- Route-domain composition centralizes auth and visitor prefixes in secure-gate-access/server/src/routes/domains/auth.domain.js and secure-gate-access/server/src/routes/domains/visitor.domain.js.
- Visitor domain includes both authenticated and public route surfaces, including legacy public alias, increasing cleanup sensitivity for path removals.
- Websocket auth middleware decodes JWT and enforces estate-aware connection metadata for multi-tenant isolation.

### Configuration Examples

```json
{
  "artifactIgnores": [
    "playwright-report/",
    "test-results/",
    "secure-gate-access/client/playwright-report/",
    "secure-gate-access/client/playwright-results*.json"
  ],
  "observedTrackedArtifacts": [
    "playwright-report/index.html",
    "secure-gate-access/client/playwright-report/index.html",
    "secure-gate-access/client/playwright-results.json",
    "secure-gate-access/test-results/e2e-report/index.html"
  ],
  "missingScriptReferences": [
    "npm run test:server",
    "npm run test:e2e:critical (cwd e2e)"
  ]
}
```

### Technical Requirements

- Mandatory protection boundary: do not clean or relocate files that implement auth, estate scoping, visitor routing, role gating, websocket room scoping, or package-level test entry points without explicit replacement proof.
- Security exception handling: archive scripts containing credential material require immediate investigate/rotation workflow before any archival retention decision.
- Test/deploy trustworthiness: cleanup cannot be considered complete while orchestration scripts point to missing scripts/paths.

### Risk And Confidence Recommendations

| Recommendation | Risk Level | Confidence | Basis |
|---|---|---|---|
| Remove tracked generated Playwright/report artifacts and rely on ignore patterns + CI artifacts | Low | High | Tracked artifacts are explicitly ignored and not referenced by runtime code.
| Correct cleanup plan verification lines to match actual archive destinations/content | Low | High | Plan assertions conflict with current archive reality.
| Treat archive/scripts/legacy/test-supademo-api.js as a security incident candidate and rotate key if valid | High | High | Hardcoded API key literal and bearer usage in tracked file.
| Normalize E2E startup command usage away from test:server references | Medium | High | Multiple e2e files reference missing script.
| Fix deployment orchestration path/cwd assumptions before relying on deployment-readiness automation | Medium-High | Medium-High | Script paths and working directories do not align with repository structure.
| Keep core auth/estate/visitor/role/websocket files out of cleanup scope unless accompanied by targeted critical tests | High if violated | High | Files contain core tenant and role enforcement logic.

### Mandatory Investigate Set

- archive/scripts/legacy/test-supademo-api.js
  - Validate whether API key is active; rotate/revoke immediately if still valid; assess git history exposure.
- e2e/playwright.config.js, e2e/run-tests.js, e2e/utils/test-helpers.js
  - Replace or remove test:server references with existing server scripts (start/dev) and validate end-to-end startup path.
- deployment/production-deployment-scripts.js and scripts/maintenance/task-19-3-deployment-readiness-orchestrator.js
  - Confirm executable deployment/test command paths; resolve cwd e2e assumptions and deployment script path mismatch.
- docs/plan/cleanup-2026-04-01-1732/plan.yaml plus archive/scripts/debug/README.md
  - Reconcile verification criteria and actual archive layout to prevent false cleanup completion claims.
- docs/plan path expectations
  - Determine whether docs/plan/2026-04-02-resident-public-ui-audit was renamed, removed, or never created.

## Recommended Approach

Adopt a conservative, evidence-locked cleanup sequence centered on preserving runtime-critical security and tenancy controls:

1. **Security-first investigate lane**
   - Handle hardcoded credential exposure in archived script before any archival pruning decisions.
2. **Reliability lane (test/deploy command coherence)**
   - Resolve missing-script and wrong-cwd references so cleanup automation cannot silently fail.
3. **Artifact lane (generated output de-tracking)**
   - Remove tracked generated reports already covered by ignore rules and move report retention to CI artifact systems.
4. **Governance lane (plan/archive reconciliation)**
   - Update plan verification and archive READMEs to reflect actual destinations and file sets.
5. **Protection fence**
   - Exclude core auth/estate/visitor/role/websocket implementation and critical tests from cleanup scope unless backed by targeted regression evidence.

## Implementation Guidance

- **Objectives**: Produce a read-only cleanup candidate matrix, contradictions/gaps, risk-confidence recommendations, and a mandatory investigate set.
- **Key Tasks**: Confirm security-sensitive archive content, reconcile command/path drift in test and deployment tooling, de-track generated artifacts, and preserve protected core flows.
- **Dependencies**: Repository search tools, instruction guardrails, existing workspace files.
- **Success Criteria**: All cleanup recommendations are path-evidenced, contradictions are explicitly resolved, and no protected auth/estate/visitor/role/websocket/test/deploy surface is modified without scoped validation.