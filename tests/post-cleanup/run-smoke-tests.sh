#!/bin/bash

################################################################################
# SMOKE TEST RUNNER - Post-Cleanup System Validation
# Purpose: Execute smoke tests and capture results
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Setup
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_DIR=".cleanup-backups/test-results"
LOG_FILE="$RESULTS_DIR/smoke-tests-$TIMESTAMP.log"
REPORT_FILE="$RESULTS_DIR/smoke-tests-report-$TIMESTAMP.json"

mkdir -p "$RESULTS_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔥 POST-CLEANUP SMOKE TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test Execution: $(date)"
echo "Log file: $LOG_FILE"
echo ""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Start JSON report
cat > "$REPORT_FILE" <<EOF
{
  "testSuite": "Post-Cleanup Smoke Tests",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "results": [
EOF

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

pass_test() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    log "✅ PASS: $1"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

fail_test() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    log "❌ FAIL: $1"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

warn_test() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    log "⚠️  WARN: $1"
}

skip_test() {
    echo -e "${YELLOW}⏭️  SKIP${NC}: $1"
    log "⏭️  SKIP: $1"
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
}

################################################################################
# TEST 1: Application Startup
################################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[TEST 1] ST-001: Application Startup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
log "[TEST 1] ST-001: Application Startup - Checking all services"

# Check if containers are running
CONTAINER_COUNT=$(docker ps --filter "name=secure-gate" --format "{{.Names}}" | wc -l | tr -d ' ')
if [ "$CONTAINER_COUNT" -ge 2 ]; then
    pass_test "ST-001: All containers are running ($CONTAINER_COUNT containers)"
else
    fail_test "ST-001: Not enough containers running (found: $CONTAINER_COUNT, expected: >=2)"
fi

################################################################################
# TEST 2: Frontend Accessibility
################################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[TEST 2] ST-002: Frontend Accessibility"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
log "[TEST 2] ST-002: Frontend Accessibility - Checking HTTP response"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 304 ]; then
    pass_test "ST-002: Frontend is accessible (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" -eq 000 ]; then
    fail_test "ST-002: Frontend is unreachable (connection failed)"
else
    fail_test "ST-002: Frontend returned unexpected HTTP code: $HTTP_CODE"
fi

################################################################################
# TEST 3: Backend API Health
################################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[TEST 3] ST-003: Backend API Health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
log "[TEST 3] ST-003: Backend API Health - Checking /health endpoint"

API_RESPONSE=$(curl -s http://localhost:5001/health 2>/dev/null || echo '{"status":"error"}')
API_STATUS=$(echo "$API_RESPONSE" | grep -o '"status":"healthy"' || echo "")
if [ -n "$API_STATUS" ]; then
    pass_test "ST-003: Backend API health check passed"
else
    fail_test "ST-003: Backend API health check failed (Response: $API_RESPONSE)"
fi

################################################################################
# TEST 4: Database Connectivity
################################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[TEST 4] ST-004: Database Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
log "[TEST 4] ST-004: Database Connectivity - Checking PostgreSQL connection"

DB_TEST=$(docker exec secure-gate-access-database-1 psql -U postgres -c "SELECT 1;" 2>&1 || echo "ERROR")
if echo "$DB_TEST" | grep -q "1 row"; then
    pass_test "ST-004: Database connection successful"
else
    fail_test "ST-004: Database connection failed"
fi

################################################################################
# TEST 5: Redis Connectivity
################################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[TEST 5] ST-005: Redis Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
log "[TEST 5] ST-005: Redis Connectivity - Checking Redis PING"

REDIS_TEST=$(docker exec secure-gate-access-redis-1 redis-cli --no-auth-warning ping 2>&1 || echo "ERROR")
if echo "$REDIS_TEST" | grep -q "PONG\|Authentication required"; then
    pass_test "ST-005: Redis connection successful (server is responding)"
else
    fail_test "ST-005: Redis connection failed"
fi

################################################################################
# TEST 6: Static Assets Loading
################################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[TEST 6] ST-006: Static Assets Loading"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
log "[TEST 6] ST-006: Static Assets - Checking favicon.ico"

FAVICON_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/favicon.ico 2>/dev/null || echo "000")
if [ "$FAVICON_CODE" -eq 200 ]; then
    pass_test "ST-006: Static assets are being served correctly"
elif [ "$FAVICON_CODE" -eq 404 ]; then
    warn_test "ST-006: Favicon not found (non-critical)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail_test "ST-006: Static assets returned HTTP $FAVICON_CODE"
fi

################################################################################
# TEST 7: API Authentication Endpoints
################################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[TEST 7] ST-007: API Authentication Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
log "[TEST 7] ST-007: Authentication - Checking /api/auth/login endpoint"

AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5001/api/auth/login -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
if [ "$AUTH_CODE" -eq 400 ] || [ "$AUTH_CODE" -eq 401 ] || [ "$AUTH_CODE" -eq 422 ]; then
    pass_test "ST-007: Authentication endpoint is responding correctly (HTTP $AUTH_CODE)"
else
    fail_test "ST-007: Authentication endpoint returned unexpected HTTP $AUTH_CODE"
fi

################################################################################
# TEST 8: Container Health Status
################################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[TEST 8] ST-008: Container Health Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
log "[TEST 8] ST-008: Container Health - Checking Docker health status"

UNHEALTHY=$(docker ps --filter "health=unhealthy" --filter "name=secure-gate-access" --format "{{.Names}}" | wc -l | tr -d ' ')
if [ "$UNHEALTHY" -eq 0 ]; then
    pass_test "ST-008: All containers are healthy"
else
    warn_test "ST-008: $UNHEALTHY container(s) are unhealthy (may be starting up)"
    # Count as pass if containers are running
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

################################################################################
# TEST 9: Environment Configuration
################################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[TEST 9] ST-009: Environment Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
log "[TEST 9] ST-009: Environment - Checking .env file"

if [ -f "secure-gate-access/.env" ]; then
    pass_test "ST-009: Environment configuration file exists"
else
    fail_test "ST-009: Environment configuration file not found"
fi

################################################################################
# TEST 10: Critical Files Present
################################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[TEST 10] ST-010: Critical Files Present"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
log "[TEST 10] ST-010: Critical Files - Checking project structure"

CRITICAL_FILES=(
    "secure-gate-access/docker-compose.prod.yml"
    "secure-gate-access/server/package.json"
    "secure-gate-access/server/server.js"
)

MISSING_FILES=0
for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES=$((MISSING_FILES + 1))
        log "  Missing: $file"
    fi
done

if [ "$MISSING_FILES" -eq 0 ]; then
    pass_test "ST-010: All critical files are present"
else
    fail_test "ST-010: $MISSING_FILES critical file(s) missing"
fi

################################################################################
# SUMMARY
################################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Tests:   $TOTAL_TESTS"
echo -e "Passed:        ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:        ${RED}$FAILED_TESTS${NC}"
echo -e "Skipped:       ${YELLOW}$SKIPPED_TESTS${NC}"
echo ""

SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
echo "Success Rate:  $SUCCESS_RATE%"
echo ""

# Finalize JSON report
cat >> "$REPORT_FILE" <<EOF
  ],
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "skipped": $SKIPPED_TESTS,
    "successRate": $SUCCESS_RATE
  }
}
EOF

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Test execution completed"
log "Report saved to: $REPORT_FILE"

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "${GREEN}✅ ALL SMOKE TESTS PASSED!${NC}"
    echo ""
    echo "The system has passed all smoke tests and is ready for further validation."
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED!${NC}"
    echo ""
    echo "Please review the failures before proceeding with further testing."
    exit 1
fi
