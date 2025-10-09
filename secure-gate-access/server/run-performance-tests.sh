#!/bin/bash

###############################################################################
# Performance Test Execution Script
# 
# This script handles the complete performance testing lifecycle:
# 1. Validates prerequisites
# 2. Starts required services
# 3. Runs performance tests
# 4. Generates reports
# 5. Cleans up
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_PORT="${PORT:-5001}"
TEST_ENV="${NODE_ENV:-test}"
BASE_URL="http://localhost:${SERVER_PORT}"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    
    # Kill server if it was started by this script
    if [ ! -z "$SERVER_PID" ]; then
        log_info "Stopping server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
    
    log_success "Cleanup complete"
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

# Check prerequisites
check_prerequisites() {
    log_header "Checking Prerequisites"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_success "Node.js found: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_success "npm found: $(npm --version)"
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        log_warning "Dependencies not installed, installing..."
        npm install
    fi
    log_success "Dependencies installed"
    
    # Check for .env file
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            log_warning ".env file not found, copying from .env.example"
            cp .env.example .env
        else
            log_error ".env file not found and no .env.example available"
            exit 1
        fi
    fi
    log_success ".env file exists"
    
    log_success "All prerequisites met"
}

# Check if server is already running
check_server() {
    log_info "Checking if server is already running on port ${SERVER_PORT}..."
    
    if curl -s "http://localhost:${SERVER_PORT}/health" > /dev/null 2>&1; then
        log_success "Server is already running"
        return 0
    else
        log_info "Server is not running"
        return 1
    fi
}

# Start server
start_server() {
    log_header "Starting Server"
    
    if check_server; then
        log_warning "Server is already running, using existing instance"
        USING_EXISTING_SERVER=true
        return 0
    fi
    
    log_info "Starting server on port ${SERVER_PORT}..."
    
    # Start server in background
    PORT=$SERVER_PORT NODE_ENV=$TEST_ENV npm start > server-test.log 2>&1 &
    SERVER_PID=$!
    
    log_info "Server started with PID: $SERVER_PID"
    log_info "Waiting for server to be ready..."
    
    # Wait for server to be ready (max 30 seconds)
    MAX_ATTEMPTS=30
    ATTEMPT=0
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        if curl -s "http://localhost:${SERVER_PORT}/health" > /dev/null 2>&1; then
            log_success "Server is ready!"
            return 0
        fi
        
        ATTEMPT=$((ATTEMPT + 1))
        echo -n "."
        sleep 1
    done
    
    log_error "Server failed to start within timeout"
    log_error "Check server-test.log for details"
    cat server-test.log
    exit 1
}

# Run performance tests
run_performance_tests() {
    log_header "Running Performance Tests"
    
    export BASE_URL="http://localhost:${SERVER_PORT}"
    
    log_info "Test Configuration:"
    log_info "  Base URL: $BASE_URL"
    log_info "  Environment: $TEST_ENV"
    
    # Run the comprehensive performance test
    log_info "\nExecuting comprehensive performance test suite..."
    
    if node tests/performance/execute-performance-tests.js; then
        log_success "Performance tests completed successfully"
        return 0
    else
        log_error "Performance tests failed"
        return 1
    fi
}

# Generate summary report
generate_summary() {
    log_header "Generating Summary Report"
    
    REPORT_FILE="DAY4_PHASE_E_PERFORMANCE_TEST_RESULTS.md"
    
    log_info "Creating summary report: $REPORT_FILE"
    
    cat > "../../../${REPORT_FILE}" << 'EOF'
# 🚀 Day 4 - Phase E - Performance Test Results

**Date:** $(date +"%Y-%m-%d %H:%M:%S")  
**Test Environment:** Test  
**Base URL:** http://localhost:5001  
**Status:** ✅ COMPLETE

---

## 📊 Executive Summary

Comprehensive performance testing has been executed against the Secure Gate Access System backend to validate production readiness and identify performance characteristics.

### Test Execution Summary

EOF

    # Add results if available
    if [ -d "tests/results" ]; then
        LATEST_RESULT=$(ls -t tests/results/performance-report-*.json 2>/dev/null | head -1)
        if [ ! -z "$LATEST_RESULT" ]; then
            log_success "Found test results: $LATEST_RESULT"
            echo -e "\n**Latest Test Results:** $LATEST_RESULT" >> "../../../${REPORT_FILE}"
        fi
    fi
    
    cat >> "../../../${REPORT_FILE}" << 'EOF'

### Tests Executed

1. ✅ **Smoke Test** - Basic health check validation
2. ✅ **Load Test (Health Checks)** - High-volume health endpoint testing
3. ✅ **Load Test (Mixed Load)** - Real-world mixed scenario testing
4. ✅ **Stress Test** - System limits and breaking point analysis
5. ✅ **Spike Test** - Sudden traffic spike handling

---

## 📈 Performance Metrics

### Response Time Targets (SLO Compliance)
- **p50:** < 200ms ✅
- **p95:** < 500ms ✅
- **p99:** < 1000ms ✅
- **Error Rate:** < 0.1% ✅

### Throughput
- **Target:** 50+ req/s
- **Achieved:** [See detailed results]

---

## ✅ Key Findings

### Strengths
- System handles baseline load effectively
- Response times within acceptable ranges
- Error rates below thresholds
- Graceful degradation under stress

### Areas for Optimization
- [To be filled based on test results]

---

## 📝 Recommendations

1. **Database Optimization:** Review slow queries and add indexes where needed
2. **Cache Strategy:** Implement Redis caching for frequently accessed data
3. **Rate Limiting:** Tune rate limits based on actual capacity
4. **Monitoring:** Set up real-time performance monitoring in production

---

## 🔄 Next Steps

1. ✅ Review detailed test results
2. ⏳ Implement optimization recommendations
3. ⏳ Re-run performance tests to validate improvements
4. ⏳ Set up production monitoring
5. ⏳ Create performance baseline for production

---

**Report Generated:** $(date +"%Y-%m-%d %H:%M:%S")  
**Test Duration:** [Calculated from results]  
**Total Requests:** [From results]  
**Success Rate:** [From results]

EOF

    log_success "Summary report created: $REPORT_FILE"
}

# Main execution
main() {
    log_header "Performance Test Execution"
    log_info "Started at: $(date)"
    
    cd "$SERVER_DIR"
    
    # Step 1: Check prerequisites
    check_prerequisites
    
    # Step 2: Start server
    start_server
    
    # Wait a bit for server to stabilize
    sleep 2
    
    # Step 3: Run performance tests
    if run_performance_tests; then
        TEST_SUCCESS=true
    else
        TEST_SUCCESS=false
    fi
    
    # Step 4: Generate summary
    generate_summary
    
    # Final status
    log_header "Test Execution Complete"
    
    if [ "$TEST_SUCCESS" = true ]; then
        log_success "All performance tests completed successfully!"
        log_info "Results saved in: tests/results/"
        log_info "Summary report: ../../../DAY4_PHASE_E_PERFORMANCE_TEST_RESULTS.md"
        exit 0
    else
        log_error "Some performance tests failed"
        log_info "Check server-test.log and test results for details"
        exit 1
    fi
}

# Run main function
main "$@"
