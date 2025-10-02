#!/bin/bash
# Save as: ./tests/visitor_flow_test.sh

API_URL="http://localhost:5003/api"
TIMESTAMP=$(date +%s)

echo "=== COMPLETE VISITOR FLOW TEST ==="

# Wait for server readiness
echo "Waiting for backend to be ready..."
for i in {1..20}; do
  HC=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5003/health || echo 000)
  if [ "$HC" = "200" ]; then
    echo "✓ Backend ready"
    break
  fi
  echo "Attempt $i: HTTP $HC"
  sleep 1
done

# 1. Register and login resident
echo ""
echo "Step 1: Register resident..."
curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"resident${TIMESTAMP}@example.com\",
    \"username\": \"resident${TIMESTAMP}\",
    \"password\": \"SecurePass123!\",
    \"role\": \"resident\",
    \"area\": \"Block A\",
    \"house\": \"A101\"
  }" > /tmp/register.json

RESIDENT_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"resident${TIMESTAMP}\",
    \"password\": \"SecurePass123!\"
  }" | jq -r '.data.accessToken')

if [ -z "$RESIDENT_TOKEN" ] || [ "$RESIDENT_TOKEN" = "null" ]; then
  echo "✗ Failed to get resident token"
  exit 1
fi
echo "✓ Resident logged in"

# 2. Create visitor invitation
echo ""
echo "Step 2: Create visitor invitation..."
TOMORROW=$(date -v+1d +%Y-%m-%d 2>/dev/null || date -d "tomorrow" +%Y-%m-%d)
INVITATION=$(curl -s -X POST "$API_URL/visitors" \
  -H "Authorization: Bearer $RESIDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"John Visitor\",
    \"email\": \"john.visitor${TIMESTAMP}@example.com\",
    \"phone\": \"+254700000100\",
    \"dateOfVisit\": \"$TOMORROW\",
    \"time\": \"14:00\",
    \"purpose\": \"Test visit\"
  }")

echo "$INVITATION" | jq .

VISITOR_ID=$(echo "$INVITATION" | jq -r '.data.id')
INVITE_CODE=$(echo "$INVITATION" | jq -r '.data.inviteCode')

if [ -z "$VISITOR_ID" ] || [ "$VISITOR_ID" = "null" ]; then
  echo "✗ Failed to create invitation"
  exit 1
fi
echo "✓ Invitation created (ID: $VISITOR_ID)"

# 2.5. Generate pass for visitor
echo ""
echo "Step 2.5: Generate pass for visitor..."
PASS_RESPONSE=$(curl -s -X POST "$API_URL/visitors/$VISITOR_ID/pass" \
  -H "Authorization: Bearer $RESIDENT_TOKEN" \
  -H "Content-Type: application/json")

echo "$PASS_RESPONSE" | jq .

QR_CODE=$(echo "$PASS_RESPONSE" | jq -r '.data.data.qrCode')
PASS_ID=$(echo "$PASS_RESPONSE" | jq -r '.data.data.passId')

if [ -z "$QR_CODE" ] || [ "$QR_CODE" = "null" ]; then
  echo "✗ Failed to create pass"
  exit 1
fi
echo "✓ Pass created"
echo "  QR Code: ${QR_CODE:0:50}..."
echo "  Pass ID: $PASS_ID"

# 3. Register and login guard
echo ""
echo "Step 3: Register guard..."
GUARD_REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"guard${TIMESTAMP}@example.com\",
    \"username\": \"guard${TIMESTAMP}\",
    \"password\": \"SecurePass123!\",
    \"role\": \"guard\"
  }")

GUARD_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"guard${TIMESTAMP}\",
    \"password\": \"SecurePass123!\"
  }" | jq -r '.data.accessToken')

if [ -z "$GUARD_TOKEN" ] || [ "$GUARD_TOKEN" = "null" ]; then
  echo "✗ Failed to get guard token"
  exit 1
fi
echo "✓ Guard logged in"

# 4. Guard checks in visitor (using visitor ID)
echo ""
echo "Step 4: Guard checks in visitor..."
CHECKIN_RESULT=$(curl -s -X POST "$API_URL/visitors/$VISITOR_ID/check-in" \
  -H "Authorization: Bearer $GUARD_TOKEN" \
  -H "Content-Type: application/json")

echo "$CHECKIN_RESULT" | jq .

if echo "$CHECKIN_RESULT" | jq -e '.data.message' > /dev/null; then
  echo "✓ Visitor checked in"
else
  echo "✗ Check-in failed"
  exit 1
fi

# 5. Guard checks out visitor
echo ""
echo "Step 5: Guard checks out visitor..."
CHECKOUT_RESULT=$(curl -s -X POST "$API_URL/visitors/$VISITOR_ID/check-out" \
  -H "Authorization: Bearer $GUARD_TOKEN" \
  -H "Content-Type: application/json")

echo "$CHECKOUT_RESULT" | jq .

if echo "$CHECKOUT_RESULT" | jq -e '.data.message' > /dev/null; then
  echo "✓ Visitor checked out"
else
  echo "✗ Check-out failed"
  exit 1
fi

echo ""
echo "=== COMPLETE VISITOR FLOW TEST PASSED ==="
echo ""
echo "Summary:"
echo "  - Resident registration: ✓"
echo "  - Visitor invitation: ✓"
echo "  - Pass generation: ✓"
echo "  - QR code generation: ✓"
echo "  - Visitor check-in: ✓"
echo "  - Visitor check-out: ✓"
echo ""
echo "🎉 CORE SYSTEM FUNCTIONALITY VERIFIED!"
