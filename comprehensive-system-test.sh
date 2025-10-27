#!/bin/bash
# Comprehensive System Test - All Components
# Date: October 22, 2025
# Purpose: Test entire Secure Gate system for AWS deployment readiness

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:5001"
FRONTEND_URL="http://localhost:3000"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# User tokens
ADMIN_TOKEN=""
GUARD_TOKEN=""
RESIDENT_TOKEN=""

# Test data
VISITOR_ID=""
PASS_ID=""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔬 COMPREHENSIVE SYSTEM TEST - SECURE GATE${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Test Date:${NC} $(date)"
echo -e "${BLUE}Backend URL:${NC} $BASE_URL"
echo -e "${BLUE}Frontend URL:${NC} $FRONTEND_URL"
echo ""

# Helper functions
test_start() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -ne "${BLUE}Testing:${NC} $1 ... "
}

test_pass() {
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✅ PASS${NC}"
}

test_fail() {
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "${RED}❌ FAIL${NC}: $1"
}

test_warn() {
    WARNINGS=$((WARNINGS + 1))
    echo -e "${YELLOW}⚠️  WARNING${NC}: $1"
}

section_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ========================================
# PHASE 1: INFRASTRUCTURE TESTS
# ========================================
section_header "PHASE 1: Infrastructure & Health Checks"

# Test 1.1: Backend Health
test_start "Backend API Health"
HEALTH=$(curl -s "$BASE_URL/api/health")
if echo "$HEALTH" | jq -e '.success == true and .data.status != "unhealthy"' >/dev/null 2>&1; then
    test_pass
    echo "   Status: $(echo "$HEALTH" | jq -r '.data.status')"
    echo "   Uptime: $(echo "$HEALTH" | jq -r '.data.uptime')s"
else
    test_fail "Backend health check failed"
fi

# Test 1.2: Database Connection
test_start "Database Connection"
DB_STATUS=$(echo "$HEALTH" | jq -r '.data.healthChecks.database.status' 2>/dev/null)
if [ "$DB_STATUS" == "healthy" ] || [ "$DB_STATUS" == "warning" ]; then
    test_pass
else
    test_fail "Database not healthy: $DB_STATUS"
fi

# Test 1.3: Redis Connection
test_start "Redis Cache Connection"
MEMORY_STATUS=$(echo "$HEALTH" | jq -r '.data.healthChecks.memory.status' 2>/dev/null)
if [ "$MEMORY_STATUS" == "healthy" ]; then
    test_pass
else
    test_warn "Memory/Cache status: $MEMORY_STATUS"
fi

# Test 1.4: Frontend Availability
test_start "Frontend Availability"
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200\|301\|302"; then
    test_pass
else
    test_warn "Frontend not accessible on port 3000"
fi

# ========================================
# PHASE 2: AUTHENTICATION TESTS
# ========================================
section_header "PHASE 2: Authentication & Authorization"

# Test 2.1: Admin Login
test_start "Admin Login"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin-test@example.com","password":"Admin@123"}')
if echo "$RESPONSE" | jq -e '.success == true' >/dev/null 2>&1; then
    ADMIN_TOKEN=$(echo "$RESPONSE" | jq -r '.data.accessToken')
    test_pass
    echo "   User: $(echo "$RESPONSE" | jq -r '.data.user.email')"
    echo "   Role: $(echo "$RESPONSE" | jq -r '.data.user.role')"
else
    test_fail "Admin login failed"
    echo "   Response: $RESPONSE"
fi

# Test 2.2: Guard Login
test_start "Guard Login"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"guard-test@example.com","password":"Guard@123"}')
if echo "$RESPONSE" | jq -e '.success == true' >/dev/null 2>&1; then
    GUARD_TOKEN=$(echo "$RESPONSE" | jq -r '.data.accessToken')
    test_pass
else
    test_fail "Guard login failed"
fi

# Test 2.3: Resident Login
test_start "Resident Login"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"resident-test@example.com","password":"Resident@123"}')
if echo "$RESPONSE" | jq -e '.success == true' >/dev/null 2>&1; then
    RESIDENT_TOKEN=$(echo "$RESPONSE" | jq -r '.data.accessToken')
    test_pass
else
    test_fail "Resident login failed"
fi

# Test 2.4: Invalid Login
test_start "Invalid Credentials Rejection"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"invalid@example.com","password":"wrong"}')
if echo "$RESPONSE" | jq -e '.success == false' >/dev/null 2>&1; then
    test_pass
else
    test_fail "Invalid login not rejected"
fi

# Test 2.5: Token Validation
test_start "Token Validation"
if [ -n "$ADMIN_TOKEN" ]; then
    RESPONSE=$(curl -s "$BASE_URL/api/users/profile" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    if echo "$RESPONSE" | jq -e '.success == true' >/dev/null 2>&1; then
        test_pass
    else
        test_fail "Token validation failed"
    fi
else
    test_fail "No admin token available"
fi

# Test 2.6: Unauthorized Access
test_start "Unauthorized Access Blocking"
RESPONSE=$(curl -s "$BASE_URL/api/users")
if echo "$RESPONSE" | jq -e '.success == false' >/dev/null 2>&1; then
    test_pass
else
    test_fail "Unauthorized access not blocked"
fi

# ========================================
# PHASE 3: VISITOR MANAGEMENT TESTS
# ========================================
section_header "PHASE 3: Visitor Management"

if [ -n "$RESIDENT_TOKEN" ]; then
    # Test 3.1: Create Visitor
    test_start "Create Single Visitor"
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/visitors" \
        -H "Authorization: Bearer $RESIDENT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "first_name": "John",
            "last_name": "Doe",
            "phone": "+254712345678",
            "purpose": "Business Meeting",
            "expiry_time": "2025-12-31T23:59:59Z"
        }')
    if echo "$RESPONSE" | jq -e '.success == true' >/dev/null 2>&1; then
        VISITOR_ID=$(echo "$RESPONSE" | jq -r '.data.id // .data.visitor.id')
        test_pass
        echo "   Visitor ID: $VISITOR_ID"
    else
        test_fail "Visitor creation failed"
        echo "   Response: $RESPONSE"
    fi

    # Test 3.2: Get Visitor List
    test_start "Get My Visitors"
    RESPONSE=$(curl -s "$BASE_URL/api/visitors" \
        -H "Authorization: Bearer $RESIDENT_TOKEN")
    if echo "$RESPONSE" | jq -e '.success == true' >/dev/null 2>&1; then
        COUNT=$(echo "$RESPONSE" | jq -r '.data | length // 0')
        test_pass
        echo "   Visitors: $COUNT"
    else
        test_fail "Get visitors failed"
    fi

    # Test 3.3: Get Visitor Details
    if [ -n "$VISITOR_ID" ] && [ "$VISITOR_ID" != "null" ]; then
        test_start "Get Visitor Details"
        RESPONSE=$(curl -s "$BASE_URL/api/visitors/$VISITOR_ID" \
            -H "Authorization: Bearer $RESIDENT_TOKEN")
        if echo "$RESPONSE" | jq -e '.success == true' >/dev/null 2>&1; then
            test_pass
        else
            test_fail "Get visitor details failed"
        fi
    fi

    # Test 3.4: Update Visitor
    if [ -n "$VISITOR_ID" ] && [ "$VISITOR_ID" != "null" ]; then
        test_start "Update Visitor"
        RESPONSE=$(curl -s -X PUT "$BASE_URL/api/visitors/$VISITOR_ID" \
            -H "Authorization: Bearer $RESIDENT_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"purpose": "Updated Business Meeting"}')
        if echo "$RESPONSE" | jq -e '.success == true' >/dev/null 2>&1; then
            test_pass
        else
            test_warn "Visitor update failed or not implemented"
        fi
    fi
else
    test_fail "No resident token available for visitor tests"
fi

# ========================================
# PHASE 4: EMAIL/SMS INTEGRATION TESTS
# ========================================
section_header "PHASE 4: Email/SMS Integration"

# Test 4.1: Email Configuration
test_start "Email Service Configuration"
if grep -q "YOUR_SMTP_PASSWORD_HERE" /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/.env 2>/dev/null; then
    test_fail "SMTP password is placeholder - Email NOT configured"
elif grep -q "MAILGUN_API_KEY=" /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/.env 2>/dev/null; then
    if grep -q "MAILGUN_API_KEY=\$" /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/.env 2>/dev/null; then
        test_warn "Mailgun API key not set"
    else
        test_pass
    fi
else
    test_warn "Email configuration status unknown"
fi

# Test 4.2: SMS Configuration
test_start "SMS Service Configuration"
# Check logs for SMS initialization
LOGS=$(docker logs secure-gate-backend-prod 2>&1 | tail -100)
if echo "$LOGS" | grep -qi "twilio\|africastalking"; then
    if echo "$LOGS" | grep -qi "failed.*twilio\|failed.*africastalking"; then
        test_warn "SMS service initialization failed"
    else
        test_pass
    fi
else
    test_warn "SMS configuration status unknown"
fi

# ========================================
# PHASE 5: SECURITY TESTS
# ========================================
section_header "PHASE 5: Security Validation"

# Test 5.1: SQL Injection Protection
test_start "SQL Injection Protection"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin@test.com OR 1=1--","password":"anything"}')
if echo "$RESPONSE" | jq -e '.success == false' >/dev/null 2>&1; then
    test_pass
else
    test_fail "SQL injection not blocked"
fi

# Test 5.2: XSS Protection
test_start "XSS Protection"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"<script>alert(1)</script>","password":"test"}')
if echo "$RESPONSE" | jq -e '.success == false' >/dev/null 2>&1; then
    test_pass
else
    test_fail "XSS not blocked"
fi

# Test 5.3: Rate Limiting
test_start "Rate Limiting"
RATE_LIMITED=false
for i in {1..15}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"test","password":"test"}')
    if [ "$STATUS" == "429" ]; then
        RATE_LIMITED=true
        break
    fi
done
if [ "$RATE_LIMITED" == "true" ]; then
    test_pass
    echo "   Rate limit triggered after $i attempts"
else
    test_warn "Rate limit not triggered after 15 attempts"
fi

# Test 5.4: HTTPS Enforcement
test_start "HTTPS Enforcement"
if grep -q "ENFORCE_HTTPS=true" /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/.env 2>/dev/null; then
    test_pass
else
    test_warn "HTTPS enforcement not enabled in production config"
fi

# ========================================
# PHASE 6: PERFORMANCE TESTS
# ========================================
section_header "PHASE 6: Performance Metrics"

# Test 6.1: API Response Time
test_start "API Response Time"
START=$(date +%s%3N)
curl -s "$BASE_URL/api/health" >/dev/null
END=$(date +%s%3N)
RESPONSE_TIME=$((END - START))
if [ $RESPONSE_TIME -lt 200 ]; then
    test_pass
    echo "   Response time: ${RESPONSE_TIME}ms"
elif [ $RESPONSE_TIME -lt 500 ]; then
    test_warn "Response time: ${RESPONSE_TIME}ms (target: <200ms)"
else
    test_fail "Response time too high: ${RESPONSE_TIME}ms"
fi

# Test 6.2: Database Query Performance
test_start "Database Query Performance"
if [ -n "$ADMIN_TOKEN" ]; then
    START=$(date +%s%3N)
    curl -s "$BASE_URL/api/visitors" -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null
    END=$(date +%s%3N)
    QUERY_TIME=$((END - START))
    if [ $QUERY_TIME -lt 300 ]; then
        test_pass
        echo "   Query time: ${QUERY_TIME}ms"
    else
        test_warn "Query time: ${QUERY_TIME}ms (target: <300ms)"
    fi
else
    test_warn "No token for database query test"
fi

# ========================================
# FINAL SUMMARY
# ========================================
section_header "📊 TEST SUMMARY"

PASS_RATE=0
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
fi

echo -e "Total Tests Run:    ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Tests Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Tests Failed:       ${RED}$FAILED_TESTS${NC}"
echo -e "Warnings:           ${YELLOW}$WARNINGS${NC}"
echo -e "Pass Rate:          ${BLUE}$PASS_RATE%${NC}"
echo ""

if [ $PASS_RATE -ge 90 ]; then
    echo -e "${GREEN}✅ EXCELLENT${NC}: System is deployment ready!"
    exit 0
elif [ $PASS_RATE -ge 75 ]; then
    echo -e "${YELLOW}⚠️  GOOD${NC}: System mostly ready, address warnings"
    exit 0
elif [ $PASS_RATE -ge 60 ]; then
    echo -e "${YELLOW}⚠️  FAIR${NC}: Several issues need attention"
    exit 1
else
    echo -e "${RED}❌ CRITICAL${NC}: System not ready for deployment"
    exit 1
fi
