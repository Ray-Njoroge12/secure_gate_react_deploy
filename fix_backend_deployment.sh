#!/bin/bash
# Quick Fix Script for Backend Deployment
# This script updates the docker-compose configuration and rebuilds the backend with full application

set -e  # Exit on error

echo "========================================"
echo "Backend Full Deployment Fix Script"
echo "========================================"
echo ""

# Check if running from correct directory
if [ ! -d "deployment" ]; then
    echo "❌ Error: Must run from project root directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📋 Step 1: Backing up current configuration..."
cp deployment/docker-compose.green.yml deployment/docker-compose.green.yml.backup
echo "✓ Backup created: deployment/docker-compose.green.yml.backup"
echo ""

echo "📋 Step 2: Updating docker-compose.green.yml..."
# Update Dockerfile.minimal to Dockerfile
sed -i.tmp 's/dockerfile: Dockerfile\.minimal/dockerfile: Dockerfile/g' deployment/docker-compose.green.yml
rm deployment/docker-compose.green.yml.tmp 2>/dev/null || true
echo "✓ Updated to use full Dockerfile"
echo ""

echo "📋 Step 3: Verifying changes..."
if grep -q "dockerfile: Dockerfile$" deployment/docker-compose.green.yml; then
    echo "✓ Configuration updated correctly"
else
    echo "❌ Configuration update failed"
    echo "   Restoring backup..."
    mv deployment/docker-compose.green.yml.backup deployment/docker-compose.green.yml
    exit 1
fi
echo ""

echo "📋 Step 4: Stopping current backend..."
cd deployment
docker-compose -f docker-compose.green.yml stop backend-green
echo "✓ Backend stopped"
echo ""

echo "📋 Step 5: Rebuilding backend with full application..."
echo "   This may take 2-3 minutes..."
docker-compose -f docker-compose.green.yml build --no-cache backend-green
echo "✓ Backend rebuilt"
echo ""

echo "📋 Step 6: Starting backend..."
docker-compose -f docker-compose.green.yml up -d backend-green
echo "✓ Backend started"
echo ""

echo "📋 Step 7: Waiting for backend to be ready..."
echo "   This may take 30-45 seconds..."
sleep 10

for i in {1..12}; do
    if curl -s http://localhost:5002/health > /dev/null 2>&1; then
        echo "✓ Backend is responding"
        break
    fi
    echo "   Waiting... ($i/12)"
    sleep 5
done
echo ""

echo "📋 Step 8: Verifying full application is running..."
HEALTH_RESPONSE=$(curl -s http://localhost:5002/health)
echo "Health check response:"
echo "$HEALTH_RESPONSE" | jq . 2>/dev/null || echo "$HEALTH_RESPONSE"
echo ""

# Test if auth route exists (should return 400 or 422, not 404)
AUTH_TEST=$(curl -s -X POST http://localhost:5002/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"test":"test"}' \
    -w "\n%{http_code}")

HTTP_CODE=$(echo "$AUTH_TEST" | tail -1)
RESPONSE=$(echo "$AUTH_TEST" | head -n -1)

if [ "$HTTP_CODE" = "404" ]; then
    echo "❌ Authentication routes still not available!"
    echo "   HTTP Code: $HTTP_CODE"
    echo "   Response: $RESPONSE"
    echo ""
    echo "⚠️  The backend may need more time to start or there may be an error."
    echo "   Check logs with: docker logs secure-gate-backend-green --tail=50"
    exit 1
else
    echo "✓ Authentication routes are available"
    echo "   HTTP Code: $HTTP_CODE (expected: 400 or 422 for invalid data)"
    echo ""
fi

cd ..

echo "========================================"
echo "✅ Backend deployment fix complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Run preflight check: ./tests/preflight_check.sh"
echo "2. Run auth tests: ./tests/auth_test.sh"
echo ""
echo "To check backend logs:"
echo "   docker logs secure-gate-backend-green --tail=50"
echo ""
echo "To rollback if needed:"
echo "   mv deployment/docker-compose.green.yml.backup deployment/docker-compose.green.yml"
echo "   cd deployment && docker-compose -f docker-compose.green.yml up -d --build backend-green"
echo ""
