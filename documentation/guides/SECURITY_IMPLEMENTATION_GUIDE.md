# Security Audit - Actionable Implementation Guide

**Project**: Secure Gate Access System  
**Audit Date**: 2024  
**Status**: ✅ All Claims Verified

---

## Quick Summary

✅ **All 11 audit tests passed**  
⚠️ **5 security improvements identified**  
🎯 **Recommended timeline: 2-3 weeks**

### Risk Matrix

| Issue | Risk Level | Effort | Priority | Timeline |
|-------|-----------|--------|----------|----------|
| OTP Debug Echo | 🔴 CRITICAL | Low | P0 | Day 1 |
| ID Number Encryption | 🟠 HIGH | Medium | P1 | Week 1 |
| Data Retention | 🟠 HIGH | Medium-High | P1 | Week 2 |
| QR Code PII | 🟡 MEDIUM-HIGH | Medium | P2 | Week 2-3 |
| Role-Based Minimization | 🟡 MEDIUM | High | P3 | Week 3-4 |

---

## Implementation Guide

### 🔴 P0: Critical - OTP Debug Echo (Day 1)

**Issue**: OTP can be echoed in production if `OTP_DEBUG_ECHO=true`

**File**: `server/src/controllers/visitorInviteController-optimized.js`

**Fix**:
```javascript
// BEFORE (Line 27-29)
function shouldEchoOtp() {
  return process.env.OTP_DEBUG_ECHO === 'true';
}

// AFTER
function shouldEchoOtp() {
  // CRITICAL: Never echo OTP in production
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  // Only allow in development/test environments
  return process.env.OTP_DEBUG_ECHO === 'true';
}
```

**Test**:
```bash
# Test 1: Production should never echo
NODE_ENV=production OTP_DEBUG_ECHO=true npm test

# Test 2: Dev can echo
NODE_ENV=development OTP_DEBUG_ECHO=true npm test
```

**Estimated Time**: 30 minutes

---

### 🟠 P1: High - ID Number Encryption (Week 1)

**Issue**: ID numbers stored in plaintext in database

**Current State**:
- ✅ Encryption service exists (`encryptionService.js`)
- ✅ Helper functions support ID encryption (`encryptionHelper.js`)
- ❌ Database missing `id_number_encrypted` column
- ❌ Controllers not using encryption

**Implementation Steps**:

#### Step 1: Database Migration (1 hour)
```sql
-- File: server/src/database/migrations/035_encrypt_id_numbers.sql

-- Add encrypted column
ALTER TABLE visitors 
ADD COLUMN id_number_encrypted TEXT,
ADD COLUMN id_number_encrypted_at TIMESTAMP;

-- Create index for encrypted lookups
CREATE INDEX idx_visitors_id_number_encrypted 
ON visitors(id_number_encrypted);
```

#### Step 2: Data Migration Script (2 hours)
```javascript
// File: server/src/scripts/migrate-id-numbers.js
import { dbManager } from '../database/db.enhanced.js';
import encryptionService from '../services/encryptionService.js';

async function migrateIdNumbers() {
  const visitors = await dbManager.query(
    'SELECT id, id_number FROM visitors WHERE id_number IS NOT NULL AND id_number_encrypted IS NULL'
  );
  
  console.log(`Encrypting ${visitors.rows.length} ID numbers...`);
  
  for (const visitor of visitors.rows) {
    const encrypted = await encryptionService.encrypt(visitor.id_number);
    await dbManager.query(
      'UPDATE visitors SET id_number_encrypted = $1, id_number_encrypted_at = NOW() WHERE id = $2',
      [encrypted, visitor.id]
    );
  }
  
  console.log('✅ Migration complete');
}

migrateIdNumbers().catch(console.error);
```

#### Step 3: Update Controllers (3 hours)
```javascript
// File: server/src/controllers/visitorInviteController-optimized.js

// Import encryption helper
import { encryptVisitorData } from '../utils/encryptionHelper.js';

// In createVisitor function, before INSERT:
const encryptedData = await encryptVisitorData({
  name,
  phone,
  email,
  id_number: idNumber, // NEW: encrypt ID number
  vehicle_plate: vehiclePlate
});

// Update INSERT to use encrypted fields
const result = await dbManager.query(
  `INSERT INTO visitors (
    name, phone, email, 
    id_number, id_number_encrypted, id_number_encrypted_at,
    vehicle_plate, ...
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, ...)`,
  [
    name, // Keep plaintext for now (transition period)
    phone,
    email,
    idNumber, // Legacy plaintext
    encryptedData.id_number_encrypted, // NEW: encrypted version
    new Date(), // encrypted_at timestamp
    vehiclePlate,
    ...
  ]
);
```

#### Step 4: Update Read Operations (2 hours)
```javascript
// File: server/src/controllers/visitorPublicController.js

import { decryptVisitorData } from '../utils/encryptionHelper.js';

// After fetching visitor:
const visitor = result.rows[0];
const decrypted = await decryptVisitorData(visitor);

// Return decrypted data (encrypted fields removed from response)
res.json({ success: true, visitor: decrypted });
```

#### Step 5: Deprecation Plan (optional)
```sql
-- After 90 days of dual-write, remove plaintext column
-- File: server/src/database/migrations/036_remove_plaintext_id.sql
ALTER TABLE visitors DROP COLUMN id_number;
```

**Estimated Time**: 1-2 days

---

### 🟠 P1: High - Data Retention Service (Week 2)

**Issue**: No automated data cleanup; data kept indefinitely

**Implementation Steps**:

#### Step 1: Create Archive Tables (1 hour)
```sql
-- File: server/src/database/migrations/037_add_archive_tables.sql

CREATE TABLE visitors_archive (
  LIKE visitors INCLUDING ALL,
  archived_at TIMESTAMP DEFAULT NOW(),
  archived_by VARCHAR(255)
);

CREATE TABLE access_logs_archive (
  LIKE access_logs INCLUDING ALL,
  archived_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs_archive (
  LIKE audit_logs INCLUDING ALL,
  archived_at TIMESTAMP DEFAULT NOW()
);
```

#### Step 2: Create Retention Service (4 hours)
```javascript
// File: server/src/services/retentionService.js
import { dbManager } from '../database/db.enhanced.js';
import logger from '../config/logger.js';

class RetentionService {
  constructor() {
    this.policies = {
      visitors: { archiveAfterDays: 365, deleteAfterDays: 730 },
      accessLogs: { archiveAfterDays: 365, deleteAfterDays: 730 },
      auditLogs: { archiveAfterDays: 730, deleteAfterDays: 2555 }
    };
  }

  async archiveOldVisitors() {
    const { archiveAfterDays } = this.policies.visitors;
    
    logger.info(`Archiving visitors older than ${archiveAfterDays} days`);
    
    const result = await dbManager.query(`
      WITH archived AS (
        DELETE FROM visitors 
        WHERE created_at < NOW() - INTERVAL '${archiveAfterDays} days'
        AND status IN ('checked_out', 'cancelled', 'expired')
        RETURNING *
      )
      INSERT INTO visitors_archive 
      SELECT *, NOW(), 'system' FROM archived
      RETURNING id
    `);
    
    logger.info(`Archived ${result.rowCount} visitors`);
    return result.rowCount;
  }

  async deleteOldArchives() {
    const { deleteAfterDays } = this.policies.visitors;
    
    logger.info(`Deleting archives older than ${deleteAfterDays} days`);
    
    const result = await dbManager.query(`
      DELETE FROM visitors_archive 
      WHERE archived_at < NOW() - INTERVAL '${deleteAfterDays} days'
    `);
    
    logger.info(`Deleted ${result.rowCount} archived visitors`);
    return result.rowCount;
  }

  async cleanupAccessLogs() {
    const { archiveAfterDays } = this.policies.accessLogs;
    
    const result = await dbManager.query(`
      WITH archived AS (
        DELETE FROM access_logs 
        WHERE log_time < NOW() - INTERVAL '${archiveAfterDays} days'
        RETURNING *
      )
      INSERT INTO access_logs_archive 
      SELECT *, NOW() FROM archived
    `);
    
    return result.rowCount;
  }

  async runAllCleanups() {
    logger.info('🧹 Starting data retention cleanup');
    
    const results = {
      visitorsArchived: await this.archiveOldVisitors(),
      visitorsDeleted: await this.deleteOldArchives(),
      accessLogsArchived: await this.cleanupAccessLogs()
    };
    
    logger.info('✅ Retention cleanup complete', results);
    return results;
  }
}

export default new RetentionService();
```

#### Step 3: Create Scheduler (2 hours)
```javascript
// File: server/src/jobs/retentionScheduler.js
import cron from 'node-cron';
import retentionService from '../services/retentionService.js';
import logger from '../config/logger.js';

export function startRetentionScheduler() {
  // Run daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('🕒 Scheduled retention cleanup starting');
      await retentionService.runAllCleanups();
    } catch (error) {
      logger.error('❌ Retention cleanup failed', error);
    }
  });
  
  logger.info('✅ Retention scheduler initialized (runs daily at 2 AM)');
}
```

#### Step 4: Integrate into Server (30 minutes)
```javascript
// File: server/server.js

import { startRetentionScheduler } from './jobs/retentionScheduler.js';

// After database initialization
if (process.env.NODE_ENV === 'production') {
  startRetentionScheduler();
}
```

#### Step 5: Manual Trigger Endpoint (1 hour)
```javascript
// File: server/src/routes/adminRoutes.js

router.post('/retention/cleanup', 
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const results = await retentionService.runAllCleanups();
      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
```

**Package Dependency**:
```bash
npm install node-cron
```

**Estimated Time**: 2-3 days

---

### 🟡 P2: Medium-High - QR Code Tokenization (Week 2-3)

**Issue**: QR codes embed PII instead of secure token reference

**Current Payload** (qrCodeService.js line 52-64):
```javascript
const payload = {
  qrId: qrId,
  visitorId: visitorData.id,
  type: 'visitor_invite',
  name: visitorData.name,        // ❌ Remove
  phone: visitorData.phone,      // ❌ Remove
  purpose: visitorData.purpose,  // ❌ Remove
  validFrom: visitorData.date_of_visit,
  expiresAt: expirationTime.toISOString()
};
```

**Recommended Payload**:
```javascript
const payload = {
  qrId: qrId,                    // ✅ UUID - sufficient for lookup
  type: 'visitor_access',
  expiresAt: expirationTime.toISOString()
};
```

**Implementation Steps**:

#### Step 1: Update QR Generation (1 hour)
```javascript
// File: server/src/services/qrCodeService.js

async generateVisitorQR(visitorData, options = {}) {
  // ... existing code ...
  
  // NEW: Minimal payload (token-based approach)
  const payload = {
    qrId: qrId,
    type: 'visitor_access',
    v: 1, // version for future compatibility
    expiresAt: expirationTime.toISOString()
  };
  
  // Remove visitorId from payload - use qrId for lookup
  // Server will fetch visitor data using qrId from qr_codes table
  
  // ... rest of code ...
}
```

#### Step 2: Update Validation Logic (2 hours)
```javascript
// File: server/src/services/qrCodeService.js

async validateQR(qrData, options = {}) {
  // ... existing code ...
  
  // Fetch QR record by qrId (not visitorId)
  const qrRecord = await dbManager.query(
    `SELECT qr.*, v.id as visitor_id, v.name, v.status, v.date_of_visit
     FROM qr_codes qr
     JOIN visitors v ON qr.visitor_id = v.id
     WHERE qr.qr_id = $1`,
    [parsedData.qrId]
  );
  
  if (!qrRecord.rows.length) {
    return { success: false, error: 'Invalid QR code' };
  }
  
  // ... validation logic ...
}
```

#### Step 3: Backward Compatibility (1 hour)
```javascript
// Handle old QR codes with embedded data
async validateQR(qrData, options = {}) {
  const parsedData = JSON.parse(qrData);
  const payload = jwt.verify(parsedData.token, jwtSecret);
  
  // Check payload version
  if (payload.v === 1) {
    // New tokenized approach
    return this.validateTokenizedQR(payload);
  } else {
    // Legacy QR with embedded data
    return this.validateLegacyQR(payload);
  }
}
```

**Estimated Time**: 1-2 days

---

### 🟡 P3: Medium - Role-Based Data Minimization (Week 3-4)

**Issue**: All roles receive same data set; no field filtering by role

**Implementation Steps**:

#### Step 1: Create Middleware (3 hours)
```javascript
// File: server/src/middleware/dataMinimization.js

/**
 * Role-based data minimization middleware
 * Filters response data based on user role
 */
export const minimizeData = (rolePermissions) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = (data) => {
      const userRole = req.user?.role || 'guest';
      const allowedFields = rolePermissions[userRole] || rolePermissions.default;
      
      // Filter data
      const filtered = filterDataByRole(data, allowedFields);
      
      return originalJson(filtered);
    };
    
    next();
  };
};

function filterDataByRole(data, allowedFields) {
  if (allowedFields === '*') return data; // admin gets all
  
  if (Array.isArray(data)) {
    return data.map(item => filterObject(item, allowedFields));
  }
  
  if (typeof data === 'object' && data !== null) {
    if (data.rows) {
      // Handle database result format
      return {
        ...data,
        rows: data.rows.map(row => filterObject(row, allowedFields))
      };
    }
    return filterObject(data, allowedFields);
  }
  
  return data;
}

function filterObject(obj, allowedFields) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const filtered = {};
  for (const field of allowedFields) {
    if (obj.hasOwnProperty(field)) {
      filtered[field] = obj[field];
    }
  }
  return filtered;
}
```

#### Step 2: Define Role Policies (1 hour)
```javascript
// File: server/src/config/rolePermissions.js

export const VISITOR_PERMISSIONS = {
  admin: '*', // all fields
  
  resident: [
    'id', 'name', 'phone', 'email', 'purpose',
    'date_of_visit', 'time_of_visit', 'status',
    'vehicle_plate', 'created_at'
  ],
  
  guard: [
    'id', 'name', 'status', 'date_of_visit',
    'vehicle_plate', 'check_in', 'check_out'
    // No phone, email, purpose for guards
  ],
  
  default: ['id', 'name', 'status'] // minimal
};

export const USER_PERMISSIONS = {
  admin: '*',
  
  resident: [
    'id', 'username', 'role', 'area', 'house'
    // No email/phone of other residents
  ],
  
  guard: [
    'id', 'username', 'area'
  ],
  
  default: []
};
```

#### Step 3: Apply to Routes (2 hours)
```javascript
// File: server/src/routes/visitorRoutes.js

import { minimizeData } from '../middleware/dataMinimization.js';
import { VISITOR_PERMISSIONS } from '../config/rolePermissions.js';

// Apply to visitor list endpoint
router.get('/visitors',
  authenticateToken,
  minimizeData(VISITOR_PERMISSIONS), // NEW: filter by role
  getVisitors
);

// Apply to visitor detail
router.get('/visitors/:id',
  authenticateToken,
  minimizeData(VISITOR_PERMISSIONS),
  getVisitorById
);
```

#### Step 4: Test Each Role (2 hours)
```javascript
// File: server/tests/middleware/dataMinimization.test.js

describe('Data Minimization Middleware', () => {
  test('Admin receives all fields', async () => {
    const response = await request(app)
      .get('/api/visitors')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.body.visitors[0]).toHaveProperty('phone');
    expect(response.body.visitors[0]).toHaveProperty('email');
  });
  
  test('Guard receives minimal fields', async () => {
    const response = await request(app)
      .get('/api/visitors')
      .set('Authorization', `Bearer ${guardToken}`);
    
    expect(response.body.visitors[0]).not.toHaveProperty('phone');
    expect(response.body.visitors[0]).not.toHaveProperty('email');
    expect(response.body.visitors[0]).toHaveProperty('status');
  });
});
```

**Estimated Time**: 3-4 days

---

## Testing Checklist

After implementing each fix, run:

```bash
# 1. Unit tests
npm test

# 2. Security audit
npm test -- tests/security-audit.test.js

# 3. Integration tests
npm run test:integration

# 4. Manual verification
# - Generate QR and decode to check payload
# - Test OTP flow in production mode
# - Query database to verify encryption
# - Test role-based access with different roles
# - Verify retention scheduler runs
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security audit green
- [ ] Database migrations tested in staging
- [ ] Environment variables configured:
  - `NODE_ENV=production`
  - `OTP_DEBUG_ECHO=false` (or unset)
  - `ENCRYPTION_KEY` set
  - `JWT_SECRET` rotated

### Post-Deployment
- [ ] Monitor logs for encryption errors
- [ ] Verify retention scheduler running
- [ ] Test QR code validation
- [ ] Audit API responses by role
- [ ] Monitor database size (retention working)

### Rollback Plan
- Keep migration rollback scripts ready
- Dual-write period for encryption (90 days)
- Monitor error rates for 72 hours

---

## Success Metrics

### Security
- ✅ 0 OTP leaks in production logs
- ✅ 100% ID numbers encrypted
- ✅ QR codes contain no PII
- ✅ Role-based access enforced

### Compliance
- ✅ GDPR Article 5(1)(c) - Data minimization
- ✅ GDPR Article 5(1)(e) - Storage limitation
- ✅ GDPR Article 32 - Security of processing

### Operational
- ✅ Database size stable (retention working)
- ✅ No performance degradation
- ✅ Automated cleanup running daily

---

## Support & Resources

### Key Files Reference
```
server/
├── src/
│   ├── controllers/
│   │   └── visitorInviteController-optimized.js  # OTP fix
│   ├── services/
│   │   ├── qrCodeService.js                      # QR tokenization
│   │   ├── retentionService.js                   # NEW: Retention
│   │   └── encryptionService.js                  # ID encryption
│   ├── middleware/
│   │   └── dataMinimization.js                   # NEW: Role filtering
│   ├── utils/
│   │   └── encryptionHelper.js                   # Encryption helpers
│   ├── jobs/
│   │   └── retentionScheduler.js                 # NEW: Cron jobs
│   └── database/
│       └── migrations/
│           ├── 035_encrypt_id_numbers.sql        # NEW
│           └── 037_add_archive_tables.sql        # NEW
├── tests/
│   ├── security-audit.test.js                    # Verification tests
│   └── middleware/
│       └── dataMinimization.test.js              # NEW
└── scripts/
    └── migrate-id-numbers.js                     # NEW: Data migration
```

### Documentation
- See `SECURITY_AUDIT_FINDINGS.md` for detailed analysis
- See `tests/security-audit.test.js` for automated verification
- Review GDPR compliance guide (internal)

---

**Ready to implement?** Start with P0 (OTP fix) - takes only 30 minutes!

