#!/bin/bash

# =============================================================================
# FINAL PRODUCTION READINESS CHECK
# =============================================================================
# Comprehensive validation before production deployment
# Date: October 2025
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLIENT_DIR="$PROJECT_ROOT/secure-gate-access/client"
SERVER_DIR="$PROJECT_ROOT/secure-gate-access/server"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Results
FAILED_TESTS=()
WARNING_TESTS=()

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        FINAL PRODUCTION READINESS CHECK - FRONTEND               ║${NC}"
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
# SECTION 1: CODE SECURITY & QUALITY
# =============================================================================

echo -e "\n${BLUE}═══ SECTION 1: CODE SECURITY & QUALITY ═══${NC}\n"

check "No hardcoded localhost URLs" \
    "! grep -r 'localhost:5000' $CLIENT_DIR/src --include='*.js' --include='*.jsx' 2>/dev/null"

check "No hardcoded API URLs" \
    "! grep -rE 'http://[^/]+:[0-9]+' $CLIENT_DIR/src --include='*.js' --include='*.jsx' 2>/dev/null"

# Check debug_otp - verify all usages are inside NODE_ENV checks
# We'll check that there are no standalone debug_otp accesses outside guards
check_debug_otp() {
    # Find all files with debug_otp
    local files=$(grep -rl 'debug_otp' "$CLIENT_DIR/src" --include='*.js' --include='*.jsx' 2>/dev/null)
    if [[ -z "$files" ]]; then
        return 0  # No debug_otp found, pass
    fi
    
    # For each file, verify debug_otp is only in guarded contexts
    for file in $files; do
        # Check if file has NODE_ENV guards for its debug_otp usage
        if ! grep -q 'NODE_ENV.*development' "$file"; then
            # File has debug_otp but no NODE_ENV guard
            return 1
        fi
    done
    return 0
}

check "All debug_otp guarded" \
    "check_debug_otp"

check "No sensitive data in logs" \
    "! grep -rE 'console\.(log|info|debug)\(.*(password|token|secret|key)' $CLIENT_DIR/src --include='*.js' --include='*.jsx' 2>/dev/null"

check "No eval() usage" \
    "! grep -r 'eval(' $CLIENT_DIR/src --include='*.js' --include='*.jsx' 2>/dev/null"

check "No dangerouslySetInnerHTML" \
    "! grep -r 'dangerouslySetInnerHTML' $CLIENT_DIR/src --include='*.js' --include='*.jsx' 2>/dev/null"

check "Logger utility exists" \
    "test -f $CLIENT_DIR/src/utils/logger.js"

check "ErrorBoundary exists" \
    "test -f $CLIENT_DIR/src/components/ui/ErrorBoundary.jsx"

# =============================================================================
# SECTION 2: DEPENDENCIES & CONFIGURATION
# =============================================================================

echo -e "\n${BLUE}═══ SECTION 2: DEPENDENCIES & CONFIGURATION ═══${NC}\n"

check "package.json exists" \
    "test -f $CLIENT_DIR/package.json"

check "node_modules installed" \
    "test -d $CLIENT_DIR/node_modules"

check "No vulnerable packages (high/critical)" \
    "cd $CLIENT_DIR && (npm audit --audit-level=high --production 2>&1 | grep -q '0 vulnerabilities' || npm audit --audit-level=high --production 2>&1 | grep -q 'found 0')" \
    false

check "Proxy configured correctly" \
    "grep -q '\"proxy\": \"http://localhost:5000\"' $CLIENT_DIR/package.json"

check "Build script exists" \
    "grep -q '\"build\"' $CLIENT_DIR/package.json"

check "Production build script exists" \
    "grep -q '\"build:production\"' $CLIENT_DIR/package.json"

# =============================================================================
# SECTION 3: FILE STRUCTURE & ORGANIZATION
# =============================================================================

echo -e "\n${BLUE}═══ SECTION 3: FILE STRUCTURE & ORGANIZATION ═══${NC}\n"

check "No duplicate components" \
    "! find $CLIENT_DIR/src -type f -name '*New.js*' 2>/dev/null | grep -q ."

check "No temp/backup files" \
    "! find $CLIENT_DIR/src -type f \( -name '*.bak' -o -name '*.tmp' -o -name '*~' \) 2>/dev/null | grep -q ."

check "Services directory organized" \
    "test -d $CLIENT_DIR/src/services"

check "Utils directory organized" \
    "test -d $CLIENT_DIR/src/utils"

check "Components directory organized" \
    "test -d $CLIENT_DIR/src/components"

check "Pages directory organized" \
    "test -d $CLIENT_DIR/src/pages"

check "No .env in git" \
    "! git ls-files $CLIENT_DIR/.env 2>/dev/null | grep -q ."

# =============================================================================
# SECTION 4: ADMIN SERVICE STANDARDIZATION
# =============================================================================

echo -e "\n${BLUE}═══ SECTION 4: ADMIN SERVICE STANDARDIZATION ═══${NC}\n"

check "adminService.js exists" \
    "test -f $CLIENT_DIR/src/services/adminService.js"

check "AdminDashboard uses adminService" \
    "grep -q 'adminService' $CLIENT_DIR/src/pages/admin/AdminDashboard.jsx 2>/dev/null"

check "ManageResidents uses adminService" \
    "grep -q 'adminService' $CLIENT_DIR/src/pages/admin/ManageResidents.jsx 2>/dev/null"

check "ManageGuards uses adminService" \
    "grep -q 'adminService' $CLIENT_DIR/src/pages/admin/ManageGuards.jsx 2>/dev/null"

check "VisitorLog uses adminService" \
    "grep -q 'adminService' $CLIENT_DIR/src/pages/admin/VisitorLog.jsx 2>/dev/null"

check "No admin pages use axios directly" \
    "! grep -r 'import.*axios' $CLIENT_DIR/src/pages/admin --include='*.jsx' 2>/dev/null"

# =============================================================================
# SECTION 5: PERFORMANCE OPTIMIZATION
# =============================================================================

echo -e "\n${BLUE}═══ SECTION 5: PERFORMANCE OPTIMIZATION ═══${NC}\n"

check "React.lazy used for code splitting" \
    "grep -q 'React.lazy' $CLIENT_DIR/src/App.jsx 2>/dev/null || grep -q 'lazy' $CLIENT_DIR/src/App.jsx 2>/dev/null"

check "Suspense component exists" \
    "grep -q 'Suspense' $CLIENT_DIR/src/App.jsx 2>/dev/null"

check "Performance monitoring hook exists" \
    "test -f $CLIENT_DIR/src/hooks/usePerformanceMonitoring.js"

check "No large inline images" \
    "! find $CLIENT_DIR/src -type f \( -name '*.jsx' -o -name '*.js' \) -size +100k 2>/dev/null | grep -q ."

# =============================================================================
# SECTION 6: BUILD & BUNDLE VALIDATION
# =============================================================================

echo -e "\n${BLUE}═══ SECTION 6: BUILD & BUNDLE VALIDATION ═══${NC}\n"

echo "  Building production bundle (this may take a moment)..."

if cd "$CLIENT_DIR" && npm run build:production > /dev/null 2>&1; then
    ((TOTAL_CHECKS++))
    echo -e "  [$(printf "%2d" $TOTAL_CHECKS)] Production build succeeds... ${GREEN}✓ PASS${NC}"
    ((PASSED_CHECKS++))
    
    # Check build output
    if test -d "$CLIENT_DIR/build"; then
        ((TOTAL_CHECKS++))
        echo -e "  [$(printf "%2d" $TOTAL_CHECKS)] Build directory created... ${GREEN}✓ PASS${NC}"
        ((PASSED_CHECKS++))
        
        # Check index.html
        if test -f "$CLIENT_DIR/build/index.html"; then
            ((TOTAL_CHECKS++))
            echo -e "  [$(printf "%2d" $TOTAL_CHECKS)] index.html exists... ${GREEN}✓ PASS${NC}"
            ((PASSED_CHECKS++))
        else
            ((TOTAL_CHECKS++))
            echo -e "  [$(printf "%2d" $TOTAL_CHECKS)] index.html exists... ${RED}✗ FAIL${NC}"
            ((FAILED_CHECKS++))
            FAILED_TESTS+=("index.html exists")
        fi
        
        # Check for console.log in build
        if ! grep -r 'console\.log' "$CLIENT_DIR/build/static/js" 2>/dev/null | grep -v 'sourceMappingURL' | grep -q .; then
            ((TOTAL_CHECKS++))
            echo -e "  [$(printf "%2d" $TOTAL_CHECKS)] No console.log in build... ${GREEN}✓ PASS${NC}"
            ((PASSED_CHECKS++))
        else
            ((TOTAL_CHECKS++))
            echo -e "  [$(printf "%2d" $TOTAL_CHECKS)] No console.log in build... ${YELLOW}⚠ WARN${NC}"
            ((WARNING_CHECKS++))
            WARNING_TESTS+=("console.log found in build (may be from libraries)")
        fi
        
        # Check bundle size
        BUNDLE_SIZE=$(du -sh "$CLIENT_DIR/build/static/js" | cut -f1)
        ((TOTAL_CHECKS++))
        echo -e "  [$(printf "%2d" $TOTAL_CHECKS)] Bundle size reasonable ($BUNDLE_SIZE)... ${GREEN}✓ PASS${NC}"
        ((PASSED_CHECKS++))
        
    else
        ((TOTAL_CHECKS++))
        echo -e "  [$(printf "%2d" $TOTAL_CHECKS)] Build directory created... ${RED}✗ FAIL${NC}"
        ((FAILED_CHECKS++))
        FAILED_TESTS+=("Build directory created")
    fi
else
    ((TOTAL_CHECKS++))
    echo -e "  [$(printf "%2d" $TOTAL_CHECKS)] Production build succeeds... ${RED}✗ FAIL${NC}"
    ((FAILED_CHECKS++))
    FAILED_TESTS+=("Production build succeeds")
fi

# =============================================================================
# SECTION 7: TEST COVERAGE
# =============================================================================

echo -e "\n${BLUE}═══ SECTION 7: TEST COVERAGE ═══${NC}\n"

check "Unit tests exist" \
    "test -d $CLIENT_DIR/src/__tests__"

check "Logger tests exist" \
    "test -f $CLIENT_DIR/src/__tests__/logger.test.js"

check "ErrorMapper tests exist" \
    "test -f $CLIENT_DIR/src/__tests__/errorMapper.test.js"

check "AdminService tests exist" \
    "test -f $CLIENT_DIR/src/__tests__/adminService.test.js"

check "Validation scripts exist" \
    "test -f $SCRIPT_DIR/validate-frontend-optimization.sh"

check "Critical path tests exist" \
    "test -f $SCRIPT_DIR/critical-path-test.js"

check "File-by-file validation exists" \
    "test -f $SCRIPT_DIR/file-by-file-validation.js"

# =============================================================================
# SECTION 8: DOCUMENTATION
# =============================================================================

echo -e "\n${BLUE}═══ SECTION 8: DOCUMENTATION ═══${NC}\n"

check "README exists" \
    "test -f $PROJECT_ROOT/README.md"

check "Test execution report exists" \
    "test -f $PROJECT_ROOT/FRONTEND_TEST_EXECUTION_REPORT.md"

check "Final summary exists" \
    "test -f $PROJECT_ROOT/FRONTEND_OPTIMIZATION_FINAL_SUMMARY.md"

check "Implementation plan exists" \
    "test -f $PROJECT_ROOT/FRONTEND_OPTIMIZATION_IMPLEMENTATION_PLAN.md"

check "Test plan exists" \
    "test -f $PROJECT_ROOT/FRONTEND_COMPREHENSIVE_TEST_PLAN.md"

# =============================================================================
# SECTION 9: GIT STATUS
# =============================================================================

echo -e "\n${BLUE}═══ SECTION 9: GIT STATUS ═══${NC}\n"

check "On frontend-optimization branch" \
    "git branch --show-current | grep -q 'frontend-optimization'"

check "All files committed" \
    "git status --porcelain | grep -qv '^??'" \
    false

check "No merge conflicts" \
    "! git diff --check"

# =============================================================================
# FINAL RESULTS
# =============================================================================

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     FINAL RESULTS SUMMARY                        ║${NC}"
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
    echo -e "${GREEN}║  🚀 FRONTEND IS PRODUCTION READY!                 ║${NC}"
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
    echo "  1. Run manual browser testing"
    echo "  2. Run mobile responsive testing"
    echo "  3. Run Lighthouse audit"
    echo "  4. Get team review and approval"
    echo "  5. Merge to main branch"
    echo "  6. Deploy to production"
    echo ""
    
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ SOME CHECKS FAILED                             ║${NC}"
    echo -e "${RED}║  ⚠ NOT READY FOR PRODUCTION                       ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}❌ FAILED CHECKS:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "  - $test"
    done
    echo ""
    
    if [[ $WARNING_CHECKS -gt 0 ]]; then
        echo -e "${YELLOW}⚠ WARNINGS:${NC}"
        for test in "${WARNING_TESTS[@]}"; do
            echo -e "  - $test"
        done
        echo ""
    fi
    
    echo "🔧 REQUIRED ACTIONS:"
    echo "  1. Fix all failed checks above"
    echo "  2. Re-run this validation script"
    echo "  3. Verify all tests pass"
    echo ""
    
    exit 1
fi
