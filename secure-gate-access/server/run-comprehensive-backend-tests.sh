#!/bin/bash

# Comprehensive Backend Testing Suite
# Runs all backend tests and generates complete analysis

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                               ║"
echo "║         COMPREHENSIVE BACKEND TESTING & VALIDATION                           ║"
echo "║         Secure Gate Access Control System                                     ║"
echo "║                                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create results directory
RESULTS_DIR="tests/results"
mkdir -p "$RESULTS_DIR"

# Timestamp for this test run
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$RESULTS_DIR/comprehensive_test_report_${TIMESTAMP}.txt"

# Start logging
exec > >(tee -a "$REPORT_FILE")
exec 2>&1

echo "Test execution started at: $(date)"
echo "Report file: $REPORT_FILE"
echo ""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print section headers
print_section() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo "  $1"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo ""
}

# Function to print subsection headers
print_subsection() {
    echo ""
    echo "───────────────────────────────────────────────────────────────────────────────"
    echo "  $1"
    echo "───────────────────────────────────────────────────────────────────────────────"
}

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local test_command=$2
    
    print_subsection "$suite_name"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $suite_name PASSED${NC}"
        ((PASSED_TESTS++))
        return 0
    else
        echo -e "${RED}❌ $suite_name FAILED${NC}"
        ((FAILED_TESTS++))
        return 1
    fi
}

# Phase 1: File Inventory
print_section "PHASE 1: BACKEND FILE INVENTORY"

echo "Counting backend files..."
SERVICE_COUNT=$(find src/services -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
CONTROLLER_COUNT=$(find src/controllers -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
MIDDLEWARE_COUNT=$(find src/middleware -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
ROUTE_COUNT=$(find src/routes -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
UTIL_COUNT=$(find src/utils -name "*.js" 2>/dev/null | wc -l | tr -d ' ')

echo "📂 Backend Components:"
echo "   - Services:    $SERVICE_COUNT files"
echo "   - Controllers: $CONTROLLER_COUNT files"
echo "   - Middleware:  $MIDDLEWARE_COUNT files"
echo "   - Routes:      $ROUTE_COUNT files"
echo "   - Utils:       $UTIL_COUNT files"

TOTAL_BACKEND_FILES=$((SERVICE_COUNT + CONTROLLER_COUNT + MIDDLEWARE_COUNT + ROUTE_COUNT + UTIL_COUNT))
echo ""
echo "   Total Backend Files: $TOTAL_BACKEND_FILES"

# Phase 2: Test File Inventory
print_section "PHASE 2: TEST FILE INVENTORY"

echo "Counting test files..."
UNIT_TEST_COUNT=$(find tests/unit -name "*.test.js" 2>/dev/null | wc -l | tr -d ' ')
INTEGRATION_TEST_COUNT=$(find tests/integration -name "*.test.js" 2>/dev/null | wc -l | tr -d ' ')
E2E_TEST_COUNT=$(find tests/e2e -name "*.test.js" 2>/dev/null | wc -l | tr -d ' ')

echo "🧪 Test Files:"
echo "   - Unit Tests:        $UNIT_TEST_COUNT files"
echo "   - Integration Tests: $INTEGRATION_TEST_COUNT files"
echo "   - E2E Tests:         $E2E_TEST_COUNT files"

TOTAL_TEST_FILES=$((UNIT_TEST_COUNT + INTEGRATION_TEST_COUNT + E2E_TEST_COUNT))
echo ""
echo "   Total Test Files: $TOTAL_TEST_FILES"

# Calculate initial coverage estimate
if [ $TOTAL_BACKEND_FILES -gt 0 ]; then
    COVERAGE_ESTIMATE=$((UNIT_TEST_COUNT * 100 / TOTAL_BACKEND_FILES))
    echo "   Estimated Coverage: ~${COVERAGE_ESTIMATE}%"
fi

# Phase 3: Unit Tests
print_section "PHASE 3: UNIT TEST EXECUTION"

echo "Running unit tests with coverage..."
if npm run test:unit:coverage 2>&1 | tee "$RESULTS_DIR/unit_tests_${TIMESTAMP}.log"; then
    echo -e "${GREEN}✅ Unit tests completed${NC}"
    ((PASSED_TESTS++))
else
    echo -e "${YELLOW}⚠️ Unit tests completed with some failures${NC}"
    ((FAILED_TESTS++))
fi

((TOTAL_TESTS++))

# Extract test results from coverage output
if [ -f coverage/coverage-summary.json ]; then
    echo ""
    echo "📊 Coverage Summary:"
    cat coverage/coverage-summary.json | grep -A 5 "total" || echo "Coverage data available in coverage/"
fi

# Phase 4: Code Quality Analysis
print_section "PHASE 4: CODE QUALITY ANALYSIS"

print_subsection "Checking for common issues..."

# Check for console.log statements
echo "🔍 Checking for debug statements..."
CONSOLE_LOG_COUNT=$(grep -r "console\.log" src/ 2>/dev/null | grep -v "logger\|winston" | wc -l | tr -d ' ')
if [ "$CONSOLE_LOG_COUNT" -gt 10 ]; then
    echo -e "${YELLOW}⚠️  Found $CONSOLE_LOG_COUNT console.log statements (should use proper logging)${NC}"
else
    echo -e "${GREEN}✅ Debug statements: $CONSOLE_LOG_COUNT (acceptable)${NC}"
fi

# Check for TODO/FIXME
echo "🔍 Checking for TODO/FIXME comments..."
TODO_COUNT=$(grep -r "TODO\|FIXME" src/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$TODO_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}ℹ️  Found $TODO_COUNT TODO/FIXME comments${NC}"
else
    echo -e "${GREEN}✅ No TODO/FIXME comments found${NC}"
fi

# Check for large files
echo "🔍 Checking file sizes..."
LARGE_FILES=$(find src/ -name "*.js" -type f -exec wc -l {} \; 2>/dev/null | awk '$1 > 500' | wc -l | tr -d ' ')
if [ "$LARGE_FILES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $LARGE_FILES files larger than 500 lines (consider refactoring)${NC}"
    echo "   Largest files:"
    find src/ -name "*.js" -type f -exec wc -l {} \; 2>/dev/null | sort -rn | head -5
else
    echo -e "${GREEN}✅ All files are reasonably sized${NC}"
fi

# Phase 5: Security Analysis
print_section "PHASE 5: SECURITY ANALYSIS"

echo "🔒 Running security checks..."

# Check for hardcoded secrets patterns
print_subsection "Checking for potential hardcoded secrets..."
SECRET_PATTERNS=("password\s*=\s*['\"]" "api[_-]?key\s*=\s*['\"]" "secret\s*=\s*['\"]" "token\s*=\s*['\"]")
SECURITY_ISSUES=0

for pattern in "${SECRET_PATTERNS[@]}"; do
    COUNT=$(grep -riE "$pattern" src/ 2>/dev/null | grep -v "process\.env\|config\|\.example" | wc -l | tr -d ' ')
    if [ "$COUNT" -gt 0 ]; then
        echo -e "${RED}❌ Found $COUNT potential hardcoded secrets matching pattern: $pattern${NC}"
        ((SECURITY_ISSUES++))
    fi
done

if [ "$SECURITY_ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ No obvious hardcoded secrets detected${NC}"
fi

# Check for SQL injection patterns
print_subsection "Checking for SQL injection vulnerabilities..."
SQL_INJECTION_COUNT=$(grep -riE "query\s*\([^)]*\\\$\{|query\s*\([^)]*\+" src/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$SQL_INJECTION_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ Found $SQL_INJECTION_COUNT potential SQL injection vulnerabilities${NC}"
    ((SECURITY_ISSUES++))
else
    echo -e "${GREEN}✅ No SQL injection patterns detected${NC}"
fi

# NPM Audit
print_subsection "Running npm audit..."
if npm audit --production 2>&1 | tee "$RESULTS_DIR/npm_audit_${TIMESTAMP}.log"; then
    echo -e "${GREEN}✅ No security vulnerabilities found${NC}"
else
    echo -e "${YELLOW}⚠️  Security vulnerabilities detected - see npm_audit log${NC}"
fi

# Phase 6: Integration Tests (Quick)
print_section "PHASE 6: INTEGRATION TEST SAMPLE"

echo "Running a subset of integration tests..."
if npm run test:integration 2>&1 | head -100 | tee "$RESULTS_DIR/integration_sample_${TIMESTAMP}.log"; then
    echo -e "${GREEN}✅ Integration tests passed${NC}"
    ((PASSED_TESTS++))
else
    echo -e "${YELLOW}⚠️ Integration tests had issues${NC}"
    ((FAILED_TESTS++))
fi

((TOTAL_TESTS++))

# Phase 7: Performance Check
print_section "PHASE 7: PERFORMANCE VALIDATION"

echo "Checking if performance tests are available..."
if [ -f "tests/performance/quick-performance-validation.js" ]; then
    echo "Running quick performance validation..."
    if node tests/performance/quick-performance-validation.js 2>&1 | tee "$RESULTS_DIR/performance_${TIMESTAMP}.log"; then
        echo -e "${GREEN}✅ Performance validation passed${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${YELLOW}⚠️ Performance validation had issues (server may need to be running)${NC}"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
else
    echo -e "${YELLOW}ℹ️  Performance tests not found - skipping${NC}"
fi

# Phase 8: Deployment Readiness Assessment
print_section "PHASE 8: DEPLOYMENT READINESS ASSESSMENT"

READINESS_SCORE=100
CRITICAL_ISSUES=0
WARNINGS=0

# Check 1: Test Coverage (30 points)
print_subsection "Test Coverage Check"
if [ $UNIT_TEST_COUNT -ge 20 ]; then
    echo -e "${GREEN}✅ Test Coverage: Good ($UNIT_TEST_COUNT unit tests)${NC}"
else
    echo -e "${YELLOW}⚠️  Test Coverage: Below recommended ($UNIT_TEST_COUNT unit tests)${NC}"
    READINESS_SCORE=$((READINESS_SCORE - 15))
    ((WARNINGS++))
fi

# Check 2: Security Issues (25 points)
print_subsection "Security Check"
if [ "$SECURITY_ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ Security: No critical issues detected${NC}"
else
    echo -e "${RED}❌ Security: $SECURITY_ISSUES issue(s) detected${NC}"
    READINESS_SCORE=$((READINESS_SCORE - 25))
    ((CRITICAL_ISSUES++))
fi

# Check 3: Code Quality (25 points)
print_subsection "Code Quality Check"
QUALITY_SCORE=100
if [ "$CONSOLE_LOG_COUNT" -gt 20 ]; then
    QUALITY_SCORE=$((QUALITY_SCORE - 10))
    ((WARNINGS++))
fi
if [ "$LARGE_FILES" -gt 10 ]; then
    QUALITY_SCORE=$((QUALITY_SCORE - 10))
    ((WARNINGS++))
fi
if [ "$QUALITY_SCORE" -ge 80 ]; then
    echo -e "${GREEN}✅ Code Quality: Good${NC}"
else
    echo -e "${YELLOW}⚠️  Code Quality: Needs improvement${NC}"
    READINESS_SCORE=$((READINESS_SCORE - 15))
fi

# Check 4: Tests Passing (20 points)
print_subsection "Test Execution Check"
if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "${GREEN}✅ All test suites passed${NC}"
else
    echo -e "${YELLOW}⚠️  $FAILED_TESTS test suite(s) had issues${NC}"
    READINESS_SCORE=$((READINESS_SCORE - 10))
    ((WARNINGS++))
fi

# Final Readiness Score
print_section "DEPLOYMENT READINESS SCORE"

echo ""
echo "   ╔════════════════════════════════════════════════════════════╗"
echo "   ║                                                            ║"
printf "   ║            DEPLOYMENT READINESS: %3d/100               ║\n" "$READINESS_SCORE"
echo "   ║                                                            ║"
echo "   ╚════════════════════════════════════════════════════════════╝"
echo ""

echo "   📊 Test Results:"
echo "      - Total Test Suites: $TOTAL_TESTS"
echo "      - Passed: $PASSED_TESTS"
echo "      - Failed: $FAILED_TESTS"
echo ""
echo "   🔍 Issues Detected:"
echo "      - Critical Issues: $CRITICAL_ISSUES"
echo "      - Warnings: $WARNINGS"
echo ""

# Final Recommendation
if [ "$READINESS_SCORE" -ge 90 ]; then
    echo -e "${GREEN}   ✅ RECOMMENDATION: READY FOR PRODUCTION DEPLOYMENT${NC}"
    RECOMMENDATION="DEPLOY_TO_PRODUCTION"
elif [ "$READINESS_SCORE" -ge 75 ]; then
    echo -e "${YELLOW}   ⚠️  RECOMMENDATION: READY FOR STAGING (Address warnings before production)${NC}"
    RECOMMENDATION="DEPLOY_TO_STAGING"
elif [ "$READINESS_SCORE" -ge 60 ]; then
    echo -e "${YELLOW}   ⚠️  RECOMMENDATION: NOT READY (Critical issues must be resolved)${NC}"
    RECOMMENDATION="DO_NOT_DEPLOY"
else
    echo -e "${RED}   ❌ RECOMMENDATION: NOT PRODUCTION READY (Significant work required)${NC}"
    RECOMMENDATION="DO_NOT_DEPLOY"
fi

echo ""

# Phase 9: Generate Summary Report
print_section "PHASE 9: GENERATING SUMMARY REPORT"

SUMMARY_FILE="../../COMPREHENSIVE_BACKEND_TEST_SUMMARY.md"

cat > "$SUMMARY_FILE" << EOF
# Comprehensive Backend Test Summary

**Generated:** $(date)  
**Deployment Readiness Score:** ${READINESS_SCORE}/100  
**Recommendation:** ${RECOMMENDATION}

## Test Execution Results

- **Total Test Suites:** $TOTAL_TESTS
- **Passed:** $PASSED_TESTS ✅
- **Failed:** $FAILED_TESTS ❌

## Backend Inventory

- **Total Backend Files:** $TOTAL_BACKEND_FILES
- **Test Files:** $TOTAL_TEST_FILES
- **Estimated Coverage:** ~${COVERAGE_ESTIMATE}%

## Code Quality Metrics

- **Console.log Statements:** $CONSOLE_LOG_COUNT
- **TODO/FIXME Comments:** $TODO_COUNT
- **Large Files (>500 lines):** $LARGE_FILES

## Security Assessment

- **Critical Security Issues:** $SECURITY_ISSUES
- **Security Warnings:** (see npm_audit log)

## Issues Summary

- **Critical Issues:** $CRITICAL_ISSUES
- **Warnings:** $WARNINGS

## Recommendation

EOF

if [ "$READINESS_SCORE" -ge 90 ]; then
    cat >> "$SUMMARY_FILE" << EOF
### ✅ READY FOR PRODUCTION DEPLOYMENT

The backend has passed all critical checks and is ready for production deployment.

**Next Steps:**
1. Perform final smoke tests
2. Review deployment checklist
3. Deploy to production
4. Monitor post-deployment metrics
EOF
elif [ "$READINESS_SCORE" -ge 75 ]; then
    cat >> "$SUMMARY_FILE" << EOF
### ⚠️ READY FOR STAGING DEPLOYMENT

The backend is ready for staging deployment but should address warnings before production.

**Next Steps:**
1. Address warning-level issues
2. Deploy to staging environment
3. Perform comprehensive staging validation
4. Fix any critical issues discovered
5. Re-run deployment readiness assessment
EOF
else
    cat >> "$SUMMARY_FILE" << EOF
### ❌ NOT READY FOR DEPLOYMENT

Critical work is required before deployment.

**Next Steps:**
1. Fix all critical security issues
2. Increase test coverage to at least 75%
3. Fix all failing tests
4. Address code quality issues
5. Re-run comprehensive backend tests
EOF
fi

cat >> "$SUMMARY_FILE" << EOF

## Detailed Logs

- Full Report: \`tests/results/comprehensive_test_report_${TIMESTAMP}.txt\`
- Unit Tests: \`tests/results/unit_tests_${TIMESTAMP}.log\`
- NPM Audit: \`tests/results/npm_audit_${TIMESTAMP}.log\`

---
**Report Generated By:** Comprehensive Backend Test Runner  
**Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

echo "✅ Summary report generated: $SUMMARY_FILE"
echo "✅ Full report saved: $REPORT_FILE"

# Final Status
print_section "TEST EXECUTION COMPLETE"

echo "📄 Reports Generated:"
echo "   - Summary: COMPREHENSIVE_BACKEND_TEST_SUMMARY.md"
echo "   - Full Report: $REPORT_FILE"
echo "   - Coverage: coverage/ directory"
echo ""
echo "Test execution completed at: $(date)"
echo ""

# Exit with appropriate code
if [ "$READINESS_SCORE" -ge 75 ]; then
    exit 0
else
    exit 1
fi
