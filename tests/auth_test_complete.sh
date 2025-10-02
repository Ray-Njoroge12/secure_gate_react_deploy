#!/bin/bash
# tests/auth_test.sh - Authentication Test Suite

API_URL="http://localhost:5002/api"
TIMESTAMP=$(date +%s)
RESULTS_FILE="./test_results_auth_$(date +%Y%m%d_%H%M%S).json"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=8

echo "=================================================="
echo "AUTHENTICATION TEST SUITE"
echo "API URL: $API_URL"
echo "Timestamp: $(date)"
echo "=================================================="
echo ""

# Initialize results JSON
cat > "$RESULTS_FILE" << EOF
{
  "test_suite": "Authentication",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "api_url": "$API_URL",
  "tests": []
}
EOF

# Function to add test result
add_result() {
  local test_id="$1"
  local test_name="$2"
  local status="$3"
  local message="$4"
  
  # Append to results file (simplified - in production use jq)
  echo "  Test: $test_id - $status"
}

# Test 1.1: Register Resident
echo "=== Test 1.1: Register Resident ==="
REGISTER_RES=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"testres${TIMESTAMP}@example.com\",
    \"username\": \"testres${TIMESTAMP}\",
    \"password\": \"SecurePass123!\",
    \"role\": \"resident\",
    \"phone\": \"+254700000001\",
    \"area\": \"Block A\",
    \"house\": \"A101\"
  }")

HTTP_CODE=$(echo "$REGISTER_RES" | tail -n1)
RESPONSE_BODY=$(echo "$REGISTER_RES" | sed '$d')

echo "HTTP Code: $HTTP_CODE"
echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  if echo "$RESPONSE_BODY" | jq -e '.success == true or .data.id' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Test 1.1 PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    RESIDENT_EMAIL=$(echo "$RESPONSE_BODY" | jq -r '.data.email // .email // empty')
    RESIDENT_USERNAME="testres${TIMESTAMP}"
    add_result "1.1" "Register Resident" "PASSED" "User created successfully"
  else
    echo -e "${RED}✗ Test 1.1 FAILED - Invalid response format${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    add_result "1.1" "Register Resident" "FAILED" "Invalid response format"
  fi
else
  echo -e "${RED}✗ Test 1.1 FAILED - Expected HTTP 201, got $HTTP_CODE${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  add_result "1.1" "Register Resident" "FAILED" "HTTP $HTTP_CODE"
fi
echo ""

# Test 1.2: Login Resident
echo "=== Test 1.2: Login Resident ==="
LOGIN_RES=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$RESIDENT_USERNAME\",
    \"password\": \"SecurePass123!\"
  }")

HTTP_CODE=$(echo "$LOGIN_RES" | tail -n1)
RESPONSE_BODY=$(echo "$LOGIN_RES" | sed '$d')

echo "HTTP Code: $HTTP_CODE"
echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ]; then
  RESIDENT_TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.data.accessToken // .accessToken // .token // empty')
  if [ -n "$RESIDENT_TOKEN" ] && [ "$RESIDENT_TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ Test 1.2 PASSED${NC}"
    echo "Token (first 30 chars): ${RESIDENT_TOKEN:0:30}..."
    TESTS_PASSED=$((TESTS_PASSED + 1))
    add_result "1.2" "Login Resident" "PASSED" "Token received"
  else
    echo -e "${RED}✗ Test 1.2 FAILED - No token in response${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    add_result "1.2" "Login Resident" "FAILED" "No token in response"
  fi
else
  echo -e "${RED}✗ Test 1.2 FAILED - Expected HTTP 200, got $HTTP_CODE${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  add_result "1.2" "Login Resident" "FAILED" "HTTP $HTTP_CODE"
fi
echo ""

# Test 1.3: Access Protected Endpoint
echo "=== Test 1.3: Access Protected Endpoint (Resident Profile) ==="
if [ -n "$RESIDENT_TOKEN" ] && [ "$RESIDENT_TOKEN" != "null" ]; then
  PROFILE_RES=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/auth/profile" \
    -H "Authorization: Bearer $RESIDENT_TOKEN")
  
  HTTP_CODE=$(echo "$PROFILE_RES" | tail -n1)
  RESPONSE_BODY=$(echo "$PROFILE_RES" | sed '$d')
  
  echo "HTTP Code: $HTTP_CODE"
  echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
  
  if [ "$HTTP_CODE" = "200" ]; then
    if echo "$RESPONSE_BODY" | jq -e '.data.user.email or .data.email or .email' > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Test 1.3 PASSED${NC}"
      TESTS_PASSED=$((TESTS_PASSED + 1))
      add_result "1.3" "Access Protected Endpoint" "PASSED" "Profile retrieved"
    else
      echo -e "${RED}✗ Test 1.3 FAILED - Invalid response format${NC}"
      TESTS_FAILED=$((TESTS_FAILED + 1))
      add_result "1.3" "Access Protected Endpoint" "FAILED" "Invalid response"
    fi
  else
    echo -e "${RED}✗ Test 1.3 FAILED - Expected HTTP 200, got $HTTP_CODE${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    add_result "1.3" "Access Protected Endpoint" "FAILED" "HTTP $HTTP_CODE"
  fi
else
  echo -e "${YELLOW}⊘ Test 1.3 SKIPPED - No resident token available${NC}"
  add_result "1.3" "Access Protected Endpoint" "SKIPPED" "No token from previous test"
fi
echo ""

# Test 1.4: Register Guard
echo "=== Test 1.4: Register Guard ==="
GUARD_RES=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"testguard${TIMESTAMP}@example.com\",
    \"username\": \"testguard${TIMESTAMP}\",
    \"password\": \"SecurePass123!\",
    \"role\": \"guard\",
    \"phone\": \"+254700000002\"
  }")

HTTP_CODE=$(echo "$GUARD_RES" | tail -n1)
RESPONSE_BODY=$(echo "$GUARD_RES" | sed '$d')

echo "HTTP Code: $HTTP_CODE"

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  if echo "$RESPONSE_BODY" | jq -e '.success == true or .data.id' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Test 1.4 PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    GUARD_USERNAME="testguard${TIMESTAMP}"
    add_result "1.4" "Register Guard" "PASSED" "Guard created"
  else
    echo -e "${RED}✗ Test 1.4 FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    add_result "1.4" "Register Guard" "FAILED" "Invalid response"
  fi
else
  echo -e "${RED}✗ Test 1.4 FAILED - HTTP $HTTP_CODE${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  add_result "1.4" "Register Guard" "FAILED" "HTTP $HTTP_CODE"
fi
echo ""

# Test 1.5: Login Guard
echo "=== Test 1.5: Login Guard ==="
GUARD_LOGIN_RES=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$GUARD_USERNAME\",
    \"password\": \"SecurePass123!\"
  }")

HTTP_CODE=$(echo "$GUARD_LOGIN_RES" | tail -n1)
RESPONSE_BODY=$(echo "$GUARD_LOGIN_RES" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  GUARD_TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.data.accessToken // .accessToken // .token // empty')
  if [ -n "$GUARD_TOKEN" ] && [ "$GUARD_TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ Test 1.5 PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    add_result "1.5" "Login Guard" "PASSED" "Token received"
  else
    echo -e "${RED}✗ Test 1.5 FAILED - No token${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    add_result "1.5" "Login Guard" "FAILED" "No token"
  fi
else
  echo -e "${RED}✗ Test 1.5 FAILED - HTTP $HTTP_CODE${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  add_result "1.5" "Login Guard" "FAILED" "HTTP $HTTP_CODE"
fi
echo ""

# Test 1.6: Register Admin
echo "=== Test 1.6: Register Admin ==="
ADMIN_RES=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"testadmin${TIMESTAMP}@example.com\",
    \"username\": \"testadmin${TIMESTAMP}\",
    \"password\": \"SecurePass123!\",
    \"role\": \"admin\"
  }")

HTTP_CODE=$(echo "$ADMIN_RES" | tail -n1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Test 1.6 PASSED${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  ADMIN_USERNAME="testadmin${TIMESTAMP}"
  add_result "1.6" "Register Admin" "PASSED" "Admin created"
else
  echo -e "${RED}✗ Test 1.6 FAILED - HTTP $HTTP_CODE${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  add_result "1.6" "Register Admin" "FAILED" "HTTP $HTTP_CODE"
fi
echo ""

# Test 1.7: Login Admin
echo "=== Test 1.7: Login Admin ==="
ADMIN_LOGIN_RES=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$ADMIN_USERNAME\",
    \"password\": \"SecurePass123!\"
  }")

HTTP_CODE=$(echo "$ADMIN_LOGIN_RES" | tail -n1)
RESPONSE_BODY=$(echo "$ADMIN_LOGIN_RES" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  ADMIN_TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.data.accessToken // .accessToken // .token // empty')
  if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ Test 1.7 PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    add_result "1.7" "Login Admin" "PASSED" "Token received"
  else
    echo -e "${RED}✗ Test 1.7 FAILED - No token${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    add_result "1.7" "Login Admin" "FAILED" "No token"
  fi
else
  echo -e "${RED}✗ Test 1.7 FAILED - HTTP $HTTP_CODE${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  add_result "1.7" "Login Admin" "FAILED" "HTTP $HTTP_CODE"
fi
echo ""

# Test 1.8: Invalid Login Rejected
echo "=== Test 1.8: Invalid Login Rejected ==="
INVALID_RES=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"nonexistent_user_12345\",
    \"password\": \"WrongPassword123!\"
  }")

HTTP_CODE=$(echo "$INVALID_RES" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Test 1.8 PASSED - Invalid credentials properly rejected${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  add_result "1.8" "Invalid Login Rejected" "PASSED" "Properly rejected"
else
  echo -e "${RED}✗ Test 1.8 FAILED - Expected HTTP 401, got $HTTP_CODE${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  add_result "1.8" "Invalid Login Rejected" "FAILED" "HTTP $HTTP_CODE"
fi
echo ""

# Summary
echo "=================================================="
echo "AUTHENTICATION TEST RESULTS"
echo "=================================================="
echo "Total Tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""
PASS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))
echo "Pass Rate: $PASS_RATE%"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}=== ALL AUTHENTICATION TESTS PASSED ===${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Save tokens for next test phase:"
  echo "   export RESIDENT_TOKEN='$RESIDENT_TOKEN'"
  echo "   export GUARD_TOKEN='$GUARD_TOKEN'"
  echo "   export ADMIN_TOKEN='$ADMIN_TOKEN'"
  echo ""
  echo "2. Run visitor flow tests:"
  echo "   ./tests/visitor_flow_test.sh"
  exit 0
else
  echo -e "${RED}=== SOME TESTS FAILED ===${NC}"
  echo "Review failures above and fix issues before proceeding."
  exit 1
fi
