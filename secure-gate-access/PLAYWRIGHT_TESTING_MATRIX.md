# Playwright Testing Matrix

This document is the canonical map of Playwright usage in this repository.

## Canonical Operator Commands (Run From Repo Root)

Use the root-first namespace as the canonical invocation path:

```bash
npm run test:playwright
npm run test:playwright:client
npm run test:playwright:client:resident-smoke
npm run test:playwright:server
```

Optional variants are also available:

```bash
npm run test:playwright:client:headed
npm run test:playwright:client:ui
npm run test:playwright:client:debug
npm run test:playwright:server:headed
npm run test:playwright:server:ui
npm run test:playwright:server:debug
```

Retired command (intentional guardrail):

```bash
npm run test:playwright:root
```

This command now exits with an explicit retirement message to avoid silent zero-test passes.

Package-local scripts in `secure-gate-access/client` and `secure-gate-access/server` remain supported as compatibility paths.

## Scope

There are two active Playwright execution surfaces in the repo:

1. Client Playwright (frontend browser flows)
2. Server-side Playwright (backend/browser integration specs)

Keep these surfaces separated when running, debugging, or updating tests.

## Root Surface Status (Retired)

- Root-level Playwright execution is retired for now because there is no active root `e2e/` suite.
- Deprecated commands intentionally fail with guidance:

```bash
npm run test:playwright:root
```

Use `npm run test:playwright` (client + server) for canonical root-invoked execution.

## 1) Client Playwright

- Config (main): `secure-gate-access/client/playwright.config.js`
- Config (resident smoke): `secure-gate-access/client/playwright.resident.smoke.config.js`
- Shared presets source: `secure-gate-access/playwright.shared.cjs`
- Tests: `secure-gate-access/client/e2e/tests/*.e2e.js`
- Auth/session bootstrap: `secure-gate-access/client/e2e/global-setup.js`
- Canonical commands (from repo root):

```bash
npm run test:playwright:client
npm run test:playwright:client:resident-smoke
npm run test:playwright:client:ui
npm run test:playwright:client:headed
npm run test:playwright:client:debug
```

Compatibility commands (from `secure-gate-access/client`):

```bash
npm run test:playwright
npm run test:playwright:resident-smoke
npm run test:playwright:ui
npm run test:playwright:headed
npm run test:playwright:debug
npm run test:playwright:report
```

## 2) Server Playwright Surface

- Playwright config: `secure-gate-access/server/tests/e2e/playwright.config.js`
- Playwright specs: `secure-gate-access/server/tests/e2e/specs/*.spec.js`
- Additional server E2E tests are Jest-based under `secure-gate-access/server/tests/e2e/` (separate from Playwright commands).

Because server E2E is mixed, use the root canonical server command (which delegates to server package scripts that pin the Playwright config):

- Use server Jest commands for Jest E2E suites.
- Use `test:playwright*` scripts in `secure-gate-access/server` for Playwright specs.

Example (from repo root):

```bash
npm run test:playwright:server
npm run test:playwright:server -- --list
```

## Shared Playwright Utilities

There are two shared files with similar names but different scopes:

- Root shared: `playwright.shared.cjs` (used by root config)
- Monorepo shared: `secure-gate-access/playwright.shared.cjs` (used by client + server Playwright configs)

Do not assume they are interchangeable.

## Generated Artifacts Policy

Generated Playwright outputs should not be committed:

- `playwright-report/`
- `playwright-results*.json`
- `test-results/`

These are already gitignored for client/root paths. If one appears in Git, remove it from source control and regenerate locally as needed.

## Cleanup Checklist

When cleaning Playwright-related files/docs:

1. Verify command examples against actual `package.json` scripts.
2. Keep root/client/server surfaces clearly separated.
3. Avoid mixing Jest E2E and Playwright E2E terminology.
4. Remove tracked generated artifacts.
5. Update this matrix first, then update secondary docs that reference Playwright.
