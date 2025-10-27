#!/bin/bash

###############################################################################
# API ENDPOINT TESTING SCRIPT
# Tests all major API endpoints for functionality and security
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="http://localhost:5001"
PASSED=0
FAILED=0

log_test() { echo -e "${YELLOW}[TEST]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASSED++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAILED++)); }

echo -e "${GREEN}Testing API Endpoints${NC}\n"

# Test 1: Health Endpoint
log_test "Testing /api/health"
RESPONSE=$(curl -s http://localhost:5001/api/health)
if echo "$RESPONSE" | grep -q '"status":"healthy"'; then
    log_pass "Health endpoint working"
else
    log_fail "Health endpoint not working"
fi

# Test 2: Authentication - No token
log_test "Testing /api/visitors without auth"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/visitors)
if [ "$RESPONSE" = "401" ]; then
    log_pass "Protected endpoint correctly rejects unauthenticated requests"
else
    log_fail "Protected endpoint authentication not working (got $RESPONSE)"
fi

# Test 3: Login endpoint exists
log_test "Testing /api/auth/login endpoint"
RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' \
    -o /dev/null -w "%{http_code}")
if [ "$RESPONSE" = "400" ] || [ "$RESPONSE" = "401" ]; then
    log_pass "Login endpoint exists and responds (got $RESPONSE)"
else
    log_fail "Login endpoint not working correctly (got $RESPONSE)"
fi

# Test 4: CORS headers
log_test "Testing CORS headers"
RESPONSE=$(curl -s -I http://localhost:5001/api/health | grep -i "access-control")
if [ -n "$RESPONSE" ]; then
    log_pass "CORS headers present"
else
    log_fail "CORS headers missing"
fi

# Test 5: Rate limiting headers
log_test "Testing rate limiting"
curl -s http://localhost:5001/api/health > /dev/null
RESPONSE=$(curl -s -I http://localhost:5001/api/health | grep -i "x-ratelimit")
if [ -n "$RESPONSE" ]; then
    log_pass "Rate limiting headers present"
else
    log_fail "Rate limiting headers missing"
fi

# Test 6: Security headers
log_test "Testing security headers"
HEADERS=$(curl -s -I http://localhost:5001/api/health)
SECURITY_OK=true
if ! echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
    log_fail "Missing X-Content-Type-Options header"
    SECURITY_OK=false
fi
if ! echo "$HEADERS" | grep -q "X-Frame-Options"; then
    log_fail "Missing X-Frame-Options header"
    SECURITY_OK=false
fi
if [ "$SECURITY_OK" = true ]; then
    log_pass "Security headers present"
fi

# Test 7: API responds to OPTIONS (preflight)
log_test "Testing OPTIONS method"
RESPONSE=$(curl -s -X OPTIONS http://localhost:5001/api/health -o /dev/null -w "%{http_code}")
if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "204" ]; then
    log_pass "OPTIONS method supported"
else
    log_fail "OPTIONS method not supported (got $RESPONSE)"
fi

# Test 8: Error handling
log_test "Testing error handling"
RESPONSE=$(curl -s http://localhost:5001/api/nonexistent)
if echo "$RESPONSE" | grep -q "error\|message\|code"; then
    log_pass "API returns structured error responses"
else
    log_fail "API error responses not structured"
fi

# Test 9: API versioning
log_test "Testing API version in response"
RESPONSE=$(curl -s http://localhost:5001/api/health)
if echo "$RESPONSE" | grep -q "version"; then
    VERSION=$(echo "$RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    log_pass "API version detected: $VERSION"
else
    log_fail "API version not found in responses"
fi

# Test 10: Response time
log_test "Testing API response time"
START=$(date +%s%N)
curl -s http://localhost:5001/api/health > /dev/null
END=$(date +%s%N)
RESPONSE_TIME=$(( (END - START) / 1000000 ))
if [ "$RESPONSE_TIME" -lt 500 ]; then
    log_pass "Response time: ${RESPONSE_TIME}ms (Good)"
elif [ "$RESPONSE_TIME" -lt 1000 ]; then
    log_pass "Response time: ${RESPONSE_TIME}ms (Acceptable)"
else
    log_fail "Response time: ${RESPONSE_TIME}ms (Too slow)"
fi

echo -e "\n${GREEN}API Test Summary${NC}"
echo -e "Passed: $PASSED"
echo -e "Failed: $FAILED"
echo -e "Total:  $((PASSED + FAILED))"

if [ "$FAILED" -eq 0 ]; then
    echo -e "\n${GREEN}✅ All API tests passed${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠️ Some API tests failed${NC}"
    exit 1
fi
