# 🎯 Staging Validation Playbook

**Purpose:** Complete operational validation of Milestone 1 and P1 Observability Pack in staging environment  
**Prerequisites:** Staging deployment complete, credentials configured  
**Estimated Time:** 30-45 minutes

---

## 📋 Pre-Flight Checklist

- [ ] Staging environment deployed and accessible
- [ ] Database migrations applied
- [ ] Environment variables configured (see `.env.production` template)
- [ ] Health check endpoint responding: `GET /health`
- [ ] Log aggregator/viewer available (e.g., CloudWatch, Datadog, Grafana Loki)
- [ ] Credentials for test users available

---

## 🔍 Validation 1: Request ID Correlation (Milestone 1)

### Objective
Prove that a single request ID links:
- Response headers
- Error payload
- Request start log
- Request end log
- Security/error logs

### Steps

#### 1. Set Environment Variables
```bash
export STAGING_BASE_URL="https://your-staging-url.com"
export KNOWN_FAILURE_PATH="/api/estates/requirement-check"
export REQUEST_ID="stage-corr-$(date +%s)"
```

#### 2. Run Staging Correlation Script
```bash
./scripts/run-staging-correlation-validation.sh
```

#### 3. Verify Response Headers
```bash
cat staging-correlation/response-headers.txt
```

**Expected:** Contains `X-Request-ID: stage-corr-XXXXXX`

#### 4. Verify Response Body
```bash
cat staging-correlation/response-body.json | jq .
```

**Expected:**
```json
{
  "error": {
    "message": "Estate context required",
    "code": "ESTATE_REQUIRED",
    "status": 403,
    "requestId": "stage-corr-XXXXXX"
  }
}
```

#### 5. Query Log Aggregator
Search for: `request_id="stage-corr-XXXXXX"`

**Expected logs:**
1. **Request start:** `Incoming request` with request_id, method, url
2. **Request end:** `Request completed` with request_id, status, duration
3. **Security log:** Estate access failure with request_id, user_id, code
4. **Error log:** (if applicable) Error details with request_id

#### 6. Capture Evidence Bundle
```bash
# Screenshot or export logs
mkdir -p staging-correlation/logs
# Save log query results to staging-correlation/logs/correlation-proof.txt

# Create verification summary
cat > staging-correlation/VALIDATION_COMPLETE.md << 'EOF'
# Staging Correlation Validation - COMPLETE

**Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Request ID:** ${REQUEST_ID}
**Environment:** ${STAGING_BASE_URL}

## Evidence
- ✅ Response headers: X-Request-ID matches
- ✅ Response body: error.requestId matches
- ✅ Request logs: Found request_id in start/end logs
- ✅ Security logs: Found request_id in security events
- ✅ Log correlation: All logs linked by single request_id

## Files
- `response-headers.txt` - Response headers
- `response-body.json` - Error payload
- `logs/correlation-proof.txt` - Log aggregator query results
EOF
```

### Success Criteria
- [ ] Response header includes `X-Request-ID: ${REQUEST_ID}`
- [ ] Response body includes `"requestId": "${REQUEST_ID}"`
- [ ] Log aggregator shows 2+ logs with same request_id
- [ ] All logs types (request, security, error) contain request_id

---

## 🔍 Validation 2: Request ID Propagation (P1 Observability)

### Objective
Verify request ID propagates through all middleware layers for different scenarios.

### Test Scenarios

#### Scenario A: CSRF Failure
```bash
export REQUEST_ID="csrf-test-$(date +%s)"
export STAGING_BASE_URL="https://your-staging-url.com"

# Send POST without CSRF token
curl -X POST "${STAGING_BASE_URL}/api/visitors" \
  -H "X-Request-ID: ${REQUEST_ID}" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=..." \
  -d '{"name":"Test"}' \
  -v 2>&1 | tee staging-correlation/csrf-test-output.txt
```

**Verify:**
- [ ] Response header: `X-Request-ID: ${REQUEST_ID}`
- [ ] Response body: `"requestId": "${REQUEST_ID}"`
- [ ] Logs show: CSRF security event with request_id

#### Scenario B: Auth Failure (401)
```bash
export REQUEST_ID="auth-test-$(date +%s)"

curl "${STAGING_BASE_URL}/api/auth/me" \
  -H "X-Request-ID: ${REQUEST_ID}" \
  -v 2>&1 | tee staging-correlation/auth-test-output.txt
```

**Verify:**
- [ ] Response header: `X-Request-ID: ${REQUEST_ID}`
- [ ] Response body: `"requestId": "${REQUEST_ID}"`
- [ ] Logs show: Auth failure event with request_id

#### Scenario C: Estate Required (403)
```bash
export REQUEST_ID="estate-test-$(date +%s)"

# Login as estate-less user first
ACCESS_TOKEN=$(curl -X POST "${STAGING_BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"estateless@test.com","password":"test123"}' | jq -r .token)

curl "${STAGING_BASE_URL}/api/guards" \
  -H "X-Request-ID: ${REQUEST_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -v 2>&1 | tee staging-correlation/estate-test-output.txt
```

**Verify:**
- [ ] Response header: `X-Request-ID: ${REQUEST_ID}`
- [ ] Response body: `"requestId": "${REQUEST_ID}"`
- [ ] Logs show: Estate required event with request_id

#### Scenario D: Rate Limit (429)
```bash
export REQUEST_ID="rate-test-$(date +%s)"

# Send multiple requests rapidly
for i in {1..20}; do
  curl -X POST "${STAGING_BASE_URL}/api/auth/login" \
    -H "X-Request-ID: ${REQUEST_ID}-${i}" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' &
done
wait
```

**Verify:**
- [ ] 429 response includes X-Request-ID
- [ ] Logs show: Rate limit event with request_id

### Success Criteria
- [ ] All 4 scenarios return X-Request-ID header
- [ ] All 4 scenarios return requestId in error payload
- [ ] All 4 scenarios log security events with request_id
- [ ] Log queries successfully correlate headers → payload → logs

---

## 🔍 Validation 3: Middleware Stack Verification

### Objective
Confirm only app-level request tracing middleware is active (no duplicates).

### Steps

#### 1. Check Server Startup Logs
```bash
# View server startup logs
# Look for middleware initialization messages
```

**Expected:**
```
✅ ONLY ONE of these:
- "Request ID middleware initialized"
- "Request logging middleware initialized"

❌ SHOULD NOT SEE:
- Multiple request tracing middleware messages
- Duplicate request logger initialization
```

#### 2. Test Request ID Uniqueness
```bash
export REQUEST_ID="unique-test-$(date +%s)"

curl "${STAGING_BASE_URL}/api/health" \
  -H "X-Request-ID: ${REQUEST_ID}" \
  -v 2>&1 | grep -i "x-request-id"
```

**Verify:**
- [ ] Only ONE X-Request-ID header in response
- [ ] Request ID matches what was sent
- [ ] No duplicate or overwritten request IDs in logs

### Success Criteria
- [ ] Single request tracing middleware active
- [ ] No duplicate request ID generation
- [ ] Logs show consistent request_id throughout request lifecycle

---

## 🔍 Validation 4: End-to-End Request Tracing

### Objective
Trace a complete user journey through logs using request IDs.

### User Journey: Login → Dashboard → Error
```bash
JOURNEY_ID="journey-$(date +%s)"

# Step 1: Login
LOGIN_REQ_ID="${JOURNEY_ID}-login"
curl -X POST "${STAGING_BASE_URL}/api/auth/login" \
  -H "X-Request-ID: ${LOGIN_REQ_ID}" \
  -H "Content-Type: application/json" \
  -d '{"email":"guard@test.com","password":"test123"}' \
  -c cookies.txt

# Step 2: Fetch Profile
PROFILE_REQ_ID="${JOURNEY_ID}-profile"
curl "${STAGING_BASE_URL}/api/auth/me" \
  -H "X-Request-ID: ${PROFILE_REQ_ID}" \
  -b cookies.txt

# Step 3: Trigger Estate Error
ERROR_REQ_ID="${JOURNEY_ID}-error"
curl "${STAGING_BASE_URL}/api/guards" \
  -H "X-Request-ID: ${ERROR_REQ_ID}" \
  -b cookies.txt
```

**Log Query:**
```
request_id=~"journey-XXXXXX-.*"
```

**Verify:**
- [ ] All 3 requests logged with correct request_id
- [ ] User journey traceable through logs
- [ ] Error context includes previous request information (via user_id)

---

## 📊 Final Validation Summary

### Completion Checklist
- [ ] Milestone 1: Request ID correlation validated
- [ ] P1 Observability: Request ID propagation validated across all scenarios
- [ ] Middleware stack: Single tracing path confirmed
- [ ] End-to-end: User journey traceable through logs
- [ ] Evidence bundle: All artifacts captured in `staging-correlation/`

### Evidence Bundle Structure
```
staging-correlation/
├── VALIDATION_COMPLETE.md           # Final summary
├── response-headers.txt              # Response headers
├── response-body.json                # Error payload
├── request-metadata.txt              # Request details
├── csrf-test-output.txt              # CSRF scenario
├── auth-test-output.txt              # Auth scenario
├── estate-test-output.txt            # Estate scenario
├── logs/
│   ├── correlation-proof.txt         # Log aggregator query results
│   ├── csrf-logs.txt                 # CSRF security logs
│   ├── auth-logs.txt                 # Auth failure logs
│   ├── estate-logs.txt               # Estate required logs
│   └── middleware-startup.txt        # Server startup logs
└── screenshots/
    └── log-dashboard-correlation.png # Visual proof (optional)
```

---

## ✅ Marking Complete

Once all validations pass:

1. **Update ROADMAP_BOARD.md:**
```markdown
**Milestone 1 — Staging correlation validation**
- **Status:** ✅ COMPLETE (code + operational validation)
- **Completion record:** See `staging-correlation/VALIDATION_COMPLETE.md`

**P1 Observability pack**
- **Status:** ✅ COMPLETE (code + operational validation)
- **Completion record:** See `staging-correlation/VALIDATION_COMPLETE.md`
```

2. **Commit Evidence Bundle:**
```bash
git add staging-correlation/
git commit -m "feat: Complete Milestone 1 & P1 Observability staging validation"
git push origin main
```

3. **Move to Next Milestone:**
Focus shifts to **Milestone 2: Log field normalization** (if not already complete).

---

## 🆘 Troubleshooting

### Issue: X-Request-ID not in response headers
**Solution:** Check `securityHeadersMiddleware.js` is loaded before routes

### Issue: requestId missing from error payload
**Solution:** Verify `standardizedErrorHandler.js` is the final error handler

### Issue: Logs don't contain request_id
**Solution:** Check `loggingService.js` normalizes request_id from req.headers

### Issue: Multiple request IDs for same request
**Solution:** Ensure only app-level `requestIdMiddleware` is loaded (no duplicates)

---

## 📚 Related Documentation
- `MILESTONE1_P1_OBSERVABILITY_COMPLETE.md` - Code implementation completion report
- `scripts/local-correlation-validation.sh` - Local validation script
- `scripts/verify-observability-pack.sh` - Automated observability checks
- `observability-verification-report.md` - Local verification results
