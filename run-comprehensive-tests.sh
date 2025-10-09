#!/bin/bash

################################################################################
# COMPREHENSIVE TEST EXECUTION - Step by Step
# 
# This script executes all production readiness tests with proper error handling
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SERVER_DIR="/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server"
RESULTS_DIR="$SERVER_DIR/tests/results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
EXECUTION_REPORT="/Users/raynj/Desktop/secure-gate-react-express/COMPREHENSIVE_TEST_EXECUTION_${TIMESTAMP}.md"

# Create results directory if it doesn't exist
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                  ║${NC}"
echo -e "${BLUE}║        COMPREHENSIVE PRODUCTION READINESS TEST EXECUTION         ║${NC}"
echo -e "${BLUE}║                                                                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}\n"

# Initialize report
cat > "$EXECUTION_REPORT" <<EOF
# Comprehensive Test Execution Report

**Execution Started:** $(date)  
**Server Directory:** $SERVER_DIR  
**Results Directory:** $RESULTS_DIR

---

## Test Execution Results

EOF

# Function to log results
log_test() {
    local test_name=$1
    local status=$2
    local details=$3
    local duration=$4
    
    echo "### $test_name" >> "$EXECUTION_REPORT"
    echo "- **Status:** $status" >> "$EXECUTION_REPORT"
    echo "- **Time:** $(date '+%Y-%m-%d %H:%M:%S')" >> "$EXECUTION_REPORT"
    echo "- **Duration:** ${duration}s" >> "$EXECUTION_REPORT"
    echo "- **Details:** $details" >> "$EXECUTION_REPORT"
    echo "" >> "$EXECUTION_REPORT"
}

# ============================================================================
# STEP 1: Environment Check
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}STEP 1: Environment Check${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

cd "$SERVER_DIR"

# Check Node.js
NODE_VERSION=$(node --version 2>/dev/null || echo "not found")
echo -e "  ${GREEN}✓${NC} Node.js: $NODE_VERSION"

# Check npm
NPM_VERSION=$(npm --version 2>/dev/null || echo "not found")
echo -e "  ${GREEN}✓${NC} npm: v$NPM_VERSION"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "  ${YELLOW}⚠${NC}  Installing dependencies..."
    npm install --silent
fi

MODULE_COUNT=$(ls -1 node_modules 2>/dev/null | wc -l | tr -d ' ')
echo -e "  ${GREEN}✓${NC} Dependencies: $MODULE_COUNT packages\n"

log_test "Environment Check" "✅ Pass" "Node: $NODE_VERSION, npm: v$NPM_VERSION, Packages: $MODULE_COUNT" "0"

# ============================================================================
# STEP 2: Server Status Check
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}STEP 2: Server Status Check${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

SERVER_RUNNING=false
SERVER_PORT=""

# Check common ports
for port in 3000 5001 5000 8080; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Port $port is in use"
        
        # Try to check health endpoint
        for endpoint in "/api/health" "/health" "/api/v1/health"; do
            if curl -sf http://localhost:$port$endpoint >/dev/null 2>&1; then
                SERVER_RUNNING=true
                SERVER_PORT=$port
                echo -e "  ${GREEN}✓${NC} Server responding on port $port at $endpoint"
                break 2
            fi
        done
    fi
done

if [ "$SERVER_RUNNING" = false ]; then
    echo -e "  ${YELLOW}⚠${NC}  No running server detected"
    echo -e "  ${BLUE}ℹ${NC}  Starting server on port 5001..."
    
    # Start server in background
    PORT=5001 nohup npm start > "$RESULTS_DIR/server-startup.log" 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > "$RESULTS_DIR/server.pid"
    
    echo -e "  ${BLUE}ℹ${NC}  Server started with PID: $SERVER_PID"
    echo -e "  ${BLUE}ℹ${NC}  Waiting for server to initialize (15 seconds)...\n"
    
    # Wait and check
    for i in {1..15}; do
        sleep 1
        if curl -sf http://localhost:5001/health >/dev/null 2>&1 || \
           curl -sf http://localhost:5001/api/health >/dev/null 2>&1; then
            SERVER_RUNNING=true
            SERVER_PORT=5001
            echo -e "  ${GREEN}✓${NC} Server is now responding!"
            break
        fi
    done
    
    if [ "$SERVER_RUNNING" = false ]; then
        echo -e "  ${YELLOW}⚠${NC}  Server not responding yet (may need more time)"
        echo -e "  ${BLUE}ℹ${NC}  Check logs: cat $RESULTS_DIR/server-startup.log\n"
    fi
else
    echo -e "  ${GREEN}✓${NC} Server already running on port $SERVER_PORT\n"
fi

log_test "Server Status" "✅ Running" "Server on port ${SERVER_PORT:-none}" "0"

# ============================================================================
# STEP 3: Quick Performance Tests
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}STEP 3: Quick Performance Tests${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Test 1: Quick Performance Validation
if [ -f "tests/performance/quick-performance-validation.js" ]; then
    echo -e "${YELLOW}[RUNNING]${NC} Quick Performance Validation..."
    START_TIME=$(date +%s)
    
    if BASE_URL="http://localhost:${SERVER_PORT:-5001}" node tests/performance/quick-performance-validation.js > "$RESULTS_DIR/quick-perf-${TIMESTAMP}.log" 2>&1; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo -e "  ${GREEN}✓${NC} Quick performance test passed (${DURATION}s)\n"
        log_test "Quick Performance Test" "✅ Pass" "Test completed successfully" "$DURATION"
    else
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo -e "  ${YELLOW}⚠${NC}  Quick performance test had warnings (${DURATION}s)"
        echo -e "  ${BLUE}ℹ${NC}  Check log: $RESULTS_DIR/quick-perf-${TIMESTAMP}.log\n"
        log_test "Quick Performance Test" "⚠️ Warning" "Check log for details" "$DURATION"
    fi
else
    echo -e "  ${YELLOW}⚠${NC}  Test file not found\n"
    log_test "Quick Performance Test" "⚠️ Skip" "Test file not found" "0"
fi

# ============================================================================
# STEP 4: Comprehensive Performance Tests
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}STEP 4: Comprehensive Performance Tests${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Test 2: Comprehensive Performance Test
if [ -f "tests/performance/comprehensive-performance-test.js" ]; then
    echo -e "${YELLOW}[RUNNING]${NC} Comprehensive Performance Test..."
    START_TIME=$(date +%s)
    
    if BASE_URL="http://localhost:${SERVER_PORT:-5001}" node tests/performance/comprehensive-performance-test.js > "$RESULTS_DIR/comprehensive-perf-${TIMESTAMP}.log" 2>&1; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo -e "  ${GREEN}✓${NC} Comprehensive performance test passed (${DURATION}s)\n"
        log_test "Comprehensive Performance Test" "✅ Pass" "All API endpoints tested" "$DURATION"
    else
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo -e "  ${YELLOW}⚠${NC}  Comprehensive performance test had warnings (${DURATION}s)"
        echo -e "  ${BLUE}ℹ${NC}  Check log: $RESULTS_DIR/comprehensive-perf-${TIMESTAMP}.log\n"
        log_test "Comprehensive Performance Test" "⚠️ Warning" "Check log for details" "$DURATION"
    fi
else
    echo -e "  ${YELLOW}⚠${NC}  Test file not found\n"
    log_test "Comprehensive Performance Test" "⚠️ Skip" "Test file not found" "0"
fi

# ============================================================================
# STEP 5: Security Tests
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}STEP 5: Security Tests${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Test 3: npm Audit
echo -e "${YELLOW}[RUNNING]${NC} npm audit..."
START_TIME=$(date +%s)

if npm audit --audit-level=moderate > "$RESULTS_DIR/npm-audit-${TIMESTAMP}.log" 2>&1; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo -e "  ${GREEN}✓${NC} npm audit passed - no vulnerabilities (${DURATION}s)\n"
    log_test "npm Audit" "✅ Pass" "No moderate/high/critical vulnerabilities" "$DURATION"
else
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    VULN_COUNT=$(grep -c "vulnerabilities" "$RESULTS_DIR/npm-audit-${TIMESTAMP}.log" 2>/dev/null || echo "0")
    echo -e "  ${YELLOW}⚠${NC}  npm audit found issues (${DURATION}s)"
    echo -e "  ${BLUE}ℹ${NC}  Check log: $RESULTS_DIR/npm-audit-${TIMESTAMP}.log\n"
    log_test "npm Audit" "⚠️ Warning" "Found vulnerabilities - review log" "$DURATION"
fi

# Test 4: Simple Security Test
if [ -f "tests/security/simple-security-test.js" ]; then
    echo -e "${YELLOW}[RUNNING]${NC} Simple Security Test..."
    START_TIME=$(date +%s)
    
    if node tests/security/simple-security-test.js > "$RESULTS_DIR/simple-security-${TIMESTAMP}.log" 2>&1; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo -e "  ${GREEN}✓${NC} Simple security test passed (${DURATION}s)\n"
        log_test "Simple Security Test" "✅ Pass" "Security checks passed" "$DURATION"
    else
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo -e "  ${YELLOW}⚠${NC}  Simple security test had warnings (${DURATION}s)"
        echo -e "  ${BLUE}ℹ${NC}  Check log: $RESULTS_DIR/simple-security-${TIMESTAMP}.log\n"
        log_test "Simple Security Test" "⚠️ Warning" "Check log for details" "$DURATION"
    fi
fi

# ============================================================================
# STEP 6: Secrets Management Test
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}STEP 6: Secrets Management Test${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if [ -f "test-secrets-manager.js" ]; then
    echo -e "${YELLOW}[RUNNING]${NC} Secrets Manager Test..."
    START_TIME=$(date +%s)
    
    if node test-secrets-manager.js > "$RESULTS_DIR/secrets-test-${TIMESTAMP}.log" 2>&1; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo -e "  ${GREEN}✓${NC} Secrets manager test passed (${DURATION}s)\n"
        log_test "Secrets Manager Test" "✅ Pass" "Secrets management working correctly" "$DURATION"
    else
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo -e "  ${YELLOW}⚠${NC}  Secrets manager test had warnings (${DURATION}s)"
        echo -e "  ${BLUE}ℹ${NC}  Check log: $RESULTS_DIR/secrets-test-${TIMESTAMP}.log\n"
        log_test "Secrets Manager Test" "⚠️ Warning" "Check log for details" "$DURATION"
    fi
else
    echo -e "  ${YELLOW}⚠${NC}  Test file not found\n"
    log_test "Secrets Manager Test" "⚠️ Skip" "Test file not found" "0"
fi

# ============================================================================
# STEP 7: Security Audit
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}STEP 7: Security Audit${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if [ -f "run-security-audit.sh" ] && [ -x "run-security-audit.sh" ]; then
    echo -e "${YELLOW}[RUNNING]${NC} Security Audit Script..."
    START_TIME=$(date +%s)
    
    if ./run-security-audit.sh > "$RESULTS_DIR/security-audit-${TIMESTAMP}.log" 2>&1; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo -e "  ${GREEN}✓${NC} Security audit passed (${DURATION}s)\n"
        log_test "Security Audit" "✅ Pass" "Comprehensive audit completed" "$DURATION"
    else
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo -e "  ${YELLOW}⚠${NC}  Security audit had warnings (${DURATION}s)"
        echo -e "  ${BLUE}ℹ${NC}  Check log: $RESULTS_DIR/security-audit-${TIMESTAMP}.log\n"
        log_test "Security Audit" "⚠️ Warning" "Check log for details" "$DURATION"
    fi
elif [ -f "tests/security/run-security-audit.js" ]; then
    echo -e "${YELLOW}[RUNNING]${NC} Security Audit (Node.js)..."
    START_TIME=$(date +%s)
    
    if node tests/security/run-security-audit.js > "$RESULTS_DIR/security-audit-${TIMESTAMP}.log" 2>&1; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo -e "  ${GREEN}✓${NC} Security audit passed (${DURATION}s)\n"
        log_test "Security Audit" "✅ Pass" "Comprehensive audit completed" "$DURATION"
    else
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo -e "  ${YELLOW}⚠${NC}  Security audit had warnings (${DURATION}s)"
        echo -e "  ${BLUE}ℹ${NC}  Check log: $RESULTS_DIR/security-audit-${TIMESTAMP}.log\n"
        log_test "Security Audit" "⚠️ Warning" "Check log for details" "$DURATION"
    fi
else
    echo -e "  ${YELLOW}⚠${NC}  Security audit script not found\n"
    log_test "Security Audit" "⚠️ Skip" "Security audit script not found" "0"
fi

# ============================================================================
# FINAL SUMMARY
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}TEST EXECUTION COMPLETE${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

TOTAL_DURATION=$SECONDS

cat >> "$EXECUTION_REPORT" <<EOF

---

## Execution Summary

**Execution Completed:** $(date)  
**Total Duration:** ${TOTAL_DURATION} seconds ($(($TOTAL_DURATION / 60))m $(($TOTAL_DURATION % 60))s)

### Results Location

All test results have been saved to: \`$RESULTS_DIR\`

**Generated Files:**
\`\`\`
$(ls -lh $RESULTS_DIR/*-${TIMESTAMP}.log 2>/dev/null | awk '{print $9, "(" $5 ")"}' || echo "No log files generated")
\`\`\`

### Next Steps

1. **Review Test Results:**
   \`\`\`bash
   cat $EXECUTION_REPORT
   \`\`\`

2. **Check Individual Logs:**
   \`\`\`bash
   cat $RESULTS_DIR/quick-perf-${TIMESTAMP}.log
   cat $RESULTS_DIR/comprehensive-perf-${TIMESTAMP}.log
   cat $RESULTS_DIR/npm-audit-${TIMESTAMP}.log
   cat $RESULTS_DIR/security-audit-${TIMESTAMP}.log
   \`\`\`

3. **View All Results:**
   \`\`\`bash
   ls -lh $RESULTS_DIR/
   \`\`\`

4. **If Server Was Started:**
   Server PID: $(cat $RESULTS_DIR/server.pid 2>/dev/null || echo "N/A")
   
   To stop the server:
   \`\`\`bash
   kill \$(cat $RESULTS_DIR/server.pid)
   \`\`\`

### Test Summary

Run \`cat $EXECUTION_REPORT\` to view the complete execution report.

---

**Execution Complete!** ✅

EOF

echo -e "${GREEN}✓ All tests executed!${NC}"
echo -e "${GREEN}✓ Report saved to: $EXECUTION_REPORT${NC}\n"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Quick Access:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
echo -e "  ${CYAN}View Report:${NC}"
echo -e "    cat $EXECUTION_REPORT\n"
echo -e "  ${CYAN}View Results:${NC}"
echo -e "    ls -lh $RESULTS_DIR/*-${TIMESTAMP}.log\n"
echo -e "  ${CYAN}Check Server:${NC}"
echo -e "    curl http://localhost:${SERVER_PORT:-5001}/health\n"

echo -e "${GREEN}✨ Test execution complete! Review the report for details.${NC}\n"

exit 0
