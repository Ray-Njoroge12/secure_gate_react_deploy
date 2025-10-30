#!/bin/bash
# Comprehensive Automated Test Suite
# Tests UI, API, Authentication, Database, Icons, and Functionality

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# URLs
FRONTEND_URL="http://localhost:3002"
BACKEND_URL="http://localhost:5001"

# Test result arrays
declare -a TEST_RESULTS

# Helper functions
pass_test() {
    echo -e "${GREEN}✅ PASS${NC} [$1] $2: $3"
    ((PASSED++))
    TEST_RESULTS+=("PASS|$1|$2|$3")
}

fail_test() {
    echo -e "${RED}❌ FAIL${NC} [$1] $2: $3"
    ((FAILED++))
    TEST_RESULTS+=("FAIL|$1|$2|$3")
}

warn_test() {
    echo -e "${YELLOW}⚠️  WARN${NC} [$1] $2: $3"
    ((WARNINGS++))
    TEST_RESULTS+=("WARN|$1|$2|$3")
}

info() {
    echo -e "${BLUE}ℹ️  INFO${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🔍 $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Start tests
echo ""
echo "🚀 Starting Comprehensive Automated Test Suite"
echo "================================================"
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
echo "Time:     $(date)"
echo ""

# Test 1: Backend Health
section "Test 1: Backend Health Check"

response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health" 2>/dev/null || echo "000")
http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    if echo "$body" | grep -q "healthy"; then
        pass_test "Backend" "Health Check" "Backend is healthy (HTTP 200)"
        
        # Check uptime
        uptime=$(echo "$body" | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
        if [ ! -z "$uptime" ]; then
            pass_test "Backend" "Uptime" "Backend uptime: ${uptime}s"
        fi
        
        # Check version
        version=$(echo "$body" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        if [ ! -z "$version" ]; then
            pass_test "Backend" "Version" "API version: $version"
        fi
    else
        fail_test "Backend" "Health Check" "Response doesn't indicate healthy status"
    fi
else
    fail_test "Backend" "Health Check" "Backend not responding (HTTP $http_code)"
fi

# Test 2: Frontend Availability
section "Test 2: Frontend Availability"

response=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    pass_test "Frontend" "Availability" "Frontend is accessible (HTTP 200)"
    
    # Check for React root
    if echo "$body" | grep -q 'id="root"'; then
        pass_test "Frontend" "HTML Structure" "React root div present"
    else
        fail_test "Frontend" "HTML Structure" "React root div missing"
    fi
    
    # Check for JavaScript bundle
    if echo "$body" | grep -qE '\.js["\']'; then
        pass_test "Frontend" "Assets" "JavaScript bundle referenced"
    else
        fail_test "Frontend" "Assets" "JavaScript bundle not found"
    fi
    
    # Check for CSS bundle
    if echo "$body" | grep -qE '\.css["\']'; then
        pass_test "Frontend" "Assets" "CSS bundle referenced"
    else
        warn_test "Frontend" "Assets" "CSS bundle not explicitly referenced"
    fi
    
    # Check for title
    if echo "$body" | grep -q '<title>'; then
        title=$(echo "$body" | grep -o '<title>[^<]*' | sed 's/<title>//')
        pass_test "Frontend" "Metadata" "Page title: $title"
    else
        warn_test "Frontend" "Metadata" "No page title found"
    fi
    
    # Check for viewport meta
    if echo "$body" | grep -q 'viewport'; then
        pass_test "Frontend" "Responsive" "Viewport meta tag present"
    else
        fail_test "Frontend" "Responsive" "Viewport meta tag missing"
    fi
    
    # Check for favicon
    if echo "$body" | grep -qi 'favicon'; then
        pass_test "Frontend" "Assets" "Favicon referenced"
    else
        warn_test "Frontend" "Assets" "No favicon reference found"
    fi
    
else
    fail_test "Frontend" "Availability" "Frontend not accessible (HTTP $http_code)"
fi

# Test 3: Authentication API
section "Test 3: Authentication API"

# Test admin login
admin_response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@securegate.com","password":"Admin@123"}' 2>/dev/null || echo "000")
admin_code=$(echo "$admin_response" | tail -n 1)
admin_body=$(echo "$admin_response" | sed '$d')

if [ "$admin_code" = "200" ]; then
    if echo "$admin_body" | grep -q '"token"'; then
        pass_test "Auth" "Admin Login" "Admin login successful, token received"
        ADMIN_TOKEN=$(echo "$admin_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    else
        fail_test "Auth" "Admin Login" "Login succeeded but no token"
    fi
else
    fail_test "Auth" "Admin Login" "Admin login failed (HTTP $admin_code)"
fi

# Test guard login
guard_response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"guard@securegate.com","password":"Guard@123"}' 2>/dev/null || echo "000")
guard_code=$(echo "$guard_response" | tail -n 1)
guard_body=$(echo "$guard_response" | sed '$d')

if [ "$guard_code" = "200" ]; then
    if echo "$guard_body" | grep -q '"token"'; then
        pass_test "Auth" "Guard Login" "Guard login successful"
    else
        fail_test "Auth" "Guard Login" "Login succeeded but no token"
    fi
else
    fail_test "Auth" "Guard Login" "Guard login failed (HTTP $guard_code)"
fi

# Test resident login
resident_response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"resident@securegate.com","password":"Resident@123"}' 2>/dev/null || echo "000")
resident_code=$(echo "$resident_response" | tail -n 1)
resident_body=$(echo "$resident_response" | sed '$d')

if [ "$resident_code" = "200" ]; then
    if echo "$resident_body" | grep -q '"token"'; then
        pass_test "Auth" "Resident Login" "Resident login successful"
    else
        fail_test "Auth" "Resident Login" "Login succeeded but no token"
    fi
else
    fail_test "Auth" "Resident Login" "Resident login failed (HTTP $resident_code)"
fi

# Test invalid login
invalid_response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid@test.com","password":"wrongpass"}' 2>/dev/null || echo "000")
invalid_code=$(echo "$invalid_response" | tail -n 1)

if [ "$invalid_code" = "401" ] || [ "$invalid_code" = "400" ]; then
    pass_test "Auth" "Invalid Login" "Invalid credentials properly rejected (HTTP $invalid_code)"
else
    warn_test "Auth" "Invalid Login" "Unexpected response for invalid login (HTTP $invalid_code)"
fi

# Test 4: API Endpoints (with admin token)
section "Test 4: API Endpoints"

if [ ! -z "$ADMIN_TOKEN" ]; then
    # Test users endpoint
    users_response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/users" \
        -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null || echo "000")
    users_code=$(echo "$users_response" | tail -n 1)
    
    if [ "$users_code" = "200" ]; then
        pass_test "API" "Get Users" "Users endpoint accessible"
    else
        fail_test "API" "Get Users" "Users endpoint failed (HTTP $users_code)"
    fi
    
    # Test visitors endpoint
    visitors_response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/visitors" \
        -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null || echo "000")
    visitors_code=$(echo "$visitors_response" | tail -n 1)
    
    if [ "$visitors_code" = "200" ]; then
        pass_test "API" "Get Visitors" "Visitors endpoint accessible"
    else
        warn_test "API" "Get Visitors" "Visitors endpoint returned HTTP $visitors_code"
    fi
    
    # Test dashboard stats
    stats_response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/dashboard/stats" \
        -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null || echo "000")
    stats_code=$(echo "$stats_response" | tail -n 1)
    
    if [ "$stats_code" = "200" ]; then
        pass_test "API" "Dashboard Stats" "Dashboard stats endpoint accessible"
    else
        warn_test "API" "Dashboard Stats" "Dashboard stats returned HTTP $stats_code"
    fi
else
    warn_test "API" "Endpoints" "Skipping endpoint tests (no admin token)"
fi

# Test 5: Database Connectivity
section "Test 5: Database Connectivity"

# Check PostgreSQL
pg_check=$(docker exec secure-gate-postgres-prod pg_isready 2>/dev/null || echo "fail")
if echo "$pg_check" | grep -q "accepting connections"; then
    pass_test "Database" "PostgreSQL" "PostgreSQL is accepting connections"
else
    fail_test "Database" "PostgreSQL" "PostgreSQL connection check failed"
fi

# Check Redis
redis_check=$(docker exec secure-gate-redis-prod redis-cli ping 2>/dev/null || echo "fail")
if echo "$redis_check" | grep -q "PONG"; then
    pass_test "Database" "Redis" "Redis is responding"
else
    fail_test "Database" "Redis" "Redis connection check failed"
fi

# Test 6: Docker Containers
section "Test 6: Docker Container Status"

containers=("secure-gate-backend-prod" "secure-gate-postgres-prod" "secure-gate-redis-prod" "secure-gate-frontend-green")

for container in "${containers[@]}"; do
    status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "not found")
    if [ "$status" = "running" ]; then
        pass_test "Docker" "$container" "Container is running"
        
        # Check health if available
        health=$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
        if [ "$health" = "healthy" ]; then
            pass_test "Docker" "$container Health" "Container is healthy"
        elif [ "$health" != "none" ]; then
            warn_test "Docker" "$container Health" "Health status: $health"
        fi
    else
        fail_test "Docker" "$container" "Container not running (status: $status)"
    fi
done

# Test 7: Performance Check
section "Test 7: Performance Check"

# Test frontend load time
frontend_time=$(curl -o /dev/null -s -w '%{time_total}' "$FRONTEND_URL" 2>/dev/null || echo "999")
frontend_check=$(echo "$frontend_time < 3" | bc -l 2>/dev/null || echo "0")
if [ "$frontend_check" = "1" ]; then
    pass_test "Performance" "Frontend Load" "Frontend loads in ${frontend_time}s (< 3s)"
else
    frontend_check5=$(echo "$frontend_time < 5" | bc -l 2>/dev/null || echo "0")
    if [ "$frontend_check5" = "1" ]; then
        warn_test "Performance" "Frontend Load" "Frontend loads in ${frontend_time}s (acceptable)"
    else
        fail_test "Performance" "Frontend Load" "Frontend slow: ${frontend_time}s (> 5s)"
    fi
fi

# Test API response time
api_time=$(curl -o /dev/null -s -w '%{time_total}' "$BACKEND_URL/health" 2>/dev/null || echo "999")
api_check=$(echo "$api_time < 1" | bc -l 2>/dev/null || echo "0")
if [ "$api_check" = "1" ]; then
    pass_test "Performance" "API Response" "API responds in ${api_time}s (< 1s)"
else
    api_check2=$(echo "$api_time < 2" | bc -l 2>/dev/null || echo "0")
    if [ "$api_check2" = "1" ]; then
        warn_test "Performance" "API Response" "API responds in ${api_time}s (acceptable)"
    else
        fail_test "Performance" "API Response" "API slow: ${api_time}s (> 2s)"
    fi
fi

# Test 8: Security Headers
section "Test 8: Security Headers"

headers=$(curl -s -I "$FRONTEND_URL" 2>/dev/null)

security_headers=("x-content-type-options" "x-frame-options" "x-xss-protection")
for header in "${security_headers[@]}"; do
    if echo "$headers" | grep -qi "$header"; then
        value=$(echo "$headers" | grep -i "$header" | cut -d':' -f2 | xargs)
        pass_test "Security" "Header: $header" "Security header present: $value"
    else
        warn_test "Security" "Header: $header" "Security header not set (recommended)"
    fi
done

# Generate Report
section "TEST REPORT SUMMARY"

TOTAL=$((PASSED + FAILED + WARNINGS))
if [ $TOTAL -gt 0 ]; then
    PASS_RATE=$(echo "scale=1; $PASSED * 100 / $TOTAL" | bc)
else
    PASS_RATE=0
fi

echo ""
echo "Total Tests:     $TOTAL"
echo -e "${GREEN}✅ Passed:${NC}       $PASSED ($PASS_RATE%)"
echo -e "${RED}❌ Failed:${NC}       $FAILED"
echo -e "${YELLOW}⚠️  Warnings:${NC}     $WARNINGS"
echo ""

# Status determination
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ ALL TESTS PASSED! System is ready for AWS deployment.${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    EXIT_CODE=0
elif [ $FAILED -lt 3 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  $FAILED test(s) failed. Review and fix before deployment.${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    EXIT_CODE=1
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ $FAILED tests failed. Critical issues need attention.${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    EXIT_CODE=1
fi

echo ""
echo "Report saved to: automated-test-report.txt"
echo "Time completed: $(date)"
echo ""

# Save detailed report
cat > automated-test-report.txt << EOF
Automated Test Suite Report
============================
Date: $(date)
Frontend: $FRONTEND_URL
Backend: $BACKEND_URL

Summary:
--------
Total Tests: $TOTAL
Passed: $PASSED ($PASS_RATE%)
Failed: $FAILED
Warnings: $WARNINGS

Detailed Results:
-----------------
EOF

for result in "${TEST_RESULTS[@]}"; do
    echo "$result" | sed 's/|/ | /g' >> automated-test-report.txt
done

echo "" >> automated-test-report.txt
echo "Status: $([ $FAILED -eq 0 ] && echo 'PASS' || echo 'FAIL')" >> automated-test-report.txt

exit $EXIT_CODE
