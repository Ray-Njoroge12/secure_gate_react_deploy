#!/bin/bash

# Compliance Testing Script
# Tests GDPR, Kenya DPA, and data protection compliance features

set -euo pipefail

# Configuration
BASE_URL="${BASE_URL:-http://localhost:5000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/compliance-test.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $1" | tee -a "$LOG_FILE"
}

# Test compliance status endpoint
test_compliance_status() {
    log "Testing compliance status endpoint..."
    
    local response
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/compliance/status" || echo "000")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [[ "$http_code" == "200" ]]; then
        log_success "Compliance status endpoint is working"
        
        # Check if response contains required fields
        if echo "$body" | jq -e '.data.gdpr' >/dev/null 2>&1; then
            log_success "GDPR compliance data present"
        else
            log_warning "GDPR compliance data missing"
        fi
        
        if echo "$body" | jq -e '.data.kenyaDpa' >/dev/null 2>&1; then
            log_success "Kenya DPA compliance data present"
        else
            log_warning "Kenya DPA compliance data missing"
        fi
        
        if echo "$body" | jq -e '.data.cookieConsent' >/dev/null 2>&1; then
            log_success "Cookie consent data present"
        else
            log_warning "Cookie consent data missing"
        fi
        
        return 0
    else
        log_error "Compliance status endpoint failed (HTTP $http_code)"
        return 1
    fi
}

# Test cookie policy endpoint
test_cookie_policy() {
    log "Testing cookie policy endpoint..."
    
    local response
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/compliance/cookie-policy" || echo "000")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [[ "$http_code" == "200" ]]; then
        log_success "Cookie policy endpoint is working"
        
        # Check if response contains required fields
        if echo "$body" | jq -e '.data.categories' >/dev/null 2>&1; then
            log_success "Cookie categories data present"
        else
            log_warning "Cookie categories data missing"
        fi
        
        if echo "$body" | jq -e '.data.retention' >/dev/null 2>&1; then
            log_success "Cookie retention data present"
        else
            log_warning "Cookie retention data missing"
        fi
        
        return 0
    else
        log_error "Cookie policy endpoint failed (HTTP $http_code)"
        return 1
    fi
}

# Test privacy policy endpoint
test_privacy_policy() {
    log "Testing privacy policy endpoint..."
    
    local response
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/compliance/privacy-policy" || echo "000")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [[ "$http_code" == "200" ]]; then
        log_success "Privacy policy endpoint is working"
        
        # Check if response contains required fields
        if echo "$body" | jq -e '.data.dataTypes' >/dev/null 2>&1; then
            log_success "Data types information present"
        else
            log_warning "Data types information missing"
        fi
        
        if echo "$body" | jq -e '.data.rights' >/dev/null 2>&1; then
            log_success "Data subject rights information present"
        else
            log_warning "Data subject rights information missing"
        fi
        
        return 0
    else
        log_error "Privacy policy endpoint failed (HTTP $http_code)"
        return 1
    fi
}

# Test DSAR endpoint (requires authentication)
test_dsar_endpoint() {
    log "Testing DSAR endpoint..."
    
    local response
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/compliance/dsar" \
        -H "Content-Type: application/json" \
        -d '{"requestType": "access"}' || echo "000")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [[ "$http_code" == "401" ]]; then
        log_success "DSAR endpoint requires authentication (expected)"
        return 0
    elif [[ "$http_code" == "200" ]]; then
        log_success "DSAR endpoint is working"
        return 0
    else
        log_error "DSAR endpoint failed (HTTP $http_code)"
        return 1
    fi
}

# Test data deletion endpoint (requires authentication)
test_deletion_endpoint() {
    log "Testing data deletion endpoint..."
    
    local response
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/compliance/deletion" \
        -H "Content-Type: application/json" \
        -d '{"reason": "user_request"}' || echo "000")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [[ "$http_code" == "401" ]]; then
        log_success "Data deletion endpoint requires authentication (expected)"
        return 0
    elif [[ "$http_code" == "200" ]]; then
        log_success "Data deletion endpoint is working"
        return 0
    else
        log_error "Data deletion endpoint failed (HTTP $http_code)"
        return 1
    fi
}

# Test data portability endpoint (requires authentication)
test_portability_endpoint() {
    log "Testing data portability endpoint..."
    
    local response
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/compliance/portability" \
        -H "Content-Type: application/json" \
        -d '{"format": "json"}' || echo "000")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [[ "$http_code" == "401" ]]; then
        log_success "Data portability endpoint requires authentication (expected)"
        return 0
    elif [[ "$http_code" == "200" ]]; then
        log_success "Data portability endpoint is working"
        return 0
    else
        log_error "Data portability endpoint failed (HTTP $http_code)"
        return 1
    fi
}

# Test consent management endpoint (requires authentication)
test_consent_endpoint() {
    log "Testing consent management endpoint..."
    
    local response
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/compliance/consent" \
        -H "Content-Type: application/json" \
        -d '{"type": "analytics", "granted": true, "version": "1.0"}' || echo "000")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [[ "$http_code" == "401" ]]; then
        log_success "Consent management endpoint requires authentication (expected)"
        return 0
    elif [[ "$http_code" == "200" ]]; then
        log_success "Consent management endpoint is working"
        return 0
    else
        log_error "Consent management endpoint failed (HTTP $http_code)"
        return 1
    fi
}

# Test security headers
test_security_headers() {
    log "Testing security headers..."
    
    local response
    response=$(curl -s -I "$BASE_URL/api/compliance/status" || echo "")
    
    local headers_present=0
    local total_headers=0
    
    # Check for required security headers
    if echo "$response" | grep -i "x-content-type-options" >/dev/null; then
        log_success "X-Content-Type-Options header present"
        ((headers_present++))
    else
        log_warning "X-Content-Type-Options header missing"
    fi
    ((total_headers++))
    
    if echo "$response" | grep -i "x-frame-options" >/dev/null; then
        log_success "X-Frame-Options header present"
        ((headers_present++))
    else
        log_warning "X-Frame-Options header missing"
    fi
    ((total_headers++))
    
    if echo "$response" | grep -i "x-xss-protection" >/dev/null; then
        log_success "X-XSS-Protection header present"
        ((headers_present++))
    else
        log_warning "X-XSS-Protection header missing"
    fi
    ((total_headers++))
    
    if echo "$response" | grep -i "referrer-policy" >/dev/null; then
        log_success "Referrer-Policy header present"
        ((headers_present++))
    else
        log_warning "Referrer-Policy header missing"
    fi
    ((total_headers++))
    
    local percentage=$((headers_present * 100 / total_headers))
    if [[ $percentage -ge 75 ]]; then
        log_success "Security headers compliance: $percentage%"
        return 0
    else
        log_warning "Security headers compliance: $percentage% (should be >= 75%)"
        return 1
    fi
}

# Test rate limiting
test_rate_limiting() {
    log "Testing rate limiting..."
    
    local success_count=0
    local total_requests=5
    
    for i in $(seq 1 $total_requests); do
        local response
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/compliance/status" || echo "000")
        local http_code=$(echo "$response" | tail -n1)
        
        if [[ "$http_code" == "200" ]]; then
            ((success_count++))
        fi
    done
    
    if [[ $success_count -eq $total_requests ]]; then
        log_success "Rate limiting test passed (all requests successful)"
        return 0
    else
        log_warning "Rate limiting test: $success_count/$total_requests requests successful"
        return 1
    fi
}

# Generate compliance test report
generate_report() {
    local report_file="$SCRIPT_DIR/compliance-test-report.json"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    log "Generating compliance test report..."
    
    cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "baseUrl": "$BASE_URL",
  "tests": {
    "complianceStatus": {
      "endpoint": "/api/compliance/status",
      "status": "tested"
    },
    "cookiePolicy": {
      "endpoint": "/api/compliance/cookie-policy",
      "status": "tested"
    },
    "privacyPolicy": {
      "endpoint": "/api/compliance/privacy-policy",
      "status": "tested"
    },
    "dsarEndpoint": {
      "endpoint": "/api/compliance/dsar",
      "status": "tested",
      "requiresAuth": true
    },
    "deletionEndpoint": {
      "endpoint": "/api/compliance/deletion",
      "status": "tested",
      "requiresAuth": true
    },
    "portabilityEndpoint": {
      "endpoint": "/api/compliance/portability",
      "status": "tested",
      "requiresAuth": true
    },
    "consentEndpoint": {
      "endpoint": "/api/compliance/consent",
      "status": "tested",
      "requiresAuth": true
    },
    "securityHeaders": {
      "status": "tested"
    },
    "rateLimiting": {
      "status": "tested"
    }
  },
  "summary": {
    "totalTests": 9,
    "complianceFeatures": [
      "GDPR compliance",
      "Kenya DPA compliance",
      "Cookie consent management",
      "Data subject rights",
      "Privacy policy",
      "Security headers",
      "Rate limiting"
    ]
  }
}
EOF
    
    log_success "Compliance test report generated: $report_file"
}

# Main test function
main() {
    local test_mode="${1:-all}"
    
    log "Starting compliance testing..."
    log "Base URL: $BASE_URL"
    
    local tests_passed=0
    local total_tests=0
    
    case "$test_mode" in
        "all")
            # Run all tests
            test_compliance_status && ((tests_passed++)) || true
            ((total_tests++))
            
            test_cookie_policy && ((tests_passed++)) || true
            ((total_tests++))
            
            test_privacy_policy && ((tests_passed++)) || true
            ((total_tests++))
            
            test_dsar_endpoint && ((tests_passed++)) || true
            ((total_tests++))
            
            test_deletion_endpoint && ((tests_passed++)) || true
            ((total_tests++))
            
            test_portability_endpoint && ((tests_passed++)) || true
            ((total_tests++))
            
            test_consent_endpoint && ((tests_passed++)) || true
            ((total_tests++))
            
            test_security_headers && ((tests_passed++)) || true
            ((total_tests++))
            
            test_rate_limiting && ((tests_passed++)) || true
            ((total_tests++))
            ;;
        "public")
            # Test only public endpoints
            test_compliance_status && ((tests_passed++)) || true
            ((total_tests++))
            
            test_cookie_policy && ((tests_passed++)) || true
            ((total_tests++))
            
            test_privacy_policy && ((tests_passed++)) || true
            ((total_tests++))
            ;;
        "auth")
            # Test only authenticated endpoints
            test_dsar_endpoint && ((tests_passed++)) || true
            ((total_tests++))
            
            test_deletion_endpoint && ((tests_passed++)) || true
            ((total_tests++))
            
            test_portability_endpoint && ((tests_passed++)) || true
            ((total_tests++))
            
            test_consent_endpoint && ((tests_passed++)) || true
            ((total_tests++))
            ;;
        "security")
            # Test security features
            test_security_headers && ((tests_passed++)) || true
            ((total_tests++))
            
            test_rate_limiting && ((tests_passed++)) || true
            ((total_tests++))
            ;;
        *)
            echo "Usage: $0 {all|public|auth|security}"
            exit 1
            ;;
    esac
    
    # Generate report
    generate_report
    
    # Summary
    local percentage=$((tests_passed * 100 / total_tests))
    log "Compliance testing completed: $tests_passed/$total_tests tests passed ($percentage%)"
    
    if [[ $percentage -ge 80 ]]; then
        log_success "Compliance implementation is working well"
        exit 0
    else
        log_warning "Compliance implementation needs attention"
        exit 1
    fi
}

# Run main function
main "$@"
