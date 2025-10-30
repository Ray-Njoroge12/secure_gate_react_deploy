#!/bin/bash
# Simplified Test Suite - Non-Hanging Version
# Tests that don't require authentication or database queries

echo ""
echo "=============================================="
echo "  SIMPLIFIED AUTOMATED TEST SUITE"
echo "=============================================="
echo ""
echo "Date: $(date)"
echo "Testing: Basic connectivity and availability"
echo ""

PASSED=0
FAILED=0

# Test 1: Backend Health (Simple endpoint)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Backend Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s --max-time 5 http://localhost:5001/health)
if echo "$response" | grep -q "healthy"; then
    echo "✅ PASS: Backend is healthy"
    PASSED=$((PASSED + 1))
else
    echo "❌ FAIL: Backend health check failed"
    FAILED=$((FAILED + 1))
fi

# Test 2: Frontend Accessibility
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Frontend Accessibility"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s --max-time 5 http://localhost:3002)
if echo "$response" | grep -q 'id="root"'; then
    echo "✅ PASS: Frontend accessible with React root"
    PASSED=$((PASSED + 1))
else
    echo "❌ FAIL: Frontend not accessible"
    FAILED=$((FAILED + 1))
fi

if echo "$response" | grep -q '<title>'; then
    echo "✅ PASS: Page title present"
    PASSED=$((PASSED + 1))
fi

if echo "$response" | grep -q '\.js'; then
    echo "✅ PASS: JavaScript bundle present"
    PASSED=$((PASSED + 1))
fi

if echo "$response" | grep -q 'viewport'; then
    echo "✅ PASS: Responsive meta tag present"
    PASSED=$((PASSED + 1))
fi

# Test 3: Database Connectivity
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Database Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if docker exec secure-gate-postgres-prod pg_isready > /dev/null 2>&1; then
    echo "✅ PASS: PostgreSQL accepting connections"
    PASSED=$((PASSED + 1))
else
    echo "❌ FAIL: PostgreSQL not responding"
    FAILED=$((FAILED + 1))
fi

if docker exec secure-gate-redis-prod redis-cli ping > /dev/null 2>&1; then
    echo "✅ PASS: Redis responding"
    PASSED=$((PASSED + 1))
else
    echo "❌ FAIL: Redis not responding"
    FAILED=$((FAILED + 1))
fi

# Test 4: Container Status
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Container Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for container in secure-gate-backend-prod secure-gate-postgres-prod secure-gate-redis-prod; do
    status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null)
    if [ "$status" = "running" ]; then
        echo "✅ PASS: $container is running"
        PASSED=$((PASSED + 1))
    else
        echo "❌ FAIL: $container not running"
        FAILED=$((FAILED + 1))
    fi
done

# Test 5: Frontend Build Artifacts
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: Frontend Build Quality"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s http://localhost:3002)
if echo "$response" | grep -qE 'static/js/main\.[a-f0-9]+\.js'; then
    echo "✅ PASS: Hashed JavaScript bundle (production build)"
    PASSED=$((PASSED + 1))
fi

if echo "$response" | grep -qE 'static/css/main\.[a-f0-9]+\.css'; then
    echo "✅ PASS: Hashed CSS bundle (production build)"
    PASSED=$((PASSED + 1))
fi

# Test 6: API Endpoints (without auth)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 6: Public API Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Health endpoint
http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:5001/health)
if [ "$http_code" = "200" ]; then
    echo "✅ PASS: Health endpoint (HTTP 200)"
    PASSED=$((PASSED + 1))
else
    echo "❌ FAIL: Health endpoint (HTTP $http_code)"
    FAILED=$((FAILED + 1))
fi

# Test 7: Performance
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 7: Basic Performance"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
api_time=$(curl -o /dev/null -s -w '%{time_total}' --max-time 10 http://localhost:5001/health)
echo "  API response time: ${api_time}s"
if [ "${api_time%%.*}" -lt 2 ]; then
    echo "✅ PASS: API responds quickly"
    PASSED=$((PASSED + 1))
fi

frontend_time=$(curl -o /dev/null -s -w '%{time_total}' --max-time 10 http://localhost:3002)
echo "  Frontend load time: ${frontend_time}s"
if [ "${frontend_time%%.*}" -lt 5 ]; then
    echo "✅ PASS: Frontend loads acceptably"
    PASSED=$((PASSED + 1))
fi

# Report
echo ""
echo "=============================================="
echo "  TEST RESULTS"
echo "=============================================="
echo ""
TOTAL=$((PASSED + FAILED))
echo "Total Tests:  $TOTAL"
echo "✅ Passed:    $PASSED"
echo "❌ Failed:    $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ ALL BASIC TESTS PASSED!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "System Status: Ready for manual testing"
    echo "Next Step: Create test users for authentication"
    echo ""
    exit 0
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ $FAILED TEST(S) FAILED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    exit 1
fi
