---
description: "Use when editing React routes, pages, auth flows, API calls, or WebSocket client code in secure-gate-access/client/src. Preserves role-based routing, AppShell boundaries, and cookie-based auth patterns."
name: "Frontend Routing And Auth"
applyTo:
  - "secure-gate-access/client/src/**/*.js"
  - "secure-gate-access/client/src/**/*.jsx"
---
# Frontend Routing And Auth

- Preserve lazy-loaded route structure and role boundaries in client app routing.
- Keep protected pages wrapped with the existing ProtectedRoute pattern and role constraints.
- Maintain AppShell usage for role-specific page framing rather than ad-hoc wrappers.
- Use AuthContext as the source of truth for authenticated user state.
- Keep authentication cookie-based. Do not add localStorage token persistence.
- Reuse the shared API client for HTTP calls and error handling behavior.
- Preserve session-expiry, estate-required, and MFA-required navigation flows already handled by the auth/api utilities.
- Keep WebSocket behavior wired through existing hooks/utilities and user context.
- Prefer Context + hooks patterns; do not introduce Redux for new state paths.
- Follow existing component and route naming conventions and keep role pages inside their current role folders.
