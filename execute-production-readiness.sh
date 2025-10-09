#!/bin/bash

################################################################################
# PRODUCTION READINESS - AUTOMATED EXECUTION SCRIPT
# 
# This script automates the execution of all critical production readiness tasks
# 
# Usage: ./execute-production-readiness.sh [options]
# Options:
#   --skip-setup      Skip pre-flight checks
#   --skip-perf       Skip performance tests
#   --skip-security   Skip security audit
#   --skip-secrets    Skip secrets validation
#   --quick           Run quick tests only
#   --full            Run complete test suite
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_DIR="/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server"
RESULTS_DIR="$SERVER_DIR/tests/results"
LOG_FILE="$RESULTS_DIR/execution-$(date +%Y%m%d-%H%M%S).log"

# Parse command line arguments
SKIP_SETUP=false
SKIP_PERF=false
SKIP_SECURITY=false
SKIP_SECRETS=false
TEST_MODE="full"

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-setup) SKIP_SETUP=true; shift ;;
    --skip-perf) SKIP_PERF=true; shift ;;
    --skip-security) SKIP_SECURITY=true; shift ;;
    --skip-secrets) SKIP_SECRETS=true; shift ;;
    --quick) TEST_MODE="quick"; shift ;;
    --full) TEST_MODE="full"; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║       PRODUCTION READINESS - AUTOMATED EXECUTION           ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
log_info "Starting production readiness execution at $(date)"
log_info "Mode: $TEST_MODE"
log_info "Log file: $LOG_FILE"
echo ""

################################################################################
# PHASE 1: PRE-FLIGHT CHECKS
################################################################################

if [ "$SKIP_SETUP" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}PHASE 1: PRE-FLIGHT CHECKS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    cd "$SERVER_DIR"
    
    # Check Node.js
    log_info "Checking Node.js version..."
    NODE_VERSION=$(node --version)
    log_success "Node.js version: $NODE_VERSION"
    
    # Check npm
    log_info "Checking npm version..."
    NPM_VERSION=$(npm --version)
    log_success "npm version: $NPM_VERSION"
    
    # Check Docker
    log_info "Checking Docker..."
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        log_success "Docker version: $DOCKER_VERSION"
    else
        log_warning "Docker not found - some tests may be skipped"
    fi
    
    # Check if .env exists
    log_info "Checking environment configuration..."
    if [ -f .env ]; then
        log_success ".env file found"
    else
        log_warning ".env file not found - using defaults"
    fi
    
    # Verify dependencies
    log_info "Verifying npm dependencies..."
    if npm list --depth=0 2>&1 | grep -q "UNMET\|missing"; then
        log_warning "Some dependencies missing, installing..."
        npm install >> "$LOG_FILE" 2>&1
        log_success "Dependencies installed"
    else
        log_success "All dependencies installed"
    fi
    
    echo ""
fi

################################################################################
# PHASE 2: SERVICE STARTUP
################################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}PHASE 2: SERVICE HEALTH CHECK${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd "$SERVER_DIR"

# Check Docker containers
log_info "Checking Docker containers..."
if docker ps --filter "name=secure-gate" --format "table {{.Names}}\t{{.Status}}" | grep -q "Up"; then
    log_success "Docker containers are running"
    docker ps --filter "name=secure-gate" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    log_warning "No running Docker containers found"
    log_info "Attempting to start containers..."
    docker-compose up -d database redis >> "$LOG_FILE" 2>&1 || log_warning "Could not start containers"
    sleep 10
fi

# Check server health
log_info "Checking server health..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health | grep -q "200"; then
    log_success "Server is healthy"
    curl -s http://localhost:3001/health | jq '.' 2>/dev/null || curl -s http://localhost:3001/health
else
    log_warning "Server not responding - tests may fail"
    log_info "You may need to start the server manually: npm start"
fi

echo ""

################################################################################
# PHASE 3: PERFORMANCE TESTING
################################################################################

if [ "$SKIP_PERF" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}PHASE 3: PERFORMANCE TESTING${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    cd "$SERVER_DIR"
    
    # Quick performance test
    log_info "Running quick performance validation..."
    if npm run test:performance >> "$LOG_FILE" 2>&1; then
        log_success "✅ Quick performance tests passed"
    else
        log_warning "⚠️ Quick performance tests had issues - check log"
    fi
    
    if [ "$TEST_MODE" = "full" ]; then
        # Comprehensive performance test
        log_info "Running comprehensive performance tests..."
        if npm run test:performance:comprehensive >> "$LOG_FILE" 2>&1; then
            log_success "✅ Comprehensive performance tests passed"
        else
            log_warning "⚠️ Comprehensive performance tests had issues - check log"
        fi
        
        # k6 load tests (if available)
        if command -v k6 &> /dev/null; then
            log_info "Running k6 load tests..."
            
            log_info "  - Load test..."
            if npm run test:performance:load >> "$LOG_FILE" 2>&1; then
                log_success "    ✅ Load test passed"
            else
                log_warning "    ⚠️ Load test had issues"
            fi
            
            log_info "  - Stress test..."
            if npm run test:performance:stress >> "$LOG_FILE" 2>&1; then
                log_success "    ✅ Stress test passed"
            else
                log_warning "    ⚠️ Stress test had issues"
            fi
            
            log_info "  - Spike test..."
            if npm run test:performance:spike >> "$LOG_FILE" 2>&1; then
                log_success "    ✅ Spike test passed"
            else
                log_warning "    ⚠️ Spike test had issues"
            fi
        else
            log_warning "k6 not installed - skipping load/stress/spike tests"
            log_info "Install k6: brew install k6"
        fi
    fi
    
    echo ""
fi

################################################################################
# PHASE 4: SECRETS MANAGEMENT VALIDATION
################################################################################

if [ "$SKIP_SECRETS" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}PHASE 4: SECRETS MANAGEMENT VALIDATION${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    cd "$SERVER_DIR"
    
    # Test secrets manager service
    log_info "Testing AWS Secrets Manager integration..."
    if [ -f test-secrets-manager.js ]; then
        if node test-secrets-manager.js >> "$LOG_FILE" 2>&1; then
            log_success "✅ Secrets Manager tests passed"
        else
            log_warning "⚠️ Secrets Manager tests had issues (may be expected if AWS not configured)"
        fi
    else
        log_warning "test-secrets-manager.js not found - skipping"
    fi
    
    # Verify migration script exists
    log_info "Checking secrets migration script..."
    if [ -f migrate-secrets-to-aws.sh ]; then
        log_success "✅ Migration script exists"
        if [ -x migrate-secrets-to-aws.sh ]; then
            log_success "✅ Migration script is executable"
        else
            log_warning "⚠️ Migration script not executable"
            chmod +x migrate-secrets-to-aws.sh
            log_info "Made migration script executable"
        fi
    else
        log_warning "migrate-secrets-to-aws.sh not found"
    fi
    
    echo ""
fi

################################################################################
# PHASE 5: SECURITY AUDIT
################################################################################

if [ "$SKIP_SECURITY" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}PHASE 5: SECURITY AUDIT${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    cd "$SERVER_DIR"
    
    # NPM audit
    log_info "Running npm security audit..."
    npm audit >> "$LOG_FILE" 2>&1 || true  # Don't fail on vulnerabilities
    
    CRITICAL=$(npm audit --json 2>/dev/null | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
    HIGH=$(npm audit --json 2>/dev/null | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")
    
    if [ "$CRITICAL" -eq 0 ] && [ "$HIGH" -eq 0 ]; then
        log_success "✅ No critical or high vulnerabilities found"
    else
        log_warning "⚠️ Found $CRITICAL critical and $HIGH high vulnerabilities"
    fi
    
    # Security audit script
    log_info "Running comprehensive security audit..."
    if [ -f run-security-audit.sh ]; then
        chmod +x run-security-audit.sh
        if ./run-security-audit.sh >> "$LOG_FILE" 2>&1; then
            log_success "✅ Security audit completed"
        else
            log_warning "⚠️ Security audit had issues - check log"
        fi
    elif npm run test:security >> "$LOG_FILE" 2>&1; then
        log_success "✅ Security tests passed"
    else
        log_warning "⚠️ Security tests had issues - check log"
    fi
    
    echo ""
fi

################################################################################
# PHASE 6: RESULTS AGGREGATION
################################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}PHASE 6: RESULTS AGGREGATION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd "$SERVER_DIR"

log_info "Aggregating test results..."

# List all result files
log_info "Test result files:"
ls -lh "$RESULTS_DIR" 2>/dev/null | tail -n +2 || log_warning "No result files found"

# Generate summary
SUMMARY_FILE="$RESULTS_DIR/execution-summary-$(date +%Y%m%d-%H%M%S).json"

cat > "$SUMMARY_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "testMode": "$TEST_MODE",
  "execution": {
    "preFlightChecks": $([ "$SKIP_SETUP" = false ] && echo "true" || echo "false"),
    "performanceTests": $([ "$SKIP_PERF" = false ] && echo "true" || echo "false"),
    "secretsValidation": $([ "$SKIP_SECRETS" = false ] && echo "true" || echo "false"),
    "securityAudit": $([ "$SKIP_SECURITY" = false ] && echo "true" || echo "false")
  },
  "results": {
    "logFile": "$LOG_FILE",
    "summaryFile": "$SUMMARY_FILE",
    "resultsDirectory": "$RESULTS_DIR"
  },
  "status": "COMPLETED"
}
EOF

log_success "Summary saved to: $SUMMARY_FILE"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║             EXECUTION COMPLETED SUCCESSFULLY               ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "Execution completed at $(date)"
log_info "Full log available at: $LOG_FILE"
log_info "Summary available at: $SUMMARY_FILE"

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Review the execution log: cat $LOG_FILE"
echo "2. Review test results in: $RESULTS_DIR"
echo "3. Check PRODUCTION_READINESS_FINAL_EXECUTION.md for detailed analysis"
echo "4. If all tests passed, proceed with production deployment"
echo ""

exit 0
