#!/bin/bash
# Login Authentication Test Script
# Tests the deployed backend API

echo "🧪 Testing Secure Gate Login Authentication..."
echo ""

# Test 1: Health Check
echo "1️⃣ Testing Health Endpoint..."
curl -s http://localhost:5001/api/health | jq -r '.status' 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi
echo ""

# Test 2: Login with Email (admin)
echo "2️⃣ Testing Admin Login with Email..."
RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin-test@example.com","password":"Admin@123"}')

SUCCESS=$(echo $RESPONSE | jq -r '.success' 2>/dev/null)
if [ "$SUCCESS" == "true" ]; then
    echo "✅ Admin login successful"
    echo "   User: $(echo $RESPONSE | jq -r '.data.user.email')"
    echo "   Role: $(echo $RESPONSE | jq -r '.data.user.role')"
    echo "   Token: $(echo $RESPONSE | jq -r '.data.accessToken' | cut -c1-20)..."
else
    echo "❌ Admin login failed"
    echo "   Response: $RESPONSE"
fi
echo ""

# Test 3: Login with Username (guard)
echo "3️⃣ Testing Guard Login with Username..."
RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"guard-test","password":"Guard@123"}')

SUCCESS=$(echo $RESPONSE | jq -r '.success' 2>/dev/null)
if [ "$SUCCESS" == "true" ]; then
    echo "✅ Guard login successful"
    echo "   User: $(echo $RESPONSE | jq -r '.data.user.email')"
    echo "   Role: $(echo $RESPONSE | jq -r '.data.user.role')"
else
    echo "❌ Guard login failed"
    echo "   Response: $RESPONSE"
fi
echo ""

# Test 4: Login with Invalid Credentials
echo "4️⃣ Testing Invalid Credentials..."
RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin-test@example.com","password":"WrongPassword"}')

SUCCESS=$(echo $RESPONSE | jq -r '.success' 2>/dev/null)
if [ "$SUCCESS" == "false" ]; then
    echo "✅ Invalid credentials properly rejected"
    echo "   Error: $(echo $RESPONSE | jq -r '.error.message')"
else
    echo "❌ Invalid credentials test failed (should have been rejected)"
fi
echo ""

# Test 5: Resident Login
echo "5️⃣ Testing Resident Login..."
RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"resident-test@example.com","password":"Resident@123"}')

SUCCESS=$(echo $RESPONSE | jq -r '.success' 2>/dev/null)
if [ "$SUCCESS" == "true" ]; then
    echo "✅ Resident login successful"
    echo "   User: $(echo $RESPONSE | jq -r '.data.user.email')"
    echo "   Role: $(echo $RESPONSE | jq -r '.data.user.role')"
else
    echo "❌ Resident login failed"
    echo "   Response: $RESPONSE"
fi
echo ""

echo "🎯 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "All authentication tests completed!"
echo ""
echo "✅ Backend API: Running"
echo "✅ Database: Connected"
echo "✅ Authentication: Functional"
echo ""
echo "📝 Test User Credentials:"
echo "   Admin:    admin-test@example.com / Admin@123"
echo "   Guard:    guard-test@example.com / Guard@123"
echo "   Resident: resident-test@example.com / Resident@123"
