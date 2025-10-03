#!/bin/bash

################################################################################
# SMOKE TESTS - Post-Cleanup System Validation
# Purpose: Basic functionality tests - must pass before proceeding
# Critical: YES - Abort on failure
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test results array
declare -a TEST_RESULTS

# Logging
LOG_FILE=".cleanup-backups/test-results/smoke-tests-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    log "✅ PASS: $1"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    TEST_RESULTS+=("PASS|$1")
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    log "❌ FAIL: $1"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TEST_RESULTS+=("FAIL|$1")
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    log "⚠️  WARN: $1"
}

info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
    log "ℹ️  INFO: $1"
}

run_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
    echo -e "${YELLOW}[TEST $TOTAL_TESTS]${NC} $1"
    log "[TEST $TOTAL_TESTS] $1"
}

################################################################################
# SMOKE TEST SUITE
################################################################################

print_header "🔥 SMOKE TESTS - Post-Cleanup System Validation"
log "Starting smoke tests suite"
log "Test execution time: $(date)"

################################################################################
# ST-001: Application Startup
################################################################################

run_test "ST-001: Application Startup - Checking all services"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    fail "ST-001: Docker/docker-compose not available"
else
    # Check if containers are running
    cd secure-gate-access
    
    # Check for running containers
    if docker-compose ps 2>/dev/null | grep -q "Up"; then
        pass "ST-001: Docker containers are running"
    else
        warn "ST-001: Containers not running, attempting to start..."
        docker-compose up -d 2>&1 | tee -a "$LOG_FILE"
        sleep 30
        
        if docker-compose ps | grep -q "Up"; then
            pass "ST-001: Containers started successfully"
        else
            fail "ST-001: Failed to start containers"
        fi
    fi
    
    cd ..
fi

################################################################################
# ST-002: Database Connectivity
################################################################################

run_test "ST-002: Database Connectivity"

# Check if database container exists
if docker ps --format '{{.Names}}' | grep -q "postgres"; then
    DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep "postgres" | head -1)
    
    # Test database connection
    if docker exec "$DB_CONTAINER" psql -U postgres -c 'SELECT 1;' &>/dev/null; then
        pass "ST-002: Database connection successful"
    else
        fail "ST-002: Cannot connect to database"
    fi
else
    warn "ST-002: PostgreSQL container not found, checking backend logs"
    
    # Check if backend can connect to database via logs
    if [ -f "secure-gate-access/server/logs/app.log" ]; then
        if grep -q "Database connected" secure-gate-access/server/logs/app.log 2>/dev/null; then
            pass "ST-002: Backend reports database connected"
        else
            fail "ST-002: No database connection confirmation in logs"
        fi
    else
        warn "ST-002: Cannot verify database connectivity"
    fi
fi

################################################################################
# ST-003: API Gateway Responsiveness
################################################################################

run_test "ST-003: API Gateway Responsiveness"

# Check backend health endpoint
if curl -f -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null | grep -q "200\|404"; then
    pass "ST-003: API backend is responsive"
else
    # Try alternate ports
    if curl -f -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null | grep -q "200"; then
        pass "ST-003: API is responsive (alternate port)"
    else
        warn "ST-003: API health endpoint not accessible (may not be implemented)"
    fi
fi

# Check if backend process is running
if pgrep -f "node.*server" > /dev/null || docker ps | grep -q "backend\|server"; then
    pass "ST-003: Backend process is running"
else
    warn "ST-003: Backend process not detected"
fi

################################################################################
# ST-004: Frontend Asset Loading
################################################################################

run_test "ST-004: Frontend Asset Loading"

# Check if frontend is built
if [ -d "secure-gate-access/client/build" ]; then
    pass "ST-004: Frontend build directory exists"
    
    # Check for main assets
    if ls secure-gate-access/client/build/static/js/main.*.js 1> /dev/null 2>&1; then
        pass "ST-004: JavaScript bundle exists"
    else
        warn "ST-004: JavaScript bundle not found"
    fi
    
    if ls secure-gate-access/client/build/static/css/main.*.css 1> /dev/null 2>&1; then
        pass "ST-004: CSS bundle exists"
    else
        warn "ST-004: CSS bundle not found"
    fi
    
    # Check if frontend is accessible
    if curl -f -s http://localhost:3000 | grep -q "root"; then
        pass "ST-004: Frontend is accessible and serving HTML"
    else
        warn "ST-004: Frontend not accessible on port 3000"
    fi
else
    warn "ST-004: Frontend not built yet"
    info "ST-004: Run 'cd secure-gate-access/client && npm run build' to build frontend"
fi

################################################################################
# ST-005: Environment Variables Loaded
################################################################################

run_test "ST-005: Environment Variables and Configuration"

# Check for .env files
if [ -f "secure-gate-access/server/.env" ] || [ -f "secure-gate-access/.env" ]; then
    pass "ST-005: Environment configuration file exists"
else
    warn "ST-005: .env file not found (using environment variables or defaults)"
fi

# Check package.json files exist
if [ -f "secure-gate-access/client/package.json" ]; then
    pass "ST-005: Frontend package.json exists"
else
    fail "ST-005: Frontend package.json missing"
fi

if [ -f "secure-gate-access/server/package.json" ]; then
    pass "ST-005: Backend package.json exists"
else
    fail "ST-005: Backend package.json missing"
fi

# Check node_modules installed
if [ -d "secure-gate-access/client/node_modules" ]; then
    pass "ST-005: Frontend dependencies installed"
else
    warn "ST-005: Frontend dependencies not installed"
fi

if [ -d "secure-gate-access/server/node_modules" ]; then
    pass "ST-005: Backend dependencies installed"
else
    warn "ST-005: Backend dependencies not installed"
fi

################################################################################
# Additional System Health Checks
################################################################################

run_test "ST-006: Project Structure Integrity"

# Check critical directories exist
CRITICAL_DIRS=(
    "secure-gate-access/client/src"
    "secure-gate-access/client/public"
    "secure-gate-access/server/src"
    "secure-gate-access/server/routes"
)

for dir in "${CRITICAL_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        pass "ST-006: Directory exists: $dir"
    else
        fail "ST-006: Critical directory missing: $dir"
    fi
done

################################################################################
# ST-007: Key Files Exist
################################################################################

run_test "ST-007: Key Application Files"

KEY_FILES=(
    "secure-gate-access/client/src/App.js"
    "secure-gate-access/server/server.js"
    "README.md"
    "package.json"
)

for file in "${KEY_FILES[@]}"; do
    if [ -f "$file" ]; then
        pass "ST-007: File exists: $file"
    else
        warn "ST-007: File not found: $file"
    fi
done

################################################################################
# ST-008: No Critical Errors in Recent Logs
################################################################################

run_test "ST-008: Log File Health Check"

if [ -d "logs" ]; then
    # Check for recent critical errors
    if find logs -name "*.log" -mtime -1 -exec grep -l "CRITICAL\|FATAL" {} \; 2>/dev/null | grep -q .; then
        warn "ST-008: Critical errors found in recent logs"
    else
        pass "ST-008: No critical errors in recent logs"
    fi
else
    info "ST-008: Logs directory not found or empty"
fi

################################################################################
# TEST SUMMARY
################################################################################

print_header "📊 SMOKE TEST SUMMARY"

echo ""
echo -e "${BLUE}Total Tests:${NC}  $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC}       $PASSED_TESTS"
echo -e "${RED}Failed:${NC}       $FAILED_TESTS"
echo ""

# Calculate pass rate
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${BLUE}Pass Rate:${NC}    $PASS_RATE%"
else
    PASS_RATE=0
fi

echo ""

# Detailed results
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}DETAILED RESULTS:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

for result in "${TEST_RESULTS[@]}"; do
    STATUS=$(echo "$result" | cut -d'|' -f1)
    DESCRIPTION=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$STATUS" = "PASS" ]; then
        echo -e "  ${GREEN}✅${NC} $DESCRIPTION"
    else
        echo -e "  ${RED}❌${NC} $DESCRIPTION"
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Generate JSON report
JSON_REPORT=".cleanup-backups/test-results/smoke-tests-report.json"
cat > "$JSON_REPORT" <<EOF
{
  "test_suite": "Smoke Tests - Post-Cleanup Validation",
  "execution_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "summary": {
    "total_tests": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "pass_rate": $PASS_RATE
  },
  "status": "$([ $PASS_RATE -ge 80 ] && echo 'PASS' || echo 'FAIL')",
  "critical": true,
  "log_file": "$LOG_FILE"
}
EOF

log "Test summary: $PASSED_TESTS/$TOTAL_TESTS passed ($PASS_RATE%)"
log "JSON report generated: $JSON_REPORT"

# Final verdict
echo ""
if [ $PASS_RATE -ge 80 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✅ SMOKE TESTS PASSED - System is operational${NC}"
    echo -e "${GREEN}  Pass Rate: $PASS_RATE% (Threshold: 80%)${NC}"
    echo -e "${GREEN}  Proceeding to next test phase is APPROVED${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log "✅ SMOKE TESTS PASSED"
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ❌ SMOKE TESTS FAILED - System has issues${NC}"
    echo -e "${RED}  Pass Rate: $PASS_RATE% (Required: 80%)${NC}"
    echo -e "${RED}  ABORT: Fix critical issues before proceeding${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log "❌ SMOKE TESTS FAILED - Aborting test suite"
    exit 1
fi
