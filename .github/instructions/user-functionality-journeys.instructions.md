---
description: "Use when editing authentication, role permissions, estate scoping, or user journey flows across frontend and backend. Protects resident, guard, admin, and super_admin functionality during feature work and fixes."
name: "User Functionality And Journeys"
applyTo:
  - "secure-gate-access/client/src/pages/**/*.js"
  - "secure-gate-access/client/src/pages/**/*.jsx"
  - "secure-gate-access/client/src/routes/**/*.js"
  - "secure-gate-access/client/src/routes/**/*.jsx"
  - "secure-gate-access/client/src/contexts/AuthContext.js"
  - "secure-gate-access/client/src/utils/apiClient.js"
  - "secure-gate-access/server/src/middleware/authMiddleware.js"
  - "secure-gate-access/server/src/middleware/estateContextMiddleware.js"
  - "secure-gate-access/server/src/routes/**/*.js"
  - "secure-gate-access/server/src/services/userService.js"
---
# User Functionality And Journeys

- Treat edits in auth, role, and estate context as high-risk behavior changes.
- Preserve role boundaries for resident, guard, admin, and super_admin.
- Keep estate/site scoping intact for protected data and workflows.
- Maintain existing session behavior:
  - Cookie-based auth lifecycle.
  - Refresh-token and unauthorized handling paths.
  - Estate-required and MFA-required user flows.
- For journey-impacting changes, validate affected flows explicitly:
  - Resident invite lifecycle.
  - Guard check-in/check-out.
  - Admin approvals and management paths.
- When startup or health logic is touched, verify boot and health endpoints remain stable.
- Prefer targeted tests for changed journeys before broad suites.
- If behavior changes are intentional, document the impact in code comments or linked task context.
