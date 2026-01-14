#!/bin/bash

BASE_URL="http://localhost:5001"
ORIGIN="http://localhost:3001"

echo "════════════════════════════════════════════════════════════"
echo "  🧪 QUICK MANUAL TEST - Secure Gate Staging Environment"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "1️⃣  Testing Health Endpoint..."
curl -s $BASE_URL/api/health -H "Origin: $ORIGIN" | jq . || curl -s $BASE_URL/api/health -H "Origin: $ORIGIN"
echo ""

echo "2️⃣  Testing Request ID Correlation..."
curl -i $BASE_URL/api/health \
  -H "Origin: $ORIGIN" \
  -H "X-Request-ID: quick-test-$(date +%s)" \
  2>&1 | grep -E "HTTP|X-Request-ID|X-Correlation"
echo ""

echo "3️⃣  Testing Error Response (404)..."
curl -s $BASE_URL/api/nonexistent \
  -H "Origin: $ORIGIN" \
  -H "X-Request-ID: error-test-$(date +%s)" | jq . || curl -s $BASE_URL/api/nonexistent -H "Origin: $ORIGIN"
echo ""

echo "4️⃣  Testing CSRF Token Endpoint..."
curl -s $BASE_URL/api/auth/csrf-token \
  -H "Origin: $ORIGIN" | jq . || curl -s $BASE_URL/api/auth/csrf-token -H "Origin: $ORIGIN"
echo ""

echo "5️⃣  Checking Recent Backend Logs..."
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access
docker-compose -f docker-compose.staging.yml logs --tail=10 backend
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✅ Quick Test Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Next Steps:"
echo "  • View frontend: open http://localhost:3001"
echo "  • View logs: docker-compose -f docker-compose.staging.yml logs -f backend"
echo "  • Full test guide: See MANUAL_TESTING_GUIDE.md"
echo ""
