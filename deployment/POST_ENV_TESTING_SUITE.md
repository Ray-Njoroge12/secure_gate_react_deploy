# ✅ Post-Environment Consolidation Testing Suite

**Purpose**: Verify all systems work correctly after env file consolidation  
**Estimated Time**: 2-3 hours  
**Environments**: Development, Staging, Production

---

## Testing Strategy

```
1. Unit Tests (Services & Feature Flags)
2. Integration Tests (Auth, CORS, Database)
3. E2E Tests (Full User Flows)
4. Security Tests (HTTPS, Cookies, CSRF)
5. Performance Tests (Load, Stress)
```

---

## 1. Development Environment Tests

### 1.1 Backend Startup with .env.local

```bash
cd server
NODE_ENV=development node --import ./load-env.js server.js

# Expected output:
# ✅ Environment variables loaded
# 📝 Loading .env.local (secrets)...
# 🔧 Environment: development
# 🚀 Server started on port 3001
```

**✅ Pass Criteria**:
- Server starts without errors
- JWT secrets loaded
- Database connection established
- Redis connected

### 1.2 Feature Flags - Webhooks Disabled

```bash
# Set in .env.local
ENABLE_WEBHOOKS=false

# Test webhook trigger
curl -X POST http://localhost:3001/api/webhooks/test/1 \
  -H "Authorization: Bearer <token>"

# Expected: Returns success but webhook not delivered
# Log: "Webhooks are disabled via ENABLE_WEBHOOKS flag"
```

**✅ Pass Criteria**:
- Webhook trigger returns 200 OK
- No external HTTP call made
- Appropriate log message shown

### 1.3 Feature Flags - Automations Disabled

```bash
# Set in .env.local
ENABLE_AUTOMATIONS=false

# Trigger an incident (should not run automations)
curl -X POST http://localhost:3001/api/incidents \
  -H "Content-Type: application/json" \
  -d '{"type":"security","description":"Test"}'

# Expected: Incident created, no automation rules executed
# Log: "Automations are disabled via ENABLE_AUTOMATIONS flag"
```

**✅ Pass Criteria**:
- Incident created successfully
- No automation rules executed
- Appropriate log message shown

### 1.4 Feature Flags - Notifications Enabled

```bash
# Set in .env.local
ENABLE_EXTERNAL_NOTIFICATIONS=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_SMS_NOTIFICATIONS=false

# Send test notification
curl -X POST http://localhost:3001/api/test/notification \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"email","to":"test@example.com"}'

# Expected: Email sent, SMS skipped
```

**✅ Pass Criteria**:
- Email sent successfully
- SMS not sent (flag disabled)
- Logs show feature flag checks

---

## 2. CORS Testing

### 2.1 Allowed Origin (localhost:3000)

```bash
curl -X OPTIONS http://localhost:3001/api/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Expected headers:
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Credentials: true
```

**✅ Pass Criteria**:
- 204 No Content status
- CORS headers present
- Credentials allowed

### 2.2 Additional Origin

```bash
# Add to .env.local
ADDITIONAL_ORIGINS=http://localhost:3002,http://localhost:3003

# Test
curl -X OPTIONS http://localhost:3001/api/auth/login \
  -H "Origin: http://localhost:3002" \
  -v

# Expected: CORS headers allow localhost:3002
```

**✅ Pass Criteria**:
- Additional origins honored
- CORS policy dynamic

### 2.3 Blocked Origin

```bash
curl -X OPTIONS http://localhost:3001/api/auth/login \
  -H "Origin: http://evil.com" \
  -v

# Expected: CORS error
# Error: "CORS policy violation: Origin not allowed"
```

**✅ Pass Criteria**:
- Request blocked
- Appropriate error message

---

## 3. Authentication & Session Tests

### 3.1 Login Flow

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@securegate.com","password":"Test123!@#"}' \
  -c cookies.txt \
  -v

# Check cookies
cat cookies.txt | grep accessToken
# Should have: HttpOnly, Secure (if HTTPS), SameSite
```

**✅ Pass Criteria**:
- Login successful
- Cookies set with security flags
- JWT tokens valid

### 3.2 Token Refresh

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt

# Expected: New access token issued
```

**✅ Pass Criteria**:
- Refresh successful
- New token issued
- Old token still valid for grace period

### 3.3 Logout & Token Revocation

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt

# Try to use old token
curl http://localhost:3001/api/users/profile \
  -b cookies.txt

# Expected: 401 Unauthorized
```

**✅ Pass Criteria**:
- Token revoked in Redis
- Subsequent requests blocked

---

## 4. Staging Environment Tests (AWS Secrets Manager)

### 4.1 Secrets Loading from AWS

```bash
# Set environment
export NODE_ENV=staging
export SECRETS_PREFIX=secure-gate
export AWS_REGION=af-south-1

# Start server (should load from AWS)
cd server && npm start

# Expected logs:
# 🔐 Loading secrets from AWS Secrets Manager...
# ✓ JWT_SECRET loaded from AWS
# ✓ PGPASSWORD loaded from AWS
# ✓ REDIS_PASSWORD loaded from AWS
# ✅ Secrets loaded successfully from AWS
```

**✅ Pass Criteria**:
- All secrets loaded from AWS
- No fallback to env vars
- Server starts successfully

### 4.2 Secrets Cache TTL

```bash
# Rotate a secret in AWS
aws secretsmanager update-secret \
  --secret-id secure-gate/jwt-secret \
  --secret-string "new-value" \
  --region af-south-1

# Wait for cache TTL (5 minutes default)
# Check if new secret is picked up
curl http://staging.securegate.com/api/admin/secrets-status \
  -H "Authorization: Bearer <admin-token>"

# Expected: Shows cached until TTL expires
```

**✅ Pass Criteria**:
- Cache working correctly
- New secret loaded after TTL
- No service interruption

### 4.3 AWS Fallback to Env Vars

```bash
# Temporarily break AWS credentials
unset AWS_ACCESS_KEY_ID

# Start server
NODE_ENV=staging npm start

# Expected:
# ⚠️  Failed to load secrets from AWS
# Falling back to environment variables
```

**✅ Pass Criteria**:
- Graceful fallback
- Server still starts
- Warning logged

---

## 5. Production Environment Tests (HTTPS)

### 5.1 HTTPS Endpoint

```bash
curl -I https://api.securegate.com/health

# Expected headers:
# HTTP/2 200
# strict-transport-security: max-age=31536000
# x-frame-options: DENY
# x-content-type-options: nosniff
```

**✅ Pass Criteria**:
- HTTPS working
- Security headers present
- Certificate valid

### 5.2 HTTP → HTTPS Redirect

```bash
curl -I http://api.securegate.com/health

# Expected:
# HTTP/1.1 301 Moved Permanently
# location: https://api.securegate.com/health
```

**✅ Pass Criteria**:
- Redirect to HTTPS
- 301 status code

### 5.3 Secure Cookies

```bash
curl -X POST https://api.securegate.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@securegate.com","password":"password"}' \
  -v

# Check Set-Cookie header
# Expected: Secure; HttpOnly; SameSite=Strict
```

**✅ Pass Criteria**:
- Cookies have Secure flag
- HttpOnly flag present
- SameSite configured

---

## 6. End-to-End User Flows

### 6.1 Visitor Registration & Access

```bash
# 1. Visitor registers
curl -X POST https://api.securegate.com/api/auth/register/visitor \
  -d '{"email":"visitor@test.com","phone":"+254712345678","idNumber":"12345678"}'

# 2. OTP sent (if SMS enabled)
# 3. Verify OTP
curl -X POST https://api.securegate.com/api/auth/verify-otp \
  -d '{"email":"visitor@test.com","otp":"123456"}'

# 4. Request access
curl -X POST https://api.securegate.com/api/access-requests \
  -H "Authorization: Bearer <visitor-token>" \
  -d '{"residentId":1,"purpose":"Visit"}'
```

**✅ Pass Criteria**:
- Registration successful
- OTP sent (if enabled)
- Access request created

### 6.2 Resident Approval Flow

```bash
# 1. Resident logs in
# 2. Gets pending requests
curl https://api.securegate.com/api/access-requests/pending \
  -H "Authorization: Bearer <resident-token>"

# 3. Approves request
curl -X PATCH https://api.securegate.com/api/access-requests/1 \
  -H "Authorization: Bearer <resident-token>" \
  -d '{"status":"approved"}'

# 4. Check if webhook triggered (if enabled)
# 5. Check if automation ran (if enabled)
```

**✅ Pass Criteria**:
- Approval successful
- Webhook sent (if enabled)
- Automation executed (if enabled)

### 6.3 Guard Check-in Flow

```bash
# 1. Guard scans QR code
curl -X POST https://api.securegate.com/api/visits/check-in \
  -H "Authorization: Bearer <guard-token>" \
  -d '{"qrCode":"abc123"}'

# 2. Verify visit created
curl https://api.securegate.com/api/visits/1 \
  -H "Authorization: Bearer <guard-token>"
```

**✅ Pass Criteria**:
- Check-in successful
- Visit record created
- Audit log entry created

---

## 7. Performance Tests

### 7.1 Load Test - Concurrent Logins

```bash
# Using Apache Bench
ab -n 1000 -c 50 -p login.json -T application/json \
  https://api.securegate.com/api/auth/login

# Expected:
# - 99% success rate
# - < 500ms average response time
# - No 500 errors
```

**✅ Pass Criteria**:
- 99%+ success rate
- Reasonable response times
- No server errors

### 7.2 Stress Test - Rate Limiting

```bash
# Exceed rate limit
for i in {1..200}; do
  curl https://api.securegate.com/api/auth/login \
    -d '{"email":"test@test.com","password":"wrong"}' &
done

# Expected: Rate limit kicks in after threshold
# HTTP 429 Too Many Requests
```

**✅ Pass Criteria**:
- Rate limiting works
- 429 responses after threshold
- Service remains stable

---

## 8. Security Tests

### 8.1 CSRF Protection

```bash
# Attempt state-changing operation without CSRF token
curl -X POST https://api.securegate.com/api/users/profile \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Hacked"}' \
  -H "X-CSRF-Token: invalid"

# Expected: 403 Forbidden
```

**✅ Pass Criteria**:
- CSRF check enforced
- Invalid token rejected

### 8.2 XSS Protection Headers

```bash
curl -I https://api.securegate.com/

# Check for:
# x-xss-protection: 1; mode=block
# content-security-policy: ...
```

**✅ Pass Criteria**:
- XSS headers present
- CSP configured

---

## 9. Monitoring & Logging

### 9.1 Application Logs

```bash
# Check logs show env loading
tail -f logs/app.log | grep "Environment"

# Expected:
# 🔧 Environment: production
# ✅ Secrets loaded successfully from AWS
```

### 9.2 Audit Logs

```bash
# Perform sensitive action
curl -X DELETE https://api.securegate.com/api/users/1 \
  -H "Authorization: Bearer <admin-token>"

# Check audit log
SELECT * FROM audit_logs 
WHERE action = 'user.deleted' 
ORDER BY created_at DESC LIMIT 1;
```

**✅ Pass Criteria**:
- Audit log created
- All required fields populated

---

## Test Execution Checklist

### Development

- [ ] Server starts with .env.local
- [ ] Feature flags work (webhooks, automations, notifications)
- [ ] CORS allows configured origins
- [ ] Login/logout flows work
- [ ] Cookies have correct flags

### Staging

- [ ] Secrets loaded from AWS
- [ ] Feature flags honor env settings
- [ ] CORS works with staging frontend
- [ ] Auth flows complete end-to-end
- [ ] Database queries succeed

### Production

- [ ] HTTPS working with valid certificate
- [ ] HTTP redirects to HTTPS
- [ ] Secure cookies set
- [ ] Rate limiting active
- [ ] CSRF protection enabled
- [ ] All E2E flows work from prod frontend
- [ ] Performance acceptable under load

---

## Automated Test Script

```bash
#!/bin/bash
# run-post-env-tests.sh

set -e

ENVIRONMENT=${1:-development}
API_URL=${2:-http://localhost:3001}

echo "🧪 Running Post-Env Consolidation Tests"
echo "Environment: $ENVIRONMENT"
echo "API URL: $API_URL"
echo ""

# 1. Health check
echo "1. Health Check..."
curl -f $API_URL/health || exit 1

# 2. CORS test
echo "2. CORS Test..."
curl -X OPTIONS $API_URL/api/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -s -o /dev/null -w "%{http_code}" | grep -q "204" || exit 1

# 3. Auth flow
echo "3. Auth Flow Test..."
# ... more tests

echo ""
echo "✅ All tests passed!"
```

---

**Test Status**: Ready for execution  
**Next Step**: Run tests in sequence: Dev → Staging → Production
