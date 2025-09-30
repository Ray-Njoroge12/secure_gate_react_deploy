# Backend Phase 2 Remediation Plan - Week 1 Implementation

## Task W1-1: Standardize JWT Usage & Fix Test Environment

### Current Issue Analysis
- Test suite failing due to JWT signature mismatches
- In-memory revoked token storage blocking horizontal scaling
- Missing fail-fast validation for JWT_SECRET
- No refresh token mechanism

### Implementation Plan

#### Step 1: Environment Validation
```javascript
// server/src/config/environment.js - Add fail-fast JWT validation
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('🚨 FATAL: JWT_SECRET must be set and >= 32 characters');
  process.exit(1);
}
```

#### Step 2: Database Migration for Refresh Tokens
```sql
-- migrations/20250915_refresh_tokens.sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  jti UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

#### Step 3: Standardized JWT Claims
```javascript
// server/src/services/tokenService.js
export function generateAccessToken(user) {
  const jti = crypto.randomUUID();
  const payload = {
    sub: user.id,           // Standard subject claim
    email: user.email,      // For compatibility
    role: user.role,        // For authorization
    jti: jti,              // Unique token ID for revocation
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
  };
  return { token: jwt.sign(payload, process.env.JWT_SECRET), jti };
}
```

#### Step 4: Test Environment Fix
```javascript
// tests/helpers/auth.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET required in test environment');
}

export function makeTestToken(user = {}) {
  const payload = {
    sub: user.id || 1,
    email: user.email || 'test@example.com',
    role: user.role || 'resident',
    jti: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  return jwt.sign(payload, JWT_SECRET);
}

export function makeAuthHeaders(user = {}) {
  return { Authorization: `Bearer ${makeTestToken(user)}` };
}
```

### Ready to Implement?
This addresses the most critical production blocker. Should I proceed with implementing W1-1?

---

## Task W1-2: Global Error Handler & Standardized Response

### Implementation Preview
```javascript
// server/src/utils/respond.js
export function respond(res, { success = true, data = null, error = null, code = 200 }) {
  const response = {
    success,
    timestamp: new Date().toISOString(),
    ...(data && { data }),
    ...(error && { error }),
    ...(res.locals.requestId && { requestId: res.locals.requestId })
  };
  
  return res.status(code).json(response);
}

// server/src/middleware/errorHandler.js
export function globalErrorHandler(err, req, res, next) {
  const requestId = req.headers['x-request-id'] || 'unknown';
  
  // Log the error
  console.error(`[${requestId}] Unhandled error:`, err);
  
  // Determine error type and response
  if (err.name === 'ValidationError') {
    return respond(res, { 
      success: false, 
      error: 'Validation failed', 
      code: 400 
    });
  }
  
  if (err.code === '23505') { // PostgreSQL unique violation
    return respond(res, { 
      success: false, 
      error: 'Resource already exists', 
      code: 409 
    });
  }
  
  // Default server error
  return respond(res, { 
    success: false, 
    error: 'Internal server error', 
    code: 500 
  });
}
```

---

## Task W1-3: GDPR-Safe Soft Delete

### Critical Database Changes
```sql
-- migrations/20250915_gdpr_compliance.sql

-- Add soft delete to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ NULL;

-- Fix audit log cascade delete violations
ALTER TABLE access_logs DROP CONSTRAINT IF EXISTS access_logs_user_id_fkey;
ALTER TABLE access_logs ADD CONSTRAINT access_logs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add audit log integrity
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS log_hash VARCHAR(255);
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(255);
```

## Implementation Priority

1. **W1-1 (JWT Fix)** - CRITICAL: Fixes test suite, enables development
2. **W1-2 (Error Handler)** - CRITICAL: Prevents crashes
3. **W1-3 (GDPR)** - CRITICAL: Legal compliance
4. **W1-4 (API Contract)** - HIGH: Frontend integration
5. **W1-5 (Audit Integrity)** - HIGH: Security compliance
6. **W1-6 (Test Infrastructure)** - HIGH: Quality assurance

Should I proceed with implementing W1-1 first?