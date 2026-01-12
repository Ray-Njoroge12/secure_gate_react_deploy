# Integration Test Matrix: Critical Operations

**Scope:** Auth refresh/logout, invite lifecycle, estate scoping, webhook verification, notification retry/DLQ.

## Legend
- **Priority:** P0 (blocking), P1 (high), P2 (medium)
- **Type:** API = HTTP-level integration, Service = service-layer integration, Data = persistence validation

## 1) Auth Refresh & Logout

| ID | Scenario | Type | Expected Outcome | Priority | Test File/Entry Point |
| --- | --- | --- | --- | --- | --- |
| AUTH-REF-01 | Refresh token succeeds with valid session | API | 200 + new access token, session remains valid | P0 | `tests/integration/auth-refresh.integration.test.js` |
| AUTH-REF-02 | Refresh token fails when session revoked | API | 401/403 + audit log entry | P0 | `tests/integration/auth-refresh.integration.test.js` |
| AUTH-REF-03 | Refresh token fails for expired refresh token | API | 401/403; no new token issued | P0 | `tests/integration/auth-refresh.integration.test.js` |
| AUTH-LOG-01 | Logout invalidates refresh token | API | 200; subsequent refresh returns 401/403 | P0 | `tests/integration/auth.integration.test.js` |
| AUTH-LOG-02 | Logout emits audit log event | Service/Data | Audit log entry created with actor + IP | P1 | `tests/integration/auth.integration.test.js` |

## 2) Invite Lifecycle

| ID | Scenario | Type | Expected Outcome | Priority | Test File/Entry Point |
| --- | --- | --- | --- | --- | --- |
| INV-NEW-01 | Create invite with valid estate scope | API | 201 + invite returned; status pending/active | P0 | `tests/integration/invite-lifecycle.integration.test.js` |
| INV-APR-02 | Approve invite triggers pass/notification | API/Service | Invite approved; pass created; notification queued | P0 | `tests/integration/invite-lifecycle.integration.test.js` |
| INV-EXP-03 | Expired invite cannot be checked in | API | 400/409; audit log entry | P1 | `tests/integration/invite-lifecycle.integration.test.js` |
| INV-DEL-04 | Delete/cancel invite stops future check-ins | API | 200; check-in rejected | P1 | `tests/integration/invite-lifecycle.integration.test.js` |

## 3) Estate Scoping

| ID | Scenario | Type | Expected Outcome | Priority | Test File/Entry Point |
| --- | --- | --- | --- | --- | --- |
| EST-SCP-01 | Admin restricted to assigned estate | API | 403 when accessing other estate data | P0 | `tests/integration/estate-scoping.integration.test.js` |
| EST-SCP-02 | Guard can only check-in for their estate | API | 403 for mismatched estate | P0 | `tests/integration/estate-scoping.integration.test.js` |
| EST-SCP-03 | Resident can only view own estate invites | API | 200 filtered results | P1 | `tests/integration/estate-scoping.integration.test.js` |

## 4) Webhooks

| ID | Scenario | Type | Expected Outcome | Priority | Test File/Entry Point |
| --- | --- | --- | --- | --- | --- |
| WH-VAL-01 | Valid signature accepted | API | 200 + event processed | P0 | `tests/integration/webhook-signature.integration.test.js` |
| WH-VAL-02 | Invalid signature rejected | API | 401/403; no side effects | P0 | `tests/integration/webhook-signature.integration.test.js` |
| WH-VAL-03 | Replay attack (old timestamp) rejected | API | 401/403; audit log entry | P1 | `tests/integration/webhook-signature.integration.test.js` |

## 5) Notification Retry & DLQ

| ID | Scenario | Type | Expected Outcome | Priority | Test File/Entry Point |
| --- | --- | --- | --- | --- | --- |
| NOTIF-RETRY-01 | Failed notification enqueued to DLQ | Service/Data | DLQ entry created with failure metadata | P0 | `tests/integration/notification-queue.integration.test.js` |
| NOTIF-RETRY-02 | Manual retry moves job to processing | API/Service | Retry endpoint requeues job | P0 | `tests/integration/notification-queue.integration.test.js` |
| NOTIF-RETRY-03 | Retry max attempts marks job failed | Service/Data | Status updated to failed-permanent | P1 | `tests/integration/notification-queue.integration.test.js` |

## CI Gate

Critical tests are executed in CI via `npm run test:critical`, which targets the auth refresh/logout, invite lifecycle, estate scoping, webhook signature, and notification queue integration specs.
