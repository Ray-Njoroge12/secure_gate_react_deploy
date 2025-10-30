#!/bin/bash
# Quick Automated Test - Simple and Reliable
# No complex bash syntax, just straightforward tests

echo ""
echo "=============================================="
echo "  AUTOMATED SYSTEM TEST SUITE"
echo "=============================================="
echo ""
echo "Date: $(date)"
echo "Frontend: http://localhost:3002"
echo "Backend:  http://localhost:5001"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# Test 1: Backend Health
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Backend Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s http://localhost:5001/health > /tmp/backend_health.json
if grep -q "healthy" /tmp/backend_health.json; then
    echo "✅ PASS: Backend is healthy"
    PASSED=$((PASSED + 1))
else
    echo "❌ FAIL: Backend not healthy"
    FAILED=$((FAILED + 1))
fi

# Test 2: Frontend Accessibility
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Frontend Accessibility"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s http://localhost:3002 > /tmp/frontend.html
if grep -q 'id="root"' /tmp/frontend.html; then
    echo "✅ PASS: Frontend accessible with React root"
    PASSED=$((PASSED + 1))
else
    echo "❌ FAIL: Frontend not accessible or missing React root"
    FAILED=$((FAILED + 1))
fi

if grep -q '<title>' /tmp/frontend.html; then
    title=$(grep -o '<title>[^<]*' /tmp/frontend.html | sed 's/<title>//')
    echo "✅ PASS: Page title present: $title"
    PASSED=$((PASSED + 1))
else
    echo "⚠️  WARN: No page title found"
    WARNINGS=$((WARNINGS + 1))
fi

if grep -q '\.js' /tmp/frontend.html; then
    echo "✅ PASS: JavaScript bundle referenced"
    PASSED=$((PASSED + 1))
else
    echo "❌ FAIL: JavaScript bundle missing"
    FAILED=$((FAILED + 1))
fi

if grep -q '\.css' /tmp/frontend.html; then
    echo "✅ PASS: CSS bundle referenced"
    PASSED=$((PASSED + 1))
else
    echo "⚠️  WARN: CSS bundle not found"
    WARNINGS=$((WARNINGS + 1))
fi

if grep -q 'viewport' /tmp/frontend.html; then
    echo "✅ PASS: Viewport meta tag present (responsive design)"
    PASSED=$((PASSED + 1))
else
    echo "❌ FAIL: Missing viewport meta tag"
    FAILED=$((FAILED + 1))
fi

# Test 3: Admin Login
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Admin Authentication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@securegate.com","password":"Admin@123"}' > /tmp/admin_login.json

if grep -q '"token"' /tmp/admin_login.json; then
    echo "✅ PASS: Admin login successful"
    PASSED=$((PASSED + 1))
    ADMIN_TOKEN=$(grep -o '"token":"[^"]*"' /tmp/admin_login.json | cut -d'"' -f4)
else
    echo "❌ FAIL: Admin login failed"
    FAILED=$((FAILED + 1))
fi

# Test 4: Guard Login
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Guard Authentication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"guard@securegate.com","password":"Guard@123"}' > /tmp/guard_login.json

if grep -q '"token"' /tmp/guard_login.json; then
    echo "✅ PASS: Guard login successful"
    PASSED=$((PASSED + 1))
else
    echo "❌ FAIL: Guard login failed"
    FAILED=$((FAILED + 1))
fi

# Test 5: Resident Login
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: Resident Authentication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"resident@securegate.com","password":"Resident@123"}' > /tmp/resident_login.json

if grep -q '"token"' /tmp/resident_login.json; then
    echo "✅ PASS: Resident login successful"
    PASSED=$((PASSED + 1))
else
    echo "❌ FAIL: Resident login failed"
    FAILED=$((FAILED + 1))
fi

# Test 6: Invalid Login Rejection
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 6: Invalid Login Rejection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid@test.com","password":"wrongpass"}')

if [ "$http_code" = "401" ] || [ "$http_code" = "400" ]; then
    echo "✅ PASS: Invalid credentials properly rejected (HTTP $http_code)"
    PASSED=$((PASSED + 1))
else
    echo "⚠️  WARN: Unexpected response for invalid login (HTTP $http_code)"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 7: API Endpoints (with admin token)
if [ ! -z "$ADMIN_TOKEN" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "TEST 7: API Endpoints"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Test users endpoint
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/users \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if [ "$http_code" = "200" ]; then
        echo "✅ PASS: Users endpoint accessible"
        PASSED=$((PASSED + 1))
    else
        echo "❌ FAIL: Users endpoint failed (HTTP $http_code)"
        FAILED=$((FAILED + 1))
    fi
    
    # Test visitors endpoint
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/visitors \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if [ "$http_code" = "200" ]; then
        echo "✅ PASS: Visitors endpoint accessible"
        PASSED=$((PASSED + 1))
    else
        echo "⚠️  WARN: Visitors endpoint returned HTTP $http_code"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Test 8: Database Connectivity
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 8: Database Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker exec secure-gate-postgres-prod pg_isready > /dev/null 2>&1; then
    echo "✅ PASS: PostgreSQL is accepting connections"
    PASSED=$((PASSED + 1))
else
    echo "❌ FAIL: PostgreSQL connection check failed"
    FAILED=$((FAILED + 1))
fi

if docker exec secure-gate-redis-prod redis-cli ping > /dev/null 2>&1; then
    echo "✅ PASS: Redis is responding"
    PASSED=$((PASSED + 1))
else
    echo "❌ FAIL: Redis connection check failed"
    FAILED=$((FAILED + 1))
fi

# Test 9: Container Status
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 9: Container Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

containers="secure-gate-backend-prod secure-gate-postgres-prod secure-gate-redis-prod"
for container in $containers; do
    status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "not found")
    if [ "$status" = "running" ]; then
        echo "✅ PASS: $container is running"
        PASSED=$((PASSED + 1))
    else
        echo "❌ FAIL: $container not running (status: $status)"
        FAILED=$((FAILED + 1))
    fi
done

# Test 10: Performance
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 10: Performance Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

api_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:5001/health)
echo "API response time: ${api_time}s"
if [ "${api_time%%.*}" -lt 2 ]; then
    echo "✅ PASS: API responds quickly"
    PASSED=$((PASSED + 1))
else
    echo "⚠️  WARN: API response slow"
    WARNINGS=$((WARNINGS + 1))
fi

frontend_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3002)
echo "Frontend load time: ${frontend_time}s"
if [ "${frontend_time%%.*}" -lt 3 ]; then
    echo "✅ PASS: Frontend loads quickly"
    PASSED=$((PASSED + 1))
else
    echo "⚠️  WARN: Frontend load time acceptable but could be faster"
    WARNINGS=$((WARNINGS + 1))
fi

# Generate Report
echo ""
echo "=============================================="
echo "  TEST REPORT SUMMARY"
echo "=============================================="
echo ""

TOTAL=$((PASSED + FAILED + WARNINGS))
if [ $TOTAL -gt 0 ]; then
    PASS_RATE=$((PASSED * 100 / TOTAL))
else
    PASS_RATE=0
fi

echo "Total Tests:  $TOTAL"
echo "✅ Passed:    $PASSED ($PASS_RATE%)"
echo "❌ Failed:    $FAILED"
echo "⚠️  Warnings:  $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ ALL TESTS PASSED!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "System is ready for AWS deployment"
    EXIT_CODE=0
elif [ $FAILED -lt 3 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  MINOR ISSUES DETECTED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$FAILED test(s) failed. Review before deployment."
    EXIT_CODE=1
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ CRITICAL ISSUES DETECTED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$FAILED tests failed. Address issues before deployment."
    EXIT_CODE=1
fi

echo ""
echo "Test completed: $(date)"
echo "Report saved to: automated-test-results.txt"
echo ""

# Save report
cat > automated-test-results.txt << EOF
Automated Test Results
======================
Date: $(date)
Frontend: http://localhost:3002
Backend: http://localhost:5001

Summary:
--------
Total Tests: $TOTAL
Passed: $PASSED ($PASS_RATE%)
Failed: $FAILED
Warnings: $WARNINGS

Status: $([ $FAILED -eq 0 ] && echo 'READY FOR DEPLOYMENT' || echo 'NEEDS ATTENTION')
EOF

exit $EXIT_CODE
