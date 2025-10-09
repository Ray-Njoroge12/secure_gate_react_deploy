#!/bin/bash

################################################################################
# PRODUCTION READINESS - VALIDATION AND EXECUTION
# 
# This script validates the system state and executes production readiness tests
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="/Users/raynj/Desktop/secure-gate-react-express"
SERVER_DIR="$PROJECT_ROOT/secure-gate-access/server"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$PROJECT_ROOT/VALIDATION_EXECUTION_REPORT_${TIMESTAMP}.md"

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}PRODUCTION READINESS VALIDATION${NC}"
echo -e "${BLUE}=================================${NC}\n"

# Create report header
cat > "$REPORT_FILE" <<EOF
# Production Readiness Validation and Execution Report
Generated: $(date)
Executor: \$USER
System: $(uname -s)

## Executive Summary

This report documents the validation and execution of all production readiness tasks.

---

## 1. Pre-Flight System Validation

EOF

echo -e "${YELLOW}Step 1: Validating System Prerequisites...${NC}"

# Check Docker
echo -n "  ✓ Docker: "
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}$DOCKER_VERSION${NC}"
    echo "- Docker: ✅ $DOCKER_VERSION" >> "$REPORT_FILE"
else
    echo -e "${RED}NOT INSTALLED${NC}"
    echo "- Docker: ❌ NOT INSTALLED" >> "$REPORT_FILE"
fi

# Check Node.js
echo -n "  ✓ Node.js: "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}$NODE_VERSION${NC}"
    echo "- Node.js: ✅ $NODE_VERSION" >> "$REPORT_FILE"
else
    echo -e "${RED}NOT INSTALLED${NC}"
    echo "- Node.js: ❌ NOT INSTALLED" >> "$REPORT_FILE"
fi

# Check npm
echo -n "  ✓ npm: "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}v$NPM_VERSION${NC}"
    echo "- npm: ✅ v$NPM_VERSION" >> "$REPORT_FILE"
else
    echo -e "${RED}NOT INSTALLED${NC}"
    echo "- npm: ❌ NOT INSTALLED" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "## 2. Project Structure Validation" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo -e "\n${YELLOW}Step 2: Validating Project Structure...${NC}"

# Key directories
DIRS=(
    "$SERVER_DIR"
    "$SERVER_DIR/src"
    "$SERVER_DIR/tests"
    "$SERVER_DIR/tests/performance"
    "$SERVER_DIR/tests/security"
)

for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "  ✓ ${GREEN}$(basename $dir)/${NC}"
        echo "- ✅ $(basename $dir)/" >> "$REPORT_FILE"
    else
        echo -e "  ✗ ${RED}$(basename $dir)/ - MISSING${NC}"
        echo "- ❌ $(basename $dir)/ - MISSING" >> "$REPORT_FILE"
    fi
done

echo "" >> "$REPORT_FILE"
echo "## 3. Critical Files Validation" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo -e "\n${YELLOW}Step 3: Validating Critical Files...${NC}"

# Key files
FILES=(
    "$SERVER_DIR/package.json:Package Config"
    "$SERVER_DIR/.env:Environment Config"
    "$SERVER_DIR/src/services/secretsManagerService.js:Secrets Manager Service"
    "$SERVER_DIR/src/config/environment.js:Environment Config"
    "$SERVER_DIR/migrate-secrets-to-aws.sh:Secrets Migration Script"
    "$SERVER_DIR/run-security-audit.sh:Security Audit Script"
    "$SERVER_DIR/test-secrets-manager.js:Secrets Manager Tests"
)

for file_entry in "${FILES[@]}"; do
    IFS=':' read -r file desc <<< "$file_entry"
    if [ -f "$file" ]; then
        echo -e "  ✓ ${GREEN}$desc${NC}"
        echo "- ✅ $desc" >> "$REPORT_FILE"
    else
        echo -e "  ✗ ${RED}$desc - MISSING${NC}"
        echo "- ❌ $desc - MISSING" >> "$REPORT_FILE"
    fi
done

echo "" >> "$REPORT_FILE"
echo "## 4. Docker Services Status" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo -e "\n${YELLOW}Step 4: Checking Docker Services...${NC}"

if docker ps &> /dev/null; then
    RUNNING_CONTAINERS=$(docker ps --format "{{.Names}}" | wc -l | tr -d ' ')
    echo -e "  ✓ Running containers: ${GREEN}$RUNNING_CONTAINERS${NC}"
    echo "- Running containers: $RUNNING_CONTAINERS" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" >> "$REPORT_FILE"
else
    echo -e "  ✗ ${RED}Docker is not running${NC}"
    echo "- ❌ Docker is not running" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "## 5. Performance Test Files" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo -e "\n${YELLOW}Step 5: Validating Performance Test Files...${NC}"

PERF_TESTS=(
    "$SERVER_DIR/tests/performance/quick-health-check.test.js:Quick Health Check"
    "$SERVER_DIR/tests/performance/comprehensive-api-tests.test.js:Comprehensive API Tests"
    "$SERVER_DIR/tests/performance/load-test.js:K6 Load Test"
    "$SERVER_DIR/tests/performance/stress-test.js:K6 Stress Test"
    "$SERVER_DIR/tests/performance/spike-test.js:K6 Spike Test"
)

PERF_COUNT=0
for test_entry in "${PERF_TESTS[@]}"; do
    IFS=':' read -r test desc <<< "$test_entry"
    if [ -f "$test" ]; then
        echo -e "  ✓ ${GREEN}$desc${NC}"
        echo "- ✅ $desc" >> "$REPORT_FILE"
        ((PERF_COUNT++))
    else
        echo -e "  ✗ ${RED}$desc - MISSING${NC}"
        echo "- ❌ $desc - MISSING" >> "$REPORT_FILE"
    fi
done

echo -e "\n${BLUE}Performance Tests Found: $PERF_COUNT/${#PERF_TESTS[@]}${NC}"

echo "" >> "$REPORT_FILE"
echo "## 6. Security Test Files" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo -e "\n${YELLOW}Step 6: Validating Security Test Files...${NC}"

SEC_TESTS=(
    "$SERVER_DIR/tests/security/audit.test.js:Security Audit"
    "$SERVER_DIR/tests/security/owasp-top10.test.js:OWASP Top 10"
)

SEC_COUNT=0
for test_entry in "${SEC_TESTS[@]}"; do
    IFS=':' read -r test desc <<< "$test_entry"
    if [ -f "$test" ]; then
        echo -e "  ✓ ${GREEN}$desc${NC}"
        echo "- ✅ $desc" >> "$REPORT_FILE"
        ((SEC_COUNT++))
    else
        echo -e "  ✗ ${RED}$desc - MISSING${NC}"
        echo "- ❌ $desc - MISSING" >> "$REPORT_FILE"
    fi
done

echo -e "\n${BLUE}Security Tests Found: $SEC_COUNT/${#SEC_TESTS[@]}${NC}"

echo "" >> "$REPORT_FILE"
echo "## 7. NPM Dependencies" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo -e "\n${YELLOW}Step 7: Checking NPM Dependencies...${NC}"

cd "$SERVER_DIR"
if [ -d "node_modules" ]; then
    MODULE_COUNT=$(ls -1 node_modules | wc -l | tr -d ' ')
    echo -e "  ✓ ${GREEN}node_modules exists ($MODULE_COUNT packages)${NC}"
    echo "- ✅ node_modules exists ($MODULE_COUNT packages)" >> "$REPORT_FILE"
else
    echo -e "  ✗ ${RED}node_modules not found - running npm install...${NC}"
    echo "- ⚠️ node_modules not found - installing..." >> "$REPORT_FILE"
    npm install --silent
fi

echo "" >> "$REPORT_FILE"
echo "## 8. Test Execution Readiness" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo -e "\n${YELLOW}Step 8: Determining Test Execution Readiness...${NC}"

READY=true
ISSUES=()

# Check if we can proceed
if [ $PERF_COUNT -lt ${#PERF_TESTS[@]} ]; then
    ISSUES+=("Missing performance test files")
    READY=false
fi

if [ $SEC_COUNT -lt ${#SEC_TESTS[@]} ]; then
    ISSUES+=("Missing security test files")
    READY=false
fi

if ! [ -d "$SERVER_DIR/node_modules" ]; then
    ISSUES+=("Node modules not installed")
    READY=false
fi

if [ ${#ISSUES[@]} -eq 0 ]; then
    echo -e "  ${GREEN}✓ System is READY for test execution${NC}"
    echo "- ✅ **System is READY for test execution**" >> "$REPORT_FILE"
else
    echo -e "  ${RED}✗ System is NOT READY${NC}"
    echo "- ❌ **System is NOT READY**" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "### Issues Found:" >> "$REPORT_FILE"
    for issue in "${ISSUES[@]}"; do
        echo "  - $issue"
        echo "- $issue" >> "$REPORT_FILE"
    done
fi

echo "" >> "$REPORT_FILE"
echo "## 9. Quick Health Check Execution" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ "$READY" = true ]; then
    echo -e "\n${YELLOW}Step 9: Running Quick Health Check...${NC}"
    
    cd "$SERVER_DIR"
    
    # Check if server is running
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "  ✓ ${GREEN}Server is responding${NC}"
        echo "- ✅ Server is responding at http://localhost:3000" >> "$REPORT_FILE"
        
        # Run quick test
        echo -e "\n  ${BLUE}Running quick performance test...${NC}"
        if npm test -- tests/performance/quick-health-check.test.js > /tmp/quick-test.log 2>&1; then
            echo -e "  ✓ ${GREEN}Quick test PASSED${NC}"
            echo "- ✅ Quick health check test PASSED" >> "$REPORT_FILE"
        else
            echo -e "  ✗ ${YELLOW}Quick test had issues (check logs)${NC}"
            echo "- ⚠️ Quick health check test had issues" >> "$REPORT_FILE"
        fi
    else
        echo -e "  ✗ ${YELLOW}Server is not responding${NC}"
        echo "- ⚠️ Server is not responding at http://localhost:3000" >> "$REPORT_FILE"
        echo "- Start the server with: \`docker-compose up -d\` or \`npm start\`" >> "$REPORT_FILE"
    fi
else
    echo -e "\n${YELLOW}Step 9: Skipped (system not ready)${NC}"
    echo "- ⚠️ Skipped - system not ready" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "## 10. Summary and Next Steps" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo -e "\n${BLUE}=================================${NC}"
echo -e "${BLUE}VALIDATION COMPLETE${NC}"
echo -e "${BLUE}=================================${NC}\n"

if [ "$READY" = true ]; then
    echo -e "${GREEN}✓ System is ready for production readiness testing${NC}\n"
    echo "**Status: ✅ READY**" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "### Next Steps:" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "1. **Start Services** (if not running):" >> "$REPORT_FILE"
    echo "   \`\`\`bash" >> "$REPORT_FILE"
    echo "   cd $SERVER_DIR" >> "$REPORT_FILE"
    echo "   docker-compose up -d" >> "$REPORT_FILE"
    echo "   \`\`\`" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "2. **Run Full Test Suite**:" >> "$REPORT_FILE"
    echo "   \`\`\`bash" >> "$REPORT_FILE"
    echo "   ./execute-production-readiness.sh --full" >> "$REPORT_FILE"
    echo "   \`\`\`" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "3. **Run Individual Test Categories**:" >> "$REPORT_FILE"
    echo "   - Performance: \`npm test -- tests/performance/\`" >> "$REPORT_FILE"
    echo "   - Security: \`./run-security-audit.sh\`" >> "$REPORT_FILE"
    echo "   - Secrets: \`node test-secrets-manager.js\`" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "4. **Review Results** in:" >> "$REPORT_FILE"
    echo "   - \`tests/results/\`" >> "$REPORT_FILE"
    echo "   - Console output" >> "$REPORT_FILE"
    echo "   - This validation report" >> "$REPORT_FILE"
    
    echo -e "Next Steps:"
    echo -e "  1. Ensure services are running: ${BLUE}docker-compose up -d${NC}"
    echo -e "  2. Execute full test suite: ${BLUE}./execute-production-readiness.sh --full${NC}"
    echo -e "  3. Review results in tests/results/"
else
    echo -e "${RED}✗ System requires attention before testing${NC}\n"
    echo "**Status: ❌ NOT READY**" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "### Required Actions:" >> "$REPORT_FILE"
    for issue in "${ISSUES[@]}"; do
        echo "- [ ] Fix: $issue" >> "$REPORT_FILE"
    done
    
    echo -e "Required Actions:"
    for issue in "${ISSUES[@]}"; do
        echo -e "  ${RED}✗${NC} Fix: $issue"
    done
fi

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Report generated:** $(date)" >> "$REPORT_FILE"
echo "**Report location:** \`$REPORT_FILE\`" >> "$REPORT_FILE"

echo -e "\n${GREEN}Report saved to:${NC} $REPORT_FILE\n"

exit 0
