#!/bin/bash

################################################################################
# MILESTONE 1 - PRE-FLIGHT CHECK
# Verifies everything is ready to run the validation
################################################################################

set -e

echo ""
echo "============================================"
echo "MILESTONE 1 - PRE-FLIGHT CHECK"
echo "============================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check counter
CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to check and report
check() {
    local description="$1"
    local command="$2"
    
    echo -n "Checking: $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi
}

# Check working directory
echo "📂 Working Directory Check"
echo "Current: $(pwd)"
if [[ "$(pwd)" == *"secure-gate-react-express" ]]; then
    echo -e "${GREEN}✓ In correct directory${NC}"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠ Not in secure-gate-react-express directory${NC}"
    echo "Run: cd /Users/raynj/Desktop/secure-gate-react-express"
fi
echo ""

# Check validation script
echo "🛠️  Validation Script Check"
check "Script exists" "test -f scripts/milestone1-local-validation.sh"
check "Script is executable" "test -x scripts/milestone1-local-validation.sh"
echo ""

# Check documentation
echo "📚 Documentation Check"
check "Run Now guide exists" "test -f MILESTONE_1_RUN_NOW.md"
check "Completion guide exists" "test -f MILESTONE_1_COMPLETION_GUIDE.md"
check "Blocker resolution exists" "test -f MILESTONE_1_BLOCKER_RESOLUTION.md"
check "Solution summary exists" "test -f MILESTONE_1_SOLUTION_SUMMARY.md"
check "Doc index exists" "test -f MILESTONE_1_DOC_INDEX.md"
echo ""

# Check Node.js
echo "💻 Runtime Environment Check"
check "Node.js installed" "command -v node"
if command -v node > /dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo "   Node version: $NODE_VERSION"
fi
check "npm installed" "command -v npm"
echo ""

# Check server directory
echo "📁 Server Directory Check"
check "Server directory exists" "test -d secure-gate-access/server"
check "Server package.json exists" "test -f secure-gate-access/server/package.json"
echo ""

# Check port availability
echo "🔌 Port Availability Check"
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port 5001 is in use${NC}"
    echo "   The script will attempt to clean this up automatically"
    echo "   Or manually run: lsof -ti:5001 | xargs kill -9"
else
    echo -e "${GREEN}✓ Port 5001 is available${NC}"
    ((CHECKS_PASSED++))
fi
echo ""

# Check roadmap status
echo "📋 Roadmap Check"
if grep -q "COMPLETED (Local Validation)" ROADMAP_BOARD.md 2>/dev/null; then
    echo -e "${GREEN}✓ Roadmap updated for Milestone 1${NC}"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠ Roadmap not yet updated${NC}"
    echo "   This will be updated after validation"
fi
echo ""

# Report summary
echo "============================================"
echo "PRE-FLIGHT CHECK SUMMARY"
echo "============================================"
echo ""
echo -e "Checks passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Checks failed: ${RED}$CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL SYSTEMS GO!${NC}"
    echo ""
    echo "You are ready to complete Milestone 1!"
    echo ""
    echo "Run this command now:"
    echo ""
    echo "  ./scripts/milestone1-local-validation.sh"
    echo ""
    exit 0
else
    echo -e "${YELLOW}⚠️  SOME CHECKS FAILED${NC}"
    echo ""
    echo "Please review the issues above."
    echo "Most issues can be resolved automatically by the validation script."
    echo ""
    echo "You can still try to run:"
    echo ""
    echo "  ./scripts/milestone1-local-validation.sh"
    echo ""
    exit 1
fi
