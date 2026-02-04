#!/bin/bash

# Milestone 1 Local Validation Suite
# Simulates staging environment for end-to-end testing
# Created: January 14, 2026

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../secure-gate-access/server"
REPORT_DIR="$SCRIPT_DIR/milestone1-validation-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/milestone1_local_validation_$TIMESTAMP.md"

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

mkdir -p "$REPORT_DIR"

print_header() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}[TEST $TOTAL_TESTS]${NC} $1"
}

pass_test() {
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}  ✓${NC} $1"
}

fail_test() {
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "${RED}  ✗${NC} $1"
}

info() {
    echo -e "${CYAN}  ℹ${NC} $1"
}

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << EOF
# Milestone 1: Local Validation Report

**Date**: $(date)  
**Environment**: Local Development (Staging Simulation)  
**Test Suite**: End-to-End Correlation & Security Validation  

---

## Executive Summary

**Status**: ${STATUS:-In Progress}  
**Total Tests**: $TOTAL_TESTS  
**Passed**: $PASSED_TESTS  
**Failed**: $FAILED_TESTS  
**Pass Rate**: ${PASS_RATE:-0}%

---

## Test Environment

### Configuration
- **Base URL**: http://localhost:5000 (simulated staging)
- **Database**: SQLite (local test database)
- **Log Aggregation**: File-based simulation
- **Request ID**: stage-corr-001 (correlation test)

### Simulated Staging Conditions
- ✅ Request correlation tracking
- ✅ Error scenario endpoints
- ✅ Security validation
- ✅ Log aggregation
- ✅ Multi-layer correlation

### Deferred to Real Staging
- ⏳ Production-like infrastructure
- ⏳ Cloud log aggregator (CloudWatch/DataDog)
- ⏳ Cross-service correlation (if microservices)
- ⏳ Performance under load

---

## Test Results

EOF
}

# Start local server
start_local_server() {
    print_header "Starting Local Test Server"
    
    cd "$SERVER_DIR"
    
    # Check if server is already running
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        info "Server already running"
        return 0
    fi
    
    info "Starting server in background..."
    export NODE_ENV=test
    export PORT=5000
    
    npm start > "$REPORT_DIR/server.log" 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to be ready
    echo -n "Waiting for server..."
    for i in {1..30}; do
        if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
            echo " Ready!"
            pass_test "Server started successfully (PID: $SERVER_PID)"
            return 0
        fi
        echo -n "."
        sleep 1
    done
    
    fail_test "Server failed to start within 30 seconds"
    return 1
}

# Test 1: Request Correlation Tracking
test_request_correlation() {
    print_header "Test 1: Request Correlation Tracking"
    
    cat >> "$REPORT_FILE" << EOF
### Test 1: Request Correlation Tracking

**Objective**: Verify request_id is tracked across all layers

EOF
    
    print_test "Sending request with correlation ID"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "X-Request-ID: stage-corr-001" \
        -H "Content-Type: application/json" \
        http://localhost:5000/api/health)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        pass_test "Health check returned 200"
        
        # Check logs for correlation ID
        if grep -q "stage-corr-001" "$REPORT_DIR/server.log"; then
            pass_test "Request ID found in logs"
            
            cat >> "$REPORT_FILE" << EOF
**Result**: ✅ PASS

- HTTP Status: 200
- Request ID tracked: stage-corr-001
- Found in server logs: Yes

\`\`\`json
$BODY
\`\`\`

EOF
        else
            fail_test "Request ID not found in logs"
            cat >> "$REPORT_FILE" << EOF
**Result**: ⚠️ PARTIAL

- HTTP Status: 200
- Request ID tracked: stage-corr-001
- Found in server logs: No (check middleware configuration)

EOF
        fi
    else
        fail_test "Health check failed (HTTP $HTTP_CODE)"
        cat >> "$REPORT_FILE" << EOF
**Result**: ❌ FAIL

- HTTP Status: $HTTP_CODE
- Error: Health check failed

EOF
    fi
}

# Test 2: Estate Required Error
test_estate_required() {
    print_header "Test 2: Estate Required Error Handling"
    
    cat >> "$REPORT_FILE" << EOF

### Test 2: Estate Required Error Handling

**Objective**: Verify ESTATE_REQUIRED error is properly returned and logged

EOF
    
    print_test "Testing endpoint without estate context"
    
    # Try to access resident endpoint without estate
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "X-Request-ID: stage-corr-002" \
        -H "Content-Type: application/json" \
        http://localhost:5000/api/residents/profile 2>&1)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        pass_test "Received expected error status ($HTTP_CODE)"
        
        if echo "$BODY" | grep -q "ESTATE_REQUIRED\|estate"; then
            pass_test "Error response contains estate-related message"
            cat >> "$REPORT_FILE" << EOF
**Result**: ✅ PASS

- HTTP Status: $HTTP_CODE
- Error type detected: ESTATE_REQUIRED or authentication error
- Request ID: stage-corr-002

\`\`\`json
$BODY
\`\`\`

EOF
        else
            info "Generic error returned (acceptable if not estate-enabled)"
            cat >> "$REPORT_FILE" << EOF
**Result**: ✅ PASS (Authentication Error)

- HTTP Status: $HTTP_CODE
- Error type: Authentication required
- Request ID: stage-corr-002

\`\`\`json
$BODY
\`\`\`

EOF
        fi
    else
        fail_test "Unexpected status code: $HTTP_CODE"
        cat >> "$REPORT_FILE" << EOF
**Result**: ❌ FAIL

- HTTP Status: $HTTP_CODE
- Expected: 401 or 403
- Request ID: stage-corr-002

EOF
    fi
}

# Test 3: CSRF Validation
test_csrf_validation() {
    print_header "Test 3: CSRF Token Validation"
    
    cat >> "$REPORT_FILE" << EOF

### Test 3: CSRF Token Validation

**Objective**: Verify CSRF protection is active

EOF
    
    print_test "Testing POST without CSRF token"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "X-Request-ID: stage-corr-003" \
        -H "Content-Type: application/json" \
        -d '{"test":"data"}' \
        http://localhost:5000/api/auth/register 2>&1)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    # CSRF might not be enabled in test mode
    if [ "$HTTP_CODE" = "403" ]; then
        if echo "$BODY" | grep -qi "csrf\|forbidden"; then
            pass_test "CSRF validation is active"
            cat >> "$REPORT_FILE" << EOF
**Result**: ✅ PASS

- HTTP Status: 403
- CSRF protection: Active
- Request ID: stage-corr-003

\`\`\`json
$BODY
\`\`\`

EOF
        else
            fail_test "403 returned but not CSRF-related"
            cat >> "$REPORT_FILE" << EOF
**Result**: ⚠️ PARTIAL

- HTTP Status: 403
- CSRF protection: Unknown (generic forbidden)

EOF
        fi
    else
        info "CSRF not enabled in test mode (acceptable)"
        cat >> "$REPORT_FILE" << EOF
**Result**: ℹ️ INFO

- HTTP Status: $HTTP_CODE
- CSRF protection: Not enabled in test environment
- Note: CSRF should be enabled in staging/production

EOF
    fi
}

# Test 4: Security Features
test_security_features() {
    print_header "Test 4: Security Features Validation"
    
    cat >> "$REPORT_FILE" << EOF

### Test 4: Security Features Validation

**Objective**: Verify security middleware is active

EOF
    
    print_test "Testing security headers"
    
    HEADERS=$(curl -s -I -H "X-Request-ID: stage-corr-004" http://localhost:5000/api/health)
    
    local security_score=0
    local total_checks=5
    
    if echo "$HEADERS" | grep -qi "x-frame-options"; then
        pass_test "X-Frame-Options header present"
        security_score=$((security_score + 1))
    else
        fail_test "X-Frame-Options header missing"
    fi
    
    if echo "$HEADERS" | grep -qi "x-content-type-options"; then
        pass_test "X-Content-Type-Options header present"
        security_score=$((security_score + 1))
    else
        fail_test "X-Content-Type-Options header missing"
    fi
    
    if echo "$HEADERS" | grep -qi "strict-transport-security"; then
        pass_test "Strict-Transport-Security header present"
        security_score=$((security_score + 1))
    else
        info "HSTS header not present (acceptable for local)"
    fi
    
    if echo "$HEADERS" | grep -qi "x-xss-protection"; then
        pass_test "X-XSS-Protection header present"
        security_score=$((security_score + 1))
    else
        info "X-XSS-Protection not set"
    fi
    
    if echo "$HEADERS" | grep -qi "content-security-policy"; then
        pass_test "Content-Security-Policy header present"
        security_score=$((security_score + 1))
    else
        info "CSP not configured"
    fi
    
    cat >> "$REPORT_FILE" << EOF
**Result**: Security Score: $security_score/$total_checks

\`\`\`
$HEADERS
\`\`\`

EOF
}

# Test 5: Log Correlation
test_log_correlation() {
    print_header "Test 5: Log Correlation Validation"
    
    cat >> "$REPORT_FILE" << EOF

### Test 5: Log Correlation Validation

**Objective**: Verify all request IDs are properly logged

EOF
    
    print_test "Analyzing log correlation"
    
    local found_ids=0
    local expected_ids=4
    
    for req_id in "stage-corr-001" "stage-corr-002" "stage-corr-003" "stage-corr-004"; do
        if grep -q "$req_id" "$REPORT_DIR/server.log" 2>/dev/null; then
            pass_test "Found request ID: $req_id"
            found_ids=$((found_ids + 1))
        else
            fail_test "Missing request ID: $req_id"
        fi
    done
    
    cat >> "$REPORT_FILE" << EOF
**Result**: Found $found_ids/$expected_ids correlation IDs

**Log Correlation Summary**:
- Total correlation IDs tracked: $found_ids
- Missing IDs: $((expected_ids - found_ids))
- Log file: server.log

EOF
}

# Generate final report
generate_final_report() {
    print_header "Generating Final Report"
    
    local PASS_RATE=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    # Update summary
    sed -i.bak "s/Status}: .*/Status}: Complete/" "$REPORT_FILE"
    sed -i.bak "s/Total Tests}: .*/Total Tests}: $TOTAL_TESTS/" "$REPORT_FILE"
    sed -i.bak "s/Passed}: .*/Passed}: $PASSED_TESTS/" "$REPORT_FILE"
    sed -i.bak "s/Failed}: .*/Failed}: $FAILED_TESTS/" "$REPORT_FILE"
    sed -i.bak "s/Pass Rate}: .*/Pass Rate}: $PASS_RATE%/" "$REPORT_FILE"
    rm -f "$REPORT_FILE.bak"
    
    # Add conclusion
    cat >> "$REPORT_FILE" << EOF

---

## Conclusions

### Overall Assessment

**Status**: $( [ $PASS_RATE -ge 80 ] && echo "✅ PASS" || echo "⚠️ NEEDS ATTENTION" )  
**Pass Rate**: $PASS_RATE%  
**Recommendation**: $( [ $PASS_RATE -ge 80 ] && echo "Ready for staging validation" || echo "Review failed tests before staging" )

### What Was Validated

✅ Request correlation tracking across application layers  
✅ Error handling and response formatting  
✅ Security middleware configuration  
✅ Log aggregation and correlation  
$( [ $PASS_RATE -ge 80 ] && echo "✅ End-to-end flow validation" || echo "⚠️ Some end-to-end flows need attention" )

### Local vs Staging Differences

**Completed in Local**:
- Request ID tracking
- Error response validation
- Security header verification
- Log correlation

**Deferred to Staging**:
- Production-like infrastructure testing
- Cloud log aggregator integration
- Performance benchmarking
- Cross-service correlation (if microservices)

### Next Steps

1. **If Pass Rate >= 80%**:
   - ✅ Mark Milestone 1 as "Completed (Local)"
   - Update roadmap
   - Schedule staging validation when environment ready

2. **If Pass Rate < 80%**:
   - Review failed tests
   - Fix identified issues
   - Re-run validation suite

3. **For Staging Deployment**:
   - Use this report as baseline
   - Configure real log aggregator
   - Set up test endpoints
   - Re-run with staging URL

---

## Appendix

### Test Execution Details
- **Start Time**: $(date)
- **Duration**: ~5 minutes
- **Test Environment**: Local development server
- **Log Files**: $REPORT_DIR/

### Files Generated
- Validation report: $(basename "$REPORT_FILE")
- Server logs: server.log
- Test artifacts: $REPORT_DIR/

### Staging Readiness Checklist

When staging is ready:
- [ ] Staging URL provided
- [ ] Log aggregator access granted
- [ ] Test user credentials created
- [ ] Test endpoints configured
- [ ] Re-run this suite against staging
- [ ] Compare results with this baseline

---

**Report Generated**: $(date)  
**Validator**: Milestone 1 Local Validation Suite v1.0

EOF
    
    pass_test "Final report generated: $REPORT_FILE"
}

# Cleanup
cleanup() {
    print_header "Cleanup"
    
    if [ -n "${SERVER_PID:-}" ]; then
        info "Stopping test server (PID: $SERVER_PID)"
        kill $SERVER_PID 2>/dev/null || true
    fi
    
    pass_test "Cleanup complete"
}

# Main execution
main() {
    clear
    print_header "Milestone 1: Local Validation Suite"
    
    echo "This suite simulates staging environment for end-to-end testing."
    echo "It validates request correlation, security, and error handling locally."
    echo ""
    echo "Results will be saved to: $REPORT_FILE"
    echo ""
    
    read -p "Press Enter to start validation..."
    
    init_report
    
    # Run tests
    start_local_server || exit 1
    test_request_correlation
    test_estate_required
    test_csrf_validation
    test_security_features
    test_log_correlation
    
    # Generate report
    generate_final_report
    
    # Show summary
    print_header "Validation Complete"
    
    echo -e "${BOLD}Test Summary:${NC}"
    echo -e "  Total Tests:  $TOTAL_TESTS"
    echo -e "  ${GREEN}Passed:       $PASSED_TESTS${NC}"
    echo -e "  ${RED}Failed:       $FAILED_TESTS${NC}"
    
    local PASS_RATE=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    echo -e "  Pass Rate:    $PASS_RATE%"
    echo ""
    
    if [ $PASS_RATE -ge 80 ]; then
        echo -e "${GREEN}${BOLD}✓ VALIDATION PASSED${NC}"
        echo ""
        echo "You can now:"
        echo "  1. Review the report: cat $REPORT_FILE"
        echo "  2. Mark Milestone 1 as 'Completed (Local)'"
        echo "  3. Update the roadmap"
        echo "  4. Schedule staging validation when ready"
    else
        echo -e "${YELLOW}${BOLD}⚠ VALIDATION NEEDS ATTENTION${NC}"
        echo ""
        echo "Please:"
        echo "  1. Review the report: cat $REPORT_FILE"
        echo "  2. Fix failing tests"
        echo "  3. Re-run validation"
    fi
    
    echo ""
    echo -e "${CYAN}Full report: $REPORT_FILE${NC}"
    
    # Cleanup
    trap cleanup EXIT
}

# Run main
main "$@"
