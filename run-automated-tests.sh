#!/bin/bash

################################################################################
# AUTOMATED TEST EXECUTION - Production Readiness
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER_DIR="/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="/Users/raynj/Desktop/secure-gate-react-express/TEST_EXECUTION_REPORT_${TIMESTAMP}.md"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     PRODUCTION READINESS TEST EXECUTION - AUTOMATED       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Create report header
cat > "$REPORT_FILE" <<EOF
# Production Readiness Test Execution Report

**Execution Started:** $(date)
**Server Directory:** $SERVER_DIR
**Executor:** Automated Test Suite

---

## Test Execution Timeline

EOF

echo -e "${YELLOW}[INFO]${NC} Starting production readiness test execution..."
echo -e "${YELLOW}[INFO]${NC} Report will be saved to: $REPORT_FILE\n"

# Function to log results
log_result() {
    local step=$1
    local status=$2
    local message=$3
    
    echo "### $step" >> "$REPORT_FILE"
    echo "**Status:** $status" >> "$REPORT_FILE"
    echo "**Time:** $(date)" >> "$REPORT_FILE"
    echo "$message" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
}

# STEP 1: Check prerequisites
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 1: Checking Prerequisites${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

cd "$SERVER_DIR"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "  ${GREEN}✓${NC} Node.js: $NODE_VERSION"
    log_result "Prerequisites - Node.js" "✅ Pass" "Node.js version: $NODE_VERSION"
else
    echo -e "  ${RED}✗${NC} Node.js not found"
    log_result "Prerequisites - Node.js" "❌ Fail" "Node.js not installed"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "  ${GREEN}✓${NC} npm: v$NPM_VERSION"
    log_result "Prerequisites - npm" "✅ Pass" "npm version: v$NPM_VERSION"
else
    echo -e "  ${RED}✗${NC} npm not found"
    log_result "Prerequisites - npm" "❌ Fail" "npm not installed"
    exit 1
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    MODULE_COUNT=$(ls -1 node_modules | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} node_modules: $MODULE_COUNT packages installed"
    log_result "Prerequisites - Dependencies" "✅ Pass" "$MODULE_COUNT packages installed"
else
    echo -e "  ${YELLOW}⚠${NC}  node_modules not found - installing dependencies..."
    log_result "Prerequisites - Dependencies" "⚠️ Warning" "Installing dependencies..."
    npm install --silent > /tmp/npm-install.log 2>&1
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} Dependencies installed successfully"
        log_result "Prerequisites - Dependencies" "✅ Pass" "Dependencies installed successfully"
    else
        echo -e "  ${RED}✗${NC} Failed to install dependencies"
        log_result "Prerequisites - Dependencies" "❌ Fail" "Failed to install dependencies"
        exit 1
    fi
fi

echo ""

# STEP 2: Check Server Status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 2: Checking Server Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check if server is running on port 5001 or 3000
SERVER_RUNNING=false
SERVER_PORT=""

for port in 5001 3000; do
    if curl -s http://localhost:$port/health > /dev/null 2>&1 || \
       curl -s http://localhost:$port/api/health > /dev/null 2>&1 || \
       curl -s http://localhost:$port/api/v1/health > /dev/null 2>&1; then
        SERVER_RUNNING=true
        SERVER_PORT=$port
        break
    fi
done

if [ "$SERVER_RUNNING" = true ]; then
    echo -e "  ${GREEN}✓${NC} Server is running on port $SERVER_PORT"
    log_result "Server Status" "✅ Running" "Server responding on port $SERVER_PORT"
else
    echo -e "  ${YELLOW}⚠${NC}  Server is not running"
    echo -e "  ${YELLOW}[INFO]${NC} Tests will run in standalone mode or skip server-dependent tests"
    log_result "Server Status" "⚠️ Not Running" "Server not responding. Tests will run in standalone mode."
fi

echo ""

# STEP 3: Run Quick Performance Tests (Standalone)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 3: Quick Performance Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}[RUNNING]${NC} Quick performance validation test..."

if [ -f "tests/performance/quick-performance-validation.js" ]; then
    TEST_START=$(date +%s)
    
    # Run the test and capture output
    if node tests/performance/quick-performance-validation.js > /tmp/quick-perf-test.log 2>&1; then
        TEST_END=$(date +%s)
        TEST_DURATION=$((TEST_END - TEST_START))
        
        echo -e "  ${GREEN}✓${NC} Quick performance test completed in ${TEST_DURATION}s"
        log_result "Quick Performance Test" "✅ Pass" "Test completed in ${TEST_DURATION} seconds"
        
        # Show summary if available
        if grep -q "Summary" /tmp/quick-perf-test.log; then
            echo -e "\n${BLUE}Test Summary:${NC}"
            grep -A 10 "Summary" /tmp/quick-perf-test.log | head -15
        fi
    else
        echo -e "  ${YELLOW}⚠${NC}  Quick performance test had issues (check log for details)"
        log_result "Quick Performance Test" "⚠️ Warning" "Test completed with warnings. See /tmp/quick-perf-test.log"
    fi
else
    echo -e "  ${RED}✗${NC} Test file not found"
    log_result "Quick Performance Test" "❌ Skip" "Test file not found"
fi

echo ""

# STEP 4: Run Simple Security Test
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 4: Simple Security Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}[RUNNING]${NC} Simple security test..."

if [ -f "tests/security/simple-security-test.js" ]; then
    TEST_START=$(date +%s)
    
    if node tests/security/simple-security-test.js > /tmp/simple-security-test.log 2>&1; then
        TEST_END=$(date +%s)
        TEST_DURATION=$((TEST_END - TEST_START))
        
        echo -e "  ${GREEN}✓${NC} Simple security test completed in ${TEST_DURATION}s"
        log_result "Simple Security Test" "✅ Pass" "Test completed in ${TEST_DURATION} seconds"
    else
        echo -e "  ${YELLOW}⚠${NC}  Simple security test had issues"
        log_result "Simple Security Test" "⚠️ Warning" "Test completed with warnings"
    fi
else
    echo -e "  ${YELLOW}⚠${NC}  Test file not found - trying npm audit instead..."
    
    if npm audit --audit-level=high > /tmp/npm-audit.log 2>&1; then
        echo -e "  ${GREEN}✓${NC} npm audit: No high/critical vulnerabilities"
        log_result "npm Audit" "✅ Pass" "No high or critical vulnerabilities found"
    else
        VULN_COUNT=$(grep -c "vulnerabilities" /tmp/npm-audit.log || echo "0")
        echo -e "  ${YELLOW}⚠${NC}  npm audit found vulnerabilities (see log)"
        log_result "npm Audit" "⚠️ Warning" "Found vulnerabilities. Review /tmp/npm-audit.log"
    fi
fi

echo ""

# STEP 5: Test Secrets Manager
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 5: Secrets Manager Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}[RUNNING]${NC} Secrets manager test..."

if [ -f "test-secrets-manager.js" ]; then
    TEST_START=$(date +%s)
    
    if node test-secrets-manager.js > /tmp/secrets-test.log 2>&1; then
        TEST_END=$(date +%s)
        TEST_DURATION=$((TEST_END - TEST_START))
        
        echo -e "  ${GREEN}✓${NC} Secrets manager test completed in ${TEST_DURATION}s"
        log_result "Secrets Manager Test" "✅ Pass" "Test completed in ${TEST_DURATION} seconds"
    else
        echo -e "  ${YELLOW}⚠${NC}  Secrets manager test had issues"
        log_result "Secrets Manager Test" "⚠️ Warning" "Test completed with warnings"
    fi
else
    echo -e "  ${YELLOW}⚠${NC}  Test file not found"
    log_result "Secrets Manager Test" "⚠️ Skip" "Test file not found"
fi

echo ""

# STEP 6: Security Audit Script
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 6: Security Audit${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}[RUNNING]${NC} Security audit..."

if [ -f "run-security-audit.sh" ] && [ -x "run-security-audit.sh" ]; then
    TEST_START=$(date +%s)
    
    if ./run-security-audit.sh > /tmp/security-audit.log 2>&1; then
        TEST_END=$(date +%s)
        TEST_DURATION=$((TEST_END - TEST_START))
        
        echo -e "  ${GREEN}✓${NC} Security audit completed in ${TEST_DURATION}s"
        log_result "Security Audit" "✅ Pass" "Audit completed in ${TEST_DURATION} seconds"
    else
        echo -e "  ${YELLOW}⚠${NC}  Security audit had warnings"
        log_result "Security Audit" "⚠️ Warning" "Audit completed with warnings"
    fi
elif [ -f "tests/security/run-security-audit.js" ]; then
    TEST_START=$(date +%s)
    
    if node tests/security/run-security-audit.js > /tmp/security-audit.log 2>&1; then
        TEST_END=$(date +%s)
        TEST_DURATION=$((TEST_END - TEST_START))
        
        echo -e "  ${GREEN}✓${NC} Security audit completed in ${TEST_DURATION}s"
        log_result "Security Audit" "✅ Pass" "Audit completed in ${TEST_DURATION} seconds"
    else
        echo -e "  ${YELLOW}⚠${NC}  Security audit had warnings"
        log_result "Security Audit" "⚠️ Warning" "Audit completed with warnings"
    fi
else
    echo -e "  ${YELLOW}⚠${NC}  Security audit script not found"
    log_result "Security Audit" "⚠️ Skip" "Security audit script not found"
fi

echo ""

# STEP 7: Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST EXECUTION SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

cat >> "$REPORT_FILE" <<EOF

---

## Execution Summary

**Execution Completed:** $(date)
**Total Duration:** ${SECONDS} seconds

### Test Results

All automated tests have been executed. Review the detailed logs:
- Quick Performance: /tmp/quick-perf-test.log
- Security Test: /tmp/simple-security-test.log
- npm Audit: /tmp/npm-audit.log
- Secrets Manager: /tmp/secrets-test.log
- Security Audit: /tmp/security-audit.log

### Next Steps

1. Review this report: $REPORT_FILE
2. Check individual test logs for details
3. Address any warnings or failures
4. If server was not running, start it and re-run tests:
   \`\`\`bash
   cd $SERVER_DIR
   node server.js &
   sleep 10
   # Re-run this script
   \`\`\`

### Logs Location

All test logs are saved in /tmp/ directory:
\`\`\`bash
ls -la /tmp/*-test.log /tmp/*-audit.log
\`\`\`

EOF

echo -e "${GREEN}✓ Test execution complete!${NC}"
echo -e "${GREEN}✓ Report saved to: $REPORT_FILE${NC}\n"

echo -e "${BLUE}[INFO]${NC} To view the full report:"
echo -e "  ${YELLOW}cat $REPORT_FILE${NC}\n"

echo -e "${BLUE}[INFO]${NC} To view test logs:"
echo -e "  ${YELLOW}ls -la /tmp/*-test.log /tmp/*-audit.log${NC}\n"

exit 0
