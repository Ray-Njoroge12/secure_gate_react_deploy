#!/bin/bash

# =============================================================================
# QUICK PRODUCTION READINESS CHECK
# =============================================================================
# Fast validation without rebuilding
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLIENT_DIR="$PROJECT_ROOT/secure-gate-access/client"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

FAILED_TESTS=()
WARNING_TESTS=()

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           QUICK PRODUCTION READINESS CHECK - FRONTEND            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Helper functions
check() {
    ((TOTAL_CHECKS++))
    local name="$1"
    local command="$2"
    local critical="${3:-true}"
    
    echo -ne "  [$(printf "%2d" $TOTAL_CHECKS)] ${name}... "
    
    if eval "$command" &>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED_CHECKS++))
        return 0
    else
        if [[ "$critical" == "true" ]]; then
            echo -e "${RED}✗ FAIL${NC}"
            ((FAILED_CHECKS++))
            FAILED_TESTS+=("$name")
        else
            echo -e "${YELLOW}⚠ WARN${NC}"
            ((WARNING_CHECKS++))
            WARNING_TESTS+=("$name")
        fi
        return 1
    fi
}

# =============================================================================
# CRITICAL CHECKS
# =============================================================================

echo -e "\n${BLUE}═══ CRITICAL SECURITY CHECKS ═══${NC}\n"

check "No hardcoded localhost URLs" \
    "! grep -r 'localhost:5000' $CLIENT_DIR/src --include='*.js' --include='*.jsx' 2>/dev/null"

check "No hardcoded API URLs" \
    "! grep -rE 'http://[^/]+:[0-9]+' $CLIENT_DIR/src --include='*.js' --include='*.jsx' 2>/dev/null"

# Check debug_otp - verify all files with it also have NODE_ENV guards
check_debug_otp() {
    local files=$(grep -rl 'debug_otp' "$CLIENT_DIR/src" --include='*.js' --include='*.jsx' 2>/dev/null)
    if [[ -z "$files" ]]; then
        return 0
    fi
    for file in $files; do
        if ! grep -q 'NODE_ENV.*development' "$file"; then
            return 1
        fi
    done
    return 0
}

check "All debug_otp guarded" "check_debug_otp"

check "No sensitive data in logs" \
    "! grep -rE 'console\.(log|info|debug)\(.*(password|token|secret|key)' $CLIENT_DIR/src --include='*.js' --include='*.jsx' 2>/dev/null"

check "Logger utility exists" \
    "test -f $CLIENT_DIR/src/utils/logger.js"

check "ErrorBoundary exists" \
    "test -f $CLIENT_DIR/src/components/ui/ErrorBoundary.jsx"

echo -e "\n${BLUE}═══ CODE ORGANIZATION ═══${NC}\n"

check "No duplicate components" \
    "! find $CLIENT_DIR/src -type f -name '*New.js*' 2>/dev/null | grep -q ."

check "adminService.js exists" \
    "test -f $CLIENT_DIR/src/services/adminService.js"

check "AdminDashboard uses adminService" \
    "grep -q 'adminService' $CLIENT_DIR/src/pages/admin/AdminDashboard.jsx 2>/dev/null"

check "No admin pages use axios directly" \
    "! grep -r 'import.*axios' $CLIENT_DIR/src/pages/admin --include='*.jsx' 2>/dev/null"

check "Performance monitoring hook exists" \
    "test -f $CLIENT_DIR/src/hooks/usePerformanceMonitoring.js"

echo -e "\n${BLUE}═══ BUILD & TESTS ═══${NC}\n"

check "Previous build directory exists" \
    "test -d $CLIENT_DIR/build"

check "Unit tests exist" \
    "test -d $CLIENT_DIR/src/__tests__"

check "Logger tests exist" \
    "test -f $CLIENT_DIR/src/__tests__/logger.test.js"

check "Validation scripts exist" \
    "test -f $SCRIPT_DIR/validate-frontend-optimization.sh"

echo -e "\n${BLUE}═══ DOCUMENTATION ═══${NC}\n"

check "Test execution report exists" \
    "test -f $PROJECT_ROOT/FRONTEND_TEST_EXECUTION_REPORT.md"

check "Final summary exists" \
    "test -f $PROJECT_ROOT/FRONTEND_OPTIMIZATION_FINAL_SUMMARY.md"

check "Manual testing checklist exists" \
    "test -f $PROJECT_ROOT/MANUAL_TESTING_CHECKLIST.md"

# =============================================================================
# FINAL RESULTS
# =============================================================================

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     RESULTS SUMMARY                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

PASS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo -e "  Total Checks:    ${BLUE}$TOTAL_CHECKS${NC}"
echo -e "  Passed:          ${GREEN}$PASSED_CHECKS${NC}"
echo -e "  Failed:          ${RED}$FAILED_CHECKS${NC}"
echo -e "  Warnings:        ${YELLOW}$WARNING_CHECKS${NC}"
echo -e "  Pass Rate:       ${BLUE}${PASS_RATE}%${NC}"
echo ""

if [[ $FAILED_CHECKS -eq 0 ]]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ ALL CRITICAL CHECKS PASSED                     ║${NC}"
    echo -e "${GREEN}║  🚀 READY FOR MANUAL TESTING!                     ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [[ $WARNING_CHECKS -gt 0 ]]; then
        echo -e "${YELLOW}⚠ WARNINGS (Non-Critical):${NC}"
        for test in "${WARNING_TESTS[@]}"; do
            echo -e "  - $test"
        done
        echo ""
    fi
    
    echo "✅ NEXT STEPS:"
    echo "  1. Review MANUAL_TESTING_CHECKLIST.md"
    echo "  2. Complete browser compatibility testing"
    echo "  3. Complete mobile responsive testing"
    echo "  4. Run Lighthouse audit"
    echo "  5. Get team sign-off"
    echo "  6. Merge to main and deploy"
    echo ""
    
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ SOME CHECKS FAILED                             ║${NC}"
    echo -e "${RED}║  ⚠ FIX ISSUES BEFORE PROCEEDING                   ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}❌ FAILED CHECKS:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "  - $test"
    done
    echo ""
    
    exit 1
fi
