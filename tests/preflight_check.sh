#!/bin/bash
# Save as: ./tests/preflight_check.sh

echo "=== SECURE GATE ACCESS - PRE-FLIGHT CHECK ==="
echo ""

# Test 1: Docker Services
echo "[P0-T001] Checking Docker services..."
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep secure-gate
if [ $? -eq 0 ]; then
  echo "✓ Docker services found"
else
  echo "✗ No Docker services running"
  exit 1
fi

# Test 2: Database Connectivity  
echo ""
echo "[P0-T002] Testing database connectivity..."
docker exec secure-gate-access-database-1 psql -U postgres -d secure_gate -c 'SELECT 1;' > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✓ Database connectivity OK"
else
  echo "✗ Database connection failed"
  exit 1
fi

# Test 3: Redis Connectivity
echo ""
echo "[P0-T003] Testing Redis connectivity..."
docker exec secure-gate-access-redis-1 redis-cli -a 0da5af19cd43c36a40b945033d8aa997 PING 2>/dev/null | grep PONG > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✓ Redis connectivity OK"
else
  echo "✗ Redis connection failed"
  exit 1
fi

# Test 4: Backend API
echo ""
echo "[P0-T004] Testing backend API..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5002/health 2>/dev/null)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "503" ]; then
  echo "✓ Backend API responding (HTTP $HTTP_CODE)"
else
  echo "✗ Backend API not responding (HTTP $HTTP_CODE)"
  echo "  Check: docker logs secure-gate-backend --tail=50"
fi

# Test 5: Frontend
echo ""
echo "[P0-T005] Testing frontend..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Frontend accessible (HTTP $HTTP_CODE on port 3002)"
else
  echo "✗ Frontend not accessible (HTTP $HTTP_CODE)"
  echo "  Check: docker logs secure-gate-frontend --tail=50"
fi

echo ""
echo "=== PRE-FLIGHT CHECK COMPLETE ==="
