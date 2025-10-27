#!/bin/bash

###############################################################################
# COMPREHENSIVE DEPLOYMENT READINESS TEST SCRIPT
# Secure Gate Access Control System
# Tests all aspects of the system for production deployment
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
WARNINGS=0

# Report file
REPORT_FILE="deployment-readiness-report-$(date +%Y%m%d-%H%M%S).md"

###############################################################################
# Helper Functions
###############################################################################

log_section() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
    echo "✅ **PASS**: $1" >> "$REPORT_FILE"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
    echo "❌ **FAIL**: $1" >> "$REPORT_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
    echo "⚠️ **WARN**: $1" >> "$REPORT_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "ℹ️ **INFO**: $1" >> "$REPORT_FILE"
}

###############################################################################
# Initialize Report
###############################################################################

cat > "$REPORT_FILE" << 'EOF'
# Deployment Readiness Analysis Report
**Generated:** $(date)
**System:** Secure Gate Access Control System

---

## Executive Summary
This report documents the comprehensive pre-deployment analysis of the system.

---

## Test Results

EOF

echo -e "${GREEN}Starting Comprehensive Deployment Readiness Test${NC}"
echo "Report will be saved to: $REPORT_FILE"

###############################################################################
# Phase 1: Infrastructure & Docker Configuration Analysis
###############################################################################

log_section "PHASE 1: INFRASTRUCTURE & DOCKER CONFIGURATION"
echo -e "\n### Phase 1: Infrastructure & Docker Configuration\n" >> "$REPORT_FILE"

log_test "Checking Docker availability"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    log_pass "Docker installed: $DOCKER_VERSION"
else
    log_fail "Docker not installed"
fi

log_test "Checking Docker Compose availability"
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION=$(docker-compose --version)
    log_pass "Docker Compose installed: $DOCKER_COMPOSE_VERSION"
else
    log_fail "Docker Compose not installed"
fi

log_test "Checking running Docker containers"
RUNNING_CONTAINERS=$(docker ps --format "{{.Names}}" | wc -l)
log_info "Found $RUNNING_CONTAINERS running containers"

log_test "Checking PostgreSQL container"
if docker ps | grep -q "secure-gate.*postgres\|secure-gate.*database"; then
    log_pass "PostgreSQL container is running"
else
    log_fail "PostgreSQL container not running"
fi

log_test "Checking Redis container"
if docker ps | grep -q "secure-gate.*redis"; then
    log_pass "Redis container is running"
else
    log_fail "Redis container not running"
fi

log_test "Checking Backend container"
if docker ps | grep -q "secure-gate.*backend"; then
    log_pass "Backend container is running"
else
    log_fail "Backend container not running"
fi

log_test "Checking Frontend container"
if docker ps | grep -q "secure-gate.*frontend"; then
    log_pass "Frontend container is running"
else
    log_fail "Frontend container not running"
fi

log_test "Checking for restarting containers"
RESTARTING=$(docker ps -a --filter "status=restarting" --format "{{.Names}}" | wc -l)
if [ "$RESTARTING" -eq 0 ]; then
    log_pass "No containers are continuously restarting"
else
    log_warn "$RESTARTING containers are restarting"
    docker ps -a --filter "status=restarting" --format "{{.Names}}" | while read container; do
        log_warn "Restarting container: $container"
    done
fi

log_test "Checking Docker Compose configuration"
if docker-compose -f secure-gate-access/docker-compose.prod.yml config > /dev/null 2>&1; then
    log_pass "Docker Compose production configuration is valid"
else
    log_fail "Docker Compose production configuration has errors"
fi

###############################################################################
# Phase 2: Backend API Testing & Database Verification
###############################################################################

log_section "PHASE 2: BACKEND API TESTING & DATABASE"
echo -e "\n### Phase 2: Backend API Testing & Database\n" >> "$REPORT_FILE"

log_test "Testing backend health endpoint"
BACKEND_URL="http://localhost:5001"
if curl -s -f "$BACKEND_URL/api/health" > /dev/null; then
    HEALTH_STATUS=$(curl -s "$BACKEND_URL/api/health" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    log_pass "Backend health endpoint responding: $HEALTH_STATUS"
else
    log_fail "Backend health endpoint not responding"
fi

log_test "Checking backend API version"
if curl -s "$BACKEND_URL/api/health" | grep -q "version"; then
    VERSION=$(curl -s "$BACKEND_URL/api/health" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    log_pass "Backend API version: $VERSION"
else
    log_warn "Backend API version not found"
fi

log_test "Testing backend uptime"
if curl -s "$BACKEND_URL/api/health" | grep -q "uptime"; then
    UPTIME=$(curl -s "$BACKEND_URL/api/health" | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
    log_pass "Backend uptime: ${UPTIME}s"
else
    log_warn "Backend uptime not available"
fi

log_test "Checking database tables"
if docker exec secure-gate-access-database-1 psql -U secure_gate_user -d secure_gate -c "\dt" > /dev/null 2>&1; then
    TABLE_COUNT=$(docker exec secure-gate-access-database-1 psql -U secure_gate_user -d secure_gate -c "\dt" 2>/dev/null | grep "public |" | wc -l)
    log_pass "Database connection successful: $TABLE_COUNT tables found"
else
    log_fail "Cannot connect to database"
fi

log_test "Checking critical database tables"
CRITICAL_TABLES=("users" "visitors" "passes" "access_logs" "audit_logs")
for table in "${CRITICAL_TABLES[@]}"; do
    if docker exec secure-gate-access-database-1 psql -U secure_gate_user -d secure_gate -c "\dt $table" 2>/dev/null | grep -q "$table"; then
        log_pass "Critical table exists: $table"
    else
        log_fail "Critical table missing: $table"
    fi
done

###############################################################################
# Phase 3: Frontend Build & Testing
###############################################################################

log_section "PHASE 3: FRONTEND BUILD & TESTING"
echo -e "\n### Phase 3: Frontend Build & Testing\n" >> "$REPORT_FILE"

log_test "Testing frontend availability"
FRONTEND_URL="http://localhost:80"
if curl -s -f "$FRONTEND_URL" -o /dev/null; then
    log_pass "Frontend is accessible at $FRONTEND_URL"
else
    log_fail "Frontend not accessible"
fi

log_test "Checking frontend response headers"
if curl -s -I "$FRONTEND_URL" | grep -q "Server: nginx"; then
    log_pass "Frontend served by Nginx"
else
    log_warn "Frontend not served by Nginx"
fi

log_test "Checking security headers"
HEADERS=$(curl -s -I "$FRONTEND_URL")
if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
    log_pass "HSTS header present"
else
    log_warn "HSTS header missing"
fi

log_test "Checking for build artifacts"
if [ -d "secure-gate-access/client/build" ]; then
    BUILD_SIZE=$(du -sh secure-gate-access/client/build | cut -f1)
    log_pass "Frontend build directory exists: $BUILD_SIZE"
else
    log_warn "Frontend build directory not found"
fi

###############################################################################
# Phase 4: Security & Compliance Audit
###############################################################################

log_section "PHASE 4: SECURITY & COMPLIANCE AUDIT"
echo -e "\n### Phase 4: Security & Compliance\n" >> "$REPORT_FILE"

log_test "Checking environment files"
if [ -f "secure-gate-access/.env.production" ]; then
    log_pass ".env.production file exists"
else
    log_warn ".env.production file not found"
fi

log_test "Checking for exposed secrets in git"
if cd secure-gate-access && git ls-files | grep -q "\.env$"; then
    log_fail ".env files tracked in git"
    cd ..
else
    log_pass "No .env files tracked in git"
    cd .. 2>/dev/null || true
fi

log_test "Checking SSL/TLS configuration"
if [ -d "secure-gate-access/nginx/ssl" ] || [ -d "secure-gate-access/certificates" ]; then
    log_pass "SSL certificate directory exists"
else
    log_warn "SSL certificate directory not found"
fi

log_test "Checking for default/weak passwords in configs"
if grep -r "password.*admin\|password.*123" secure-gate-access/*.example 2>/dev/null; then
    log_warn "Example files contain default passwords (acceptable for examples)"
else
    log_pass "No obvious default passwords in example files"
fi

###############################################################################
# Phase 5: Performance & Load Testing
###############################################################################

log_section "PHASE 5: PERFORMANCE TESTING"
echo -e "\n### Phase 5: Performance Testing\n" >> "$REPORT_FILE"

log_test "Testing API response time"
START_TIME=$(date +%s%N)
curl -s "$BACKEND_URL/api/health" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
if [ "$RESPONSE_TIME" -lt 500 ]; then
    log_pass "API response time: ${RESPONSE_TIME}ms (Good)"
elif [ "$RESPONSE_TIME" -lt 1000 ]; then
    log_warn "API response time: ${RESPONSE_TIME}ms (Acceptable)"
else
    log_fail "API response time: ${RESPONSE_TIME}ms (Too slow)"
fi

log_test "Checking database connection pool"
if docker exec secure-gate-access-backend-1 cat /proc/1/environ 2>/dev/null | grep -q "PGPOOL"; then
    log_pass "Database connection pooling configured"
else
    log_warn "Database connection pooling not explicitly configured"
fi

log_test "Checking Redis cache"
if docker ps | grep -q "secure-gate.*redis"; then
    log_pass "Redis cache is available"
else
    log_warn "Redis cache not running"
fi

###############################################################################
# Phase 6: Manual Testing Preparation
###############################################################################

log_section "PHASE 6: MANUAL TESTING READINESS"
echo -e "\n### Phase 6: Manual Testing Readiness\n" >> "$REPORT_FILE"

log_test "Checking test scripts availability"
if [ -d "secure-gate-access/server/tests" ]; then
    TEST_COUNT=$(find secure-gate-access/server/tests -name "*.test.js" -o -name "*.spec.js" | wc -l)
    log_pass "Found $TEST_COUNT test files"
else
    log_warn "Tests directory not found"
fi

log_test "Checking for test documentation"
if [ -f "secure-gate-access/server/tests/README.md" ] || [ -f "TEST_QUICK_REFERENCE.md" ]; then
    log_pass "Test documentation available"
else
    log_warn "Test documentation not found"
fi

###############################################################################
# Generate Summary
###############################################################################

log_section "TEST SUMMARY"
echo -e "\n---\n## Test Summary\n" >> "$REPORT_FILE"

TOTAL=$((PASSED + FAILED + WARNINGS))
echo -e "${GREEN}Passed:   $PASSED / $TOTAL${NC}"
echo -e "${RED}Failed:   $FAILED / $TOTAL${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS / $TOTAL${NC}"

echo -e "\n**Total Tests:** $TOTAL" >> "$REPORT_FILE"
echo -e "**Passed:** $PASSED" >> "$REPORT_FILE"
echo -e "**Failed:** $FAILED" >> "$REPORT_FILE"
echo -e "**Warnings:** $WARNINGS" >> "$REPORT_FILE"

# Calculate readiness score
if [ "$TOTAL" -gt 0 ]; then
    SCORE=$(( (PASSED * 100) / TOTAL ))
    echo -e "\n**Deployment Readiness Score:** $SCORE%" >> "$REPORT_FILE"
    
    if [ "$SCORE" -ge 90 ]; then
        echo -e "\n${GREEN}✅ DEPLOYMENT READY${NC}"
        echo -e "\n### Deployment Status: ✅ **READY**\n" >> "$REPORT_FILE"
    elif [ "$SCORE" -ge 75 ]; then
        echo -e "\n${YELLOW}⚠️ DEPLOYMENT POSSIBLE WITH WARNINGS${NC}"
        echo -e "\n### Deployment Status: ⚠️ **READY WITH WARNINGS**\n" >> "$REPORT_FILE"
    else
        echo -e "\n${RED}❌ NOT READY FOR DEPLOYMENT${NC}"
        echo -e "\n### Deployment Status: ❌ **NOT READY**\n" >> "$REPORT_FILE"
    fi
fi

echo -e "\n${GREEN}Report saved to: $REPORT_FILE${NC}"

exit 0
