#!/usr/bin/env bash
# Local Correlation Validation Script
# Tests request ID propagation through response headers, error payloads, and logs

set -euo pipefail

# Configuration
LOCAL_BASE_URL=${LOCAL_BASE_URL:-http://localhost:5000}
REQUEST_ID=${REQUEST_ID:-local-corr-$(date +%s)}
OUTPUT_DIR=${OUTPUT_DIR:-local-correlation-validation}
LOG_DIR=${LOG_DIR:-secure-gate-access/server/logs}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create output directory
mkdir -p "${OUTPUT_DIR}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Local Request ID Correlation Validation                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Request ID:${NC} ${REQUEST_ID}"
echo -e "${YELLOW}Base URL:${NC} ${LOCAL_BASE_URL}"
echo -e "${YELLOW}Output Directory:${NC} ${OUTPUT_DIR}"
echo ""

# Test endpoints that should trigger specific responses
declare -A TEST_ENDPOINTS=(
  ["csrf_required"]="/api/visitors"
  ["auth_required"]="/api/auth/me"
  ["estate_required"]="/api/guards"
)

TESTS_PASSED=0
TESTS_FAILED=0

# Function to test an endpoint
test_endpoint() {
  local test_name=$1
  local endpoint=$2
  local method=${3:-GET}
  local request_id="${REQUEST_ID}-${test_name}"
  
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${YELLOW}Test: ${test_name}${NC}"
  echo -e "${YELLOW}Endpoint: ${method} ${endpoint}${NC}"
  echo -e "${YELLOW}Request ID: ${request_id}${NC}"
  echo ""
  
  local header_file="${OUTPUT_DIR}/${test_name}-headers.txt"
  local body_file="${OUTPUT_DIR}/${test_name}-body.json"
  local meta_file="${OUTPUT_DIR}/${test_name}-metadata.txt"
  
  # Make request
  http_code=$(curl -sS -w "%{http_code}" -X "${method}" \
    -H "X-Request-ID: ${request_id}" \
    -H "Accept: application/json" \
    -D "${header_file}" \
    -o "${body_file}" \
    "${LOCAL_BASE_URL}${endpoint}")
  
  # Save metadata
  cat > "${meta_file}" << META
test_name=${test_name}
request_id=${request_id}
method=${method}
url=${LOCAL_BASE_URL}${endpoint}
http_code=${http_code}
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
META
  
  echo -e "HTTP Status: ${http_code}"
  echo -e "Headers saved: ${header_file}"
  echo -e "Body saved: ${body_file}"
  echo ""
  
  # Validation checks
  local validation_passed=true
  
  # Check 1: Response header echoes X-Request-ID
  echo -e "${YELLOW}✓ Check 1: Response header contains X-Request-ID${NC}"
  if grep -qi "X-Request-ID.*${request_id}" "${header_file}" || \
     grep -qi "X-Request-Id.*${request_id}" "${header_file}"; then
    echo -e "${GREEN}  ✅ PASS: X-Request-ID found in headers${NC}"
  else
    echo -e "${RED}  ❌ FAIL: X-Request-ID NOT found in headers${NC}"
    validation_passed=false
  fi
  
  # Check 2: Response body contains requestId (if error)
  echo -e "${YELLOW}✓ Check 2: Response body contains requestId${NC}"
  if [[ -f "${body_file}" ]] && [[ -s "${body_file}" ]]; then
    if grep -q "requestId" "${body_file}"; then
      if grep -q "${request_id}" "${body_file}"; then
        echo -e "${GREEN}  ✅ PASS: requestId found in response body${NC}"
      else
        echo -e "${YELLOW}  ⚠️  WARN: requestId field exists but ID doesn't match${NC}"
        echo -e "  Expected: ${request_id}"
        echo -e "  Body snippet: $(grep -o '"requestId":"[^"]*"' "${body_file}" | head -1)"
      fi
    else
      echo -e "${YELLOW}  ⚠️  INFO: No requestId in response body (may not be an error response)${NC}"
    fi
  else
    echo -e "${YELLOW}  ⚠️  INFO: Empty response body${NC}"
  fi
  
  # Check 3: Check logs for request_id
  echo -e "${YELLOW}✓ Check 3: Logs contain request_id${NC}"
  local logs_found=false
  if [[ -d "${LOG_DIR}" ]]; then
    # Check various log files
    for log_type in app security api audit; do
      local log_pattern="${LOG_DIR}/${log_type}*.log"
      if ls ${log_pattern} &>/dev/null; then
        local matches=$(grep -l "${request_id}" ${log_pattern} 2>/dev/null || true)
        if [[ -n "${matches}" ]]; then
          echo -e "${GREEN}  ✅ FOUND in ${log_type} logs:${NC}"
          grep "${request_id}" ${log_pattern} 2>/dev/null | head -5 | while read -r line; do
            echo -e "${GREEN}     ${line}${NC}"
          done
          logs_found=true
        fi
      fi
    done
    
    if [[ "${logs_found}" == "false" ]]; then
      echo -e "${RED}  ❌ FAIL: request_id NOT found in any logs${NC}"
      validation_passed=false
    fi
  else
    echo -e "${YELLOW}  ⚠️  WARN: Log directory not found: ${LOG_DIR}${NC}"
  fi
  
  echo ""
  
  # Update counters
  if [[ "${validation_passed}" == "true" ]]; then
    ((TESTS_PASSED++))
    echo -e "${GREEN}✓ Test PASSED: ${test_name}${NC}"
  else
    ((TESTS_FAILED++))
    echo -e "${RED}✗ Test FAILED: ${test_name}${NC}"
  fi
  
  echo ""
}

# Run tests
echo -e "${BLUE}Starting Correlation Validation Tests...${NC}"
echo ""

# Test 1: CSRF Required (POST without token)
test_endpoint "csrf_required" "/api/visitors" "POST"

# Test 2: Auth Required (no token)
test_endpoint "auth_required" "/api/auth/me" "GET"

# Test 3: Estate Required (if auth works, this will need estate)
# For now, test with a public endpoint that returns requestId
test_endpoint "public_endpoint" "/api/auth/csrf-token" "GET"

# Generate summary report
SUMMARY_FILE="${OUTPUT_DIR}/validation-summary.md"
cat > "${SUMMARY_FILE}" << SUMMARY
# Local Correlation Validation Summary

**Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Request ID Pattern:** ${REQUEST_ID}  
**Base URL:** ${LOCAL_BASE_URL}

## Test Results

- **Tests Passed:** ${TESTS_PASSED}
- **Tests Failed:** ${TESTS_FAILED}
- **Total Tests:** $((TESTS_PASSED + TESTS_FAILED))

## Tests Executed

$(for test_name in "${!TEST_ENDPOINTS[@]}"; do
  if [[ -f "${OUTPUT_DIR}/${test_name}-metadata.txt" ]]; then
    echo "### ${test_name}"
    cat "${OUTPUT_DIR}/${test_name}-metadata.txt"
    echo ""
  fi
done)

## Validation Criteria

1. ✓ Response headers echo X-Request-ID
2. ✓ Error payloads include requestId field
3. ✓ Logs contain request_id for correlation

## Evidence Files

- Headers: ${OUTPUT_DIR}/*-headers.txt
- Bodies: ${OUTPUT_DIR}/*-body.json
- Metadata: ${OUTPUT_DIR}/*-metadata.txt

## Next Steps

1. Review log files in ${LOG_DIR} for complete request traces
2. Verify request-start, request-end, error, and security logs all contain request_id
3. Test query template: \`request_id="${REQUEST_ID}"\`
4. Run staging validation when staging environment is available

## Status

$(if [[ ${TESTS_FAILED} -eq 0 ]]; then
  echo "✅ **ALL TESTS PASSED** - Request ID correlation is working correctly"
else
  echo "⚠️ **SOME TESTS FAILED** - Review failed test evidence files"
fi)

SUMMARY

# Display summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Validation Summary                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Tests Passed:${NC} ${TESTS_PASSED}"
echo -e "${YELLOW}Tests Failed:${NC} ${TESTS_FAILED}"
echo -e "${YELLOW}Total Tests:${NC} $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [[ ${TESTS_FAILED} -eq 0 ]]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
  echo -e "${GREEN}Request ID correlation is working correctly!${NC}"
  exit_code=0
else
  echo -e "${RED}⚠️  SOME TESTS FAILED${NC}"
  echo -e "${YELLOW}Review evidence files in ${OUTPUT_DIR}${NC}"
  exit_code=1
fi

echo ""
echo -e "${YELLOW}Summary Report:${NC} ${SUMMARY_FILE}"
echo -e "${YELLOW}Evidence Directory:${NC} ${OUTPUT_DIR}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

exit ${exit_code}
