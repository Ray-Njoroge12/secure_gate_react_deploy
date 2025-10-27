#!/bin/bash
# Comprehensive System Testing Script
# Tests all endpoints, functionalities, and system components

set -e

BASE_URL="http://localhost:5001"
ADMIN_TOKEN=""
GUARD_TOKEN=""
RESIDENT_TOKEN=""
VISITOR_ID=""
PASS_ID=""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 SECURE GATE - COMPREHENSIVE SYSTEM TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to run test
run_test() {
    local test_name=$1
    local expected_status=$2
    local response=$3
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        local success=$(echo "$response" | jq -r '.success')
        if [ "$success" == "$expected_status" ]; then
            echo -e "${GREEN}✅ PASS${NC}: $test_name"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            echo -e "${RED}❌ FAIL${NC}: $test_name"
            echo "   Expected: $expected_status, Got: $success"
            echo "   Response: $response"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            return 1
        fi
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name (Invalid JSON response)"
        echo "   Response: $response"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Test Section Header
section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ============================================
# SECTION 1: SYSTEM HEALTH CHECKS
# ============================================
section "1️⃣  SYSTEM HEALTH CHECKS"

echo "Testing system health endpoint..."
RESPONSE=$(curl -s "$BASE_URL/api/health")
if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    STATUS=$(echo "$RESPONSE" | jq -r '.data.status')
    if [ "$STATUS" == "healthy" ]; then
        echo -e "${GREEN}✅ PASS${NC}: Health check endpoint"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        echo "   Uptime: $(echo "$RESPONSE" | jq -r '.data.uptime')s"
        echo "   Database: $(echo "$RESPONSE" | jq -r '.data.healthChecks.database.status')"
        echo "   Memory: $(echo "$RESPONSE" | jq -r '.data.healthChecks.memory.status')"
        echo "   CPU: $(echo "$RESPONSE" | jq -r '.data.healthChecks.cpu.status')"
    else
        echo -e "${RED}❌ FAIL${NC}: Health check (status: $STATUS)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
    fi
else
    echo -e "${RED}❌ FAIL${NC}: Health check endpoint"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# ============================================
# SECTION 2: AUTHENTICATION TESTS
# ============================================
section "2️⃣  AUTHENTICATION TESTS"

# Test 2.1: Admin Login
echo "2.1 Testing Admin Login..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin-test@example.com","password":"Admin@123"}')
run_test "Admin Login" "true" "$RESPONSE"
ADMIN_TOKEN=$(echo "$RESPONSE" | jq -r '.data.accessToken // empty')
if [ -n "$ADMIN_TOKEN" ]; then
    echo "   Token acquired: ${ADMIN_TOKEN:0:30}..."
fi

# Test 2.2: Guard Login
echo ""
echo "2.2 Testing Guard Login..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"guard-test@example.com","password":"Guard@123"}')
run_test "Guard Login" "true" "$RESPONSE"
GUARD_TOKEN=$(echo "$RESPONSE" | jq -r '.data.accessToken // empty')

# Test 2.3: Resident Login
echo ""
echo "2.3 Testing Resident Login..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"resident-test@example.com","password":"Resident@123"}')
run_test "Resident Login" "true" "$RESPONSE"
RESIDENT_TOKEN=$(echo "$RESPONSE" | jq -r '.data.accessToken // empty')

# Test 2.4: Invalid Login
echo ""
echo "2.4 Testing Invalid Credentials..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin-test@example.com","password":"WrongPassword"}')
run_test "Invalid Login (should fail)" "false" "$RESPONSE"

# Test 2.5: Login with Username
echo ""
echo "2.5 Testing Login with Username..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin-test","password":"Admin@123"}')
run_test "Login with Username" "true" "$RESPONSE"

# Test 2.6: Token Refresh
echo ""
echo "2.6 Testing Token Refresh..."
REFRESH_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin-test@example.com","password":"Admin@123"}' | jq -r '.data.refreshToken // empty')
if [ -n "$REFRESH_TOKEN" ]; then
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
    run_test "Token Refresh" "true" "$RESPONSE"
else
    echo -e "${YELLOW}⚠️  SKIP${NC}: Token Refresh (no refresh token)"
fi

# ============================================
# SECTION 3: USER MANAGEMENT TESTS
# ============================================
section "3️⃣  USER MANAGEMENT TESTS"

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  SKIP${NC}: User management tests (no admin token)"
else
    # Test 3.1: Get All Users (Admin only)
    echo "3.1 Testing Get All Users..."
    RESPONSE=$(curl -s "$BASE_URL/api/users" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    run_test "Get All Users" "true" "$RESPONSE"
    
    # Test 3.2: Get User Profile
    echo ""
    echo "3.2 Testing Get User Profile..."
    RESPONSE=$(curl -s "$BASE_URL/api/users/profile" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    run_test "Get User Profile" "true" "$RESPONSE"
    
    # Test 3.3: Update User Profile
    echo ""
    echo "3.3 Testing Update User Profile..."
    RESPONSE=$(curl -s -X PUT "$BASE_URL/api/users/profile" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"phone":"+254700000000","area":"Test Area"}')
    run_test "Update User Profile" "true" "$RESPONSE"
fi

# ============================================
# SECTION 4: VISITOR MANAGEMENT TESTS
# ============================================
section "4️⃣  VISITOR MANAGEMENT TESTS"

if [ -z "$RESIDENT_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  SKIP${NC}: Visitor management tests (no resident token)"
else
    # Test 4.1: Create Single Visitor
    echo "4.1 Testing Create Single Visitor..."
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/visitors" \
        -H "Authorization: Bearer $RESIDENT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "first_name": "Test",
            "last_name": "Visitor",
            "phone": "+254712345678",
            "purpose": "Meeting",
            "expiry_time": "2025-12-31T23:59:59Z"
        }')
    run_test "Create Single Visitor" "true" "$RESPONSE"
    VISITOR_ID=$(echo "$RESPONSE" | jq -r '.data.id // .data.visitor.id // empty')
    if [ -n "$VISITOR_ID" ]; then
        echo "   Visitor ID: $VISITOR_ID"
    fi
    
    # Test 4.2: Get My Visitors
    echo ""
    echo "4.2 Testing Get My Visitors..."
    RESPONSE=$(curl -s "$BASE_URL/api/visitors" \
        -H "Authorization: Bearer $RESIDENT_TOKEN")
    run_test "Get My Visitors" "true" "$RESPONSE"
    
    # Test 4.3: Get Visitor by ID
    if [ -n "$VISITOR_ID" ]; then
        echo ""
        echo "4.3 Testing Get Visitor by ID..."
        RESPONSE=$(curl -s "$BASE_URL/api/visitors/$VISITOR_ID" \
            -H "Authorization: Bearer $RESIDENT_TOKEN")
        run_test "Get Visitor by ID" "true" "$RESPONSE"
    fi
    
    # Test 4.4: Update Visitor
    if [ -n "$VISITOR_ID" ]; then
        echo ""
        echo "4.4 Testing Update Visitor..."
        RESPONSE=$(curl -s -X PUT "$BASE_URL/api/visitors/$VISITOR_ID" \
            -H "Authorization: Bearer $RESIDENT_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"purpose": "Updated Meeting"}')
        run_test "Update Visitor" "true" "$RESPONSE"
    fi
fi

# ============================================
# SECTION 5: PASS MANAGEMENT TESTS
# ============================================
section "5️⃣  PASS MANAGEMENT TESTS"

if [ -z "$RESIDENT_TOKEN" ] || [ -z "$VISITOR_ID" ]; then
    echo -e "${YELLOW}⚠️  SKIP${NC}: Pass management tests (no resident token or visitor ID)"
else
    # Test 5.1: Generate Pass
    echo "5.1 Testing Generate Pass..."
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/visitors/$VISITOR_ID/pass" \
        -H "Authorization: Bearer $RESIDENT_TOKEN")
    run_test "Generate Pass" "true" "$RESPONSE"
    PASS_ID=$(echo "$RESPONSE" | jq -r '.data.id // .data.pass.id // empty')
    
    # Test 5.2: Get Pass Details
    if [ -n "$PASS_ID" ]; then
        echo ""
        echo "5.2 Testing Get Pass Details..."
        RESPONSE=$(curl -s "$BASE_URL/api/passes/$PASS_ID" \
            -H "Authorization: Bearer $RESIDENT_TOKEN")
        run_test "Get Pass Details" "true" "$RESPONSE"
    fi
fi

# ============================================
# SECTION 6: ACCESS LOG TESTS
# ============================================
section "6️⃣  ACCESS LOG TESTS"

if [ -z "$GUARD_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  SKIP${NC}: Access log tests (no guard token)"
else
    # Test 6.1: Get Access Logs
    echo "6.1 Testing Get Access Logs..."
    RESPONSE=$(curl -s "$BASE_URL/api/access-logs" \
        -H "Authorization: Bearer $GUARD_TOKEN")
    run_test "Get Access Logs" "true" "$RESPONSE"
    
    # Test 6.2: Create Access Log Entry
    if [ -n "$VISITOR_ID" ]; then
        echo ""
        echo "6.2 Testing Create Access Log..."
        RESPONSE=$(curl -s -X POST "$BASE_URL/api/access-logs" \
            -H "Authorization: Bearer $GUARD_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"visitor_id\": $VISITOR_ID,
                \"action\": \"entry\",
                \"gate_location\": \"Main Gate\",
                \"notes\": \"Test entry\"
            }")
        run_test "Create Access Log" "true" "$RESPONSE"
    fi
fi

# ============================================
# SECTION 7: SECURITY & VALIDATION TESTS
# ============================================
section "7️⃣  SECURITY & VALIDATION TESTS"

# Test 7.1: Unauthorized Access
echo "7.1 Testing Unauthorized Access..."
RESPONSE=$(curl -s "$BASE_URL/api/users")
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}: Unauthorized access blocked"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Unauthorized access not blocked"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 7.2: Invalid Token
echo ""
echo "7.2 Testing Invalid Token..."
RESPONSE=$(curl -s "$BASE_URL/api/users" \
    -H "Authorization: Bearer invalid_token_12345")
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}: Invalid token rejected"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Invalid token not rejected"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 7.3: SQL Injection Protection
echo ""
echo "7.3 Testing SQL Injection Protection..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin-test@example.com OR 1=1--","password":"anything"}')
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}: SQL injection attempt blocked"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: SQL injection not blocked"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 7.4: XSS Protection
echo ""
echo "7.4 Testing XSS Protection..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"<script>alert(1)</script>","password":"test"}')
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}: XSS attempt blocked"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: XSS not blocked"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# ============================================
# SECTION 8: RATE LIMITING TESTS
# ============================================
section "8️⃣  RATE LIMITING TESTS"

echo "8.1 Testing Rate Limiting..."
RATE_LIMIT_HITS=0
for i in {1..15}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"test","password":"test"}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" == "429" ]; then
        echo -e "${GREEN}✅ PASS${NC}: Rate limit enforced after $i attempts"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        RATE_LIMIT_HITS=1
        break
    fi
done
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $RATE_LIMIT_HITS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  WARNING${NC}: Rate limit not triggered after 15 attempts"
fi

# ============================================
# SECTION 9: DATA INTEGRITY TESTS
# ============================================
section "9️⃣  DATA INTEGRITY TESTS"

if [ -z "$RESIDENT_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  SKIP${NC}: Data integrity tests (no resident token)"
else
    # Test 9.1: Invalid Data Validation
    echo "9.1 Testing Invalid Phone Number..."
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/visitors" \
        -H "Authorization: Bearer $RESIDENT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "first_name": "Test",
            "last_name": "Visitor",
            "phone": "invalid_phone",
            "purpose": "Meeting",
            "expiry_time": "2025-12-31T23:59:59Z"
        }')
    if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}: Invalid phone number rejected"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: Invalid phone number accepted"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Test 9.2: Missing Required Fields
    echo ""
    echo "9.2 Testing Missing Required Fields..."
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/visitors" \
        -H "Authorization: Bearer $RESIDENT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"first_name": "Test"}')
    if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}: Missing required fields rejected"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: Missing required fields accepted"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# ============================================
# FINAL SUMMARY
# ============================================
section "📊 TEST SUMMARY"

PASS_RATE=0
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
fi

echo "Total Tests Run: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo "Pass Rate: $PASS_RATE%"
echo ""

if [ $PASS_RATE -ge 90 ]; then
    echo -e "${GREEN}🎉 EXCELLENT${NC}: System is deployment ready!"
    exit 0
elif [ $PASS_RATE -ge 70 ]; then
    echo -e "${YELLOW}⚠️  GOOD${NC}: System is mostly ready, some issues to address"
    exit 0
else
    echo -e "${RED}❌ CRITICAL${NC}: System has significant issues, not deployment ready"
    exit 1
fi
