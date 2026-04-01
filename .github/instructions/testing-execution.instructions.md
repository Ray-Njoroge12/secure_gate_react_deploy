---
description: "Use when adding or editing tests, debugging test failures, or running validation commands. Enforces project test command selection, ESM-safe Jest execution, and deliberate Playwright config targeting."
name: "Testing Execution Conventions"
applyTo:
  - "**/*.test.{js,jsx,mjs,cjs}"
  - "**/*.spec.{js,jsx,mjs,cjs}"
  - "secure-gate-access/server/tests/**"
  - "secure-gate-access/client/src/**/__tests__/**"
  - "e2e/**/*.js"
---
# Testing Execution Conventions

- Use npm scripts as the default interface for tests.
- For server tests, use server package scripts so NODE_ENV, NODE_NO_WARNINGS, and Jest ESM flags are preserved.
- Prefer narrow test runs first:
  - Target file or suite before full test matrices.
  - Use critical suites for fast backend feedback loops.
- When integration tests need data isolation, use the in-memory app and transaction-based setup patterns from secure-gate-access/docs/testing/integration/guide.md.
- When touching auth/estate behavior, prioritize tests that cover estate scoping and role-protected flows.
- Choose Playwright surface intentionally:
  - Root Playwright config and e2e config are both present.
  - Confirm which config/suite is intended before changing tests or commands.
- Do not treat historical archive reports as authoritative test truth.
- If tooling helpers fail to discover tests, fall back to package-local test commands defined in package scripts.
