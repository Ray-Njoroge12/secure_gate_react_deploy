# 🔐 Secure Gate Access Control System

> **🚨 SECURITY NOTICE**: Critical security vulnerabilities have been **ELIMINATED** as of September 17, 2025.  
> See [SECURITY_CLEANUP_COMPLETED.md](../SECURITY_CLEANUP_COMPLETED.md) for full security audit results.

## 🛡️ Security Status: PRODUCTION READY ✅

- **Client-Server Separation**: SECURED ✅ (server code removed from client)
- **Authentication Architecture**: CLEAN ✅ (no JWT/bcrypt exposure in frontend)  
- **File Structure**: OPTIMIZED ✅ (proper dependency isolation)
- **Production Deployment**: READY ✅ (consolidated startup process)

---

## System Test Summary (Phase 9)
- Backend tests: PASS (15/15)
  - Covered OTP flows, lifecycle (check-in/out/revoke/self-check-in), SSE safety and role gating, metrics endpoint (admin-only), caching HIT on repeat, and PII masking in reports aggregates.
- Frontend tests: PASS (2/2 suites)
  - Reports aggregates UI (counts, dailyTotals chart/table, masked hostSummary, conditional host filter).
  - GuardDashboard SSE toasts (severity filter with persistence, auto-dismiss, auto-scroll, visible count badge, no PII in UI).
- Client build: PASS (CRA production build succeeded).
- Optional cache validation: X-Cache header available on cached endpoints (e.g., `GET /api/visitors/active`, `GET /api/visitors/reports?mode=aggregates`) when requested with appropriate headers.

Manual verification (optional):
- Start server (`npm start` in `server`) and client (`npm start` in `client`).
- Login as guard/admin and open Guard Dashboard to observe live SSE toasts; toggle severity filter and confirm persistence across reloads.
- Open Admin Reports to inspect status badges, dailyTotals chart, and hostSummary; verify host filter appears only when supported.

Security and PII:
- SSE and logs contain minimal, PII-safe payloads; emails/phones are masked; OTPs are never returned.

# Secure Gate Access — Phase 3-5 Additions

## Visitor Lifecycle Endpoints

- POST `/api/visitors/:id/check-in` → 200 { id, status: 'ON_PREMISE', check_in_time } or { id, already_checked_in: true }
- POST `/api/visitors/:id/check-out` → 200 { id, status: 'EXITED', check_out_time } or { id, already_checked_out: true }
- POST `/api/visitors/:id/revoke` → 200 { id, status: 'REVOKED' }
- GET `/api/visitors/active` → Active visitors list (ON_PREMISE or checked-in without check-out)
- GET `/api/visitors/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&host=email&status=CONFIRMED|ON_PREMISE|EXITED|REVOKED&format=csv|json`

Notes:
- Idempotency: Repeating check-in/out returns 200 with `already_checked_in`/`already_checked_out` flags.
- Reporting: CSV returns `text/csv`; JSON wraps results in `{ success, data }`.
- Security: OTP values and hashes are never persisted in responses or logs; use `OTP_DEBUG_ECHO=true` only in tests.

## Roles

- Guard/Admin: check-in, check-out, revoke, active list, reports, SSE endpoint.
- Resident: create invites and view own visitor history.
- Public: self check-in requires prior OTP verification.

## Auditing

All lifecycle and OTP events are logged to `access_logs.metadata` using a unified schema:
`{ event_type, actor, target, timestamp, outcome, message, metadata, request_id, context }`.

## Phase 4 Features

- Guard SSE channel: GET `/api/ws/guards` (SSE). Requires guard/admin headers. Emits events:
  - `visitor.check_in`, `visitor.check_out`, `visitor.revoked`, `visitor.self_check_in`
  - Payload: minimal safe subset (event_type, target{id}, timestamp, outcome, metadata{status}).
- QR Self Check-In: POST `/api/visitors/self-check-in/:inviteCode` (idempotent, requires OTP verified)
- Host notifications: `NOTIFY_STRATEGY=email|sms|none` using existing adapters.

## Phase 5 Client-Side Development ✅ COMPLETED

### Features Implemented
- **Guest Invitation Page**: `/guest-invite/:inviteCode` with form validation and QR display
- **Enhanced Bulk Upload**: CSV processing with papaparse, batch visitor creation
- **Enhanced Visitor Creation**: QR generation, auto-approval, robust error handling
- **Service Layer Standardization**: Centralized HTTP utilities (`_http.js`)
- **Error Mapping System**: User-friendly error messages (`errorMapper.js`)
- **Authentication Enhancements**: User persistence, role management, session handling
- **Comprehensive Testing**: Unit tests, E2E PowerShell scripts, failure tracking

### Dependencies Added
- `react-qr-code@2.0.15`: QR code generation and display
- `papaparse@5.4.1`: CSV parsing for bulk operations
- `@testing-library/react@16.3.0`: Enhanced testing infrastructure

### Technical Architecture
```
client/src/
├── pages/GuestInvite.jsx              # New guest invitation completion
├── services/_http.js                  # Centralized HTTP service layer
├── utils/errorMapper.js               # Error handling and user feedback
├── context/AuthContext.js             # Enhanced auth with persistence
└── __tests__/                         # Comprehensive test coverage
```

### Known Issues
- **Test imports**: Component resolution issues in Jest (documented in FAILED_TESTS.md)
- **Security**: 9 npm vulnerabilities remain (react-scripts limitations)
- **Peer deps**: React 18 warnings (mitigated with --legacy-peer-deps)

### Status: Ready for Phase 6
**Completion Report**: See `PHASE5_COMPLETION.md` for detailed implementation status

---

## Legacy Phase 5 Backend Enhancements

- Unified audit across invite, OTP, check-in/out, revoke, self-check-in (consistent schema).
- Strict role enforcement across routes (see Roles above).
- PII redaction: logs/SSE/notifications never include OTPs/hashes; email/phone masked when logged.
- SSE emits minimal payload; frontend does not render sensitive fields.
- Compliance test plan: lifecycle, role gating, audit coverage, idempotency, SSE minimal payload.

## Phase 6 Enhancements

- Performance: Added pg Pool tuning (max=20, idleTimeout=30s, connectTimeout=5s).
- Caching: 30s TTL in-memory cache for hot endpoints (`GET /api/visitors/active`, `GET /api/visitors/reports`). Returns `X-Cache: HIT|MISS` header.
- Metrics: `GET /api/metrics` (admin-only) returns `{ otps_issued, checkins, checkouts, revokes, sse_clients }`.
- Logging: Structured JSON logs via lightweight logger in utils; audit logs continue to include `request_id`.
- Security: Helmet middleware added for secure headers; role header strictly validated; SSE payload minimized; no OTP/PII in logs or SSE.
- Deployment: Use `npm start` or `NODE_ENV=production node server.js`; recommend Node 18+; configure env vars (PG*, SMTP*, SMS*, NOTIFY_STRATEGY, ADMIN_EMAIL/PHONE).

## Phase 7-8 Frontend Enhancements

- Reports (Admin):
  - Aggregates via `GET /api/visitors/reports?mode=aggregates` — counts by status, visitors per day, PII-safe top hosts.
  - UI shows status badges, daily totals table, and masked host summary when available.
  - Host filter input is conditionally shown if a host query is present or hostSummary exists.
  - CSV/JSON export preserved and PII-safe.

- Guard Dashboard:
  - Real-time SSE toasts with minimal payload and severity (info/warning/error); no PII content.
  - Optional toast severity filter (All/Info/Warning/Error), auto-dismiss after ~4s, up to 5 recent.
  - Aggregate badges derived from active visitors list.

- Testing & Build:
  - Frontend tests cover aggregates rendering and SSE toasts.
  - CRA build remains green.
