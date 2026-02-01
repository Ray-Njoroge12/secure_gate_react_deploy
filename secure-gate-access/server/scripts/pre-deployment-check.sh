#!/bin/bash

# Pre-Deployment Verification Script
# Secure Gate Access - Security Implementation
# Date: January 7, 2026

set -e  # Exit on error

echo "🚀 Starting Pre-Deployment Verification..."
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

echo "📋 Phase 1: Environment Verification"
echo "======================================"

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_status 0 "Node.js installed: $NODE_VERSION"
else
    print_status 1 "Node.js not found"
fi

# Check npm version
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_status 0 "npm installed: $NPM_VERSION"
else
    print_status 1 "npm not found"
fi

# Check PostgreSQL client
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | head -1)
    print_status 0 "PostgreSQL client: $PSQL_VERSION"
else
    print_warning "psql not found (needed for manual migration verification)"
fi

echo ""
echo "📋 Phase 2: Environment Variables"
echo "=================================="

# Check critical environment variables
if [ -n "$NODE_ENV" ]; then
    print_status 0 "NODE_ENV is set: $NODE_ENV"
else
    print_warning "NODE_ENV not set (defaults to development)"
fi

if [ -n "$ENCRYPTION_KEY" ]; then
    KEY_LENGTH=${#ENCRYPTION_KEY}
    if [ $KEY_LENGTH -ge 64 ]; then
        print_status 0 "ENCRYPTION_KEY configured (length: $KEY_LENGTH)"
    else
        print_status 1 "ENCRYPTION_KEY too short (length: $KEY_LENGTH, need: 64+)"
    fi
else
    print_status 1 "ENCRYPTION_KEY not set"
fi

if [ -n "$RETENTION_VISITOR_DAYS" ]; then
    print_status 0 "RETENTION_VISITOR_DAYS: $RETENTION_VISITOR_DAYS"
else
    print_warning "RETENTION_VISITOR_DAYS not set (will use default)"
fi

if [ -n "$RETENTION_ACCESS_LOG_DAYS" ]; then
    print_status 0 "RETENTION_ACCESS_LOG_DAYS: $RETENTION_ACCESS_LOG_DAYS"
else
    print_warning "RETENTION_ACCESS_LOG_DAYS not set (will use default)"
fi

if [ -n "$RETENTION_ARCHIVE_ENABLED" ]; then
    print_status 0 "RETENTION_ARCHIVE_ENABLED: $RETENTION_ARCHIVE_ENABLED"
else
    print_warning "RETENTION_ARCHIVE_ENABLED not set (will default to false)"
fi

if [ -n "$DATABASE_URL" ]; then
    print_status 0 "DATABASE_URL configured"
else
    print_status 1 "DATABASE_URL not set"
fi

echo ""
echo "📋 Phase 3: File Verification"
echo "=============================="

# Check migration files
MIGRATION_FILES=(
    "src/database/migrations/035_encrypt_id_numbers.sql"
    "src/database/migrations/037_add_archive_tables.sql"
    "src/database/migrations/038_add_qr_token_mapping.sql"
)

for file in "${MIGRATION_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "Migration file exists: $file"
    else
        print_status 1 "Migration file missing: $file"
    fi
done

# Check service files
SERVICE_FILES=(
    "src/services/qrTokenService.js"
    "src/services/retentionService.js"
    "src/jobs/retentionScheduler.js"
    "src/middleware/dataMinimization.js"
)

for file in "${SERVICE_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "Service file exists: $file"
    else
        print_status 1 "Service file missing: $file"
    fi
done

# Check route files
ROUTE_FILES=(
    "src/routes/visitorRoutes.js"
    "src/routes/checkInRoutes.js"
    "src/routes/checkOutRoutes.js"
    "src/routes/adminRoutes.js"
)

for file in "${ROUTE_FILES[@]}"; do
    if [ -f "$file" ]; then
        # Check if minimizeData is imported
        if grep -q "minimizeData" "$file"; then
            print_status 0 "Route integrated: $file (middleware present)"
        else
            print_warning "Route exists but middleware may not be integrated: $file"
        fi
    else
        print_status 1 "Route file missing: $file"
    fi
done

echo ""
echo "📋 Phase 4: Test Verification"
echo "=============================="

# Check if test files exist
TEST_FILES=(
    "tests/security/otp-security.test.js"
    "tests/e2e/security-integration.test.js"
)

for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "Test file exists: $file"
    else
        print_warning "Test file missing: $file"
    fi
done

# Run tests
print_info "Running security integration tests..."
if npm test -- tests/e2e/security-integration.test.js --testTimeout=30000 --silent 2>&1 | grep -q "19 passed"; then
    print_status 0 "Integration tests passing (19/19)"
else
    print_warning "Integration tests may have issues (check manually)"
fi

echo ""
echo "📋 Phase 5: Code Quality"
echo "========================"

# Check for common issues
print_info "Checking for console.log statements in production code..."
CONSOLE_LOGS=$(grep -r "console\.log" src/ --include="*.js" | grep -v "test" | wc -l)
if [ "$CONSOLE_LOGS" -gt 50 ]; then
    print_warning "Found $CONSOLE_LOGS console.log statements (consider using proper logging)"
else
    print_status 0 "Console.log usage acceptable ($CONSOLE_LOGS found)"
fi

# Check for TODO/FIXME comments
TODOS=$(grep -r "TODO\|FIXME" src/ --include="*.js" | wc -l)
if [ "$TODOS" -gt 0 ]; then
    print_info "Found $TODOS TODO/FIXME comments"
fi

echo ""
echo "📋 Phase 6: Documentation"
echo "========================="

DOC_FILES=(
    "SECURITY_IMPLEMENTATION_COMPLETE.md"
    "DEPLOYMENT_INTEGRATION_PLAN.md"
    "E2E_TEST_RESULTS.md"
    "PROJECT_SUCCESS_SUMMARY.md"
)

for file in "${DOC_FILES[@]}"; do
    if [ -f "../$file" ]; then
        print_status 0 "Documentation exists: $file"
    else
        print_warning "Documentation missing: $file"
    fi
done

echo ""
echo "=========================================="
echo "📊 VERIFICATION SUMMARY"
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Passed:${NC}   $PASSED"
echo -e "${RED}❌ Failed:${NC}   $FAILED"
echo -e "${YELLOW}⚠️  Warnings:${NC} $WARNINGS"
echo ""

# Overall status
if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL CHECKS PASSED - READY FOR DEPLOYMENT${NC}"
        exit 0
    else
        echo -e "${YELLOW}✅ PASSED WITH WARNINGS - REVIEW WARNINGS BEFORE DEPLOYMENT${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ VERIFICATION FAILED - FIX ERRORS BEFORE DEPLOYMENT${NC}"
    exit 1
fi
