#!/bin/bash
# scripts/validate-frontend-optimization.sh
# Comprehensive validation script for frontend optimization

echo "🔍 Frontend Optimization Validation Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Change to client directory
cd "$(dirname "$0")/../secure-gate-access/client" || exit 1

echo "📁 Working Directory: $(pwd)"
echo ""

# Test 1: Check for hardcoded localhost URLs
echo "Test 1: Checking for hardcoded localhost URLs..."
if grep -r "localhost:5000" src/ 2>/dev/null; then
    echo -e "${RED}❌ FAILED: Found hardcoded localhost:5000 URLs${NC}"
    ((FAILED++))
else
    echo -e "${GREEN}✅ PASSED: No hardcoded localhost URLs found${NC}"
    ((PASSED++))
fi
echo ""

# Test 2: Check for unguarded debug_otp
echo "Test 2: Checking for unguarded debug_otp code..."
# Check if debug_otp usages exist, and if so, verify they're near NODE_ENV checks
DEBUG_FILES=$(grep -l "debug_otp" src/**/*.{js,jsx} 2>/dev/null || true)
ALL_GUARDED=true
for file in $DEBUG_FILES; do
    if grep -q "debug_otp" "$file" 2>/dev/null; then
        # Check if same file has NODE_ENV guard nearby
        if ! grep -q "NODE_ENV.*development" "$file" 2>/dev/null; then
            echo -e "${RED}❌ File $file has debug_otp but no NODE_ENV guard${NC}"
            ALL_GUARDED=false
        fi
    fi
done

if [ "$ALL_GUARDED" = true ]; then
    echo -e "${GREEN}✅ PASSED: All debug_otp code is guarded with NODE_ENV checks${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED: Found unguarded debug_otp${NC}"
    ((FAILED++))
fi
echo ""

# Test 3: Check for duplicate files
echo "Test 3: Checking for archived duplicate files..."
DUPLICATE_FILES=("RegisterNew.js" "AddVisitorNew.jsx" "BulkInviteNew.jsx" "ForgotPasswordPage.js")
FOUND_DUPLICATES=0
for file in "${DUPLICATE_FILES[@]}"; do
    if [ -f "src/pages/$file" ] || [ -f "src/pages/resident/$file" ]; then
        echo -e "${RED}❌ Found duplicate file: $file${NC}"
        ((FOUND_DUPLICATES++))
    fi
done

if [ $FOUND_DUPLICATES -eq 0 ]; then
    echo -e "${GREEN}✅ PASSED: No duplicate files in src/${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED: Found $FOUND_DUPLICATES duplicate files${NC}"
    ((FAILED++))
fi
echo ""

# Test 4: Check for direct axios usage in pages
echo "Test 4: Checking for direct axios usage in page components..."
AXIOS_IN_PAGES=$(grep -r "import axios from ['\"]axios['\"]" src/pages/ || true)
if [ -n "$AXIOS_IN_PAGES" ]; then
    echo -e "${RED}❌ FAILED: Found direct axios imports in pages${NC}"
    echo "$AXIOS_IN_PAGES"
    ((FAILED++))
else
    echo -e "${GREEN}✅ PASSED: No direct axios usage in pages${NC}"
    ((PASSED++))
fi
echo ""

# Test 5: Check that adminService exists
echo "Test 5: Checking for adminService.js..."
if [ -f "src/services/adminService.js" ]; then
    echo -e "${GREEN}✅ PASSED: adminService.js exists${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED: adminService.js not found${NC}"
    ((FAILED++))
fi
echo ""

# Test 6: Check that logger utility exists
echo "Test 6: Checking for logger utility..."
if [ -f "src/utils/logger.js" ]; then
    echo -e "${GREEN}✅ PASSED: logger.js exists${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED: logger.js not found${NC}"
    ((FAILED++))
fi
echo ""

# Test 7: Check for console.log in production build
echo "Test 7: Checking production build for console statements..."
if [ -d "build" ]; then
    CONSOLE_COUNT=$(grep -r "console\.log" build/static/js/*.js 2>/dev/null | wc -l | tr -d ' ')
    if [ "$CONSOLE_COUNT" -lt 10 ]; then
        echo -e "${GREEN}✅ PASSED: Minimal console.log in build ($CONSOLE_COUNT instances)${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  WARNING: Found $CONSOLE_COUNT console.log instances in build${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  WARNING: Build directory not found, skipping build check${NC}"
    ((WARNINGS++))
fi
echo ""

# Test 8: Check admin pages use adminService
echo "Test 8: Verifying admin pages use adminService..."
ADMIN_FILES=("AdminDashboard.jsx" "ManageResidents.jsx" "ManageGuards.jsx" "VisitorLog.jsx" "AccessControl.jsx" "IncidentManagement.jsx")
ADMIN_SERVICE_USAGE=0
for file in "${ADMIN_FILES[@]}"; do
    if [ -f "src/pages/admin/$file" ]; then
        if grep -q "from.*adminService" "src/pages/admin/$file"; then
            ((ADMIN_SERVICE_USAGE++))
        else
            echo -e "${YELLOW}⚠️  $file does not import adminService${NC}"
        fi
    fi
done

if [ $ADMIN_SERVICE_USAGE -ge 5 ]; then
    echo -e "${GREEN}✅ PASSED: $ADMIN_SERVICE_USAGE admin pages use adminService${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED: Only $ADMIN_SERVICE_USAGE admin pages use adminService${NC}"
    ((FAILED++))
fi
echo ""

# Test 9: Check for usePerformanceMonitoring hook
echo "Test 9: Checking for performance monitoring hook..."
if [ -f "src/hooks/usePerformanceMonitoring.js" ]; then
    echo -e "${GREEN}✅ PASSED: usePerformanceMonitoring.js exists${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING: usePerformanceMonitoring.js not found${NC}"
    ((WARNINGS++))
fi
echo ""

# Test 10: Check ErrorBoundary uses logger
echo "Test 10: Checking ErrorBoundary integration with logger..."
if [ -f "src/components/ui/ErrorBoundary.jsx" ]; then
    if grep -q "import logger" "src/components/ui/ErrorBoundary.jsx"; then
        echo -e "${GREEN}✅ PASSED: ErrorBoundary uses logger${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  WARNING: ErrorBoundary doesn't import logger${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ FAILED: ErrorBoundary.jsx not found${NC}"
    ((FAILED++))
fi
echo ""

# Test 11: Check package.json has proxy configured
echo "Test 11: Checking proxy configuration..."
if grep -q '"proxy".*"http://localhost:5000"' package.json; then
    echo -e "${GREEN}✅ PASSED: Proxy configured correctly${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED: Proxy not configured${NC}"
    ((FAILED++))
fi
echo ""

# Test 12: Run production build
echo "Test 12: Testing production build..."
if npm run build:production > /tmp/build-output.log 2>&1; then
    echo -e "${GREEN}✅ PASSED: Production build succeeds${NC}"
    ((PASSED++))
    
    # Check bundle size
    MAIN_BUNDLE_SIZE=$(du -k build/static/js/main.*.js 2>/dev/null | cut -f1 | head -1)
    if [ -n "$MAIN_BUNDLE_SIZE" ] && [ "$MAIN_BUNDLE_SIZE" -lt 250 ]; then
        echo -e "${GREEN}✅ PASSED: Main bundle size optimal (${MAIN_BUNDLE_SIZE}KB)${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  WARNING: Main bundle size is ${MAIN_BUNDLE_SIZE}KB${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ FAILED: Production build failed${NC}"
    echo "See /tmp/build-output.log for details"
    ((FAILED++))
fi
echo ""

# Test 13: Check for test files
echo "Test 13: Checking for test files..."
TEST_FILES=$(find src/__tests__ -name "*.test.js" 2>/dev/null | wc -l | tr -d ' ')
if [ "$TEST_FILES" -gt 0 ]; then
    echo -e "${GREEN}✅ PASSED: Found $TEST_FILES test files${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING: No test files found${NC}"
    ((WARNINGS++))
fi
echo ""

# Test 14: Check for sensitive data in console
echo "Test 14: Checking for sensitive data patterns in code..."
SENSITIVE_PATTERNS=("password" "token" "secret" "api_key" "apiKey")
SENSITIVE_FOUND=0
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    COUNT=$(grep -r "console\.log.*$pattern" src/ 2>/dev/null | wc -l | tr -d ' ')
    if [ "$COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found $COUNT console.log with '$pattern'${NC}"
        ((SENSITIVE_FOUND++))
    fi
done

if [ $SENSITIVE_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ PASSED: No sensitive data in console.log${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING: Found console.log with sensitive patterns${NC}"
    ((WARNINGS++))
fi
echo ""

# Test 15: Check code splitting
echo "Test 15: Checking code splitting (lazy loading)..."
if grep -q "lazy.*import" src/App.js; then
    echo -e "${GREEN}✅ PASSED: Code splitting implemented${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING: Code splitting not detected${NC}"
    ((WARNINGS++))
fi
echo ""

# Summary
echo "=========================================="
echo "📊 VALIDATION SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

TOTAL=$((PASSED + FAILED + WARNINGS))
PASS_RATE=$((PASSED * 100 / TOTAL))

echo "Pass Rate: $PASS_RATE%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CRITICAL TESTS PASSED!${NC}"
    echo "Frontend optimization validation successful."
    exit 0
else
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo "$FAILED critical test(s) failed."
    exit 1
fi
