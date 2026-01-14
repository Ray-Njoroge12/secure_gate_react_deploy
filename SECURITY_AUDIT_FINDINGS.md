# Security & Privacy Audit Findings

**Date**: 2024
**Scope**: Secure Gate Access System - Privacy & Security Claims Verification

---

## Executive Summary

This audit verified 5 high-impact security and privacy claims against the current codebase. The findings confirm **most claims are valid** with varying degrees of implementation gaps.

### Overall Status: ⚠️ **REQUIRES ATTENTION**

- ✅ 2 Claims **Verified as Issues**
- ⚠️ 2 Claims **Partially Implemented** 
- ℹ️ 1 Claim **Infrastructure Exists** (not fully utilized)

---

## Detailed Findings

### 1. ⚠️ QR Code Data Minimization - **PARTIALLY IMPLEMENTED**

**Claim**: QR codes contain full PII (name, phone, purpose) instead of tokenized reference

**Status**: ⚠️ **PARTIALLY VERIFIED**

#### Evidence:
- **File**: `server/src/services/qrCodeService.js` (lines 52-64)
- QR codes currently include:
  ```javascript
  const payload = {
    qrId: qrId,
    visitorId: visitorData.id,
    type: 'visitor_invite',
    name: visitorData.name,        // ❌ PII
    phone: visitorData.phone,      // ❌ PII
    purpose: visitorData.purpose,  // ❌ Potentially sensitive
    validFrom: visitorData.date_of_visit,
    expiresAt: expirationTime.toISOString()
  };
  ```

#### Security Impact:
- **Risk Level**: MEDIUM-HIGH
- QR codes can be scanned by anyone with a camera
- PII is readable if JWT is decoded (not encrypted, just signed)
- Data exposure window extends for QR code lifetime (~24 hours)

#### Current Mitigation:
- ✅ QR codes use JWT signing (prevents tampering)
- ✅ QR codes include expiration (`expiresAt`)
- ✅ Server-side validation required before access granted
- ❌ No tokenized reference approach

#### Recommendation:
**Priority**: HIGH

Replace PII with tokenized reference:
```javascript
const payload = {
  qrId: qrId,           // ✓ Already UUID
  visitorId: visitorData.id,  // ✓ Database reference only
  type: 'visitor_invite',
  // Remove: name, phone, purpose
  expiresAt: expirationTime.toISOString()
};
```

---

### 2. ✅ OTP Debug Echo - **VERIFIED ISSUE**

**Claim**: OTP debug echo (returning OTP in API response) has no production guard

**Status**: ✅ **VERIFIED**

#### Evidence:
- **File**: `server/src/controllers/visitorInviteController-optimized.js` (lines 27-29)
- **Environment Check**: `process.env.OTP_DEBUG_ECHO === 'true'`
- **No Production Guard**: Code will echo OTP in production if env var is set

```javascript
function shouldEchoOtp() {
  return process.env.OTP_DEBUG_ECHO === 'true';
}
```

Usage in controller (line 234):
```javascript
if (shouldEchoOtp()) {
  sentVia.otp = otpCode; // ❌ Echoed in response
}
```

#### Security Impact:
- **Risk Level**: CRITICAL
- OTP leakage in API responses if `OTP_DEBUG_ECHO=true` in production
- Defeats entire purpose of OTP security
- Could be logged by proxies, browsers, monitoring tools

#### Current Mitigation:
- ❌ No NODE_ENV check
- ❌ No production safeguard
- ⚠️ Relies solely on operator discipline (not setting env var)

#### Recommendation:
**Priority**: CRITICAL

Add production guard:
```javascript
function shouldEchoOtp() {
  // NEVER echo OTP in production
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return process.env.OTP_DEBUG_ECHO === 'true';
}
```

---

### 3. ℹ️ ID Number Encryption - **INFRASTRUCTURE EXISTS**

**Claim**: ID numbers are not encrypted at rest

**Status**: ℹ️ **INFRASTRUCTURE EXISTS** (not fully utilized)

#### Evidence:

**Schema** (`server/src/database/schema.sql` line 22):
```sql
id_number VARCHAR(50),  -- ❌ No encrypted column variant
```

**Encryption Service Available** (`server/src/utils/encryptionHelper.js`):
```javascript
const VISITOR_ENCRYPTED_FIELDS = ['name', 'phone', 'email', 'id_number', 'vehicle_plate'];

// Lines 99, 149 - encryption logic exists
id_number_encrypted: visitorData.id_number ? 
  await encryptionService.encrypt(visitorData.id_number) : null
```

#### Current State:
- ✅ Encryption service capable of handling `id_number`
- ✅ Field listed in `VISITOR_ENCRYPTED_FIELDS` array
- ❌ Database schema missing `id_number_encrypted` column
- ⚠️ Controllers not utilizing encryption for ID numbers

#### Security Impact:
- **Risk Level**: HIGH
- ID numbers are government-issued sensitive identifiers
- Database compromise exposes all ID numbers in plaintext
- Regulatory compliance risk (GDPR/DPA requires encryption of sensitive IDs)

#### Recommendation:
**Priority**: HIGH

1. Add database column:
   ```sql
   ALTER TABLE visitors ADD COLUMN id_number_encrypted TEXT;
   ALTER TABLE visitors ADD COLUMN id_number_encrypted_at TIMESTAMP;
   ```

2. Migrate existing data (encrypt all existing ID numbers)

3. Update controllers to use `encryptVisitorData()` helper

4. Deprecate plaintext `id_number` column (soft migration)

---

### 4. ⚠️ Role-Based Data Minimization - **PARTIALLY IMPLEMENTED**

**Claim**: API returns same full data set to all roles (no data minimization by role)

**Status**: ⚠️ **PARTIALLY IMPLEMENTED**

#### Evidence:

**GDPR Service Exists** (`server/src/services/gdprComplianceService.js`):
```javascript
data_minimization: {
  enabled: true,
  policies: [
    'visitor_data_minimization',
    'guard_data_minimization',
    'access_log_minimization',
    'audit_log_minimization'
  ]
}
```

**Response Sanitization** (`server/src/utils/responseUtils.js`):
- `sanitizeUser()` function exists
- Used in `userController.js` (line 6)

**No Middleware Implementation**:
- ❌ No role-based field filtering middleware
- ❌ No automated response trimming based on `req.user.role`

#### Current State:
- ✅ Awareness of data minimization principle
- ✅ Manual sanitization in some controllers
- ⚠️ Inconsistent application across endpoints
- ❌ No centralized enforcement

#### Security Impact:
- **Risk Level**: MEDIUM
- Guards may receive resident private data (email, phone)
- Residents may see other residents' sensitive info
- Potential GDPR Article 5(1)(c) violation (data minimization)

#### Recommendation:
**Priority**: MEDIUM

Create role-based response middleware:
```javascript
// server/src/middleware/dataMinimization.js
export const minimizeResponseData = (allowedFields) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      const role = req.user?.role;
      const filtered = filterByRole(data, role, allowedFields);
      return originalJson(filtered);
    };
    next();
  };
};
```

Apply to routes:
```javascript
router.get('/visitors', 
  authenticateToken,
  minimizeResponseData({
    guard: ['id', 'name', 'status', 'date_of_visit'],
    resident: ['id', 'name', 'phone', 'email', 'status', 'purpose'],
    admin: '*' // all fields
  }),
  getVisitors
);
```

---

### 5. ✅ Data Retention - **VERIFIED ISSUE**

**Claim**: No automated data retention/deletion policies

**Status**: ✅ **VERIFIED**

#### Evidence:

**No Retention Service**:
- ❌ File does not exist: `server/src/services/retentionService.js`

**No Archive Tables**:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%retention%' OR table_name LIKE '%archive%');
-- Result: 0 rows
```

**No Scheduled Jobs**:
- ❌ No cron jobs or scheduled tasks for data cleanup
- ⚠️ Some cleanup functions exist but are manual-only:
  - `auditLogger.cleanupAuditLogs()` (manual)
  - `QRCodeService.cleanupExpiredQRCodes()` (manual)
  - `userService.cleanupExpiredResetTokens()` (manual)

**Configuration Exists**:
```javascript
// server/src/services/centralizedLoggingService.js
retention: {
  default: 90,           // days
  security_events: 365,
  audit_logs: 730,
  compliance_logs: 2555,
  financial_data: 2555
}
```

**API Route Exists** (`server/src/routes/dataPrivacyRoutes.js` line 216):
```javascript
router.get('/retention-policy', ...);
// Returns retention policy info but doesn't enforce it
```

#### Security Impact:
- **Risk Level**: HIGH
- Indefinite data storage violates GDPR Article 5(1)(e) (storage limitation)
- Increased attack surface (more data = more to steal)
- Database bloat over time
- Regulatory compliance risk (max €20M fine or 4% annual turnover)

#### Current State:
- ✅ Retention policies defined
- ✅ Manual cleanup functions exist
- ❌ No automation
- ❌ No scheduled execution
- ❌ Data retained indefinitely by default

#### Recommendation:
**Priority**: HIGH

1. **Create Retention Service**:
   ```javascript
   // server/src/services/retentionService.js
   class RetentionService {
     async cleanupVisitors() {
       // Archive visitors older than 365 days
       // Delete archived visitors older than 730 days
     }
     
     async cleanupAccessLogs() {
       // Delete access logs older than 730 days
     }
     
     async cleanupAuditLogs() {
       // Archive audit logs older than 365 days
     }
   }
   ```

2. **Add Archive Tables**:
   ```sql
   CREATE TABLE visitors_archive (
     -- Same schema as visitors
     -- Additional: archived_at TIMESTAMP
   );
   ```

3. **Schedule Automated Cleanup**:
   ```javascript
   // server/src/jobs/retentionScheduler.js
   import cron from 'node-cron';
   import retentionService from '../services/retentionService.js';
   
   // Run daily at 2 AM
   cron.schedule('0 2 * * *', async () => {
     await retentionService.cleanupVisitors();
     await retentionService.cleanupAccessLogs();
     await retentionService.cleanupAuditLogs();
   });
   ```

4. **Add Soft Delete**:
   - Add `deleted_at` column to tables
   - Implement soft delete before hard delete
   - Grace period for data recovery

---

## Summary Matrix

| # | Claim | Status | Risk Level | Priority | Effort |
|---|-------|--------|------------|----------|--------|
| 1 | QR Code PII | ⚠️ Partial | MEDIUM-HIGH | HIGH | MEDIUM |
| 2 | OTP Debug Echo | ✅ Verified | CRITICAL | CRITICAL | LOW |
| 3 | ID Encryption | ℹ️ Infra Exists | HIGH | HIGH | MEDIUM |
| 4 | Data Minimization | ⚠️ Partial | MEDIUM | MEDIUM | HIGH |
| 5 | Data Retention | ✅ Verified | HIGH | HIGH | MEDIUM-HIGH |

---

## Implementation Roadmap

### Phase 1: Critical (Week 1)
1. ✅ **Fix OTP Debug Echo** (1-2 hours)
   - Add `NODE_ENV` check to `shouldEchoOtp()`
   - Add unit test to verify production guard

### Phase 2: High Priority (Weeks 2-3)
2. ✅ **Implement QR Code Tokenization** (2-3 days)
   - Remove PII from QR payload
   - Update validation logic
   - Test with existing QR codes

3. ✅ **ID Number Encryption** (3-4 days)
   - Add database columns
   - Create migration script
   - Update controllers
   - Migrate existing data

4. ✅ **Data Retention Service** (4-5 days)
   - Create retention service
   - Add archive tables
   - Implement cron scheduler
   - Test automation

### Phase 3: Medium Priority (Week 4)
5. ✅ **Role-Based Data Minimization** (5-7 days)
   - Create middleware
   - Define role policies
   - Apply to all endpoints
   - Comprehensive testing

---

## Testing Strategy

### Automated Tests (included in `security-audit.test.js`)
```bash
cd secure-gate-access/server
npm test -- tests/security-audit.test.js
```

### Manual Verification
1. **OTP Debug**: 
   - Set `NODE_ENV=production` and `OTP_DEBUG_ECHO=true`
   - Verify OTP is NOT returned in response

2. **QR Code**:
   - Generate QR code
   - Decode JWT payload
   - Verify no PII present

3. **ID Encryption**:
   - Query database: `SELECT id_number, id_number_encrypted FROM visitors LIMIT 5;`
   - Verify encrypted column is populated

4. **Retention**:
   - Check cron logs
   - Verify old data is archived/deleted
   - Check archive tables

---

## Compliance Impact

### GDPR Articles Affected
- **Article 5(1)(c)**: Data minimization ⚠️
- **Article 5(1)(e)**: Storage limitation ❌
- **Article 32**: Security of processing ⚠️

### Current Compliance Score: **6/10**
- ✅ Encryption service exists
- ✅ Consent management implemented
- ✅ Access controls in place
- ⚠️ Data minimization partial
- ❌ Retention policies not enforced
- ⚠️ Some PII exposure risks

---

## Conclusion

The system has **solid foundational security** with encryption services, audit logging, and consent management. However, **operational security gaps** exist in:

1. Production environment safeguards (OTP debug)
2. Data minimization enforcement (QR codes, role-based access)
3. Automated compliance (retention, cleanup)

**Recommendation**: Prioritize Phase 1 (Critical) immediately, then Phase 2 within 2-3 weeks to achieve compliance and reduce risk.

---

**Next Steps**:
1. Review findings with development team
2. Approve implementation roadmap
3. Create tickets for each phase
4. Schedule security re-audit after Phase 2 completion

---

*End of Report*
