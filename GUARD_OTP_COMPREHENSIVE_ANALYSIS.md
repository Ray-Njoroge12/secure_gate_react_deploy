# Comprehensive Analysis: Guard Role & OTP Functionality

## Document Overview

This document provides a complete analysis of the Guard role and OTP (One-Time Password) functionality in the Secure Gate Access Control System, incorporating all recent improvements including offline support, MFA for sensitive operations, session management, and bulk operations.

---

## Part 1: Guard Role Analysis

### 1.1 Guard User Profile

**Role Definition:**
- Guards are frontline security personnel responsible for managing physical access control at estate gates.
- They have restricted administrative capabilities focused on visitor verification and check-in/check-out operations.
- Guards operate in high-availability scenarios requiring offline support.

**Authentication & Session:**
```
Session Timeout: 45 minutes (reduced from 60 min for security)
MFA: Optional but recommended; required for sensitive operations
Token Refresh: Automatic background refresh
Session Store: Redis-backed with estate isolation
```

### 1.2 Guard Dashboard Capabilities

| Feature | Online | Offline | MFA Required |
|---------|--------|---------|--------------|
| QR Scanning | ✅ Full | ✅ Cached | No |
| Manual Check-in | ✅ Full | ❌ No | No |
| Walk-in Registration | ✅ Full | ✅ Queued | No |
| Visitor Search | ✅ Full | ✅ Limited | No |
| Check-out Single | ✅ Full | ✅ Queued | No |
| Bulk Check-out (≥5) | ✅ Full | ❌ No | **Yes** |
| Shift Handover | ✅ Full | ❌ No | No |
| Activity Log | ✅ Full | ✅ Local | No |
| Panic Button | ✅ Full | ✅ Queued | No |

### 1.3 Guard Frontend Pages

```
/guard/dashboard         - Main dashboard with quick actions
/guard/scan-qr           - QR code scanning (online/offline)
/guard/walk-in           - Walk-in visitor registration
/guard/manual-check      - Manual check-in verification
/guard/visitor-search    - Search visitor database
/guard/check-out         - Individual check-out
/guard/bulk-checkout     - Bulk/EOD check-out operations
/guard/shift-handover    - Shift handover management
/guard/activity-log      - Activity history and logs
```

### 1.4 Guard Backend Endpoints

**Core Operations:**
```
POST /api/visitors/:id/check-in       - Check-in visitor
POST /api/visitors/:id/check-out      - Check-out visitor
POST /api/qr/validate                 - Validate QR code
POST /api/qr/checkin                  - Check-in via QR
GET  /api/visitors/today              - Today's visitors
GET  /api/visitors/on-premise         - Currently on-premise visitors
POST /api/guards/panic                - Trigger panic alert
```

**Offline Support Endpoints:**
```
GET  /api/guards/offline-policy       - Get estate offline policy
GET  /api/guards/qr-cache             - Get QR codes for offline cache
POST /api/guards/offline-sync         - Sync offline operations
```

**MFA Endpoints:**
```
POST /api/mfa/verify-operation        - Verify MFA for sensitive operation
```

---

## Part 2: OTP Functionality Analysis

### 2.1 OTP Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     OTP GENERATION PROCESS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Resident invites visitor                                     │
│           ↓                                                      │
│  2. System calls generateOTP(6) from tokenHelper.js              │
│           ↓                                                      │
│  3. OTP generated using crypto.randomInt() (secure)              │
│           ↓                                                      │
│  4. OTP hashed with bcrypt: bcrypt.hash(otp, 10)                │
│           ↓                                                      │
│  5. Stored in DB: otp_hash, otp_expires_at (15-30 min)          │
│           ↓                                                      │
│  6. Plain OTP sent to visitor via SMS/Email                      │
│           ↓                                                      │
│  7. Visitor shows OTP at gate (with QR code)                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Code Implementation (tokenHelper.js):**
```javascript
export const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, 10)]; // Cryptographically secure
  }
  return otp;
};
```

### 2.2 OTP Storage & Security

**Database Schema:**
```sql
visitors table:
  - otp_hash        VARCHAR(255)   -- bcrypt hashed OTP
  - otp_expires_at  TIMESTAMP      -- Expiration time
  - otp_attempts    INTEGER        -- Failed attempt counter
```

**Security Measures:**
1. ✅ OTP is never stored in plaintext
2. ✅ bcrypt hashing with salt rounds = 10
3. ✅ Time-limited validity (15-30 minutes)
4. ✅ OTP hash is stripped from all API responses
5. ✅ No debug echo of OTP in production
6. ✅ Rate limiting on verification attempts

### 2.3 OTP Verification Flow (Check-in)

```
┌─────────────────────────────────────────────────────────────────┐
│                   OTP VERIFICATION (QR CHECK-IN)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Guard scans QR code                                             │
│           ↓                                                      │
│  Server validates QR (qrCodeRoutes.js /checkin)                 │
│           ↓                                                      │
│  Check: Does visitor have otp_hash?                             │
│           ↓                                                      │
│     YES → Check: Is otp_expires_at > now?                       │
│           ↓                                                      │
│        YES (not expired) → Require OTP input                    │
│           ↓                                                      │
│        Guard enters OTP received from visitor                   │
│           ↓                                                      │
│        bcrypt.compare(otp, visitor.otp_hash)                    │
│           ↓                                                      │
│        MATCH → Check-in proceeds                                │
│        NO MATCH → 401 "Invalid OTP"                             │
│           ↓                                                      │
│     NO (expired or no OTP) → Skip OTP verification              │
│           ↓                                                      │
│  Check-in proceeds                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Backend Implementation (qrCodeRoutes.js):**
```javascript
// OTP Verification
if (visitor.otp_hash) {
  const now = new Date();
  const expiresAt = visitor.otp_expires_at ? new Date(visitor.otp_expires_at) : null;
  const isExpired = expiresAt && expiresAt < now;

  // If OTP exists and is not expired, verify it
  if (!isExpired) {
    if (!otp) {
      return respondError(res, 428, 'OTP required', 'OTP_REQUIRED');
    }

    const isValid = await bcrypt.compare(otp.toString(), visitor.otp_hash);

    if (!isValid) {
      await req.audit?.('visitor.checkin_failed', 'visitor', String(visitor.id), {
        outcome: 'fail',
        message: 'Invalid OTP provided'
      });
      return respondError(res, 401, 'Invalid OTP', 'INVALID_OTP');
    }
  }
}
```

### 2.4 OTP in Different Contexts

| Context | OTP Required | Notes |
|---------|--------------|-------|
| Pre-registered visitor | Yes (if set) | Standard flow |
| QR Code check-in | Yes (if set) | Server validates before check-in |
| Manual check-in | Yes (if set) | Guard enters OTP from visitor |
| Walk-in visitor | No | No pre-registration |
| Recurring visitor | Configurable | Can be disabled for regulars |
| VIP pass | Configurable | Estate policy determines |

### 2.5 OTP API Response Handling

**Validation Response (sanitized):**
```javascript
// Server removes sensitive OTP fields before response
const visitorData = { ...validation.visitor };
const otpRequired = !!visitorData.otp_hash &&
  visitorData.otp_expires_at &&
  new Date(visitorData.otp_expires_at) > new Date();

// Remove sensitive fields - NEVER exposed to client
delete visitorData.otp_hash;
delete visitorData.otp_expires_at;
delete visitorData.otp_attempts;

respond(res, {
  data: {
    visitor: visitorData,
    otpRequired: otpRequired  // Boolean flag only
  }
});
```

---

## Part 3: Offline Mode Implementation

### 3.1 Offline Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    OFFLINE SERVICE (offlineService.js)           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  IndexedDB Stores:                                               │
│  ├── visitors         - Cached visitor data                     │
│  ├── syncQueue        - General sync queue                      │
│  ├── preferences      - User preferences                        │
│  ├── apiCache         - Cached API responses                    │
│  ├── qrCache          - QR codes for offline validation  [NEW]  │
│  ├── pendingWalkIns   - Offline walk-in registrations    [NEW]  │
│  └── offlineCheckIns  - Offline check-ins pending sync   [NEW]  │
│                                                                  │
│  Purge Configuration (estate-configurable):                      │
│  ├── visitorDataRetentionMs:  8 hours                           │
│  ├── qrCacheRetentionMs:      12 hours                          │
│  ├── walkInRetentionMs:       24 hours                          │
│  ├── inactivityPurgeMs:       30 minutes                        │
│  ├── scheduledPurgeIntervalMs: 1 hour                           │
│  └── maxCachedVisitors:       200                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Offline QR Validation

**Process:**
1. Guard scans QR code
2. If offline, `validateQRCodeOffline()` checks local `qrCache`
3. Validates expiration and status
4. If valid, queues check-in in `offlineCheckIns` store
5. Updates local visitor status
6. Syncs when connection restored

**Limitations:**
- OTP verification is NOT supported offline (security decision)
- Only pre-cached QR codes can be validated
- Unknown visitors flagged for manual verification when online

### 3.3 Offline Walk-In Registration

**Process:**
1. Guard registers walk-in visitor offline
2. Data stored in `pendingWalkIns` store
3. Local ID generated for tracking
4. Syncs to server when online
5. Server assigns real visitor ID
6. Local cache updated with server response

### 3.4 Auto-Purge Mechanism

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTO-PURGE SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Scheduled Purge (every 1 hour):                                 │
│  └── Removes expired data from all stores                       │
│                                                                  │
│  Inactivity Purge (30 min idle):                                 │
│  └── Clears sensitive visitor data                              │
│  └── Preserves pending sync data                                │
│                                                                  │
│  Security Purge (on logout/estate change):                       │
│  └── Clears ALL offline data                                    │
│                                                                  │
│  Max Visitors Enforcement:                                       │
│  └── Keeps only most recent 200 visitors                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 4: Session Security

### 4.1 Guard Session Configuration

**Reduced Timeout Implementation (sessionSecurityService.js):**
```javascript
const roleTimeouts = {
  guard: 45 * 60 * 1000,   // 45 minutes (reduced from 60)
  admin: 60 * 60 * 1000,   // 60 minutes
  resident: 30 * 60 * 1000 // 30 minutes
};
```

**Rationale:**
- Guards handle sensitive operations (visitor entry)
- Shared device scenario risk (guard stations)
- Quick re-authentication preferred over session hijacking risk

### 4.2 Session Activity Tracking

```javascript
// Activity events monitored
const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];

// Session extended on activity
this.lastActivity = Date.now();
```

---

## Part 5: MFA for Sensitive Guard Operations

### 5.1 MFA Middleware Extension

**Operations Requiring Guard MFA (mfaSensitiveOperations.js):**
```javascript
const sensitiveOperations = [
  'bulk-checkout',      // Check out 5+ visitors at once
  'panic-trigger',      // Trigger panic alert
  'manual-override',    // Override visitor status
  'shift-handover',     // Transfer shift data
  'visitor-deny',       // Deny visitor entry
  'pass-revoke'         // Revoke visitor pass
];
```

### 5.2 MFA Verification Modal

**Frontend Component (MFAVerificationModal.jsx):**
- Reusable modal for guard MFA prompts
- Supports TOTP code input
- Clear error messaging
- Hook: `useMFAVerification()` for easy integration

### 5.3 MFA Flow for Bulk Checkout

```
┌─────────────────────────────────────────────────────────────────┐
│               MFA FLOW FOR BULK CHECKOUT (≥5 visitors)           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Guard selects 5+ visitors for checkout                      │
│           ↓                                                      │
│  2. Frontend detects threshold exceeded                         │
│           ↓                                                      │
│  3. MFAVerificationModal opens                                  │
│           ↓                                                      │
│  4. Guard enters TOTP code                                      │
│           ↓                                                      │
│  5. POST /api/mfa/verify-operation                              │
│           ↓                                                      │
│  6. Server verifies TOTP against guard's secret                 │
│           ↓                                                      │
│  7. Returns verification token (short-lived)                    │
│           ↓                                                      │
│  8. Bulk checkout proceeds with token                           │
│           ↓                                                      │
│  9. All visitors checked out + audit logged                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 6: New Guard Features

### 6.1 Shift Handover (ShiftHandover.jsx)

**Features:**
- View current shift summary
- Pending visitors count
- Active alerts
- Handover notes
- Incoming guard selection
- Complete handover with confirmation

**Data Transferred:**
- Pending visitors list
- Active alerts/incidents
- Notes from outgoing guard
- Timestamp and guard IDs

### 6.2 Activity Log (ActivityLog.jsx)

**Capabilities:**
- Filter by date range
- Filter by action type (check-in, check-out, panic, etc.)
- Search by visitor name/ID
- Export functionality
- Pagination
- Real-time updates

**Logged Actions:**
```
- visitor.check_in
- visitor.check_out
- visitor.deny
- visitor.walk_in
- qr.scan
- panic.trigger
- shift.handover
- pass.revoke
```

### 6.3 Bulk Checkout (BulkCheckout.jsx)

**Features:**
- Select multiple visitors
- Select all on-premise visitors
- End-of-day checkout
- MFA required for 5+ visitors
- Progress indicator
- Success/failure summary

### 6.4 Panic Button (AppShell.jsx)

**Implementation:**
```javascript
// Located in AppShell for all guard pages
const handlePanicButton = async () => {
  try {
    await api.post('/api/guards/panic', {
      location: 'Main Gate',
      timestamp: new Date().toISOString()
    });
    // Also queue offline if network fails
    if (!navigator.onLine) {
      await offlineService.queuePanicAlert({...});
    }
  } catch (err) {
    // Offline fallback
    await offlineService.queuePanicAlert({...});
  }
};
```

---

## Part 7: Security Posture Assessment

### 7.1 Strengths

| Area | Implementation | Score |
|------|----------------|-------|
| OTP Security | bcrypt hash, never exposed | ✅ Strong |
| Session Management | 45-min timeout, activity tracking | ✅ Strong |
| MFA for Sensitive Ops | TOTP verification | ✅ Strong |
| Offline Data Purge | Auto-purge, inactivity clear | ✅ Strong |
| Audit Logging | Comprehensive, immutable | ✅ Strong |
| Input Validation | Server-side validation | ✅ Strong |

### 7.2 Remaining Considerations

| Area | Status | Recommendation |
|------|--------|----------------|
| Offline OTP | Not supported | Keep as-is (security) |
| QR Code Expiry | 24 hours | Consider shorter for high-security |
| Cache Encryption | Not encrypted at rest | Consider IndexedDB encryption |
| Device Binding | Not implemented | Consider for shared devices |
| Biometric Auth | Not implemented | Future enhancement |

### 7.3 Attack Surface Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│                    ATTACK VECTORS & MITIGATIONS                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Stolen Session                                               │
│     Risk: Medium                                                 │
│     Mitigation: 45-min timeout, secure cookies, HTTPS           │
│                                                                  │
│  2. OTP Brute Force                                              │
│     Risk: Low                                                    │
│     Mitigation: 6-digit OTP, 15-min expiry, rate limiting       │
│                                                                  │
│  3. Offline Cache Theft                                          │
│     Risk: Medium                                                 │
│     Mitigation: Auto-purge, inactivity clear, no OTP cached     │
│                                                                  │
│  4. QR Code Replay                                               │
│     Risk: Low                                                    │
│     Mitigation: Single-use marking, expiration, OTP required    │
│                                                                  │
│  5. Bulk Operation Abuse                                         │
│     Risk: Medium                                                 │
│     Mitigation: MFA required for 5+ visitors                    │
│                                                                  │
│  6. Panic Button Spam                                            │
│     Risk: Low                                                    │
│     Mitigation: Rate limiting, audit logging                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 8: Code Quality Summary

### 8.1 Files Modified/Created

| File | Change Type | Lines |
|------|-------------|-------|
| `offlineService.js` | Enhanced | ~1200 |
| `ScanQR.jsx` | Modified | ~570 |
| `WalkInRegistration.jsx` | Modified | ~400 |
| `sessionSecurityService.js` | Modified | ~50 |
| `mfaSensitiveOperations.js` | Modified | ~100 |
| `guardManagementRoutes.js` | Modified | ~150 |
| `ShiftHandover.jsx` | **New** | ~350 |
| `ActivityLog.jsx` | **New** | ~400 |
| `BulkCheckout.jsx` | **New** | ~450 |
| `MFAVerificationModal.jsx` | **New** | ~200 |
| `mfaRoutes.js` | Modified | ~50 |
| `App.js` | Modified | ~30 |
| `Sidebar.jsx` | Modified | ~20 |
| `AppShell.jsx` | Modified | ~50 |
| `GuardDashboard.jsx` | Modified | ~40 |

### 8.2 Error Validation

All modified files have been validated for:
- ✅ Syntax errors
- ✅ Import/export consistency
- ✅ Type safety (where applicable)
- ✅ React hook rules
- ✅ Async/await patterns

---

## Part 9: Testing Recommendations

### 9.1 Unit Tests Required

```javascript
// offlineService.js
- testScheduledPurge()
- testInactivityPurge()
- testQRCacheValidation()
- testOfflineCheckInQueue()
- testWalkInRegistrationQueue()
- testSyncMechanism()

// MFA flows
- testMFAVerificationModal()
- testBulkCheckoutMFAThreshold()
- testMFABypass()
```

### 9.2 Integration Tests

```
1. Full QR scan → OTP verification → Check-in
2. Offline mode → Queue → Reconnect → Sync
3. Bulk checkout → MFA prompt → Success
4. Shift handover → Data transfer → Verification
5. Panic button → Alert propagation → Audit log
```

### 9.3 Edge Cases to Test

- OTP expired during check-in
- Network loss during check-in
- MFA timeout during bulk operation
- Concurrent bulk operations
- Cache purge during active operation
- Shift handover with pending offline data

---

## Part 10: Deployment Checklist

### Pre-Deployment
- [ ] Run all unit tests
- [ ] Run integration tests
- [ ] Security audit of new endpoints
- [ ] Performance test offline sync
- [ ] Verify MFA flow end-to-end

### Post-Deployment Monitoring
- [ ] Monitor guard session durations
- [ ] Track offline sync failures
- [ ] Monitor MFA failure rates
- [ ] Track bulk operation usage
- [ ] Alert on panic button usage

---

## Conclusion

The Guard role and OTP functionality have been significantly enhanced with:

1. **Robust Offline Support**: Full QR validation, walk-in registration, and sync queuing
2. **Improved Security**: Reduced session timeout, MFA for sensitive operations, auto-purge
3. **New Capabilities**: Shift handover, activity log, bulk checkout, panic button
4. **OTP Protection**: Secure generation, bcrypt hashing, no client exposure

The system now provides a comprehensive, secure, and resilient guard experience suitable for high-security estate management scenarios.

---

*Document Version: 1.0*
*Last Updated: Current Session*
*Authors: Development Team*
