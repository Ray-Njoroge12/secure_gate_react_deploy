#!/bin/bash

# Secure Gate Access - Deployment Verification Script
# This script verifies your deployment is working correctly

set -e

echo "🔍 Secure Gate Access - Deployment Verification"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a URL is reachable
check_url() {
    local url=$1
    local name=$2
    
    echo -n "Checking $name... "
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Function to check API endpoint
check_api() {
    local url=$1
    local endpoint=$2
    local name=$3
    
    echo -n "Checking $name... "
    
    response=$(curl -s "$url$endpoint")
    
    if echo "$response" | grep -q "status"; then
        echo -e "${GREEN}✓ OK${NC}"
        echo "  Response: $response"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Response: $response"
        return 1
    fi
}

# Prompt for URLs
echo "Please enter your deployment URLs:"
echo ""
read -p "Server URL (e.g., https://securegate-api.onrender.com): " SERVER_URL
read -p "Client URL (e.g., https://your-site.netlify.app): " CLIENT_URL

echo ""
echo "Verifying deployment..."
echo ""

# Initialize counters
PASSED=0
FAILED=0

# Test 1: Server Health
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Server Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if check_api "$SERVER_URL" "/api/health" "Server Health"; then
    ((PASSED++))
else
    ((FAILED++))
fi
echo ""

# Test 2: Client Accessibility
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Client Accessibility"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if check_url "$CLIENT_URL" "Client Homepage"; then
    ((PASSED++))
else
    ((FAILED++))
fi
echo ""

# Test 3: HTTPS Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. HTTPS/SSL Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -n "Server HTTPS... "
if echo "$SERVER_URL" | grep -q "https://"; then
    echo -e "${GREEN}✓ OK${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED (Not using HTTPS)${NC}"
    ((FAILED++))
fi

echo -n "Client HTTPS... "
if echo "$CLIENT_URL" | grep -q "https://"; then
    echo -e "${GREEN}✓ OK${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED (Not using HTTPS)${NC}"
    ((FAILED++))
fi
echo ""

# Test 4: API Endpoints
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Core API Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test auth endpoints (should return error without credentials)
echo -n "Auth endpoint exists... "
response=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/api/auth/login")
if [ "$response" = "400" ] || [ "$response" = "401" ] || [ "$response" = "422" ]; then
    echo -e "${GREEN}✓ OK (Endpoint accessible)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED (Code: $response)${NC}"
    ((FAILED++))
fi

echo -n "Visitor endpoint exists... "
response=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/api/visitors")
if [ "$response" = "401" ] || [ "$response" = "403" ]; then
    echo -e "${GREEN}✓ OK (Protected endpoint)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED (Code: $response)${NC}"
    ((FAILED++))
fi
echo ""

# Test 5: CORS Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. CORS Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -n "CORS headers... "
cors_header=$(curl -s -I -H "Origin: $CLIENT_URL" "$SERVER_URL/api/health" | grep -i "access-control-allow-origin")
if [ ! -z "$cors_header" ]; then
    echo -e "${GREEN}✓ OK${NC}"
    echo "  $cors_header"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING (No CORS headers found)${NC}"
    echo "  Make sure CLIENT_ORIGIN is set to: $CLIENT_URL"
    ((FAILED++))
fi
echo ""

# Test 6: Security Headers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Security Headers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

headers=$(curl -s -I "$SERVER_URL/api/health")

echo -n "X-Frame-Options... "
if echo "$headers" | grep -qi "x-frame-options"; then
    echo -e "${GREEN}✓ OK${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING${NC}"
fi

echo -n "X-Content-Type-Options... "
if echo "$headers" | grep -qi "x-content-type-options"; then
    echo -e "${GREEN}✓ OK${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING${NC}"
fi

echo -n "Strict-Transport-Security... "
if echo "$headers" | grep -qi "strict-transport-security"; then
    echo -e "${GREEN}✓ OK${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING${NC}"
fi
echo ""

# Test 7: Response Time
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Performance Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Server response time... "
response_time=$(curl -o /dev/null -s -w '%{time_total}' "$SERVER_URL/api/health")
response_time_ms=$(echo "$response_time * 1000" | bc | cut -d'.' -f1)

if [ "$response_time_ms" -lt 1000 ]; then
    echo -e "${GREEN}✓ OK (${response_time_ms}ms)${NC}"
    ((PASSED++))
elif [ "$response_time_ms" -lt 3000 ]; then
    echo -e "${YELLOW}⚠ SLOW (${response_time_ms}ms)${NC}"
    echo "  Note: Render free tier may spin down after inactivity"
    ((PASSED++))
else
    echo -e "${RED}✗ SLOW (${response_time_ms}ms)${NC}"
    ((FAILED++))
fi

echo -n "Client response time... "
client_response_time=$(curl -o /dev/null -s -w '%{time_total}' "$CLIENT_URL")
client_response_time_ms=$(echo "$client_response_time * 1000" | bc | cut -d'.' -f1)

if [ "$client_response_time_ms" -lt 1000 ]; then
    echo -e "${GREEN}✓ OK (${client_response_time_ms}ms)${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ SLOW (${client_response_time_ms}ms)${NC}"
    ((PASSED++))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))
echo "Success Rate: $PERCENTAGE%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Your deployment is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test user registration and login"
    echo "2. Test visitor invitation flow"
    echo "3. Verify SMS/Email notifications (if configured)"
    echo "4. Run full E2E test suite"
    echo "5. Configure monitoring (Sentry, UptimeRobot)"
    exit 0
elif [ $PERCENTAGE -ge 80 ]; then
    echo -e "${YELLOW}⚠ Deployment mostly working but has some issues.${NC}"
    echo ""
    echo "Please review the failed checks above and:"
    echo "1. Check environment variables in Render/Netlify"
    echo "2. Verify CLIENT_ORIGIN is set correctly"
    echo "3. Check server logs for errors"
    echo "4. Ensure database is connected"
    exit 1
else
    echo -e "${RED}❌ Deployment has critical issues.${NC}"
    echo ""
    echo "Please review the deployment guide and:"
    echo "1. Check all environment variables"
    echo "2. Verify server is running"
    echo "3. Check database connection"
    echo "4. Review server logs"
    echo "5. Test health endpoint manually"
    exit 1
fi
