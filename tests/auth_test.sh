#!/bin/bash
# Save as: ./tests/auth_test.sh

API_URL="http://localhost:5003/api"
TIMESTAMP=$(date +%s)

echo "=== AUTHENTICATION TESTS ==="

# Wait for server readiness
for i in {1..10}; do
  HC=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5003/health || echo 000)
  if [ "$HC" = "200" ]; then
    break
  fi
  echo "Waiting for backend to be ready (attempt $i, HTTP $HC)..."
  sleep 1
done

# Test 1: Register Resident
echo ""
echo "[P2-T001] Registering test resident..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
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

echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo "✓ Resident registration successful"
  USER_EMAIL=$(echo "$REGISTER_RESPONSE" | jq -r '.data.email')
  USERNAME=$(echo "$REGISTER_RESPONSE" | jq -r '.data.username')
else
  echo "✗ Resident registration failed"
  exit 1
fi

# Test 2: Login Resident
echo ""
echo "[P2-T004] Logging in resident..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$USERNAME\",
    \"password\": \"SecurePass123!\"
  }")

echo "$LOGIN_RESPONSE" | jq .

if echo "$LOGIN_RESPONSE" | jq -e '.data.accessToken' > /dev/null; then
  echo "✓ Login successful"
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
  echo "Token: ${ACCESS_TOKEN:0:50}..."
else
  echo "✗ Login failed"
  exit 1
fi

# Test 3: Access Protected Endpoint
echo ""
echo "[P2-T003] Accessing user profile..."
PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/auth/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$PROFILE_RESPONSE" | jq .

if echo "$PROFILE_RESPONSE" | jq -e '.data.user.email' > /dev/null; then
  echo "✓ Profile access successful"
else
  echo "✗ Profile access failed"
fi

echo ""
echo "=== AUTHENTICATION TESTS COMPLETE ==="