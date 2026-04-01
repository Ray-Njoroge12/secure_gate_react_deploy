---
description: "Use when editing Express backend routes, controllers, services, middleware, or database access in secure-gate-access/server/src. Enforces estate scoping, middleware order, ESM patterns, and standardized API/error handling."
name: "Backend Estate Guardrails"
applyTo:
  - "secure-gate-access/server/src/**/*.js"
  - "secure-gate-access/server/src/**/*.mjs"
---
# Backend Estate Guardrails

- Keep backend code ESM-only. Do not introduce CommonJS patterns in server source.
- Preserve protected route middleware order: auth, role policy, then estate enforcement for estate-scoped resources.
- Ensure user-generated data queries remain estate-filtered using request estate context.
- Treat missing estate scope as a security defect, not a convenience fallback.
- Use existing error/response conventions:
  - Throw AppError for controlled failures.
  - Prefer async handler wrappers used by the current codebase.
  - Return standardized JSON response helpers where available.
- Keep feature flags and optional integrations non-breaking:
  - AWS Secrets Manager via USE_AWS_SECRETS.
  - Datadog tracing via ENABLE_DD_TRACE.
  - Sentry via SENTRY_DSN.
  - Redis-backed features must degrade safely when Redis is unavailable.
- Follow the established app middleware ordering in server app wiring; avoid moving security middleware casually.
- Prefer extending existing route/domain files and service modules over creating parallel abstractions.
- For integration tests, prefer in-memory app plus transaction isolation patterns documented in secure-gate-access/docs/testing/integration/guide.md.
- Run server tests through npm scripts so Jest ESM flags and environment setup are preserved.
