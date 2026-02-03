# 🔒 ADMIN SECURITY MIDDLEWARE - QUICK REFERENCE
## Phase 1 Security Hardening Implementation Guide

---

## 📚 AVAILABLE MIDDLEWARE

### 1. Rate Limiting
**File:** `/server/src/middleware/rateLimitMiddleware.js`

```javascript
import { adminQueryLimit, adminModificationLimit } from '../middleware/rateLimitMiddleware.js';

// For read-heavy endpoints (list, search, get)
router.get('/api/admin/users', adminQueryLimit(), /* other middleware */, handler);

// For write endpoints (create, update, delete)
router.put('/api/admin/users/:id', adminModificationLimit(), /* other middleware */, handler);
```

**Limits:**
- `adminQueryLimit`: 300 requests per 15 minutes
- `adminModificationLimit`: 100 requests per 15 minutes

---

### 2. Input Validation
**File:** `/server/src/middleware/adminValidation.js`

```javascript
import { 
  validateUserUpdate, 
  validateUserStatusUpdate,
  validateIdParam,
  validate
} from '../middleware/adminValidation.js';

// Apply validation + error handling
router.put('/api/admin/users/:id', 
  validateIdParam(),           // Validate :id is a number
  validateUserUpdate(),        // Validate request body
  validate,                    // Check for validation errors
  handler
);
```

**Available Validators:**
- `validateUserUpdate()` - Email, phone, role
- `validateUserStatusUpdate()` - Status enum
- `validateResidentCreation()` - Full resident profile
- `validateEstateSettings()` - Estate config
- `validateDPOSettings()` - DPO contact
- `validateODPCSettings()` - ODPC compliance
- `validateSearchTerm()` - Search query
- `validatePagination()` - Page/limit
- `validateIdParam()` - Numeric ID

---

### 3. Privilege Escalation Prevention
**File:** `/server/src/middleware/adminValidation.js`

```javascript
import { preventPrivilegeEscalation } from '../middleware/adminValidation.js';

// Prevents admins from changing roles
router.put('/api/admin/users/:id', 
  authenticateToken,
  requireRole(['admin']),
  preventPrivilegeEscalation,  // Must come BEFORE validate
  validateUserUpdate(),
  validate,
  handler
);
```

**Prevents:**
- Admins changing their own role
- Admins promoting users to super_admin
- Unauthorized privilege escalation

---

### 4. Self-Deletion Prevention
**File:** `/server/src/middleware/adminValidation.js`

```javascript
import { preventSelfDeletion } from '../middleware/adminValidation.js';

// Prevents admins from deleting their own account
router.delete('/api/admin/users/:id', 
  authenticateToken,
  requireRole(['admin']),
  preventSelfDeletion,         // Must come BEFORE validate
  validateIdParam(),
  validate,
  handler
);
```

**Prevents:**
- Self-account deletion
- Accidental admin lockout

---

### 5. MFA Requirements
**File:** `/server/src/middleware/mfaSensitiveOperations.js`

```javascript
import { requireMFAForSensitiveOps } from '../middleware/mfaSensitiveOperations.js';

// For critical operations (delete, backup, compliance, retention)
router.delete('/api/admin/users/:id', 
  authenticateToken,
  requireRole(['admin']),
  requireMFAForSensitiveOps,   // Requires MFA enabled
  /* other middleware */,
  handler
);
```

**Use For:**
- User deletion
- Backup operations
- Compliance data access
- Data retention operations
- Any destructive action

**Returns 403 if:**
- User doesn't have MFA enabled
- Error message prompts user to enable MFA

---

## 🎯 COMMON PATTERNS

### Standard Admin Query Endpoint
```javascript
router.get('/api/admin/resource', 
  authenticateToken,           // 1. Authenticate
  requireRole(['admin']),      // 2. Check role
  adminQueryLimit(),           // 3. Rate limit
  validatePagination(),        // 4. Validate query params
  validate,                    // 5. Check validation errors
  attachRequestAudit,          // 6. Audit logging
  handler                      // 7. Business logic
);
```

---

### Standard Admin Modification Endpoint
```javascript
router.put('/api/admin/resource/:id', 
  authenticateToken,           // 1. Authenticate
  requireRole(['admin']),      // 2. Check role
  adminModificationLimit(),    // 3. Rate limit
  validateIdParam(),           // 4. Validate :id param
  validateResourceUpdate(),    // 5. Validate request body
  validate,                    // 6. Check validation errors
  attachRequestAudit,          // 7. Audit logging
  handler                      // 8. Business logic
);
```

---

### Sensitive Deletion Endpoint
```javascript
router.delete('/api/admin/resource/:id', 
  authenticateToken,           // 1. Authenticate
  requireRole(['admin']),      // 2. Check role
  requireMFAForSensitiveOps,   // 3. Require MFA 🔒
  adminModificationLimit(),    // 4. Rate limit
  validateIdParam(),           // 5. Validate :id param
  preventSelfDeletion,         // 6. Prevent self-deletion
  validate,                    // 7. Check validation errors
  attachRequestAudit,          // 8. Audit logging
  handler                      // 9. Business logic
);
```

---

### User Role Update Endpoint
```javascript
router.put('/api/admin/users/:id', 
  authenticateToken,           // 1. Authenticate
  requireRole(['admin']),      // 2. Check role
  adminModificationLimit(),    // 3. Rate limit
  validateIdParam(),           // 4. Validate :id param
  preventPrivilegeEscalation,  // 5. Prevent role escalation 🔒
  validateUserUpdate(),        // 6. Validate request body
  validate,                    // 7. Check validation errors
  attachRequestAudit,          // 8. Audit logging
  handler                      // 9. Business logic
);
```

---

## 🚨 CRITICAL OPERATIONS CHECKLIST

When adding a new admin endpoint, ask:

1. **Is it a read or write operation?**
   - Read → `adminQueryLimit()`
   - Write → `adminModificationLimit()`

2. **Does it involve user roles?**
   - Yes → Add `preventPrivilegeEscalation`

3. **Is it a deletion endpoint?**
   - Yes → Add `preventSelfDeletion`

4. **Is it sensitive/destructive?**
   - Yes → Add `requireMFAForSensitiveOps`
   - Examples: delete, backup, retention, compliance

5. **Does it accept user input?**
   - Yes → Add appropriate validation middleware

6. **Does it need audit logging?**
   - Yes → Add `attachRequestAudit`

7. **Is it estate-scoped?**
   - Yes → Ensure query includes `WHERE estate_id = $X`

---

## 🧪 TESTING EXAMPLES

### Test Rate Limiting
```bash
# Trigger rate limit
for i in {1..350}; do
  curl -H "Authorization: Bearer $TOKEN" \
       http://localhost:5000/api/admin/users
done

# Should return 429 after 300 requests
```

---

### Test Input Validation
```bash
# Invalid email
curl -X PUT http://localhost:5000/api/admin/users/123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "not-an-email"}'

# Should return 400 with validation error
```

---

### Test Privilege Escalation Prevention
```bash
# Try to promote to super_admin
curl -X PUT http://localhost:5000/api/admin/users/123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "super_admin"}'

# Should return 403 with privilege escalation error
```

---

### Test MFA Requirement
```bash
# Try sensitive operation without MFA
curl -X DELETE http://localhost:5000/api/admin/users/123 \
  -H "Authorization: Bearer $TOKEN"

# Should return 403 if MFA not enabled
```

---

## 📊 MONITORING & LOGGING

### Rate Limit Metrics
```javascript
// In application logs
{
  "type": "rate_limit_exceeded",
  "endpoint": "/api/admin/users",
  "user_id": 123,
  "ip": "192.168.1.1",
  "limit": 300,
  "window": "15 minutes"
}
```

---

### Validation Error Logs
```javascript
{
  "type": "validation_error",
  "endpoint": "/api/admin/users/123",
  "user_id": 456,
  "errors": [
    { "param": "email", "msg": "Invalid email address" }
  ]
}
```

---

### MFA Check Logs
```javascript
// Successful MFA check
{
  "type": "mfa_verified",
  "operation": "sensitive_admin_operation",
  "route": "/api/admin/users/123",
  "user_id": 789,
  "role": "admin"
}

// Failed MFA check
{
  "type": "mfa_required_blocked",
  "operation": "sensitive_admin_operation",
  "route": "/api/admin/users/123",
  "user_id": 789,
  "role": "admin",
  "status": 403
}
```

---

## 🔧 TROUBLESHOOTING

### "Too many requests" error
**Cause:** Rate limit exceeded  
**Solution:** Wait 15 minutes or increase rate limit in `rateLimitMiddleware.js`

---

### "Invalid input" errors
**Cause:** Request data doesn't meet validation rules  
**Solution:** Check validation error details in response body

---

### "MFA required" error
**Cause:** User hasn't enabled MFA  
**Solution:** Enable MFA in user profile settings

---

### "Privilege escalation prevented" error
**Cause:** Attempting to change roles  
**Solution:** Contact super admin for role changes

---

### "Cannot delete your own account" error
**Cause:** Attempting self-deletion  
**Solution:** Have another admin delete the account

---

## 📚 RELATED DOCUMENTATION

- Full Implementation: `PHASE_1_SECURITY_HARDENING_SUMMARY.md`
- Analysis: `ADMIN_ROLE_COMPREHENSIVE_ANALYSIS.md`
- API Docs: `API_DOCUMENTATION.md`

---

**Last Updated:** February 3, 2026
